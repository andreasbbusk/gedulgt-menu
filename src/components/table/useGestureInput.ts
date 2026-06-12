import { useEffect, useRef, type RefObject } from "react";
import { projectPointToTable } from "../../config/tableCalibration";
import type {
  GedulgtTableStore,
  TableSide,
} from "../../store/gedulgtTableStore";
import type {
  HandPose,
  HandTrackingSnapshot,
  ScreenPoint,
} from "../../hooks/useHandTracking";
import {
  getInwardSign,
  getRotation,
  getSide,
} from "./utils";

const GESTURE_ACTION_COOLDOWN_MS = 620;
const GESTURE_ADD_COOLDOWN_MS = 1000;
const GESTURE_FLIP_PINCH_MAX_DISTANCE = 0.032;
const GESTURE_MOTION_MAX_MS = 1250;
const GESTURE_AXIS_LOCK_DISTANCE = 40;
const GESTURE_HORIZONTAL_LOCK_DOMINANCE = 0.9;
const GESTURE_INWARD_LOCK_DOMINANCE = 1.2;
const GESTURE_HORIZONTAL_SWIPE = 96;
const GESTURE_HORIZONTAL_AXIS_DOMINANCE = 1.35;
const GESTURE_INWARD_SWIPE = 100;
const GESTURE_INWARD_AXIS_DOMINANCE = 1.7;
const GESTURE_INWARD_HORIZONTAL_CAP = 80;

type MotionAxis = "horizontal" | "inward" | "undecided";

type GestureTarget =
  | {
      type: "drink";
      drinkId: string;
      focused: boolean;
      side: TableSide;
    }
  | null;

type MotionStart = {
  point: ScreenPoint;
  side: TableSide;
  startedAt: number;
  target: GestureTarget;
  focusedAnchorPoint: ScreenPoint | null;
  focusedTarget: GestureTarget;
  lockedAxis: MotionAxis;
  maxAbsoluteX: number;
};

type GestureInputState = {
  activatedForCurrentHand: boolean;
  cooldownUntil: number;
  motionStart: MotionStart | null;
  pinchReachedFlipDepth: boolean;
  pinchTarget: GestureTarget;
  previousPose: HandPose;
  wasPinching: boolean;
};

type UseGestureInputOptions = {
  enabled: boolean;
  tableRef: RefObject<HTMLElement | null>;
  trackingRef: {
    current: HandTrackingSnapshot;
  };
  activeSide: TableSide;
  phase: GedulgtTableStore["phase"];
  focusedDrinkId: string;
  activate: GedulgtTableStore["activate"];
  addFocusedToTray: GedulgtTableStore["addFocusedToTray"];
  rotateWheel: GedulgtTableStore["rotateWheel"];
  toggleCardFace: GedulgtTableStore["toggleCardFace"];
};

function createGestureInputState(): GestureInputState {
  return {
    activatedForCurrentHand: false,
    cooldownUntil: 0,
    motionStart: null,
    pinchReachedFlipDepth: false,
    pinchTarget: null,
    previousPose: "unknown",
    wasPinching: false,
  };
}

function getProjectedPoint(point: ScreenPoint | null) {
  if (!point) {
    return null;
  }

  return projectPointToTable(point) ?? point;
}

function getPinchCenter(snapshot: HandTrackingSnapshot) {
  if (!snapshot.thumbTip || !snapshot.indexFingerTip) {
    return null;
  }

  return getProjectedPoint({
    x: (snapshot.thumbTip.x + snapshot.indexFingerTip.x) / 2,
    y: (snapshot.thumbTip.y + snapshot.indexFingerTip.y) / 2,
  });
}

function getGesturePoint(snapshot: HandTrackingSnapshot) {
  const pinchCenter = snapshot.isPinching ? getPinchCenter(snapshot) : null;

  return (
    pinchCenter ??
    snapshot.projectedCursor ??
    getProjectedPoint(snapshot.indexFingerTip) ??
    getProjectedPoint(snapshot.palmCenter) ??
    getProjectedPoint(snapshot.gesturePoint)
  );
}

function isTableSide(value: string | undefined): value is TableSide {
  return value === "near" || value === "far";
}

function getTargetFromElement(element: Element | null): GestureTarget {
  const card = element?.closest<HTMLElement>("[data-drink-id][data-table-side]");
  const side = card?.dataset.tableSide;
  const drinkId = card?.dataset.drinkId;

  if (!card || !drinkId || !isTableSide(side)) {
    return null;
  }

  return {
    type: "drink",
    drinkId,
    focused: card.dataset.focusedCard === "true",
    side,
  };
}

function getDistanceToRect(point: ScreenPoint, rect: DOMRect) {
  const deltaX = Math.max(rect.left - point.x, 0, point.x - rect.right);
  const deltaY = Math.max(rect.top - point.y, 0, point.y - rect.bottom);

  return Math.hypot(deltaX, deltaY);
}

