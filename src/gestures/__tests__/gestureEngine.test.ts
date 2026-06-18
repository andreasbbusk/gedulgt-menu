import { describe, expect, it } from "vitest";
import {
  createEngineState,
  defaultConfig,
  updateEngine,
  type EngineConfig,
  type EngineInput,
  type EngineState,
} from "../gestureEngine";

const config: EngineConfig = {
  swipeMinPx: 100,
  repeatSwipeMinPx: 300,
  swipeMaxOffAxisPx: 50,
  swipeMinVelocityPxMs: 0.25,
  swipeUpMinPx: 90,
  swipeUpMaxOffAxisPx: 20,
  swipeUpMinVelocityPxMs: 0.25,
  swipeDownMinPx: 90,
  swipeDownMaxOffAxisPx: 20,
  swipeDownMinVelocityPxMs: 0.6,
  fistTapMaxMs: 300,
  cooldownMs: 600,
  returnGuardMs: 1200,
  doubleOpenDwellMs: 600,
  doubleOpenMoveTolerance: 10,
};

const initialState = {
  phase: "idle",
  pose: "unknown",
  poseStart: 0,
  swipeOrigin: null,
  cooldownUntil: 0,
  lastSwipeDirection: null,
  lastSwipePoint: null,
  returnGuardUntil: 0,
  doubleOpenSince: 0,
  doubleOpenAnchor: [null, null],
  requireVerticalPoseBreak: false,
  fistTapArmed: true,
} satisfies EngineState;

function frame(
  pose: EngineInput["pose"],
  point: EngineInput["point"],
  time: number,
  hasHand = true,
): EngineInput {
  return {
    pose,
    point,
    hasHand,
    hands: hasHand ? [{ pose, point }, null] : [null, null],
    time,
  };
}

function doubleOpenFrame(
  first: EngineInput["point"],
  second: EngineInput["point"],
  time: number,
  poses: [EngineInput["pose"], EngineInput["pose"]] = ["open", "open"],
): EngineInput {
  return {
    pose: poses[0],
    point: first,
    hasHand: true,
    hands: [
      { pose: poses[0], point: first },
      { pose: poses[1], point: second },
    ],
    time,
  };
}

function step(state: EngineState, input: EngineInput) {
  return updateEngine(state, input, config);
}

describe("createEngineState", () => {
  it("returns correct initial shape with all fields zeroed", () => {
    expect(createEngineState()).toEqual(initialState);
  });
});

describe("defaultConfig", () => {
  it("returns correct proportional values for given screen dimensions", () => {
    expect(defaultConfig(1000, 800)).toEqual({
      swipeMinPx: 130,
      repeatSwipeMinPx: 380,
      swipeMaxOffAxisPx: 144,
      swipeMinVelocityPxMs: 0.25,
      swipeUpMinPx: 112.00000000000001,
      swipeUpMaxOffAxisPx: 90,
      swipeUpMinVelocityPxMs: 0.05,
      swipeDownMinPx: 112.00000000000001,
      swipeDownMaxOffAxisPx: 90,
      swipeDownMinVelocityPxMs: 0.6,
      fistTapMaxMs: 300,
      cooldownMs: 600,
      returnGuardMs: 1200,
      doubleOpenDwellMs: 500,
      doubleOpenMoveTolerance: 30,
    });
  });
});

describe("updateEngine - no hand", () => {
  it("resets to initial state when hasHand is false", () => {
    const result = step(
      {
        ...createEngineState(),
        phase: "tracking",
        pose: "open",
        poseStart: 100,
        swipeOrigin: { x: 100, y: 100 },
        cooldownUntil: 900,
        lastSwipeDirection: "right",
        lastSwipePoint: { x: 230, y: 100 },
        returnGuardUntil: 1_500,
        doubleOpenSince: 100,
        doubleOpenAnchor: [
          { x: 100, y: 100 },
          { x: 300, y: 100 },
        ],
        requireVerticalPoseBreak: true,
      },
      frame("open", { x: 230, y: 100 }, 400, false),
    );

    expect(result).toEqual({ state: createEngineState(), event: null });
  });

  it("does not re-arm fist tap when hand leaves frame", () => {
    const result = step(
      {
        ...createEngineState(),
        phase: "cooldown",
        cooldownUntil: 900,
        pose: "fist",
        fistTapArmed: false,
      },
      frame("fist", { x: 100, y: 100 }, 400, false),
    );

    expect(result).toEqual({
      state: { ...createEngineState(), fistTapArmed: false },
      event: null,
    });
  });
});

