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
        <span className="tray__success-outline" aria-hidden="true" />
        <div className="tray__core" />
      </div>

      <p className="onboarding-remove__instruction">
        Swipe down to remove the cocktail
      </p>

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
    </section>
  );
}
