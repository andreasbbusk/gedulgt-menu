import { useEffect, useRef, useReducer, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { projectPointToTable } from "../config/tableCalibration";
import { classifyPose } from "./handPose";
import type { HandPose } from "./handPose";

const WASM_URL  = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const FRAME_MS  = 1000 / 30;

export type TrackingStatus = "idle" | "requesting-permission" | "loading" | "ready" | "error";

export type TrackingFrame = {
  hasHand: boolean;
  pose: HandPose;
  projectedPoint: { x: number; y: number } | null;
  time: number;
};

type Pt = { x: number; y: number };

function avg(lms: Pt[], idxs: number[]): Pt {
  const pts = idxs.map((i) => lms[i]).filter(Boolean);
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
}

function toScreenPt(lm: Pt, mirrorX: boolean): Pt {
  return {
    x: (mirrorX ? 1 - lm.x : lm.x) * window.innerWidth,
    y: lm.y * window.innerHeight,
  };
}

const EMPTY_FRAME: TrackingFrame = {
  hasHand: false,
  pose: "unknown",
  projectedPoint: null,
  time: 0,
};

export function useHandTracking(
  onFrame: (frame: TrackingFrame) => void,
  { enabled = true, mirrorX = true }: { enabled?: boolean; mirrorX?: boolean } = {},
) {
  const videoRef   = useRef<HTMLVideoElement | null>(null);
  const onFrameRef = useRef(onFrame);

  const [status, setStatus] = useReducer(
    (_: TrackingStatus, s: TrackingStatus) => s,
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!enabled) return;

    const video = videoRef.current;
    let disposed      = false;
    let raf           = 0;
    let landmarker: HandLandmarker | null = null;
    let stream: MediaStream | null        = null;
    let lastVideoTime = -1;
    let lastFrameAt   = 0;

    const detect = () => {
      if (disposed || !video || !landmarker) return;

      const now = performance.now();

      if (
        video.readyState >= 2 &&
        video.currentTime !== lastVideoTime &&
        now - lastFrameAt >= FRAME_MS
      ) {
        lastVideoTime = video.currentTime;
        lastFrameAt   = now;

        const result = landmarker.detectForVideo(video, now);
        const lms    = result.landmarks[0] as Pt[] | undefined;

        if (lms && lms.length >= 21) {
          const palmCenter     = avg(lms, [0, 5, 9, 13, 17]);
          const palmScreenPt   = toScreenPt(palmCenter, mirrorX);
          const projectedPoint = projectPointToTable(palmScreenPt) ?? null;

          onFrameRef.current({
            hasHand: true,
            pose: classifyPose(lms),
            projectedPoint,
            time: now,
          });
        } else {
          onFrameRef.current({ ...EMPTY_FRAME, time: now });
        }
      }

      raf = requestAnimationFrame(detect);
    };

    const start = async () => {
      if (!video) throw new Error("Video element not mounted");

      setStatus("requesting-permission");
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (disposed) { stream.getTracks().forEach((t) => t.stop()); return; }

      video.srcObject   = stream;
      video.muted       = true;
      video.playsInline = true;
      await video.play();

      setStatus("loading");
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      if (disposed) return;

      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        numHands: 1,
        runningMode: "VIDEO",
      });

      if (disposed) { landmarker.close(); return; }

      setStatus("ready");
      detect();
    };

    start().catch((err) => {
      if (disposed) return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "Tracking failed");
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      landmarker?.close();
      stream?.getTracks().forEach((t) => t.stop());
      if (video) { video.pause(); video.srcObject = null; }
    };
  }, [enabled, mirrorX]);

  return { videoRef, status, error };
}
