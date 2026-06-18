import type {
  OnboardingStep,
  RotateDirection,
  TableSide,
} from "../../store/gedulgtTableStore";

export const POINTER_CLICK_SUPPRESS_DISTANCE = 14;
export const POINTER_CLICK_SUPPRESS_MS = 360;
export const POINTER_HORIZONTAL_SWIPE = 68;
export const POINTER_INWARD_SWIPE = 76;
export const FEEDBACK_SETTLE_MS = 950;

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function getSide(
  clientY: number,
  element: HTMLElement | null,
): TableSide {
  if (!element) {
    return clientY >= window.innerHeight / 2 ? "near" : "far";
  }

  const rect = element.getBoundingClientRect();

  return clientY >= rect.top + rect.height / 2 ? "near" : "far";
}

export function isIgnoredTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "[data-tray-token], [data-tray-confirm], [data-reset-order]",
    ),
  );
}

export function getGuideCopy(step: OnboardingStep) {
  if (step === "browse") {
    return "Swipe to browse";
  }

  if (step === "reveal") {
    return "Tap to reveal";
  }

  return "Drag to tray";
}

export function getInwardSign(side: TableSide) {
  return side === "near" ? -1 : 1;
}

export function getRotation(deltaX: number): RotateDirection {
  return deltaX < 0 ? "next" : "previous";
}
