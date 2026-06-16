import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackingFrame } from "../useHandTracking";

const mocks = vi.hoisted(() => {
  const capturedFrameHandler = {
    current: undefined as ((frame: TrackingFrame) => void) | undefined,
  };
  const store = {
    rotateWheel: vi.fn(),
    navigateOnboarding: vi.fn(),
    addOnboardingCocktail: vi.fn(),
    removeOnboardingCocktail: vi.fn(),
    toggleCardFace: vi.fn(),
    addFocusedToTray: vi.fn(),
    decrementTrayItem: vi.fn(),
    focusedDrinkId: "test-drink",
    phase: "browseWheel",
    activate: vi.fn(),
    deactivate: vi.fn(),
  };

  return {
    capturedFrameHandler,
    store,
    useHandTracking: vi.fn((onFrame: (frame: TrackingFrame) => void) => {
      capturedFrameHandler.current = onFrame;

      return {
        videoRef: { current: null },
        status: "ready",
        error: null,
      };
    }),
  };
});

vi.mock("react", () => ({
  useCallback: (callback: unknown) => callback,
  useRef: (initial: unknown) => ({ current: initial }),
}));

vi.mock("../useHandTracking", () => ({
  useHandTracking: mocks.useHandTracking,
}));

vi.mock("../../store/gedulgtTableStore", () => ({
  useGedulgtTableStore: (selector: (state: typeof mocks.store) => unknown) =>
    selector(mocks.store),
}));

import { useGestureEngine } from "../useGestureEngine";

function openHandFrame(
  point: NonNullable<TrackingFrame["projectedPoint"]>,
  time: number,
): TrackingFrame {
  return {
    hasHand: true,
    pose: "open",
    projectedPoint: point,
    handCount: 1,
    hands: [{ pose: "open", projectedPoint: point }, null],
    time,
  };
}

describe("useGestureEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("window", { innerWidth: 1000, innerHeight: 1000 });
    mocks.capturedFrameHandler.current = undefined;
    mocks.store.focusedDrinkId = "test-drink";
    mocks.store.phase = "browseWheel";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("decrements the focused tray item when the engine emits SWIPE_DOWN", () => {
    vi.spyOn(Date, "now").mockReturnValue(12_349);

    useGestureEngine();

    const handleFrame = mocks.capturedFrameHandler.current;

    if (!handleFrame) {
      throw new Error("Expected useHandTracking to receive a frame handler");
    }

    handleFrame(openHandFrame({ x: 100, y: 200 }, 100));
    handleFrame(openHandFrame({ x: 100, y: 350 }, 300));

    expect(mocks.store.decrementTrayItem).toHaveBeenCalledWith(
      "test-drink",
      "near",
      12_349,
    );
    expect(mocks.store.addFocusedToTray).not.toHaveBeenCalled();
  });
});
