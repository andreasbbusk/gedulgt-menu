import { useCallback, useRef } from "react";
import { useHandTracking } from "./useHandTracking";
import {
  createEngineState,
  defaultConfig,
  updateEngine,
} from "./gestureEngine";
import type { EngineInput, EngineState } from "./gestureEngine";
import { useGedulgtTableStore } from "../store/gedulgtTableStore";
import type { TrackingFrame } from "./useHandTracking";

export function useGestureEngine({
  enabled = true,
  mirrorX = true,
}: {
  enabled?: boolean;
  mirrorX?: boolean;
} = {}) {
  const engineState = useRef<EngineState>(createEngineState());
  const rotateWheel = useGedulgtTableStore((s) => s.rotateWheel);
  const toggleCardFace = useGedulgtTableStore((s) => s.toggleCardFace);
  const addFocusedToTray = useGedulgtTableStore((s) => s.addFocusedToTray);
  const decrementTrayItem = useGedulgtTableStore((s) => s.decrementTrayItem);
  const focusedDrinkId = useGedulgtTableStore((s) => s.focusedDrinkId);
  const phase = useGedulgtTableStore((s) => s.phase);
  const activate = useGedulgtTableStore((s) => s.activate);
  const deactivate = useGedulgtTableStore((s) => s.deactivate);

  const handleFrame = useCallback(
    (frame: TrackingFrame) => {
      if (!frame.projectedPoint) {
        engineState.current = createEngineState();
        return;
      }

      const config = defaultConfig(window.innerWidth, window.innerHeight);
      const { state, event } = updateEngine(
        engineState.current,
        {
          pose: frame.pose,
          point: frame.projectedPoint,
          hasHand: frame.hasHand,
          hands: frame.hands.map((h) =>
            h?.projectedPoint
              ? { pose: h.pose, point: h.projectedPoint }
              : null,
          ) as EngineInput["hands"],
          time: frame.time,
        },
        config,
      );

      engineState.current = state;

      if (!event) return;

      const now = Date.now();

      if (event.type === "DOUBLE_OPEN") {
        if (phase === "dormant" || phase === "onboardingIntro") {
          activate("near", now);
        } else if (
          phase === "onboarding" ||
          phase === "browseWheel" ||
          phase === "trayFeedback"
        ) {
          deactivate("near", now);
        }
        return;
      }

      if (event.type === "SWIPE") {
        rotateWheel(
          event.direction === "left" ? "previous" : "next",
          "near",
          now,
        );
        return;
      }

      if (event.type === "FIST_TAP") {
        toggleCardFace("near", now);
        return;
      }

      if (event.type === "SWIPE_UP") {
        addFocusedToTray("near", now);
        return;
      }

      if (event.type === "SWIPE_DOWN") {
        decrementTrayItem(focusedDrinkId, "near", now);
      }
    },
    [
      rotateWheel,
      toggleCardFace,
      addFocusedToTray,
      decrementTrayItem,
      focusedDrinkId,
      phase,
      activate,
      deactivate,
    ],
  );

  const { videoRef, status, error } = useHandTracking(handleFrame, {
    enabled,
    mirrorX,
  });

  return { videoRef, status, error };
}
