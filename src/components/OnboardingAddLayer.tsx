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
        <div className="tray__core">
          <p>Swipe the cocktail into the tray to continue</p>
        </div>
      </div>

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

      <svg
        className="onboarding-add__check"
        viewBox="0 0 64 64"
        role="img"
        aria-label="Confirmed"
      >
        <circle cx="32" cy="32" r="28" />
        <path d="M18 33.5 27.2 42 46.5 22" pathLength="72" />
      </svg>
    </section>
  );
}
