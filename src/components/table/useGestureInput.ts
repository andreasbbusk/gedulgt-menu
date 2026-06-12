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
  POINTER_HORIZONTAL_SWIPE,
  getInwardSign,
  getRotation,
  getSide,
} from "./utils";

const GESTURE_ACTION_COOLDOWN_MS = 620;
const GESTURE_FIST_MIN_MS = 160;
const GESTURE_FIST_MAX_MS = 1900;
const GESTURE_FIST_MOVE_TOLERANCE = 148;
const GESTURE_MOTION_MAX_MS = 1250;
const GESTURE_INWARD_SWIPE = 74;
const GESTURE_INWARD_AXIS_DOMINANCE = 0.62;

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
};

type FistPress = {
  point: ScreenPoint;
  side: TableSide;
  startedAt: number;
  target: GestureTarget;
  lastTarget: GestureTarget;
};

type GestureInputState = {
  activatedForCurrentHand: boolean;
  cooldownUntil: number;
  fistPress: FistPress | null;
  motionStart: MotionStart | null;
  previousPose: HandPose;
  wasPressing: boolean;
};

type UseGestureInputOptions = {
  enabled: boolean;
  tableRef: RefObject<HTMLElement | null>;
  trackingRef: {
    current: HandTrackingSnapshot;
  };
  phase: GedulgtTableStore["phase"];
  focusedDrinkId: string;
  activate: GedulgtTableStore["activate"];
  addFocusedToTray: GedulgtTableStore["addFocusedToTray"];
  focusDrink: GedulgtTableStore["focusDrink"];
  rotateWheel: GedulgtTableStore["rotateWheel"];
  toggleCardFace: GedulgtTableStore["toggleCardFace"];
};

