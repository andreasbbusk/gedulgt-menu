import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import gsap from "gsap";
import {
  EDGE_HOLD_MS,
  type ExperiencePhase,
  type InteractionSource,
  type TableSide,
} from "../../store/gedulgtTableStore";
import { cx, getSource } from "./utils";

type EdgeWellProps = {
  side: TableSide;
  phase: ExperiencePhase;
  onActivate: (side: TableSide, source: InteractionSource) => void;
  onDeactivate: (side: TableSide, source: InteractionSource) => void;
};

export function EdgeWell({
  side,
  phase,
  onActivate,
  onDeactivate,
}: EdgeWellProps) {
  const meterRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  const clearHold = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    tweenRef.current?.kill();
    tweenRef.current = null;

    if (meterRef.current) {
      gsap.to(meterRef.current, {
        scaleX: 0,
        duration: 0.18,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  }, []);

  useEffect(() => clearHold, [clearHold]);

  const startHold = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const source = getSource(event.pointerType);

      if (phase === "dormant") {
        onActivate(side, source);
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      tweenRef.current?.kill();

      if (meterRef.current) {
        gsap.set(meterRef.current, { scaleX: 0, transformOrigin: "50% 50%" });
        tweenRef.current = gsap.to(meterRef.current, {
          scaleX: 1,
          duration: EDGE_HOLD_MS / 1000,
          ease: "power2.inOut",
          overwrite: "auto",
        });
      }

      timerRef.current = window.setTimeout(() => {
        onDeactivate(side, source);
        clearHold();
      }, EDGE_HOLD_MS);
    },
    [clearHold, onActivate, onDeactivate, phase, side],
  );

  return (
    <button
      type="button"
      className={cx("edge-well", `edge-well--${side}`)}
      data-edge-well
      onPointerCancel={clearHold}
      onPointerDown={startHold}
      onPointerLeave={clearHold}
      onPointerUp={clearHold}
      aria-label={`${side} edge well`}
    >
      <span className="edge-well__beam" />
      <span ref={meterRef} className="edge-well__meter" />
    </button>
  );
}
