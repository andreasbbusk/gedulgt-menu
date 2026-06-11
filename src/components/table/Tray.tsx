import { useRef, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  MAX_SELECTED_DRINKS,
  formatPrice,
  getOrderTotal,
  type TableSide,
  type TrayFeedback,
  type getSelectedDrinkItems,
} from "../../store/gedulgtTableStore";
import { Glyph } from "./Glyph";
import { cx, getSide } from "./utils";

gsap.registerPlugin(useGSAP);

type SelectedItems = ReturnType<typeof getSelectedDrinkItems>;

type TrayProps = {
  items: SelectedItems;
  totalCount: number;
  feedback: TrayFeedback;
  phase: string;
  onDecrement: (drinkId: string, side: TableSide) => void;
  onConfirm: (side: TableSide) => void;
};

export function Tray({
  items,
  totalCount,
  feedback,
  phase,
  onDecrement,
  onConfirm,
}: TrayProps) {
  const trayRef = useRef<HTMLElement | null>(null);
  const hasItems = totalCount > 0;
  const total = getOrderTotal(items);

  useGSAP(
    () => {
      const tray = trayRef.current;

      if (!tray || !feedback) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const core = tray.querySelector(".tray__core");
      const tokens = tray.querySelectorAll(".tray-token");
      const pulse = tray.querySelector(".tray__feedback-pulse");

      if (feedback.type === "full") {
        if (!core) {
          return;
        }

        gsap.fromTo(
          core,
          { scale: 1, rotation: 0 },
          {
            scale: reduceMotion ? 1 : 1.08,
            rotation: reduceMotion ? 0 : 5,
            yoyo: true,
            repeat: 3,
            duration: reduceMotion ? 0 : 0.08,
            ease: "power2.inOut",
            overwrite: "auto",
          },
        );
        return;
      }

      if (pulse) {
        gsap.fromTo(
          pulse,
          { autoAlpha: 0.8, scale: 0.34 },
          {
            autoAlpha: 0,
            scale: reduceMotion ? 1 : 1.8,
            duration: reduceMotion ? 0 : 0.76,
            ease: "expo.out",
            overwrite: "auto",
          },
        );
      }

      if (tokens.length > 0) {
        gsap.fromTo(
          tokens,
          { scale: 0.72, autoAlpha: 0 },
          {
            scale: 1,
            autoAlpha: 1,
            stagger: { amount: 0.18, from: "center" },
            duration: reduceMotion ? 0 : 0.54,
            ease: "back.out(1.8)",
            overwrite: "auto",
          },
        );
      }
    },
    { dependencies: [feedback, totalCount], scope: trayRef },
  );

  return (
    <section
      ref={trayRef}
      className={cx(
        "tray",
        hasItems && "tray--populated",
        feedback?.type === "full" && "tray--full",
        phase === "orderConfirmation" && "tray--confirming",
      )}
      aria-label="Tray"
    >
      <span className="tray__feedback-pulse" aria-hidden="true" />
      <div className="tray__core">
        <span className="tray__title">Tray</span>
        <span className="tray__count">
          {totalCount}/{MAX_SELECTED_DRINKS}
        </span>
      </div>

      <div className="tray__tokens" aria-label="Selected drinks">
        {items.map((item, index) => {
          const count = Math.max(items.length, 1);
          const radians = ((-90 + (360 / count) * index) * Math.PI) / 180;
          const radius = items.length <= 1 ? 66 : 82;

          return (
            <button
              key={item.drinkId}
              type="button"
              className="tray-token"
              style={
                {
                  "--drink-accent": item.drink.accent,
                  "--token-x": `${Math.cos(radians) * radius}px`,
                  "--token-y": `${Math.sin(radians) * radius}px`,
                } as CSSProperties
              }
              data-tray-token
              onClick={(event) => {
                onDecrement(item.drinkId, getSide(event.clientY, trayRef.current));
              }}
              aria-label={`Remove one ${item.drink.name}`}
            >
              <Glyph drink={item.drink} small />
              <span>x{item.quantity}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="tray__confirm"
        data-tray-confirm
        disabled={!hasItems || phase === "orderConfirmation"}
        onClick={(event) => {
          onConfirm(getSide(event.clientY, trayRef.current));
        }}
      >
        <span>Order drinks</span>
        {hasItems && <strong>{formatPrice(total)}</strong>}
      </button>
    </section>
  );
}
