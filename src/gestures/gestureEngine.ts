export type GestureEvent =
  | { type: "SWIPE"; direction: "left" | "right" }
  | { type: "FIST_HOLD" }
  | { type: "SWIPE_UP" };

export type GesturePhase = "idle" | "tracking" | "cooldown";

type Pt = { x: number; y: number };

export type EngineInput = {
  pose: "open" | "fist" | "unknown";
  point: Pt;
  hasHand: boolean;
  time: number;
};

export type EngineConfig = {
  swipeMinPx: number;
  swipeMaxOffAxisPx: number;
  swipeMinVelocityPxMs: number;
  swipeUpMinPx: number;
  swipeUpMaxOffAxisPx: number;
  fistHoldMs: number;
  fistMoveTolerance: number;
  cooldownMs: number;
  returnGuardMs: number;
};

export type EngineState = {
  phase: GesturePhase;
  pose: "open" | "fist" | "unknown";
  poseStart: number;
  swipeOrigin: Pt | null;
  cooldownUntil: number;
  lastSwipeDirection: "left" | "right" | null;
  returnGuardUntil: number;
};

export function defaultConfig(screenW: number, screenH: number): EngineConfig {
  return {
    swipeMinPx: screenW * 0.12,
    swipeMaxOffAxisPx: screenH * 0.18,
    swipeMinVelocityPxMs: 0.25,
    swipeUpMinPx: screenH * 0.14,
    swipeUpMaxOffAxisPx: screenW * 0.09,
    fistHoldMs: 500,
    fistMoveTolerance: screenW * 0.06,
    cooldownMs: 600,
    returnGuardMs: 1200,
  };
}

export function createEngineState(): EngineState {
  return {
    phase: "idle",
    pose: "unknown",
    poseStart: 0,
    swipeOrigin: null,
    cooldownUntil: 0,
    lastSwipeDirection: null,
    returnGuardUntil: 0,
  };
}

export function updateEngine(
  state: EngineState,
  input: EngineInput,
  config: EngineConfig,
): { state: EngineState; event: GestureEvent | null } {
  const fire = (event: GestureEvent) => ({
    state: {
      ...state,
      phase: "cooldown" as const,
      cooldownUntil: input.time + config.cooldownMs,
      swipeOrigin: null,
      lastSwipeDirection:
        event.type === "SWIPE" ? event.direction : state.lastSwipeDirection,
      returnGuardUntil:
        event.type === "SWIPE"
          ? input.time + config.returnGuardMs
          : state.returnGuardUntil,
    },
    event,
  });

  if (!input.hasHand) {
    return { state: createEngineState(), event: null };
  }

  if (input.time < state.cooldownUntil) {
    return { state: { ...state, phase: "cooldown" }, event: null };
  }

  const poseChanged = input.pose !== state.pose;
  const poseStart = poseChanged ? input.time : state.poseStart;
  const poseAge = input.time - poseStart;

  const next: EngineState = {
    ...state,
    phase: "tracking",
    pose: input.pose,
    poseStart,
  };

  if (input.pose === "fist") {
    const origin = poseChanged
      ? input.point
      : (state.swipeOrigin ?? input.point);
    const drift = Math.hypot(
      input.point.x - origin.x,
      input.point.y - origin.y,
    );

    if (drift > config.fistMoveTolerance) {
      return { state: { ...next, swipeOrigin: null }, event: null };
    }

    if (poseAge >= config.fistHoldMs) {
      return fire({ type: "FIST_HOLD" });
    }

    return { state: { ...next, swipeOrigin: origin }, event: null };
  }

  if (input.pose === "open") {
    if (poseChanged || !state.swipeOrigin) {
      return { state: { ...next, swipeOrigin: input.point }, event: null };
    }

    const origin = state.swipeOrigin;
    const dx = input.point.x - origin.x;
    const dy = input.point.y - origin.y; // negative = upward in screen coords
    const elapsed = Math.max(poseAge, 1);
    const velocityPxMs = Math.abs(dx) / elapsed;

    // Swipe up — checked first, stricter axis gate
    if (
      -dy >= config.swipeUpMinPx &&
      Math.abs(dx) <= config.swipeUpMaxOffAxisPx
    ) {
      return fire({ type: "SWIPE_UP" });
    }

    // Horizontal swipe
    const direction = dx < 0 ? "left" : "right";
    const isReturnStroke =
      state.lastSwipeDirection !== null &&
      direction !== state.lastSwipeDirection &&
      input.time < state.returnGuardUntil;

    if (
      Math.abs(dx) >= config.swipeMinPx &&
      Math.abs(dy) <= config.swipeMaxOffAxisPx &&
      velocityPxMs >= config.swipeMinVelocityPxMs &&
      !isReturnStroke
    ) {
      return fire({ type: "SWIPE", direction });
    }

    return { state: { ...next, swipeOrigin: origin }, event: null };
  }

  return { state: next, event: null };
}
