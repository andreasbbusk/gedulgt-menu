import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  getCanonicalDrinks,
  type TableSide,
  type WheelSlot,
} from "../../store/gedulgtTableStore";
import { Card } from "./Card";

gsap.registerPlugin(useGSAP);

type WheelProps = {
  slots: WheelSlot[];
  focusedDrinkId: string;
  cardFace: "front" | "back";
  onDrinkClick: (drinkId: string, side: TableSide) => void;
};

export function Wheel({
  slots,
  focusedDrinkId,
  cardFace,
  onDrinkClick,
}: WheelProps) {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const drinks = getCanonicalDrinks();

  useEffect(() => {
    const handleResize = () => {
      setLayoutVersion((version) => version + 1);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useGSAP(
    () => {
      const wheel = wheelRef.current;

      if (!wheel) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const rect = wheel.getBoundingClientRect();
      const diameter = Math.max(320, Math.min(rect.width, rect.height));
      const radiusX = diameter * 0.33;
      const radiusY = diameter * 0.34;
      const cards = Array.from(
        wheel.querySelectorAll<HTMLButtonElement>("[data-wheel-slot]"),
      );
      const tl = gsap.timeline({
        defaults: {
          duration: reduceMotion ? 0 : 0.98,
          ease: "expo.inOut",
        },
      });

      cards.forEach((card) => {
        const side = card.dataset.tableSide as TableSide;
        const offset = Number(card.dataset.focusOffset ?? 0);
        const depth = Math.abs(offset);
        const focused = offset === 0;
        const baseAngle = side === "near" ? 90 : 270;
        const radians = ((baseAngle + offset * 23) * Math.PI) / 180;
        const readableRotation = side === "far" ? 180 : 0;
        const tilt = focused ? 0 : offset * (side === "far" ? -3 : 3);
        const scale = focused ? 1 : depth === 1 ? 0.68 : depth === 2 ? 0.46 : 0.34;
        const alpha = focused ? 1 : depth === 1 ? 0.46 : depth === 2 ? 0.22 : 0.1;

        tl.to(
          card,
          {
            x: Math.cos(radians) * radiusX,
            y: Math.sin(radians) * radiusY,
            xPercent: -50,
            yPercent: -50,
            scale,
            rotation: readableRotation + tilt,
            rotationX: focused ? 0 : side === "near" ? -11 : 11,
            rotationY: focused ? 0 : offset * -6,
            autoAlpha: alpha,
            filter: focused
              ? "blur(0px) saturate(1.08)"
              : `blur(${Math.min(7, 2 + depth * 1.5)}px) saturate(0.72)`,
            zIndex: focused ? 12 : 8 - depth,
            pointerEvents: depth <= 1 ? "auto" : "none",
            transformPerspective: 1100,
            transformOrigin: "50% 50%",
            overwrite: "auto",
          },
          0,
        );
      });

      const focusedConstellations = cards
        .filter((card) => card.dataset.focusOffset === "0")
        .map((card) => card.querySelector(".table-drink-card__constellation"));

      if (focusedConstellations.length > 0 && !reduceMotion) {
        tl.fromTo(
          focusedConstellations,
          { autoAlpha: 0.15, scale: 0.75, rotation: -8 },
          {
            autoAlpha: 0.62,
            scale: 1.1,
            rotation: 8,
            duration: 0.9,
            ease: "elastic.out(1, 0.58)",
          },
          0.14,
        );
      }
    },
    { dependencies: [focusedDrinkId, layoutVersion], scope: wheelRef },
  );

  return (
    <div ref={wheelRef} className="mirrored-wheel" aria-label="Mirrored drinks">
      {slots.map((slot) => {
        const drink = drinks[slot.canonicalIndex];

        return (
          <span
            key={slot.slotId}
            className="mirrored-wheel__slot"
            data-wheel-slot
            data-table-side={slot.side}
            data-focus-offset={slot.offsetFromFocus}
          >
            <Card
              drink={drink}
              side={slot.side}
              focused={slot.focused}
              face={cardFace}
              offset={slot.offsetFromFocus}
              onClick={onDrinkClick}
            />
          </span>
        );
      })}
    </div>
  );
}
