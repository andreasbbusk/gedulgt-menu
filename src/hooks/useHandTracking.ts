import { useEffect, useReducer, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import {
  projectPointToTable,
  type ScreenPoint,
} from "../config/tableCalibration";
import { getPinchState } from "./pinch";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const DETECTION_INTERVAL_MS = 1000 / 30;
const ACTIVE_HAND_LOCK_MS = 900;
const CAMERA_FACING_MODE: VideoFacingModeEnum = "environment";
const DEFAULT_MIRROR_TRACKING_X_AXIS = true;

export type { ScreenPoint };

export type HandPose = "unknown" | "open" | "fist";
export type TrackingQuality = "none" | "searching" | "stable" | "limited";

export type HandTrackingSnapshot = {
  wrist: ScreenPoint | null;
  palmCenter: ScreenPoint | null;
  gesturePoint: ScreenPoint | null;
  indexFingerTip: ScreenPoint | null;
  middleFingerTip: ScreenPoint | null;
  ringFingerTip: ScreenPoint | null;
  pinkyFingerTip: ScreenPoint | null;
  thumbTip: ScreenPoint | null;
  cursor: ScreenPoint | null;
  projectedCursor: ScreenPoint | null;
  normalizedPinchDistance: number | null;
  handPose: HandPose;
  isHandOpen: boolean;
  isFistClosed: boolean;
  isPinching: boolean;
  hasHand: boolean;
  trackingQuality: TrackingQuality;
  activeHandLocked: boolean;
  frameDurationMs: number | null;
  lastUpdated: number;
};

export type HandTrackingStatus =
  | "idle"
  | "requesting-permission"
  | "loading-model"
  | "ready"
  | "error";

const EMPTY_TRACKING_SNAPSHOT: HandTrackingSnapshot = {
  wrist: null,
  palmCenter: null,
  gesturePoint: null,
  indexFingerTip: null,
  middleFingerTip: null,
  ringFingerTip: null,
  pinkyFingerTip: null,
  thumbTip: null,
  cursor: null,
  projectedCursor: null,
  normalizedPinchDistance: null,
  handPose: "unknown",
  isHandOpen: false,
  isFistClosed: false,
  isPinching: false,
  hasHand: false,
  trackingQuality: "none",
  activeHandLocked: false,
  frameDurationMs: null,
  lastUpdated: 0,
};

function statusReducer(
  _currentStatus: HandTrackingStatus | undefined,
  nextStatus: HandTrackingStatus,
) {
  return nextStatus;
}

type LandmarkPoint = {
  x: number;
  y: number;
  z?: number;
};

const PALM_CENTER_LANDMARKS = [0, 5, 9, 13, 17] as const;
const FINGER_LANDMARKS = [
  { tip: 8, pip: 6, mcp: 5 },
  { tip: 12, pip: 10, mcp: 9 },
  { tip: 16, pip: 14, mcp: 13 },
  { tip: 20, pip: 18, mcp: 17 },
] as const;

function getLandmarkDistance(first: LandmarkPoint, second: LandmarkPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function averageLandmarks(
  landmarks: LandmarkPoint[],
  landmarkIndexes: readonly number[],
): LandmarkPoint | null {
  const points = landmarkIndexes
    .map((index) => landmarks[index])
    .filter((point): point is LandmarkPoint => Boolean(point));

  if (points.length === 0) {
    return null;
  }

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function getFingerPoseCounts(landmarks: LandmarkPoint[]) {
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];

  if (!wrist || !middleMcp) {
    return { curledFingerCount: 0, extendedFingerCount: 0 };
  }

  const palmSize = Math.max(getLandmarkDistance(wrist, middleMcp), 0.001);

  return FINGER_LANDMARKS.reduce(
    (counts, finger) => {
      const tip = landmarks[finger.tip];
      const pip = landmarks[finger.pip];
      const mcp = landmarks[finger.mcp];

      if (!tip || !pip || !mcp) {
        return counts;
      }

      const wristToTip = getLandmarkDistance(wrist, tip);
      const wristToPip = getLandmarkDistance(wrist, pip);
      const tipToMcp = getLandmarkDistance(tip, mcp);
      const extended =
        wristToTip > wristToPip * 1.03 && tipToMcp > palmSize * 0.68;
      const curled =
        wristToTip < wristToPip * 0.98 || tipToMcp < palmSize * 0.55;

      return {
        curledFingerCount: counts.curledFingerCount + (curled ? 1 : 0),
        extendedFingerCount: counts.extendedFingerCount + (extended ? 1 : 0),
      };
    },
    { curledFingerCount: 0, extendedFingerCount: 0 },
  );
}

function getHandPose(landmarks: LandmarkPoint[]): HandPose {
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const palmCenter = averageLandmarks(landmarks, PALM_CENTER_LANDMARKS);

  if (!wrist || !thumbTip || !indexMcp || !middleMcp || !palmCenter) {
    return "unknown";
  }

  const palmSize = Math.max(getLandmarkDistance(wrist, middleMcp), 0.001);
  const thumbAwayFromPalm =
    getLandmarkDistance(thumbTip, indexMcp) > palmSize * 0.48;
  const thumbFolded =
    getLandmarkDistance(thumbTip, palmCenter) < palmSize * 0.92;
  const { curledFingerCount, extendedFingerCount } =
    getFingerPoseCounts(landmarks);

  if (extendedFingerCount >= 4 || (extendedFingerCount >= 3 && thumbAwayFromPalm)) {
    return "open";
  }

  if (curledFingerCount >= 3 && (thumbFolded || extendedFingerCount <= 1)) {
    return "fist";
  }

  return "unknown";
}

function toScreenPoint(landmark: LandmarkPoint): ScreenPoint {
  const mirrorX = getBooleanTrackingOption(
    "mirrorX",
    "gedulgt:mirror-x",
    DEFAULT_MIRROR_TRACKING_X_AXIS,
  );
  const x = mirrorX ? 1 - landmark.x : landmark.x;

  return {
    x: x * window.innerWidth,
    y: landmark.y * window.innerHeight,
  };
}

function getBooleanTrackingOption(
  queryKey: string,
  storageKey: string,
  fallback: boolean,
) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const queryValue = new URLSearchParams(window.location.search).get(queryKey);

  if (queryValue === "0" || queryValue === "false") {
    return false;
  }

  if (queryValue === "1" || queryValue === "true") {
    return true;
  }

  const storedValue = safeGetLocalStorageValue(storageKey);

  if (storedValue === "0" || storedValue === "false") {
    return false;
  }

  if (storedValue === "1" || storedValue === "true") {
    return true;
  }

  return fallback;
}

function safeGetLocalStorageValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      return "Tracking unavailable.";
    }

    if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError"
    ) {
      return "Tracking unavailable.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Hand tracking could not be started.";
}

