import type { GedulgtTableStore } from "../store/gedulgtTableStore";
import type { GestureEvent } from "./gestureEngine";

type GestureActions = Pick<
  GedulgtTableStore,
  "addFocusedToTray" | "rotateWheel" | "toggleCardFace"
>;

export function dispatchGestureEvent(
  event: GestureEvent,
  actions: GestureActions,
  time = Date.now(),
) {
  if (event.type === "SWIPE") {
    actions.rotateWheel(
      event.direction === "left" ? "previous" : "next",
      "near",
      "gesture",
      time,
    );
  }

  if (event.type === "FIST_TAP") {
    actions.toggleCardFace("near", "gesture", time);
  }

  if (event.type === "SWIPE_UP") {
    actions.addFocusedToTray("near", "gesture", time);
  }
}
