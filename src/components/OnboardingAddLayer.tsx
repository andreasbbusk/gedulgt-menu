import swipeUpGesture from "../assets/gestures/swipe_up.gif";
import { GEDULGT_DRINKS } from "../data/gedulgtDrinks";
import { getDrinkImageSrc } from "./table/drinkAssets";

type OnboardingAddLayerProps = {
  confirmed: boolean;
};

const ONBOARDING_DRINK = GEDULGT_DRINKS[0];

export function OnboardingAddLayer({ confirmed }: OnboardingAddLayerProps) {
  return (
    <section
      className="onboarding-add"
      aria-label="Add cocktail to tray"
      data-confirmed={confirmed ? "true" : "false"}
    >
      <div className="tray onboarding-add__tray" aria-label="Instruction">
        <span className="tray__feedback-pulse" />
        <span className="tray__success-outline" aria-hidden="true" />
        <div className="tray__core">
          <p>Swipe the cocktail into the tray to order</p>
        </div>
      </div>

      <img
        className="onboarding-add__gesture"
        src={swipeUpGesture}
        alt=""
        aria-hidden="true"
      />

      <button
        type="button"
        className={
          confirmed
            ? "onboarding-add__drink onboarding-add__drink--in-tray"
            : "onboarding-add__drink"
        }
        data-focused-card="true"
        data-table-side="near"
        aria-label="Cocktail"
      >
        <img src={getDrinkImageSrc(ONBOARDING_DRINK.imageId)} alt="" />
      </button>
    </section>
  );
}