export function useHandTracking() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackingRef = useRef<HandTrackingSnapshot>({
    ...EMPTY_TRACKING_SNAPSHOT,
  });
  const pinchStateRef = useRef(false);
  const handStateRef = useRef(false);
  const fistStateRef = useRef(false);
  const handPoseRef = useRef<HandPose>("unknown");
  const activeHandLockedRef = useRef(false);

  const [isPinching, setIsPinching] = useState(false);
  const [isFistClosed, setIsFistClosed] = useState(false);
  const [handPose, setHandPose] = useState<HandPose>("unknown");
  const [hasHand, setHasHand] = useState(false);
  const [status, setStatus] = useReducer(statusReducer, undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let animationFrameId = 0;
    let disposed = false;
    let handLandmarker: HandLandmarker | null = null;
    let stream: MediaStream | null = null;
    let lastVideoTime = -1;
    let lastDetectionAt = 0;
    let activeHandLockUntil = 0;

    const updatePinching = (nextValue: boolean) => {
      if (pinchStateRef.current === nextValue || disposed) {
        return;
      }

      pinchStateRef.current = nextValue;
      setIsPinching(nextValue);
    };

    const updateFistClosed = (nextValue: boolean) => {
      if (fistStateRef.current === nextValue || disposed) {
        return;
      }

      fistStateRef.current = nextValue;
      setIsFistClosed(nextValue);
    };

    const updateHandPose = (nextValue: HandPose) => {
      if (handPoseRef.current === nextValue || disposed) {
        return;
      }

      handPoseRef.current = nextValue;
      setHandPose(nextValue);
    };

    const updateHasHand = (nextValue: boolean) => {
      if (handStateRef.current === nextValue || disposed) {
        return;
      }

      handStateRef.current = nextValue;
      setHasHand(nextValue);
    };

    const updateActiveHandLocked = (nextValue: boolean) => {
      activeHandLockedRef.current = nextValue;
    };

    const resetTracking = () => {
      trackingRef.current = { ...EMPTY_TRACKING_SNAPSHOT };
      updatePinching(false);
      updateFistClosed(false);
      updateHandPose("unknown");
      updateHasHand(false);
      updateActiveHandLocked(false);
    };

    const stopWebcam = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;

      const video = videoRef.current;
      if (video) {
        video.pause();
        video.srcObject = null;
      }
    };

    const detectHands = () => {
      const video = videoRef.current;

      if (disposed || !video || !handLandmarker) {
        return;
      }

      const now = performance.now();

      if (
        video.readyState >= 2 &&
        video.currentTime !== lastVideoTime &&
        now - lastDetectionAt >= DETECTION_INTERVAL_MS
      ) {
        lastVideoTime = video.currentTime;
        lastDetectionAt = now;

        const detectionStartedAt = performance.now();
        const results = handLandmarker.detectForVideo(video, detectionStartedAt);
        const frameDurationMs = performance.now() - detectionStartedAt;
        const landmarks = results.landmarks[0] as LandmarkPoint[] | undefined;
        const wrist = landmarks?.[0];
        const thumbTip = landmarks?.[4];
        const indexFingerTip = landmarks?.[8];
        const middleFingerTip = landmarks?.[12];
        const ringFingerTip = landmarks?.[16];
        const pinkyFingerTip = landmarks?.[20];
        const palmCenter = landmarks
          ? averageLandmarks(landmarks, PALM_CENTER_LANDMARKS)
          : null;

        if (
          landmarks &&
          wrist &&
          palmCenter &&
          thumbTip &&
          indexFingerTip &&
          middleFingerTip &&
          ringFingerTip &&
          pinkyFingerTip
        ) {
          const normalizedPinchDistance = Math.hypot(
            thumbTip.x - indexFingerTip.x,
            thumbTip.y - indexFingerTip.y,
          );
          const pinching = getPinchState(
            pinchStateRef.current,
            normalizedPinchDistance,
          );
          const nextHandPose = getHandPose(landmarks);
          const wristPoint = toScreenPoint(wrist);
          const palmCenterPoint = toScreenPoint(palmCenter);
          const indexFingerTipPoint = toScreenPoint(indexFingerTip);
          const middleFingerTipPoint = toScreenPoint(middleFingerTip);
          const ringFingerTipPoint = toScreenPoint(ringFingerTip);
          const pinkyFingerTipPoint = toScreenPoint(pinkyFingerTip);
          const thumbTipPoint = toScreenPoint(thumbTip);
          if (!handStateRef.current) {
            activeHandLockUntil = now + ACTIVE_HAND_LOCK_MS;
          }

          const projectedCursor =
            projectPointToTable(palmCenterPoint) ??
            projectPointToTable(indexFingerTipPoint);
          const activeHandLocked = now < activeHandLockUntil;
          const trackingQuality: TrackingQuality = projectedCursor
            ? "stable"
            : "limited";

          trackingRef.current = {
            wrist: wristPoint,
            palmCenter: palmCenterPoint,
            gesturePoint: wristPoint,
            indexFingerTip: indexFingerTipPoint,
            middleFingerTip: middleFingerTipPoint,
            ringFingerTip: ringFingerTipPoint,
            pinkyFingerTip: pinkyFingerTipPoint,
            thumbTip: thumbTipPoint,
            cursor: palmCenterPoint,
            projectedCursor,
            normalizedPinchDistance,
            handPose: nextHandPose,
            isHandOpen: nextHandPose === "open",
            isFistClosed: nextHandPose === "fist",
            isPinching: pinching,
            hasHand: true,
            trackingQuality,
            activeHandLocked,
            frameDurationMs,
            lastUpdated: now,
          };

          updateHasHand(true);
          updatePinching(pinching);
          updateFistClosed(nextHandPose === "fist");
          updateHandPose(nextHandPose);
          updateActiveHandLocked(activeHandLocked);
        } else {
          activeHandLockUntil = 0;
          trackingRef.current = {
            ...EMPTY_TRACKING_SNAPSHOT,
            frameDurationMs,
            lastUpdated: now,
          };
          updateHasHand(false);
          updatePinching(false);
          updateFistClosed(false);
          updateHandPose("unknown");
          updateActiveHandLocked(false);
        }
      }

      animationFrameId = requestAnimationFrame(detectHands);
    };

    const startTracking = async () => {
      const video = videoRef.current;

      if (!video) {
        throw new Error("The webcam video element is not mounted.");
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support webcam access.");
      }

      setStatus("requesting-permission");

      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: CAMERA_FACING_MODE,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (disposed) {
        stopWebcam();
        return;
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await video.play();

      if (disposed) {
        stopWebcam();
        return;
      }

      setStatus("loading-model");

      const vision = await FilesetResolver.forVisionTasks(WASM_URL);

      if (disposed) {
        return;
      }

      const runningMode = "video".toUpperCase() as "VIDEO";

      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
        },
        numHands: 1,
        runningMode,
      });

      if (disposed) {
        handLandmarker?.close();
        return;
      }

      setStatus("ready");
      detectHands();
    };

    startTracking().catch((cause) => {
      if (disposed) {
        return;
      }

      resetTracking();
      stopWebcam();
      setStatus("error");
      setError(getCameraErrorMessage(cause));
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
      handLandmarker?.close();
      stopWebcam();
    };
  }, []);

  return {
    videoRef,
    trackingRef,
    isPinching,
    isFistClosed,
    handPose,
    hasHand,
    status,
    error,
  };
}
