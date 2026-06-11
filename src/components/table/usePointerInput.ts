import {
  useCallback,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type {
  InteractionSource,
  RotateDirection,
  TableSide,
} from "../../store/gedulgtTableStore";
import {
  POINTER_CLICK_SUPPRESS_DISTANCE,
  POINTER_CLICK_SUPPRESS_MS,
  POINTER_HORIZONTAL_SWIPE,
  POINTER_INWARD_SWIPE,
  getInwardSign,
  getRotation,
  getSide,
  getSource,
  isIgnoredTarget,
} from "./utils";

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  side: TableSide;
  source: InteractionSource;
  startedOnCard: boolean;
  suppressClick: boolean;
  consumed: boolean;
};

type UsePointerInputOptions = {
  tableRef: RefObject<HTMLElement | null>;
  onAdd: (side: TableSide, source: InteractionSource) => void;
  onRotate: (
    direction: RotateDirection,
    side: TableSide,
    source: InteractionSource,
  ) => void;
};

export function usePointerInput({
  tableRef,
  onAdd,
  onRotate,
}: UsePointerInputOptions) {
  const dragRef = useRef<DragState | null>(null);
  const suppressUntilRef = useRef(0);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (isIgnoredTarget(event.target)) {
        return;
      }

      const card = (event.target as HTMLElement).closest(
        "[data-focused-card='true']",
      );

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        side: getSide(event.clientY, tableRef.current),
        source: getSource(event.pointerType),
        startedOnCard: Boolean(card),
        suppressClick: false,
        consumed: false,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [tableRef],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId || drag.consumed) {
        return;
      }

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const x = Math.abs(deltaX);
      const y = Math.abs(deltaY);

      if (Math.hypot(deltaX, deltaY) >= POINTER_CLICK_SUPPRESS_DISTANCE) {
        drag.suppressClick = true;
        event.preventDefault();
      }

      if (
        drag.startedOnCard &&
        Math.sign(deltaY) === getInwardSign(drag.side) &&
        y >= POINTER_INWARD_SWIPE &&
        y > x * 0.8
      ) {
        drag.consumed = true;
        drag.suppressClick = true;
        suppressUntilRef.current = performance.now() + POINTER_CLICK_SUPPRESS_MS;
        onAdd(drag.side, drag.source);
        return;
      }

      if (x >= POINTER_HORIZONTAL_SWIPE && x > y * 1.12) {
        drag.consumed = true;
        drag.suppressClick = true;
        suppressUntilRef.current = performance.now() + POINTER_CLICK_SUPPRESS_MS;
        onRotate(getRotation(deltaX), drag.side, drag.source);
      }
    },
    [onAdd, onRotate],
  );

  const finishDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (drag.suppressClick || drag.consumed) {
      suppressUntilRef.current = performance.now() + POINTER_CLICK_SUPPRESS_MS;
    }

    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (performance.now() < suppressUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  return {
    onClickCapture,
    onPointerCancel: finishDrag,
    onPointerDown,
    onPointerMove,
    onPointerUp: finishDrag,
  };
}