function getTargetSlop(focused: boolean) {
  const viewportMin = Math.min(window.innerWidth, window.innerHeight);

  return Math.max(
    focused ? 132 : 76,
    Math.min(focused ? 220 : 136, viewportMin * (focused ? 0.16 : 0.1)),
  );
}

function canUseCardAsGestureTarget(card: HTMLElement) {
  const rect = card.getBoundingClientRect();
  const slot = card.closest<HTMLElement>("[data-wheel-slot]");

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    getComputedStyle(card).visibility !== "hidden" &&
    (!slot || getComputedStyle(slot).pointerEvents !== "none")
  );
}

function getNearestGestureTarget(
  point: ScreenPoint,
  focusedDrinkId: string,
): GestureTarget {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>("[data-drink-id][data-table-side]"),
  );
  let nearest:
    | {
        target: NonNullable<GestureTarget>;
        score: number;
      }
    | null = null;

  for (const card of cards) {
    if (!canUseCardAsGestureTarget(card)) {
      continue;
    }

    const target = getTargetFromElement(card);

    if (!target) {
      continue;
    }

    const focused = target.focused || target.drinkId === focusedDrinkId;
    const distance = getDistanceToRect(point, card.getBoundingClientRect());

    if (distance > getTargetSlop(focused)) {
      continue;
    }

    const score = distance - (focused ? 46 : 0);

    if (!nearest || score < nearest.score) {
      nearest = { target, score };
    }
  }

  return nearest?.target ?? null;
}

function getGestureTarget(
  point: ScreenPoint,
  focusedDrinkId: string,
): GestureTarget {
  const directTarget = getTargetFromElement(
    document.elementFromPoint(point.x, point.y),
  );

  return directTarget ?? getNearestGestureTarget(point, focusedDrinkId);
}

function getFocusedGestureTarget(
  focusedDrinkId: string,
  side: TableSide,
): GestureTarget {
  if (!focusedDrinkId) {
    return null;
  }

  return {
    type: "drink",
    drinkId: focusedDrinkId,
    focused: true,
    side,
  };
}

function isMotionPose(pose: HandPose) {
  return pose === "open" || pose === "unknown";
}

function isDeepFlipPinch(snapshot: HandTrackingSnapshot) {
  return (
    snapshot.normalizedPinchDistance !== null &&
    snapshot.normalizedPinchDistance <= GESTURE_FLIP_PINCH_MAX_DISTANCE
  );
}

function createMotionStart(
  point: ScreenPoint,
  side: TableSide,
  startedAt: number,
  target: GestureTarget,
  focusedDrinkId: string,
  activeSide: TableSide,
  lockedAxis: MotionAxis = "undecided",
): MotionStart {
  const focusedTarget = getFocusedGestureTarget(focusedDrinkId, activeSide);

  return {
    point,
    side: focusedTarget?.side ?? target?.side ?? side,
    startedAt,
    target,
    focusedAnchorPoint: focusedTarget ? point : null,
    focusedTarget,
    lockedAxis,
    maxAbsoluteX: 0,
  };
}

function updateMotionTarget(
  motion: MotionStart,
  target: GestureTarget,
) {
  motion.target = target;
}

function resetInteraction(state: GestureInputState) {
  state.motionStart = null;
  state.pinchReachedFlipDepth = false;
  state.pinchTarget = null;
  state.wasPinching = false;
}

