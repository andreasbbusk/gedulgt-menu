import { useCallback, useRef } from "react";
import { useHandTracking } from "./useHandTracking";
import { dispatchGestureEvent } from "./gestureActions";
import { createEngineState, defaultConfig, updateEngine } from "./gestureEngine";
import type { EngineState } from "./gestureEngine";
import { useGedulgtTableStore } from "../store/gedulgtTableStore";
import type { TrackingFrame } from "./useHandTracking";

export function useGestureEngine({
  enabled = true,
  mirrorX = true,
}: {
  enabled?: boolean;
  mirrorX?: boolean;
} = {}) {
  const engineState    = useRef<EngineState>(createEngineState());
  const rotateWheel    = useGedulgtTableStore((s) => s.rotateWheel);
  const toggleCardFace = useGedulgtTableStore((s) => s.toggleCardFace);
  const addFocusedToTray = useGedulgtTableStore((s) => s.addFocusedToTray);

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
          time: frame.time,
        },
        config,
      );

      engineState.current = state;

      if (!event) return;

      dispatchGestureEvent(
        event,
        { rotateWheel, toggleCardFace, addFocusedToTray },
        Date.now(),
      );
    },
    [rotateWheel, toggleCardFace, addFocusedToTray],
  );

  const { videoRef, status, error } = useHandTracking(handleFrame, {
    enabled,
    mirrorX,
  });

  return { videoRef, status, error };
}
