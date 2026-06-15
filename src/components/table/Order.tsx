import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { RotateCcw } from "lucide-react";
import {
  formatPrice,
  parseDrinkPrice,
  type getSelectedDrinkItems,
} from "../../store/gedulgtTableStore";

gsap.registerPlugin(useGSAP);

type OrderProps = {
  items: ReturnType<typeof getSelectedDrinkItems>;
  total: number;
  onReset: () => void;
};

export function Order({ items, total, onReset }: OrderProps) {
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
        defaults: {
          duration: reduceMotion ? 0 : 0.72,
          ease: "expo.out",
        },
      });

      tl.fromTo(
        root,
        { autoAlpha: 0, scale: 0.22, rotation: -8 },
        { autoAlpha: 1, scale: 1, rotation: 0 },
      )
        .fromTo(
          q(".order-confirmation__item"),
          { autoAlpha: 0, y: 20, scale: 0.96 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            stagger: 0.07,
            duration: reduceMotion ? 0 : 0.48,
          },
          0.16,
        )
        .fromTo(
          q(".order-confirmation__total, .order-confirmation__reset"),
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, stagger: 0.08 },
          0.34,
        );
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      className="order-confirmation"
      aria-label="Your order"
    >
      <span className="order-confirmation__brand">Gedulgt</span>
      <h2>Your order</h2>
      <div className="order-confirmation__items">
        {items.map((item) => (
          <div key={item.drinkId} className="order-confirmation__item">
            <span>
              {item.quantity}x {item.drink.name}
            </span>
            <strong>
              {formatPrice(parseDrinkPrice(item.drink.price) * item.quantity)}
            </strong>
          </div>
        ))}
      </div>
      <p className="order-confirmation__total">Total {formatPrice(total)}</p>
      <button
        type="button"
        className="order-confirmation__reset"
        data-reset-order
        onClick={onReset}
      >
        <RotateCcw size={17} strokeWidth={1.8} aria-hidden="true" />
        <span>Reset</span>
      </button>
    </section>
  );
}