export function useGestureInput({
  enabled,
  tableRef,
  trackingRef,
  activeSide,
  phase,
  focusedDrinkId,
  activate,
  addFocusedToTray,
  rotateWheel,
  toggleCardFace,
}: UseGestureInputOptions) {
  const stateRef = useRef(createGestureInputState());

  useEffect(() => {
    resetInteraction(stateRef.current);
  }, [phase]);

  useEffect(() => {
    if (!enabled) {
      stateRef.current = createGestureInputState();
      return;
    }

    let animationFrameId = 0;

    const runGestureFrame = () => {
      const inputState = stateRef.current;
      const snapshot = trackingRef.current;
      const point = getGesturePoint(snapshot);
      const now = performance.now();
      const hasGesturePoint =
        snapshot.hasHand && point && snapshot.trackingQuality !== "none";

      if (!hasGesturePoint) {
        stateRef.current = createGestureInputState();
        animationFrameId = requestAnimationFrame(runGestureFrame);
        return;
      }

      const side = getSide(point.y, tableRef.current);

      if (snapshot.activeHandLocked || now < inputState.cooldownUntil) {
        resetInteraction(inputState);
        inputState.previousPose = snapshot.handPose;
        animationFrameId = requestAnimationFrame(runGestureFrame);
        return;
      }

      if (phase === "dormant") {
        if (
          !inputState.activatedForCurrentHand &&
          snapshot.trackingQuality === "stable" &&
          isMotionPose(snapshot.handPose)
        ) {
          activate(side, "gesture");
          inputState.activatedForCurrentHand = true;
          inputState.cooldownUntil = now + GESTURE_ACTION_COOLDOWN_MS;
        }

        resetInteraction(inputState);
        inputState.previousPose = snapshot.handPose;
        animationFrameId = requestAnimationFrame(runGestureFrame);
        return;
      }

      inputState.activatedForCurrentHand = false;

      if (phase === "orderConfirmation") {
        resetInteraction(inputState);
        inputState.previousPose = snapshot.handPose;
        animationFrameId = requestAnimationFrame(runGestureFrame);
        return;
      }

      if (snapshot.isPinching && !inputState.wasPinching) {
        inputState.pinchTarget = getFocusedGestureTarget(
          focusedDrinkId,
          activeSide,
        );
        inputState.pinchReachedFlipDepth = isDeepFlipPinch(snapshot);
      } else if (snapshot.isPinching && isDeepFlipPinch(snapshot)) {
        inputState.pinchReachedFlipDepth = true;
      }

      const releasedPinch = !snapshot.isPinching && inputState.wasPinching;

      if (releasedPinch) {
        const target = inputState.pinchTarget;

        if (target?.type === "drink" && inputState.pinchReachedFlipDepth) {
          toggleCardFace(target.side, "gesture");
          inputState.cooldownUntil = now + GESTURE_ACTION_COOLDOWN_MS;
          inputState.previousPose = snapshot.handPose;
          inputState.wasPinching = snapshot.isPinching;
          inputState.pinchReachedFlipDepth = false;
          inputState.pinchTarget = null;
          animationFrameId = requestAnimationFrame(runGestureFrame);
          return;
        }

        inputState.pinchReachedFlipDepth = false;
        inputState.pinchTarget = null;
      }

      if (!snapshot.isPinching && isMotionPose(snapshot.handPose)) {
        const target = getGestureTarget(point, focusedDrinkId);

        if (!inputState.motionStart) {
          inputState.motionStart = createMotionStart(
            point,
            side,
            now,
            target,
            focusedDrinkId,
            activeSide,
          );
        } else {
          const motion = inputState.motionStart;
          updateMotionTarget(motion, target);

          const deltaX = point.x - motion.point.x;
          const deltaY = point.y - motion.point.y;
          const absoluteX = Math.abs(deltaX);
          const absoluteY = Math.abs(deltaY);
          motion.maxAbsoluteX = Math.max(motion.maxAbsoluteX, absoluteX);

          if (
            motion.lockedAxis === "undecided" &&
            Math.max(absoluteX, absoluteY) > GESTURE_AXIS_LOCK_DISTANCE
          ) {
            if (absoluteX >= absoluteY * GESTURE_HORIZONTAL_LOCK_DOMINANCE) {
              motion.lockedAxis = "horizontal";
            } else if (absoluteY > absoluteX * GESTURE_INWARD_LOCK_DOMINANCE) {
              motion.lockedAxis = "inward";
            }
          }

          const addDeltaX = motion.focusedAnchorPoint
            ? point.x - motion.focusedAnchorPoint.x
            : 0;
          const addDeltaY = motion.focusedAnchorPoint
            ? point.y - motion.focusedAnchorPoint.y
            : 0;
          const addAbsoluteX = Math.abs(addDeltaX);
          const addAbsoluteY = Math.abs(addDeltaY);
          const inward =
            motion.lockedAxis === "inward" &&
            motion.focusedTarget?.type === "drink" &&
            Math.sign(addDeltaY) === getInwardSign(motion.focusedTarget.side) &&
            addAbsoluteY >= GESTURE_INWARD_SWIPE &&
            addAbsoluteY > addAbsoluteX * GESTURE_INWARD_AXIS_DOMINANCE &&
            motion.maxAbsoluteX < GESTURE_INWARD_HORIZONTAL_CAP;
          const horizontal =
            motion.lockedAxis === "horizontal" &&
            absoluteX >= GESTURE_HORIZONTAL_SWIPE &&
            absoluteX > absoluteY * GESTURE_HORIZONTAL_AXIS_DOMINANCE;

          if (inward && motion.focusedTarget) {
            addFocusedToTray(motion.focusedTarget.side, "gesture");
            inputState.motionStart = null;
            inputState.cooldownUntil = now + GESTURE_ADD_COOLDOWN_MS;
          } else if (horizontal) {
            rotateWheel(getRotation(deltaX), motion.side, "gesture");
            inputState.motionStart = null;
            inputState.cooldownUntil = now + GESTURE_ACTION_COOLDOWN_MS;
          } else if (now - motion.startedAt > GESTURE_MOTION_MAX_MS) {
            inputState.motionStart = createMotionStart(
              point,
              side,
              now,
              target,
              focusedDrinkId,
              activeSide,
              motion.lockedAxis,
            );
          }
        }
      } else if (!snapshot.isPinching) {
        inputState.motionStart = null;
      }

      inputState.wasPinching = snapshot.isPinching;
      inputState.previousPose = snapshot.handPose;
      animationFrameId = requestAnimationFrame(runGestureFrame);
    };

    runGestureFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    activate,
    activeSide,
    addFocusedToTray,
    enabled,
    focusedDrinkId,
    phase,
    rotateWheel,
    tableRef,
    toggleCardFace,
    trackingRef,
  ]);
}
