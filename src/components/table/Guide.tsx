import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { OnboardingStep } from "../../store/gedulgtTableStore";
import { getGuideCopy } from "./utils";

gsap.registerPlugin(useGSAP);

export function Guide({ step }: { step: OnboardingStep }) {
  const guideRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const guide = guideRef.current;

      if (!guide) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const q = gsap.utils.selector(guide);
      const tl = gsap.timeline({
        defaults: {
          duration: reduceMotion ? 0 : 0.72,
          ease: "power3.out",
        },
      });

      tl.fromTo(
        guide,
        { autoAlpha: 0, scale: 0.92, y: 12 },
        { autoAlpha: 1, scale: 1, y: 0 },
      )
        .fromTo(
          q(".onboarding-guide__trace"),
          { strokeDashoffset: 130, autoAlpha: 0 },
          {
            strokeDashoffset: 0,
            autoAlpha: 1,
            stagger: 0.08,
            duration: reduceMotion ? 0 : 0.92,
            ease: "power2.inOut",
          },
          0.08,
        )
        .fromTo(
          q(".onboarding-guide__hand"),
          { x: step === "browse" ? -18 : 0, y: step === "add" ? -18 : 0 },
          {
            x: step === "browse" ? 18 : 0,
            y: step === "add" ? 22 : 0,
            repeat: reduceMotion ? 0 : -1,
            yoyo: true,
            duration: reduceMotion ? 0 : 1.2,
            ease: "sine.inOut",
          },
          0.2,
        );
    },
    { dependencies: [step], scope: guideRef },
  );

  return (
    <aside ref={guideRef} className="onboarding-guide" aria-label="Onboarding">
      <svg viewBox="0 0 160 96" className="onboarding-guide__icon" aria-hidden="true">
        <path
          className="onboarding-guide__trace"
          d="M24 49 C47 24, 74 24, 98 49 S132 72, 146 42"
        />
        <path
          className="onboarding-guide__trace"
          d="M68 74 C82 58, 96 49, 116 47"
        />
        <g className="onboarding-guide__hand">
          <path d="M53 66 C53 45, 55 32, 61 32 C66 32, 67 40, 67 49 L67 37 C67 31, 75 30, 77 37 L79 51 L80 41 C82 35, 90 35, 91 42 L92 55 L95 48 C98 42, 106 45, 104 52 L99 70 C97 80, 89 86, 76 86 C62 86, 53 78, 53 66 Z" />
        </g>
      </svg>
      <span>{getGuideCopy(step)}</span>
    </aside>
  );
}
