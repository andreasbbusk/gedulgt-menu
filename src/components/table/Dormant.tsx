import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type {
  InteractionSource,
  TableSide,
} from "../../store/gedulgtTableStore";
import { getSide } from "./utils";

gsap.registerPlugin(useGSAP);

type DormantProps = {
  onActivate: (side: TableSide, source: InteractionSource) => void;
};

export function Dormant({ onActivate }: DormantProps) {
  const rootRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const root = rootRef.current;

      if (!root) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({
        defaults: { ease: "power3.out", duration: reduceMotion ? 0 : 0.75 },
      });

      tl.fromTo(
        q(".dormant-state__mark, .dormant-state__prompt"),
        { autoAlpha: 0, y: 18, scale: 0.95 },
        { autoAlpha: 1, y: 0, scale: 1, stagger: 0.1 },
      ).fromTo(
        q(".dormant-state__halo"),
        { autoAlpha: 0, scale: 0.52 },
        { autoAlpha: 0.78, scale: 1, duration: reduceMotion ? 0 : 1.1 },
        0,
      );
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className="dormant-state" aria-label="Dormant">
      <button
        type="button"
        className="dormant-state__activation"
        data-dormant-activate
        onClick={(event) => {
          onActivate(getSide(event.clientY, rootRef.current), "mouse");
        }}
      >
        <span className="dormant-state__halo" aria-hidden="true" />
        <span className="dormant-state__mark">Gedulgt</span>
        <span className="dormant-state__prompt">Place hand in light</span>
      </button>
    </section>
  );
}
