import { useRef, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type {
  HandTrackingSnapshot,
  ScreenPoint,
} from "../hooks/useHandTracking";

gsap.registerPlugin(useGSAP);

const TRACKING_MARKERS = [
  "indexFingerTip",
  "thumbTip",
] as const;

const TRACKING_LINES = [["indexFingerTip", "thumbTip"]] as const;

type TrackingMarkerKey = (typeof TRACKING_MARKERS)[number];
type TrackingLineKey = `${(typeof TRACKING_LINES)[number][0]}-${(typeof TRACKING_LINES)[number][1]}`;

type TrackingPreviewProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  trackingRef: {
    current: HandTrackingSnapshot;
  };
  open: boolean;
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

export function TrackingPreview({
  videoRef,
  trackingRef,
  open,
}: TrackingPreviewProps) {
  const markerRefs = useRef<
    Partial<Record<TrackingMarkerKey, HTMLSpanElement | null>>
  >({});
  const lineRefs = useRef<Partial<Record<TrackingLineKey, SVGLineElement | null>>>(
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
    };

    gsap.ticker.add(updateTrackingPreview);

    return () => {
      gsap.ticker.remove(updateTrackingPreview);
    };
  }, [trackingRef]);

  return (
    <aside
      className={["tracking-preview", open && "tracking-preview--open"]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!open}
    >
      <video
        ref={videoRef}
        className="tracking-preview__video"
        muted
        playsInline
        tabIndex={-1}
        aria-hidden="true"
      />
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
    </aside>
  );
}