describe("updateEngine - cooldown", () => {
  it("returns cooldown state and null event when within cooldownUntil", () => {
    const result = step(
      {
        ...createEngineState(),
        phase: "cooldown",
        cooldownUntil: 900,
        swipeOrigin: { x: 100, y: 100 },
      },
      frame("open", { x: 260, y: 100 }, 500),
    );

    expect(result.event).toBeNull();
    expect(result.state.phase).toBe("cooldown");
    expect(result.state.cooldownUntil).toBe(900);
    expect(result.state.swipeOrigin).toEqual({ x: 100, y: 100 });
  });

  it("resumes tracking after cooldownUntil has passed", () => {
    const result = step(
      {
        ...createEngineState(),
        phase: "cooldown",
        cooldownUntil: 900,
      },
      frame("open", { x: 260, y: 100 }, 900),
    );

    expect(result.event).toBeNull();
    expect(result.state.phase).toBe("tracking");
    expect(result.state.swipeOrigin).toEqual({ x: 260, y: 100 });
  });
});

describe("updateEngine - FIST_TAP", () => {
  it("fires FIST_TAP on first frame fist is detected while armed", () => {
    const result = step(
      createEngineState(),
      frame("fist", { x: 100, y: 100 }, 100),
    );

    expect(result.event).toEqual({ type: "FIST_TAP" });
    expect(result.state.phase).toBe("cooldown");
    expect(result.state.pose).toBe("fist");
    expect(result.state.poseStart).toBe(100);
    expect(result.state.fistTapArmed).toBe(false);
    expect(result.state.swipeOrigin).toBeNull();
  });

  it("does not fire if fist tap is disarmed", () => {
    const result = step(
      {
        ...createEngineState(),
        phase: "tracking",
        pose: "fist",
        poseStart: 100,
        swipeOrigin: { x: 100, y: 100 },
        fistTapArmed: false,
      },
      frame("fist", { x: 110, y: 100 }, 150),
    );

    expect(result.event).toBeNull();
    expect(result.state.swipeOrigin).toBeNull();
    expect(result.state.fistTapArmed).toBe(false);
  });

  it("does not fire repeatedly while fist remains closed across cooldown", () => {
    let result = step(
      createEngineState(),
      frame("fist", { x: 100, y: 100 }, 100),
    );
    expect(result.event).toEqual({ type: "FIST_TAP" });
    expect(result.state.fistTapArmed).toBe(false);

    result = step(result.state, frame("fist", { x: 100, y: 100 }, 700));
    expect(result.event).toBeNull();
    expect(result.state.phase).toBe("tracking");
    expect(result.state.fistTapArmed).toBe(false);

    result = step(result.state, frame("fist", { x: 100, y: 100 }, 900));
    expect(result.event).toBeNull();
    expect(result.state.fistTapArmed).toBe(false);
  });

  it("re-arms on open hand and fires again on the next fist close", () => {
    let result = step(
      createEngineState(),
      frame("fist", { x: 100, y: 100 }, 100),
    );
    expect(result.event).toEqual({ type: "FIST_TAP" });

    result = step(result.state, frame("open", { x: 100, y: 100 }, 700));
    expect(result.event).toBeNull();
    expect(result.state.fistTapArmed).toBe(true);

    result = step(result.state, frame("fist", { x: 100, y: 100 }, 800));
    expect(result.event).toEqual({ type: "FIST_TAP" });
    expect(result.state.fistTapArmed).toBe(false);
  });

  it("does not re-arm on unknown pose", () => {
    let result = step(
      createEngineState(),
      frame("fist", { x: 100, y: 100 }, 100),
    );
    expect(result.event).toEqual({ type: "FIST_TAP" });

    result = step(result.state, frame("unknown", { x: 100, y: 100 }, 700));
    expect(result.event).toBeNull();
    expect(result.state.fistTapArmed).toBe(false);

    result = step(result.state, frame("fist", { x: 100, y: 100 }, 800));

    expect(result.event).toBeNull();
    expect(result.state.phase).toBe("tracking");
    expect(result.state.fistTapArmed).toBe(false);
  });

  it("re-arms on open hand during cooldown", () => {
    let result = step(
      createEngineState(),
      frame("fist", { x: 100, y: 100 }, 100),
    );
    expect(result.event).toEqual({ type: "FIST_TAP" });

    result = step(result.state, frame("open", { x: 100, y: 100 }, 300));

    expect(result.event).toBeNull();
    expect(result.state.phase).toBe("cooldown");
    expect(result.state.pose).toBe("open");
    expect(result.state.fistTapArmed).toBe(true);
  });

  it("does not re-arm when the hand leaves frame after a fist tap", () => {
    let result = step(
      createEngineState(),
      frame("fist", { x: 100, y: 100 }, 100),
    );
    expect(result.event).toEqual({ type: "FIST_TAP" });

    result = step(result.state, frame("fist", { x: 100, y: 100 }, 250, false));

    expect(result.event).toBeNull();
    expect(result.state.fistTapArmed).toBe(false);
  });

  it("enters cooldown after firing", () => {
    const result = step(
      createEngineState(),
      frame("fist", { x: 100, y: 100 }, 100),
    );

    expect(result.state.cooldownUntil).toBe(700);
  });
});

