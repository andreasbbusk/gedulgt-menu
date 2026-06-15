import { describe, expect, it, vi } from "vitest";
import { dispatchGestureEvent } from "./gestureActions";

function createActions() {
  return {
    addFocusedToTray: vi.fn(),
    rotateWheel: vi.fn(),
    toggleCardFace: vi.fn(),
  };
}

describe("dispatchGestureEvent", () => {
  it("maps swipe right to rotate next on the near side from gesture input", () => {
    const actions = createActions();

    dispatchGestureEvent(
      { type: "SWIPE", direction: "right" },
      actions,
      12_345,
    );

    expect(actions.rotateWheel).toHaveBeenCalledWith(
      "next",
      "near",
      "gesture",
      12_345,
    );
    expect(actions.toggleCardFace).not.toHaveBeenCalled();
    expect(actions.addFocusedToTray).not.toHaveBeenCalled();
  });

  it("maps swipe left to rotate previous on the near side from gesture input", () => {
    const actions = createActions();

    dispatchGestureEvent(
      { type: "SWIPE", direction: "left" },
      actions,
      12_346,
    );

    expect(actions.rotateWheel).toHaveBeenCalledWith(
      "previous",
      "near",
      "gesture",
      12_346,
    );
  });

  it("maps fist hold to card face toggle on the near side from gesture input", () => {
    const actions = createActions();

    dispatchGestureEvent({ type: "FIST_HOLD" }, actions, 12_347);

    expect(actions.toggleCardFace).toHaveBeenCalledWith(
      "near",
      "gesture",
      12_347,
    );
    expect(actions.rotateWheel).not.toHaveBeenCalled();
    expect(actions.addFocusedToTray).not.toHaveBeenCalled();
  });

  it("maps swipe up to add focused drink to tray on the near side from gesture input", () => {
    const actions = createActions();

    dispatchGestureEvent({ type: "SWIPE_UP" }, actions, 12_348);

    expect(actions.addFocusedToTray).toHaveBeenCalledWith(
      "near",
      "gesture",
      12_348,
    );
    expect(actions.rotateWheel).not.toHaveBeenCalled();
    expect(actions.toggleCardFace).not.toHaveBeenCalled();
  });
});
