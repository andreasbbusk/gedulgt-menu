import type { CSSProperties } from "react";
import { GEDULGT_DRINKS } from "../data/gedulgtDrinks";
import type { RotateDirection, TableSide } from "../store/gedulgtTableStore";
import { getDrinkImageSrc } from "./table/drinkAssets";

type OnboardingNavigateLayerProps = {
  position: number;
  confirmed: boolean;
  onRotate: (direction: RotateDirection, side: TableSide) => void;
};

const ONBOARDING_DRINKS = GEDULGT_DRINKS.slice(0, 3);

export function OnboardingNavigateLayer({
  position,
  confirmed,
  onRotate,
}: OnboardingNavigateLayerProps) {
  return (
    <section
      className="onboarding-navigate"
      aria-label="Navigate cocktails"
      data-confirmed={confirmed ? "true" : "false"}
    >
      <div className="tray onboarding-navigate__tray" aria-label="Instruction">
        <span className="tray__feedback-pulse" />
        <span className="tray__success-outline" aria-hidden="true" />
        <div className="tray__core">
          <p>Swipe left and right to navigate between cocktails</p>
        </div>
      </div>

      <div className="onboarding-navigate__drinks" aria-label="Cocktails">
        {ONBOARDING_DRINKS.map((drink, index) => {
          const offset = getCarouselOffset(index, position);

          return (
            <button
              key={drink.id}
              type="button"
              className="onboarding-navigate__drink"
              data-active={offset === 0 ? "true" : "false"}
              style={
                {
                  "--navigate-offset": offset,
                  "--navigate-depth": Math.abs(offset),
                } as CSSProperties
              }
              onClick={() => {
                if (offset < 0) {
                  onRotate("previous", "near");
                  return;
                }

                onRotate("next", "near");
              }}
              aria-label="Navigate cocktail"
            >
              <img src={getDrinkImageSrc(drink.imageId)} alt="" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function getCarouselOffset(index: number, position: number) {
  const rawOffset =
    (index - position + ONBOARDING_DRINKS.length) % ONBOARDING_DRINKS.length;

  return rawOffset > 1 ? rawOffset - ONBOARDING_DRINKS.length : rawOffset;
}
