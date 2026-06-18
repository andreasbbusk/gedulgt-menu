import { describe, expect, it } from "vitest";
import {
  createEngineState,
  updateEngine,
  type EngineConfig,
  type EngineInput,
  type EngineState,
  type GestureEvent,
} from "../gestureEngine";

const config: EngineConfig = {
  swipeMinPx: 100,
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
): EngineInput {
  return {
    pose: "open",
    point: first,
    hasHand: true,
    hands: [
      { pose: "open", point: first },
      { pose: "open", point: second },
    ],
    time,
  };
}

function runSequence(inputs: EngineInput[]) {
  return inputs.reduce(
    (acc, input) => {
      const result = updateEngine(acc.state, input, config);
      return {
        state: result.state,
        events: [...acc.events, result.event],
      };
    },
    { state: createEngineState(), events: [] as (GestureEvent | null)[] },
  );
}

function step(state: EngineState, input: EngineInput) {
  return updateEngine(state, input, config);
}

describe("gestureEngine sequences", () => {
  it("swipe right, return stroke left within guard, guard expires, swipe left fires", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 100 }, 100),
    );
    result = step(result.state, frame("open", { x: 230, y: 100 }, 300));
    expect(result.event).toEqual({ type: "SWIPE", direction: "right" });

    result = step(result.state, frame("open", { x: 230, y: 100 }, 900));
    result = step(result.state, frame("open", { x: 230, y: 100 }, 901));
    result = step(result.state, frame("open", { x: 100, y: 100 }, 1_000));
    expect(result.event).toBeNull();

    result = step(result.state, frame("open", { x: -100, y: 100 }, 1_501));
    expect(result.event).toEqual({ type: "SWIPE", direction: "left" });
  });

  it("hand enters, open pose, swipe right fires, hand leaves, hand re-enters, swipe right fires again", () => {
    const result = runSequence([
      frame("open", { x: 100, y: 100 }, 100),
      frame("open", { x: 230, y: 100 }, 300),
      frame("open", { x: 230, y: 100 }, 400, false),
      frame("open", { x: 120, y: 100 }, 1_000),
      frame("open", { x: 250, y: 100 }, 1_200),
    ]);

    expect(result.events).toEqual([
      null,
      { type: "SWIPE", direction: "right" },
      null,
      null,
      { type: "SWIPE", direction: "right" },
    ]);
  });

  it("fist tap, cooldown, open hand, swipe fires", () => {
    const result = runSequence([
      frame("fist", { x: 100, y: 100 }, 100),
      frame("open", { x: 100, y: 100 }, 400),
      frame("open", { x: 100, y: 100 }, 700),
      frame("open", { x: 230, y: 100 }, 900),
    ]);

    expect(result.events).toEqual([
      { type: "FIST_TAP" },
      null,
      null,
      { type: "SWIPE", direction: "right" },
    ]);
  });

  it("both hands open, hand moves, dwell resets, hands settle again, DOUBLE_OPEN fires", () => {
    const result = runSequence([
      doubleOpenFrame({ x: 100, y: 100 }, { x: 300, y: 100 }, 100),
      doubleOpenFrame({ x: 112, y: 100 }, { x: 300, y: 100 }, 300),
      doubleOpenFrame({ x: 113, y: 100 }, { x: 300, y: 100 }, 800),
      doubleOpenFrame({ x: 113, y: 100 }, { x: 300, y: 100 }, 900),
    ]);

    expect(result.events).toEqual([null, null, null, { type: "DOUBLE_OPEN" }]);
  });

  it("does not fire a second same-direction swipe from one continuous open hand", () => {
    let result = step(
      createEngineState(),
      frame("open", { x: 100, y: 100 }, 100),
    );
    result = step(result.state, frame("open", { x: 230, y: 100 }, 300));
    expect(result.event).toEqual({ type: "SWIPE", direction: "right" });

    result = step(result.state, frame("open", { x: 230, y: 100 }, 900));
    result = step(result.state, frame("open", { x: 230, y: 100 }, 901));
    result = step(result.state, frame("open", { x: 360, y: 100 }, 1_100));
    expect(result.event).toBeNull();

    result = step(result.state, frame("open", { x: 360, y: 100 }, 1_700));
    result = step(result.state, frame("open", { x: 360, y: 100 }, 1_701));
    result = step(result.state, frame("open", { x: 540, y: 100 }, 1_900));
    expect(result.event).toBeNull();
  });
});
