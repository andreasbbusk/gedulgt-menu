import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGestureCoreState,
  getGestureConfig,
  updateGestureCore,
  type GestureCoreEvent,
  type InteractionContext,
  type SwipeDirection,
} from "./gestureCore";
import type { HandTrackingSnapshot, ScreenPoint } from "./useHandTracking";

type UseGestureControllerOptions = {
  trackingRef: {
    current: HandTrackingSnapshot;
  };
  interactionContext: InteractionContext;
  fallbackTargetId?: string | null;
  onSelectTarget: (targetId: string) => void;
  onSwipe: (direction: SwipeDirection) => void;
};

export type GestureControllerSnapshot = GestureCoreEvent;
export type { SwipeDirection };

const INITIAL_GESTURE_EVENT: GestureControllerSnapshot = {
  hoverTarget: null,
  pressedTarget: null,
  selectedTarget: null,
  swipeDirection: null,
  gestureState: "show-hand",
  gestureText: "Show hand",
};

function getGestureTarget(point: ScreenPoint) {
  const element = document.elementFromPoint(point.x, point.y);
  const target = element?.closest<HTMLElement>("[data-gesture-target]");

  return target?.dataset.gestureTarget ?? null;
}

function getGestureMotionPoint(snapshot: HandTrackingSnapshot) {
  if (snapshot.handPose === "fist") {
    return (
      snapshot.gesturePoint ??
      snapshot.projectedCursor ??
      snapshot.indexFingerTip
    );
  }

  return (
    snapshot.indexFingerTip ??
    snapshot.gesturePoint ??
    snapshot.projectedCursor
  );
}

function hasGestureEventChanged(
  previousEvent: GestureControllerSnapshot,
  nextEvent: GestureControllerSnapshot,
) {
  return (
    previousEvent.hoverTarget !== nextEvent.hoverTarget ||
    previousEvent.pressedTarget !== nextEvent.pressedTarget ||
    previousEvent.selectedTarget !== nextEvent.selectedTarget ||
    previousEvent.swipeDirection !== nextEvent.swipeDirection ||
    previousEvent.gestureState !== nextEvent.gestureState ||
    previousEvent.gestureText !== nextEvent.gestureText
  );
}

export function useGestureController({
  trackingRef,
  interactionContext,
  fallbackTargetId = null,
  onSelectTarget,
  onSwipe,
}: UseGestureControllerOptions) {
  const coreStateRef = useRef(createGestureCoreState());
  const gestureEventRef = useRef(INITIAL_GESTURE_EVENT);
  const [gestureEvent, setGestureEvent] = useState(INITIAL_GESTURE_EVENT);

  const publishGestureEvent = useCallback((nextEvent: GestureCoreEvent) => {
    if (!hasGestureEventChanged(gestureEventRef.current, nextEvent)) {
      return;
    }

    gestureEventRef.current = nextEvent;
    setGestureEvent(nextEvent);
  }, []);

  useEffect(() => {
    let animationFrameId = 0;

    const detectGesture = () => {
      const snapshot = trackingRef.current;
      const point = getGestureMotionPoint(snapshot);
      const targetPoint = snapshot.projectedCursor ?? point;
      const targetId = targetPoint
        ? (getGestureTarget(targetPoint) ?? fallbackTargetId)
        : fallbackTargetId;
      const config = getGestureConfig(window.innerWidth, window.innerHeight);
      const next = updateGestureCore(
        coreStateRef.current,
        {
          hasHand: snapshot.hasHand,
          point,
          targetId,
          handPose: snapshot.handPose,
          insideProjection: Boolean(point),
          interactionContext,
          trackingQuality: snapshot.trackingQuality,
          time: snapshot.lastUpdated || performance.now(),
        },
        config,
      );

      coreStateRef.current = next.state;
      publishGestureEvent(next.event);

      if (next.event.selectedTarget) {
        onSelectTarget(next.event.selectedTarget);
      }

      if (next.event.swipeDirection) {
        onSwipe(next.event.swipeDirection);
      }

      animationFrameId = requestAnimationFrame(detectGesture);
    };

    detectGesture();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    fallbackTargetId,
    interactionContext,
    onSelectTarget,
    onSwipe,
    publishGestureEvent,
    trackingRef,
  ]);

  return gestureEvent;
}