function createGestureInputState(): GestureInputState {
  return {
    activatedForCurrentHand: false,
    cooldownUntil: 0,
    fistPress: null,
    motionStart: null,
    previousPose: "unknown",
    wasPressing: false,
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

function getDistance(first: ScreenPoint, second: ScreenPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function isMotionPose(pose: HandPose) {
  return pose === "open" || pose === "unknown";
}

function isPressPose(snapshot: HandTrackingSnapshot) {
  return snapshot.handPose === "fist" || snapshot.isPinching;
}

function isFocusedGestureTarget(
  target: GestureTarget,
  focusedDrinkId: string,
): target is NonNullable<GestureTarget> {
  return (
    target?.type === "drink" &&
    (target.focused || target.drinkId === focusedDrinkId)
  );
}

function isSameGestureTarget(
  first: GestureTarget,
  second: GestureTarget,
) {
  return (
    first?.type === "drink" &&
    second?.type === "drink" &&
    first.drinkId === second.drinkId &&
    first.side === second.side
  );
}

function createMotionStart(
  point: ScreenPoint,
  side: TableSide,
  startedAt: number,
  target: GestureTarget,
  focusedDrinkId: string,
): MotionStart {
  const focusedTarget = isFocusedGestureTarget(target, focusedDrinkId)
    ? target
    : null;

  return {
    point,
    side: focusedTarget?.side ?? target?.side ?? side,
    startedAt,
    target,
    focusedAnchorPoint: focusedTarget ? point : null,
    focusedTarget,
  };
}

function updateMotionTarget(
  motion: MotionStart,
  point: ScreenPoint,
  target: GestureTarget,
  focusedDrinkId: string,
) {
  motion.target = target;

  if (!motion.focusedTarget && isFocusedGestureTarget(target, focusedDrinkId)) {
    motion.focusedAnchorPoint = point;
    motion.focusedTarget = target;
    motion.side = target.side;
  }
}

function resetInteraction(state: GestureInputState) {
  state.fistPress = null;
  state.motionStart = null;
  state.wasPressing = false;
}

export function useGestureInput({
  enabled,
  tableRef,
  trackingRef,
  phase,
  focusedDrinkId,
  activate,
  addFocusedToTray,
  focusDrink,
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

      const releasedFist =
        inputState.wasPressing && !isPressPose(snapshot);

      if (releasedFist && inputState.fistPress) {
        const press = inputState.fistPress;
        const target =
          press.lastTarget ??
          press.target ??
          getGestureTarget(point, focusedDrinkId);
        const pressDuration = now - press.startedAt;

        if (
          target?.type === "drink" &&
          pressDuration >= GESTURE_FIST_MIN_MS &&
          pressDuration <= GESTURE_FIST_MAX_MS
        ) {
          if (target.drinkId !== focusedDrinkId) {
            focusDrink(target.drinkId, target.side, "gesture");
          }

          toggleCardFace(target.side, "gesture");
          inputState.cooldownUntil = now + GESTURE_ACTION_COOLDOWN_MS;
        }
      }

      if (isPressPose(snapshot)) {
        const target = getGestureTarget(point, focusedDrinkId);

        if (!inputState.fistPress) {
          inputState.fistPress = {
            point,
            side: target?.side ?? side,
            startedAt: now,
            target,
            lastTarget: target,
          };
        } else if (target) {
          const activeTarget =
            inputState.fistPress.lastTarget ?? inputState.fistPress.target;

          inputState.fistPress.lastTarget = target;

          if (!inputState.fistPress.target) {
            inputState.fistPress.target = target;
          }

          if (
            activeTarget &&
            !isSameGestureTarget(target, activeTarget) &&
            getDistance(inputState.fistPress.point, point) >
              GESTURE_FIST_MOVE_TOLERANCE
          ) {
            inputState.fistPress = {
              point,
              side: target.side,
              startedAt: now,
              target,
              lastTarget: target,
            };
          }
        } else if (
          !inputState.fistPress.target &&
          getDistance(inputState.fistPress.point, point) >
            GESTURE_FIST_MOVE_TOLERANCE
        ) {
          inputState.fistPress = {
            point,
            side,
            startedAt: now,
            target,
            lastTarget: target,
          };
        }

        inputState.motionStart = null;
        inputState.previousPose = snapshot.handPose;
        inputState.wasPressing = true;
        animationFrameId = requestAnimationFrame(runGestureFrame);
        return;
      }

      inputState.fistPress = null;
      inputState.wasPressing = false;

      if (isMotionPose(snapshot.handPose)) {
        const target = getGestureTarget(point, focusedDrinkId);

        if (!inputState.motionStart) {
          inputState.motionStart = createMotionStart(
            point,
            side,
            now,
            target,
            focusedDrinkId,
          );
        } else {
          const motion = inputState.motionStart;
          updateMotionTarget(motion, point, target, focusedDrinkId);

          const deltaX = point.x - motion.point.x;
          const deltaY = point.y - motion.point.y;
          const absoluteX = Math.abs(deltaX);
          const absoluteY = Math.abs(deltaY);
          const addDeltaX = motion.focusedAnchorPoint
            ? point.x - motion.focusedAnchorPoint.x
            : 0;
          const addDeltaY = motion.focusedAnchorPoint
            ? point.y - motion.focusedAnchorPoint.y
            : 0;
          const addAbsoluteX = Math.abs(addDeltaX);
          const addAbsoluteY = Math.abs(addDeltaY);
          const inward =
            motion.focusedTarget?.type === "drink" &&
            Math.sign(addDeltaY) === getInwardSign(motion.focusedTarget.side) &&
            addAbsoluteY >= GESTURE_INWARD_SWIPE &&
            addAbsoluteY > addAbsoluteX * GESTURE_INWARD_AXIS_DOMINANCE;
          const horizontal =
            absoluteX >= POINTER_HORIZONTAL_SWIPE && absoluteX > absoluteY * 1.12;

          if (inward && motion.focusedTarget) {
            addFocusedToTray(motion.focusedTarget.side, "gesture");
            inputState.motionStart = null;
            inputState.cooldownUntil = now + GESTURE_ACTION_COOLDOWN_MS;
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
            );
          }
        }
      } else {
        inputState.motionStart = null;
      }

      inputState.previousPose = snapshot.handPose;
      animationFrameId = requestAnimationFrame(runGestureFrame);
    };

    runGestureFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    activate,
    addFocusedToTray,
    enabled,
    focusDrink,
    focusedDrinkId,
    phase,
    rotateWheel,
    tableRef,
    toggleCardFace,
    trackingRef,
  ]);
}