describe("updateEngine - SWIPE left/right", () => {
  it("sets swipeOrigin on first open-hand frame", () => {
    const result = step(
      createEngineState(),
      frame("open", { x: 100, y: 100 }, 100),
    );

    expect(result.event).toBeNull();
    expect(result.state.swipeOrigin).toEqual({ x: 100, y: 100 });
  });

  it("fires SWIPE right when dx exceeds swipeMinPx with sufficient velocity", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 100 }, 100),
    );
    result = step(result.state, frame("open", { x: 230, y: 112 }, 300));

    expect(result.event).toEqual({ type: "SWIPE", direction: "right" });
  });

  it("fires SWIPE left when -dx exceeds swipeMinPx with sufficient velocity", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 300, y: 100 }, 100),
    );
    result = step(result.state, frame("open", { x: 185, y: 95 }, 300));

    expect(result.event).toEqual({ type: "SWIPE", direction: "left" });
  });

  it("does not fire when dx is below swipeMinPx", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 100 }, 100),
    );
    result = step(result.state, frame("open", { x: 199, y: 100 }, 300));

    expect(result.event).toBeNull();
  });

  it("does not fire when dy exceeds swipeMaxOffAxisPx", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 100 }, 100),
    );
    result = step(result.state, frame("open", { x: 230, y: 151 }, 300));

    expect(result.event).toBeNull();
  });

  it("does not fire when velocity is below swipeMinVelocityPxMs", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 100 }, 0),
    );
    result = step(result.state, frame("open", { x: 230, y: 100 }, 1_000));

    expect(result.event).toBeNull();
  });

  it("does not fire opposite direction within returnGuardUntil", () => {
    const state = {
      ...createEngineState(),
      phase: "tracking",
      pose: "open",
      poseStart: 100,
      swipeOrigin: { x: 250, y: 100 },
      lastSwipeDirection: "right",
      returnGuardUntil: 1_500,
    } satisfies EngineState;

    const result = step(state, frame("open", { x: 120, y: 100 }, 500));

    expect(result.event).toBeNull();
  });

  it("does fire same direction again within returnGuardUntil", () => {
    const state = {
      ...createEngineState(),
      phase: "tracking",
      pose: "open",
      poseStart: 100,
      swipeOrigin: { x: 100, y: 100 },
      lastSwipeDirection: "right",
      returnGuardUntil: 1_500,
    } satisfies EngineState;

    const result = step(state, frame("open", { x: 230, y: 100 }, 500));

    expect(result.event).toEqual({ type: "SWIPE", direction: "right" });
  });

  it("does not fire same direction again before repeatSwipeMinPx is reached", () => {
    const state = {
      ...createEngineState(),
      phase: "tracking",
      pose: "open",
      poseStart: 900,
      swipeOrigin: { x: 230, y: 100 },
      lastSwipeDirection: "right",
      lastSwipePoint: { x: 230, y: 100 },
      returnGuardUntil: 1_500,
    } satisfies EngineState;

    const result = step(state, frame("open", { x: 360, y: 100 }, 1_100));

    expect(result.event).toBeNull();
  });

  it("fires same direction again once repeatSwipeMinPx is reached", () => {
    const state = {
      ...createEngineState(),
      phase: "tracking",
      pose: "open",
      poseStart: 900,
      swipeOrigin: { x: 230, y: 100 },
      lastSwipeDirection: "right",
      lastSwipePoint: { x: 230, y: 100 },
      returnGuardUntil: 1_500,
    } satisfies EngineState;

    const result = step(state, frame("open", { x: 540, y: 100 }, 1_900));

    expect(result.event).toEqual({ type: "SWIPE", direction: "right" });
  });

  it("does fire opposite direction after returnGuardUntil has expired", () => {
    const state = {
      ...createEngineState(),
      phase: "tracking",
      pose: "open",
      poseStart: 1_100,
      swipeOrigin: { x: 250, y: 100 },
      lastSwipeDirection: "right",
      returnGuardUntil: 1_500,
    } satisfies EngineState;

    const result = step(state, frame("open", { x: 120, y: 100 }, 1_500));

    expect(result.event).toEqual({ type: "SWIPE", direction: "left" });
  });
});

