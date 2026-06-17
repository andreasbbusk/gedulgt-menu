import { GEDULGT_DRINKS } from "../data/gedulgtDrinks";
import type { CardFace, TableSide } from "../store/gedulgtTableStore";
import { Card } from "./table/Card";

type OnboardingFlipLayerProps = {
  face: CardFace;
  confirmed: boolean;
  onFlip: (side: TableSide) => void;
};

const ONBOARDING_DRINK = GEDULGT_DRINKS[0];

export function OnboardingFlipLayer({
  face,
  confirmed,
  onFlip,
}: OnboardingFlipLayerProps) {
  return (
    <section
      className="onboarding-flip"
      aria-label="Flip cocktail"
      data-confirmed={confirmed ? "true" : "false"}
    >
      <div className="tray onboarding-flip__tray" aria-label="Instruction">
        <span className="tray__feedback-pulse" />
        <span className="tray__success-outline" aria-hidden="true" />
        <div className="tray__core">
          <p>Close your fist to flip the cocktail</p>
        </div>
      </div>

      <div className="onboarding-flip__card">
        <Card
          drink={ONBOARDING_DRINK}
          side="near"
          focused
          face={face}
          offset={0}
          onClick={(_, side) => onFlip(side)}
        />
      </div>

    </section>
  );
}
