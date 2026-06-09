import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { GestureState } from "../hooks/gestureCore";
import type { HandTrackingSnapshot } from "../hooks/useHandTracking";

gsap.registerPlugin(useGSAP);

type VirtualCursorProps = {
  trackingRef: {
    current: HandTrackingSnapshot;
  };
  isFistClosed: boolean;
  gestureState: GestureState;
};

export function VirtualCursor({
  trackingRef,
  isFistClosed,
  gestureState,
}: VirtualCursorProps) {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useGSAP(() => {
    const cursor = cursorRef.current;

    if (!cursor) {
      return;
    }

    gsap.set(cursor, {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      xPercent: -50,
      yPercent: -50,
      opacity: 0,
      scale: 1,
      transformOrigin: "50% 50%",
    });

    const xTo = gsap.quickTo(cursor, "x", {
      duration: 0.18,
      ease: "power3.out",
    });
    const yTo = gsap.quickTo(cursor, "y", {
      duration: 0.18,
      ease: "power3.out",
    });
    const opacityTo = gsap.quickTo(cursor, "opacity", {
      duration: 0.16,
      ease: "power2.out",
    });

    const updateCursor = () => {
      const { projectedCursor: point, hasHand } = trackingRef.current;

      if (!point || !hasHand) {
        opacityTo(0);
        return;
      }

      xTo(point.x);
      yTo(point.y);
      opacityTo(1);
    };

    gsap.ticker.add(updateCursor);

    return () => {
      gsap.ticker.remove(updateCursor);
      gsap.killTweensOf(cursor);
    };
  }, [trackingRef]);

  useGSAP(() => {
    const cursor = cursorRef.current;
    const ring = ringRef.current;

    if (!cursor || !ring) {
      return;
    }

    const outsideProjection = gestureState === "out-of-bounds";
    const pressing = isFistClosed || gestureState === "pressing";
    const swiping = gestureState === "swiping";

    gsap.to(cursor, {
      backgroundColor: pressing ? "#c79b5b" : "rgba(244, 234, 220, 0.84)",
      borderColor: pressing ? "#c79b5b" : "#f4eadc",
      boxShadow: pressing
        ? "0 0 0 9px rgba(199, 155, 91, 0.18)"
        : swiping
          ? "0 0 0 12px rgba(136, 184, 154, 0.13)"
          : "0 0 0 1px rgba(244, 234, 220, 0.16)",
      scale: pressing ? 0.72 : outsideProjection ? 0.82 : swiping ? 1.14 : 1,
      duration: 0.16,
      ease: "power3.out",
      overwrite: "auto",
    });

    gsap.to(ring, {
      borderColor: pressing
        ? "rgba(199, 155, 91, 0.46)"
        : swiping
          ? "rgba(136, 184, 154, 0.48)"
          : "rgba(244, 234, 220, 0.22)",
      opacity: outsideProjection ? 0.32 : 1,
      scale: pressing ? 0.58 : swiping ? 1.24 : 1,
      duration: 0.18,
      ease: "power3.out",
      overwrite: "auto",
    });
  }, [gestureState, isFistClosed]);

  return (
    <div ref={cursorRef} className="virtual-cursor" aria-hidden="true">
      <div ref={ringRef} className="virtual-cursor__ring" />
    </div>
  );
}