describe("updateEngine - SWIPE_UP", () => {
  it("fires SWIPE_UP when -dy exceeds swipeUpMinPx with sufficient velocity", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 300 }, 100),
    );
    result = step(result.state, frame("open", { x: 112, y: 205 }, 300));

    expect(result.event).toEqual({ type: "SWIPE_UP" });
  });

  it("requires a pose break before a following SWIPE_DOWN can arm", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 300 }, 100),
    );
    result = step(result.state, frame("open", { x: 112, y: 205 }, 300));

    expect(result.event).toEqual({ type: "SWIPE_UP" });
    expect(result.state.requireVerticalPoseBreak).toBe(true);
  });

  it("allows another SWIPE_UP while the vertical pose break is required", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 400 }, 100),
    );
    result = step(result.state, frame("open", { x: 112, y: 305 }, 300));
    expect(result.event).toEqual({ type: "SWIPE_UP" });

    result = step(result.state, frame("open", { x: 112, y: 305 }, 900));
    result = step(result.state, frame("open", { x: 112, y: 210 }, 1_000));

    expect(result.event).toEqual({ type: "SWIPE_UP" });
  });

  it("does not fire when dx exceeds swipeUpMaxOffAxisPx", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 300 }, 100),
    );
    result = step(result.state, frame("open", { x: 121, y: 205 }, 300));

    expect(result.event).toBeNull();
  });

  it("does not fire when velocity is below swipeUpMinVelocityPxMs", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 300 }, 0),
    );
    result = step(result.state, frame("open", { x: 100, y: 205 }, 1_000));

    expect(result.event).toBeNull();
  });

  it("checks SWIPE_UP before horizontal swipe", () => {
    const diagonalConfig = {
      ...config,
      swipeUpMaxOffAxisPx: 140,
    };
    let result = updateEngine(
      createEngineState(),
      frame("open", { x: 100, y: 300 }, 100),
      diagonalConfig,
    );
    result = updateEngine(
      result.state,
      frame("open", { x: 230, y: 205 }, 300),
      diagonalConfig,
    );

    expect(result.event).toEqual({ type: "SWIPE_UP" });
  });
});

