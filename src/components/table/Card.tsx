import { useRef, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { GedulgtDrink } from "../../data/gedulgtDrinks";
import type { TableSide } from "../../store/gedulgtTableStore";
import { Glyph } from "./Glyph";
import { cx } from "./utils";

gsap.registerPlugin(useGSAP);

type CardProps = {
  drink: GedulgtDrink;
  side: TableSide;
  focused: boolean;
  face: "front" | "back";
  offset: number;
  onClick: (drinkId: string, side: TableSide) => void;
};

export function Card({
  drink,
  side,
  focused,
  face,
  offset,
  onClick,
}: CardProps) {
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const innerRef = useRef<HTMLSpanElement | null>(null);
  const shimmerRef = useRef<HTMLSpanElement | null>(null);

  useGSAP(
    () => {
      const inner = innerRef.current;
      const shimmer = shimmerRef.current;

      if (!inner) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      gsap.to(inner, {
        rotationY: focused && face === "back" ? 180 : 0,
        transformPerspective: 1200,
        transformOrigin: "50% 50%",
        duration: reduceMotion ? 0 : 0.78,
        ease: "back.inOut(1.15)",
        overwrite: "auto",
      });

      if (focused && shimmer && !reduceMotion) {
        gsap.fromTo(
          shimmer,
          { autoAlpha: 0, xPercent: -150, skewX: -18 },
          {
            autoAlpha: 0.72,
            xPercent: 150,
            duration: 0.72,
            ease: "power3.inOut",
            overwrite: "auto",
          },
        );
      }
    },
    { dependencies: [drink.id, face, focused], scope: cardRef },
  );

  return (
    <button
      ref={cardRef}
      type="button"
      className={cx(
        "table-drink-card",
        focused && "table-drink-card--focused",
        !focused && "table-drink-card--ghost",
      )}
      style={{ "--drink-accent": drink.accent } as CSSProperties}
      data-focused-card={focused ? "true" : undefined}
      data-drink-id={drink.id}
      data-table-side={side}
      data-focus-offset={offset}
      onClick={() => onClick(drink.id, side)}
      tabIndex={focused ? 0 : -1}
      aria-label={`${drink.name} ${focused ? "focused" : "drink"}`}
      aria-pressed={focused && face === "back"}
    >
      <span ref={innerRef} className="table-drink-card__inner">
        <span className="table-drink-card__face table-drink-card__face--front">
          <span className="table-drink-card__constellation" aria-hidden="true" />
          <Glyph drink={drink} />
          <span className="table-drink-card__name">{drink.name}</span>
        </span>

        <span className="table-drink-card__face table-drink-card__face--back">
          <span className="table-drink-card__meta">{drink.description}</span>
          <span className="table-drink-card__back-name">{drink.name}</span>
          <span className="table-drink-card__tags">
            {drink.flavorTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </span>
          <span className="table-drink-card__ingredients">
            {drink.ingredients.slice(0, 5).join(" / ")}
          </span>
          <span className="table-drink-card__footer">
            <span>{drink.creator}</span>
            <strong>{drink.price}</strong>
          </span>
        </span>

        <span ref={shimmerRef} className="table-drink-card__shimmer" />
      </span>
    </button>
  );
}
