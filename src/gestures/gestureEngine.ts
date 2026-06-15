export type GestureEvent =
  | { type: "SWIPE"; direction: "left" | "right" }
  | { type: "FIST_TAP" }
  | { type: "SWIPE_UP" }
  | { type: "SWIPE_DOWN" }
  | { type: "DOUBLE_OPEN" };

export type GesturePhase = "idle" | "tracking" | "cooldown";

type Pt = { x: number; y: number };
type EngineHand = { pose: "open" | "fist" | "unknown"; point: Pt } | null;

export type EngineInput = {
  pose: "open" | "fist" | "unknown";
  point: Pt;
  hasHand: boolean;
  hands: [EngineHand, EngineHand];
  time: number;
};

export type EngineConfig = {
  swipeMinPx: number;
  swipeMaxOffAxisPx: number;
  swipeMinVelocityPxMs: number;
  swipeUpMinPx: number;
  swipeUpMaxOffAxisPx: number;
  swipeUpMinVelocityPxMs: number;
  swipeDownMinPx: number;
  swipeDownMaxOffAxisPx: number;
  swipeDownMinVelocityPxMs: number;
  fistTapMaxMs: number; // fist must close and be detected within this window
  cooldownMs: number;
  returnGuardMs: number;
  doubleOpenDwellMs: number;
  doubleOpenMoveTolerance: number;
};

export type EngineState = {
  phase: GesturePhase;
  pose: "open" | "fist" | "unknown";
  poseStart: number;
  swipeOrigin: Pt | null;
  cooldownUntil: number;
  lastSwipeDirection: "left" | "right" | null;
  returnGuardUntil: number;
  doubleOpenSince: number;
  doubleOpenAnchor: [Pt | null, Pt | null];
};

export function defaultConfig(screenW: number, screenH: number): EngineConfig {
  return {
    swipeMinPx: screenW * 0.13,
    swipeMaxOffAxisPx: screenH * 0.18,
    swipeMinVelocityPxMs: 0.25,
    swipeUpMinPx: screenH * 0.14,
    swipeUpMaxOffAxisPx: screenW * 0.09,
    swipeUpMinVelocityPxMs: 0.05,
    swipeDownMinPx:           screenH * 0.14,
    swipeDownMaxOffAxisPx:    screenW * 0.09,
    swipeDownMinVelocityPxMs: 0.6,
    fistTapMaxMs: 300,
    cooldownMs: 600,
    returnGuardMs: 1200,
    doubleOpenDwellMs: 500,
    doubleOpenMoveTolerance: screenW * 0.03,
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
    doubleOpenSince: 0,
    doubleOpenAnchor: [null, null],
  };
}

export function updateEngine(
  state: EngineState,
  input: EngineInput,
  config: EngineConfig,
): { state: EngineState; event: GestureEvent | null } {
  if (!input.hasHand) {
    return { state: createEngineState(), event: null };
  }

  if (input.time < state.cooldownUntil) {
    return { state: { ...state, phase: "cooldown" }, event: null };
  }

  const bothOpen =
    input.hands[0]?.pose === "open" && input.hands[1]?.pose === "open";

  if (bothOpen) {
    const anchor0 = state.doubleOpenAnchor[0] ?? input.hands[0]?.point ?? null;
    const anchor1 = state.doubleOpenAnchor[1] ?? input.hands[1]?.point ?? null;

    const drift0 = anchor0 && input.hands[0]?.point
      ? Math.hypot(
          input.hands[0].point.x - anchor0.x,
          input.hands[0].point.y - anchor0.y,
        )
      : 0;
    const drift1 = anchor1 && input.hands[1]?.point
      ? Math.hypot(
          input.hands[1].point.x - anchor1.x,
          input.hands[1].point.y - anchor1.y,
        )
      : 0;

    const handsMoved =
      drift0 > config.doubleOpenMoveTolerance ||
      drift1 > config.doubleOpenMoveTolerance;

    if (handsMoved) {
      return {
        state: {
          ...state,
          doubleOpenSince: input.time,
          doubleOpenAnchor: [
            input.hands[0]?.point ?? null,
            input.hands[1]?.point ?? null,
          ],
        },
        event: null,
      };
    }

    const hasDoubleOpenAnchor =
      state.doubleOpenAnchor[0] !== null && state.doubleOpenAnchor[1] !== null;
    const doubleOpenSince = hasDoubleOpenAnchor
      ? state.doubleOpenSince
      : input.time;
    const dwellAge = input.time - doubleOpenSince;

    if (dwellAge >= config.doubleOpenDwellMs) {
      return {
        state: {
          ...createEngineState(),
          phase: "cooldown",
          cooldownUntil: input.time + config.cooldownMs,
        },
        event: { type: "DOUBLE_OPEN" },
      };
    }

    return {
      state: {
        ...state,
        doubleOpenSince,
        doubleOpenAnchor: [anchor0, anchor1],
      },
      event: null,
    };
  }

  const clearedState: EngineState = {
    ...state,
    doubleOpenSince: 0,
    doubleOpenAnchor: [null, null],
  };

  const fire = (event: GestureEvent) => ({
    state: {
      ...clearedState,
      phase: "cooldown" as const,
      cooldownUntil: input.time + config.cooldownMs,
      swipeOrigin: null,
      lastSwipeDirection:
        event.type === "SWIPE" ? event.direction : clearedState.lastSwipeDirection,
      returnGuardUntil:
        event.type === "SWIPE"
          ? input.time + config.returnGuardMs
          : clearedState.returnGuardUntil,
    },
    event,
  });

  const poseChanged = input.pose !== clearedState.pose;
  const poseStart = poseChanged ? input.time : clearedState.poseStart;
  const poseAge = input.time - poseStart;

  const next: EngineState = {
    ...clearedState,
    phase: "tracking",
    pose: input.pose,
    poseStart,
  };

  if (input.pose === "fist") {
    // Fire immediately on first frame the fist is detected, within the tap window
    if (poseChanged && poseAge <= config.fistTapMaxMs) {
      return fire({ type: "FIST_TAP" });
    }

    return { state: { ...next, swipeOrigin: null }, event: null };
  }

  if (input.pose === "open") {
    if (poseChanged || !clearedState.swipeOrigin) {
      return {
        state: { ...next, poseStart: input.time, swipeOrigin: input.point },
        event: null,
      };
    }

    const origin = clearedState.swipeOrigin;
    const dx = input.point.x - origin.x;
    const dy = input.point.y - origin.y; // negative = upward in screen coords
    const elapsed = Math.max(poseAge, 1);
    const velocityPxMs = Math.abs(dx) / elapsed;
    const velocityYPxMs = Math.abs(dy) / elapsed;

    // Swipe up — checked first, stricter axis gate
    if (
      -dy >= config.swipeUpMinPx &&
      Math.abs(dx) <= config.swipeUpMaxOffAxisPx &&
      velocityYPxMs >= config.swipeUpMinVelocityPxMs
    ) {
      return fire({ type: "SWIPE_UP" });
    }

    // Swipe down — mirrors swipe up, checks +dy
    if (
      dy >= config.swipeDownMinPx &&
      Math.abs(dx) <= config.swipeDownMaxOffAxisPx &&
      velocityYPxMs >= config.swipeDownMinVelocityPxMs
    ) {
      return fire({ type: "SWIPE_DOWN" });
    }

    // Horizontal swipe
    const direction = dx < 0 ? "left" : "right";
    const isReturnStroke =
      clearedState.lastSwipeDirection !== null &&
      direction !== clearedState.lastSwipeDirection &&
      input.time < clearedState.returnGuardUntil;

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