describe("updateEngine - SWIPE_DOWN", () => {
  it("fires SWIPE_DOWN when dy exceeds swipeDownMinPx with sufficient velocity", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 200 }, 100),
    );
    result = step(result.state, frame("open", { x: 112, y: 330 }, 300));

    expect(result.event).toEqual({ type: "SWIPE_DOWN" });
  });

  it("does not fire when dx exceeds swipeDownMaxOffAxisPx", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 200 }, 100),
    );
    result = step(result.state, frame("open", { x: 121, y: 330 }, 300));

    expect(result.event).toBeNull();
  });

  it("does not fire when velocity is below swipeDownMinVelocityPxMs", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 200 }, 0),
    );
    result = step(result.state, frame("open", { x: 100, y: 330 }, 1_000));

    expect(result.event).toBeNull();
  });

  it("checks SWIPE_DOWN before horizontal swipe", () => {
    const diagonalConfig = {
      ...config,
      swipeDownMaxOffAxisPx: 140,
    };
    let result = updateEngine(
      createEngineState(),
      frame("open", { x: 100, y: 200 }, 100),
      diagonalConfig,
    );
    result = updateEngine(
      result.state,
      frame("open", { x: 230, y: 330 }, 300),
      diagonalConfig,
    );

    expect(result.event).toEqual({ type: "SWIPE_DOWN" });
  });

  it("blocks SWIPE_DOWN after SWIPE_UP while the hand stays open", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 300 }, 100),
    );
    result = step(result.state, frame("open", { x: 112, y: 205 }, 300));
    expect(result.event).toEqual({ type: "SWIPE_UP" });

    result = step(result.state, frame("open", { x: 112, y: 205 }, 900));
    result = step(result.state, frame("open", { x: 112, y: 335 }, 1_000));

    expect(result.event).toBeNull();
    expect(result.state.requireVerticalPoseBreak).toBe(true);
  });

  it("fires SWIPE_DOWN after SWIPE_UP once the pose leaves and re-enters open", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 300 }, 100),
    );
    result = step(result.state, frame("open", { x: 112, y: 205 }, 300));
    expect(result.event).toEqual({ type: "SWIPE_UP" });

    result = step(result.state, frame("unknown", { x: 112, y: 205 }, 900));
    expect(result.state.requireVerticalPoseBreak).toBe(false);

    result = step(result.state, frame("open", { x: 112, y: 205 }, 1_000));
    result = step(result.state, frame("open", { x: 112, y: 335 }, 1_100));

    expect(result.event).toEqual({ type: "SWIPE_DOWN" });
  });

  it("does not block horizontal swipes while the vertical pose break is required", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 300 }, 100),
    );
    result = step(result.state, frame("open", { x: 112, y: 205 }, 300));
    expect(result.event).toEqual({ type: "SWIPE_UP" });

    result = step(result.state, frame("open", { x: 112, y: 205 }, 900));
    result = step(result.state, frame("open", { x: 242, y: 205 }, 1_000));

    expect(result.event).toEqual({ type: "SWIPE", direction: "right" });
    expect(result.state.requireVerticalPoseBreak).toBe(true);
  });
});

