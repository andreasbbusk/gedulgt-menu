import { useRef, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type {
  HandTrackingSnapshot,
  HandTrackingStatus,
  ScreenPoint,
} from "../hooks/useHandTracking";

gsap.registerPlugin(useGSAP);

const TRACKING_MARKERS = [
  "projectedCursor",
  "palmCenter",
  "indexFingerTip",
  "thumbTip",
] as const;

const TRACKING_LINES = [
  ["indexFingerTip", "thumbTip"],
  ["palmCenter", "projectedCursor"],
] as const;

type TrackingMarkerKey = (typeof TRACKING_MARKERS)[number];
type TrackingLineKey = `${(typeof TRACKING_LINES)[number][0]}-${(typeof TRACKING_LINES)[number][1]}`;
type ReadoutKey =
  | "camera"
  | "quality"
  | "hand"
  | "pose"
  | "projection"
  | "pinch"
  | "latency"
  | "instruction";
type TrackingTone = "idle" | "searching" | "ready" | "limited" | "error";

type TrackingPreviewProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  trackingRef: {
    current: HandTrackingSnapshot;
  };
  open: boolean;
  status: HandTrackingStatus;
  error: string | null;
  gesturesEnabled: boolean;
};

function clamp(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function getPointPercent(point: ScreenPoint) {
  return {
    x: clamp((point.x / Math.max(window.innerWidth, 1)) * 100),
    y: clamp((point.y / Math.max(window.innerHeight, 1)) * 100),
  };
}

function getLineKey([from, to]: (typeof TRACKING_LINES)[number]): TrackingLineKey {
  return `${from}-${to}`;
}

function getCameraLabel(status: HandTrackingStatus) {
  if (status === "requesting-permission") {
    return "Camera permission";
  }

  if (status === "loading-model") {
    return "Loading hand model";
  }

  if (status === "ready") {
    return "Camera ready";
  }

  if (status === "error") {
    return "Camera blocked";
  }

  return "Camera idle";
}

function getQualityLabel(snapshot: HandTrackingSnapshot) {
  if (!snapshot.hasHand) {
    return "No hand";
  }

  if (snapshot.trackingQuality === "stable") {
    return "Stable";
  }

  if (snapshot.trackingQuality === "limited") {
    return "Outside projection";
  }

  if (snapshot.trackingQuality === "searching") {
    return "Searching";
  }

  return "No tracking";
}

function getPoseLabel(snapshot: HandTrackingSnapshot) {
  if (snapshot.isPinching) {
    return "Pinch";
  }

  if (snapshot.handPose === "fist") {
    return "Fist";
  }

  if (snapshot.handPose === "open") {
    return "Open hand";
  }

  return "Unclear";
}

function getProjectionLabel(snapshot: HandTrackingSnapshot) {
  if (!snapshot.hasHand) {
    return "Waiting";
  }

  return snapshot.projectedCursor ? "Inside table" : "Move into frame";
}

function getLatencyLabel(snapshot: HandTrackingSnapshot) {
  if (snapshot.frameDurationMs === null) {
    return "-- ms";
  }

  return `${Math.round(snapshot.frameDurationMs)} ms`;
}

function getTrackingTone(
  snapshot: HandTrackingSnapshot,
  status: HandTrackingStatus,
  error: string | null,
): TrackingTone {
  if (status === "error" || error) {
    return "error";
  }

  if (status !== "ready") {
    return "idle";
  }

  if (!snapshot.hasHand) {
    return "searching";
  }

  if (!snapshot.projectedCursor || snapshot.trackingQuality === "limited") {
    return "limited";
  }

  return "ready";
}

function getInstruction(
  snapshot: HandTrackingSnapshot,
  status: HandTrackingStatus,
  error: string | null,
  gesturesEnabled: boolean,
) {
  if (error) {
    return error;
  }

  if (status === "requesting-permission") {
    return "Allow camera access to inspect hand tracking.";
  }

  if (status === "loading-model") {
    return "Loading the hand model. Keep the table visible.";
  }

  if (status !== "ready") {
    return "Press C or V to open this panel and start tracking.";
  }

  if (!snapshot.hasHand) {
    return "Show one hand inside the camera view.";
  }

  if (!snapshot.projectedCursor) {
    return "Move the hand into the central projection frame.";
  }

  if (snapshot.activeHandLocked) {
    return "Hold steady for a beat while the hand locks.";
  }

  if (!gesturesEnabled) {
    return "Gestures are disabled. Use this panel for camera calibration.";
  }

  if (snapshot.isPinching || snapshot.handPose === "fist") {
    return "Release over a drink to flip it.";
  }

  return "Open hand: swipe to browse, then swipe inward to add.";
}

function writeReadout(
  refs: Partial<Record<ReadoutKey, HTMLElement | null>>,
  key: ReadoutKey,
  value: string,
) {
  const node = refs[key];

  if (node && node.textContent !== value) {
    node.textContent = value;
  }
}

export function TrackingPreview({
  videoRef,
  trackingRef,
  open,
  status,
  error,
  gesturesEnabled,
}: TrackingPreviewProps) {
  const previewRef = useRef<HTMLElement | null>(null);
  const markerRefs = useRef<
    Partial<Record<TrackingMarkerKey, HTMLSpanElement | null>>
  >({});
  const lineRefs = useRef<Partial<Record<TrackingLineKey, SVGLineElement | null>>>(
    {},
  );
  const readoutRefs = useRef<Partial<Record<ReadoutKey, HTMLElement | null>>>(
    {},
  );

  useGSAP(() => {
    const updateMarker = (
      markerKey: TrackingMarkerKey,
      point: ScreenPoint | null,
      hasHand: boolean,
    ) => {
      const marker = markerRefs.current[markerKey];

      if (!marker) {
        return;
      }

      if (!hasHand || !point) {
        gsap.set(marker, { autoAlpha: 0 });
        return;
      }

      const position = getPointPercent(point);
      marker.style.left = `${position.x}%`;
      marker.style.top = `${position.y}%`;
      gsap.set(marker, { autoAlpha: 1 });
    };

    const updateLine = (
      lineKey: TrackingLineKey,
      fromPoint: ScreenPoint | null,
      toPoint: ScreenPoint | null,
      hasHand: boolean,
    ) => {
      const line = lineRefs.current[lineKey];

      if (!line) {
        return;
      }

      if (!hasHand || !fromPoint || !toPoint) {
        gsap.set(line, { autoAlpha: 0 });
        return;
      }

      const fromPosition = getPointPercent(fromPoint);
      const toPosition = getPointPercent(toPoint);

      gsap.set(line, {
        attr: {
          x1: `${fromPosition.x}%`,
          y1: `${fromPosition.y}%`,
          x2: `${toPosition.x}%`,
          y2: `${toPosition.y}%`,
        },
        autoAlpha: 1,
      });
    };

    const updateTrackingPreview = () => {
      const snapshot = trackingRef.current;
      const tone = getTrackingTone(snapshot, status, error);

      if (previewRef.current) {
        previewRef.current.dataset.trackingTone = tone;
      }

      TRACKING_MARKERS.forEach((markerKey) => {
        updateMarker(markerKey, snapshot[markerKey], snapshot.hasHand);
      });

      TRACKING_LINES.forEach((lineDefinition) => {
        const [from, to] = lineDefinition;
        updateLine(
          getLineKey(lineDefinition),
          snapshot[from],
          snapshot[to],
          snapshot.hasHand,
        );
      });

      writeReadout(readoutRefs.current, "camera", getCameraLabel(status));
      writeReadout(readoutRefs.current, "quality", getQualityLabel(snapshot));
      writeReadout(
        readoutRefs.current,
        "hand",
        snapshot.hasHand ? "Detected" : "Not seen",
      );
      writeReadout(readoutRefs.current, "pose", getPoseLabel(snapshot));
      writeReadout(
        readoutRefs.current,
        "projection",
        getProjectionLabel(snapshot),
      );
      writeReadout(
        readoutRefs.current,
        "pinch",
        snapshot.isPinching ? "Closed" : "Open",
      );
      writeReadout(readoutRefs.current, "latency", getLatencyLabel(snapshot));
      writeReadout(
        readoutRefs.current,
        "instruction",
        getInstruction(snapshot, status, error, gesturesEnabled),
      );
    };

    updateTrackingPreview();
    gsap.ticker.add(updateTrackingPreview);

    return () => {
      gsap.ticker.remove(updateTrackingPreview);
    };
  }, [error, gesturesEnabled, status, trackingRef]);

  return (
    <aside
      ref={previewRef}
      className={["tracking-preview", open && "tracking-preview--open"]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!open}
      data-tracking-tone="idle"
    >
      <div className="tracking-preview__stage">
        <video
          ref={videoRef}
          className="tracking-preview__video"
          muted
          playsInline
          tabIndex={-1}
          aria-hidden="true"
        />
        <span className="tracking-preview__projection-frame" aria-hidden="true">
          <span>projection frame</span>
        </span>
        <svg className="tracking-preview__svg" aria-hidden="true">
          {TRACKING_LINES.map((lineDefinition) => {
            const lineKey = getLineKey(lineDefinition);

            return (
              <line
                key={lineKey}
                ref={(node) => {
                  lineRefs.current[lineKey] = node;
                }}
                className={`tracking-preview__line tracking-preview__line--${lineKey}`}
              />
            );
          })}
        </svg>
        {TRACKING_MARKERS.map((markerKey) => (
          <span
            key={markerKey}
            ref={(node) => {
              markerRefs.current[markerKey] = node;
            }}
            className={`tracking-preview__marker tracking-preview__marker--${markerKey}`}
          />
        ))}
        <div className="tracking-preview__legend" aria-hidden="true">
          <span>
            <i className="tracking-preview__swatch tracking-preview__swatch--cursor" />
            cursor
          </span>
          <span>
            <i className="tracking-preview__swatch tracking-preview__swatch--palm" />
            palm
          </span>
          <span>
            <i className="tracking-preview__swatch tracking-preview__swatch--pinch" />
            pinch
          </span>
        </div>
      </div>

      <div className="tracking-preview__panel">
        <header className="tracking-preview__header">
          <span className="tracking-preview__eyebrow">Tracking debug</span>
          <strong ref={(node) => {
            readoutRefs.current.instruction = node;
          }}>
            Press C or V to inspect tracking.
          </strong>
          <span className="tracking-preview__shortcut">C / V</span>
        </header>

        <div className="tracking-preview__grid" aria-hidden="true">
          <span className="tracking-preview__stat">
            <span>Camera</span>
            <strong ref={(node) => {
              readoutRefs.current.camera = node;
            }}>
              Camera idle
            </strong>
          </span>
          <span className="tracking-preview__stat">
            <span>Quality</span>
            <strong ref={(node) => {
              readoutRefs.current.quality = node;
            }}>
              No tracking
            </strong>
          </span>
          <span className="tracking-preview__stat">
            <span>Hand</span>
            <strong ref={(node) => {
              readoutRefs.current.hand = node;
            }}>
              Not seen
            </strong>
          </span>
          <span className="tracking-preview__stat">
            <span>Pose</span>
            <strong ref={(node) => {
              readoutRefs.current.pose = node;
            }}>
              Unclear
            </strong>
          </span>
          <span className="tracking-preview__stat">
            <span>Projection</span>
            <strong ref={(node) => {
              readoutRefs.current.projection = node;
            }}>
              Waiting
            </strong>
          </span>
          <span className="tracking-preview__stat">
            <span>Pinch</span>
            <strong ref={(node) => {
              readoutRefs.current.pinch = node;
            }}>
              Open
            </strong>
          </span>
          <span className="tracking-preview__stat">
            <span>Frame</span>
            <strong ref={(node) => {
              readoutRefs.current.latency = node;
            }}>
              -- ms
            </strong>
          </span>
        </div>

        <div className="tracking-preview__hints" aria-hidden="true">
          <span>Open hand: wake / browse</span>
          <span>Pinch or fist: flip drink</span>
          <span>Swipe inward: add to Tray</span>
        </div>
      </div>
    </aside>
  );
}
