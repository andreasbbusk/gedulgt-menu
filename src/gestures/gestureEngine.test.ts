import { describe, expect, it } from "vitest";
import {
  createEngineState,
  defaultConfig,
  updateEngine,
  type EngineConfig,
  type EngineInput,
  type EngineState,
} from "./gestureEngine";

const config: EngineConfig = {
  swipeMinPx: 100,
  swipeMaxOffAxisPx: 50,
  swipeMinVelocityPxMs: 0.25,
  swipeUpMinPx: 90,
  swipeUpMaxOffAxisPx: 20,
  fistTapMaxMs: 300,
  cooldownMs: 600,
  returnGuardMs: 1200,
};

function frame(
  pose: EngineInput["pose"],
  point: EngineInput["point"],
  time: number,
  hasHand = true,
): EngineInput {
  return { pose, point, hasHand, time };
}

function step(
  state: EngineState,
  input: EngineInput,
): ReturnType<typeof updateEngine> {
  return updateEngine(state, input, config);
}

describe("gestureEngine", () => {
  it("creates an idle empty state", () => {
    expect(createEngineState()).toEqual({
      phase: "idle",
      pose: "unknown",
      poseStart: 0,
      swipeOrigin: null,
      cooldownUntil: 0,
      lastSwipeDirection: null,
      returnGuardUntil: 0,
    });
  });

  it("scales default thresholds from the viewport", () => {
    expect(defaultConfig(1000, 800)).toEqual({
      swipeMinPx: 120,
      swipeMaxOffAxisPx: 144,
      swipeMinVelocityPxMs: 0.25,
      swipeUpMinPx: 112.00000000000001,
      swipeUpMaxOffAxisPx: 90,
      fistTapMaxMs: 300,
      cooldownMs: 600,
      returnGuardMs: 1200,
    });
  });

  it("fires a right horizontal swipe after an open-hand move passes distance, off-axis, and velocity gates", () => {
    let result = step(createEngineState(), frame("open", { x: 100, y: 100 }, 100));
    expect(result.event).toBeNull();
    expect(result.state.swipeOrigin).toEqual({ x: 100, y: 100 });

    result = step(result.state, frame("open", { x: 230, y: 112 }, 300));

    expect(result.event).toEqual({ type: "SWIPE", direction: "right" });
    expect(result.state.phase).toBe("cooldown");
    expect(result.state.cooldownUntil).toBe(900);
    expect(result.state.swipeOrigin).toBeNull();
  });

  it("fires a left horizontal swipe", () => {
    let result = step(createEngineState(), frame("open", { x: 300, y: 100 }, 100));
    result = step(result.state, frame("open", { x: 185, y: 95 }, 300));

    expect(result.event).toEqual({ type: "SWIPE", direction: "left" });
  });

  it("does not fire a horizontal swipe when velocity is too low", () => {
    let result = step(createEngineState(), frame("open", { x: 100, y: 100 }, 0));
    result = step(result.state, frame("open", { x: 230, y: 100 }, 1_000));

    expect(result.event).toBeNull();
    expect(result.state.phase).toBe("tracking");
  });

  it("does not fire a horizontal swipe when off-axis movement is too large", () => {
    let result = step(createEngineState(), frame("open", { x: 100, y: 100 }, 0));
    result = step(result.state, frame("open", { x: 230, y: 170 }, 300));

    expect(result.event).toBeNull();
  });

  it("checks swipe up before horizontal swipes with a stricter off-axis gate", () => {
    let result = step(createEngineState(), frame("open", { x: 100, y: 300 }, 0));
    result = step(result.state, frame("open", { x: 115, y: 205 }, 300));

    expect(result.event).toEqual({ type: "SWIPE_UP" });
  });

  it("does not fire swipe up when horizontal drift exceeds the up-swipe gate", () => {
    let result = step(createEngineState(), frame("open", { x: 100, y: 300 }, 0));
    result = step(result.state, frame("open", { x: 125, y: 205 }, 300));

    expect(result.event).toBeNull();
  });

  it("suppresses events during cooldown", () => {
    let result = step(createEngineState(), frame("open", { x: 100, y: 100 }, 0));
    result = step(result.state, frame("open", { x: 230, y: 100 }, 300));
    expect(result.event).toEqual({ type: "SWIPE", direction: "right" });

    result = step(result.state, frame("open", { x: 400, y: 100 }, 500));

    expect(result.event).toBeNull();
    expect(result.state.phase).toBe("cooldown");
    expect(result.state.cooldownUntil).toBe(900);
  });

  it("resets completely when no hand is present", () => {
    let result = step(createEngineState(), frame("open", { x: 100, y: 100 }, 0));
    result = step(result.state, frame("open", { x: 230, y: 100 }, 300));

    result = step(result.state, frame("open", { x: 230, y: 100 }, 400, false));

    expect(result).toEqual({ state: createEngineState(), event: null });
  });

  it("fires a fist tap immediately when a fist is first detected", () => {
    const result = step(
      createEngineState(),
      frame("fist", { x: 100, y: 100 }, 1_000),
    );

    expect(result.event).toEqual({ type: "FIST_TAP" });
    expect(result.state.cooldownUntil).toBe(1_600);
  });

  it("does not fire a fist tap on subsequent fist frames", () => {
    const result = step(
      {
        ...createEngineState(),
        phase: "tracking",
        pose: "fist",
        poseStart: 1_000,
        swipeOrigin: { x: 100, y: 100 },
      },
      frame("fist", { x: 150, y: 100 }, 1_400),
    );

    expect(result.event).toBeNull();
    expect(result.state.swipeOrigin).toBeNull();
  });

  it("tracks unknown poses without firing a gesture", () => {
    const result = step(
      createEngineState(),
      frame("unknown", { x: 100, y: 100 }, 100),
    );

    expect(result.event).toBeNull();
    expect(result.state.phase).toBe("tracking");
    expect(result.state.pose).toBe("unknown");
  });
});
