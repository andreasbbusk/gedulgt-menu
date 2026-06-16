import { GEDULGT_DRINKS } from "../data/gedulgtDrinks";
import { getDrinkImageSrc } from "./table/drinkAssets";

type OnboardingRemoveLayerProps = {
  confirmed: boolean;
};

const ONBOARDING_DRINK = GEDULGT_DRINKS[0];

export function OnboardingRemoveLayer({
  confirmed,
}: OnboardingRemoveLayerProps) {
  return (
    <section
      className="onboarding-remove"
      aria-label="Remove cocktail from tray"
      data-confirmed={confirmed ? "true" : "false"}
    >
      <div className="tray onboarding-remove__tray" aria-label="Instruction">
        <span className="tray__feedback-pulse" />
        <div className="tray__core">
          <p>Swipe down to remove the cocktail</p>
        </div>
      </div>

      <button
        type="button"
        className={
          confirmed
            ? "onboarding-remove__drink onboarding-remove__drink--removed"
            : "onboarding-remove__drink"
        }
        data-focused-card="true"
        data-table-side="near"
        aria-label="Cocktail in tray"
      >
        <img src={getDrinkImageSrc(ONBOARDING_DRINK.imageId)} alt="" />
      </button>

      <svg
        className="onboarding-remove__check"
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