describe("updateEngine - DOUBLE_OPEN", () => {
  it("does not fire on first frame both hands are open", () => {
    const result = step(
      createEngineState(),
      doubleOpenFrame({ x: 100, y: 100 }, { x: 300, y: 100 }, 100),
    );

    expect(result.event).toBeNull();
    expect(result.state.doubleOpenSince).toBe(100);
  });

  it("fires DOUBLE_OPEN after both hands held still for doubleOpenDwellMs", () => {
    let result = step(
      createEngineState(),
      doubleOpenFrame({ x: 100, y: 100 }, { x: 300, y: 100 }, 100),
    );
    result = step(
      result.state,
      doubleOpenFrame({ x: 104, y: 103 }, { x: 297, y: 102 }, 700),
    );

    expect(result.event).toEqual({ type: "DOUBLE_OPEN" });
  });

  it("resets dwell timer when hand 0 moves beyond doubleOpenMoveTolerance", () => {
    let result = step(
      createEngineState(),
      doubleOpenFrame({ x: 100, y: 100 }, { x: 300, y: 100 }, 100),
    );
    result = step(
      result.state,
      doubleOpenFrame({ x: 111, y: 100 }, { x: 300, y: 100 }, 300),
    );

    expect(result.event).toBeNull();
    expect(result.state.doubleOpenSince).toBe(300);
    expect(result.state.doubleOpenAnchor).toEqual([
      { x: 111, y: 100 },
      { x: 300, y: 100 },
    ]);
  });

  it("resets dwell timer when hand 1 moves beyond doubleOpenMoveTolerance", () => {
    let result = step(
      createEngineState(),
      doubleOpenFrame({ x: 100, y: 100 }, { x: 300, y: 100 }, 100),
    );
    result = step(
      result.state,
      doubleOpenFrame({ x: 100, y: 100 }, { x: 300, y: 111 }, 300),
    );

    expect(result.event).toBeNull();
    expect(result.state.doubleOpenSince).toBe(300);
    expect(result.state.doubleOpenAnchor).toEqual([
      { x: 100, y: 100 },
      { x: 300, y: 111 },
    ]);
  });

  it("does not fire if one hand is not open", () => {
    const result = step(
      createEngineState(),
      doubleOpenFrame({ x: 100, y: 100 }, { x: 300, y: 100 }, 1_000, [
        "open",
        "fist",
      ]),
    );

    expect(result.event).toBeNull();
    expect(result.state.doubleOpenSince).toBe(0);
  });

  it("does not fire if one hand leaves frame during dwell", () => {
    let result = step(
      createEngineState(),
      doubleOpenFrame({ x: 100, y: 100 }, { x: 300, y: 100 }, 100),
    );
    result = step(result.state, frame("open", { x: 100, y: 100 }, 700));

    expect(result.event).toBeNull();
  });

  it("enters cooldown and resets to initial state after firing", () => {
    let result = step(
      createEngineState(),
      doubleOpenFrame({ x: 100, y: 100 }, { x: 300, y: 100 }, 100),
    );
    result = step(
      result.state,
      doubleOpenFrame({ x: 100, y: 100 }, { x: 300, y: 100 }, 700),
    );

    expect(result.state).toEqual({
      ...createEngineState(),
      phase: "cooldown",
      cooldownUntil: 1_300,
    });
  });
});

describe("updateEngine - state threading", () => {
  it("lastSwipeDirection is set correctly after SWIPE fires", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 100 }, 100),
    );
    result = step(result.state, frame("open", { x: 230, y: 100 }, 300));

    expect(result.state.lastSwipeDirection).toBe("right");
  });

  it("lastSwipePoint is set correctly after SWIPE fires", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 100 }, 100),
    );
    result = step(result.state, frame("open", { x: 230, y: 100 }, 300));

    expect(result.state.lastSwipePoint).toEqual({ x: 230, y: 100 });
  });

  it("returnGuardUntil is set correctly after SWIPE fires", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 100 }, 100),
    );
    result = step(result.state, frame("open", { x: 230, y: 100 }, 300));

    expect(result.state.returnGuardUntil).toBe(1_500);
  });

  it("doubleOpenSince is cleared when hands are no longer both open", () => {
    let result = step(
      createEngineState(),
      doubleOpenFrame({ x: 100, y: 100 }, { x: 300, y: 100 }, 100),
    );
    result = step(result.state, frame("open", { x: 100, y: 100 }, 200));

    expect(result.state.doubleOpenSince).toBe(0);
  });

  it("doubleOpenAnchor is cleared when hands are no longer both open", () => {
    let result = step(
      createEngineState(),
      doubleOpenFrame({ x: 100, y: 100 }, { x: 300, y: 100 }, 100),
    );
    result = step(result.state, frame("open", { x: 100, y: 100 }, 200));

    expect(result.state.doubleOpenAnchor).toEqual([null, null]);
  });

  it("requireVerticalPoseBreak clears when the pose leaves open during cooldown", () => {
    const result = step(
      {
        ...createEngineState(),
        phase: "cooldown",
        cooldownUntil: 900,
        requireVerticalPoseBreak: true,
      },
      frame("unknown", { x: 100, y: 100 }, 500),
    );

    expect(result.event).toBeNull();
    expect(result.state.requireVerticalPoseBreak).toBe(false);
  });
});
