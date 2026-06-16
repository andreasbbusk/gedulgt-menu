import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

export function Dormant() {
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
        q(".dormant-state__mark"),
        { autoAlpha: 0, y: 18, scale: 0.95 },
        { autoAlpha: 1, y: 0, scale: 1 },
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
      <div className="dormant-state__visual">
        <span className="dormant-state__mark">Gedulgt</span>
      </div>
    </section>
  );
}
