import { memo, type CSSProperties } from "react";
import type { GedulgtDrink } from "../../data/gedulgtDrinks";
import type { TableSide } from "../../store/gedulgtTableStore";
import { getDrinkImageSrc } from "./drinkAssets";
import { cx } from "./utils";

type CardProps = {
  drink: GedulgtDrink;
  side: TableSide;
  focused: boolean;
  face: "front" | "back";
  offset: number;
  onClick: (drinkId: string, side: TableSide) => void;
};

export const Card = memo(function Card({
  drink,
  side,
  focused,
  face,
  offset,
  onClick,
}: CardProps) {
  const showBack = focused && face === "back";
  const denseIngredients = drink.ingredients.length > 5;
  const imageSrc = getDrinkImageSrc(drink.imageId);
  const drinkAccent =
    (drink as GedulgtDrink & { accent?: string }).accent ?? "#78b99a";

  return (
    <button
      type="button"
      className={cx(
        "table-drink-card",
        focused && "table-drink-card--focused",
        showBack && "table-drink-card--back",
        !focused && "table-drink-card--ghost",
      )}
      style={{ "--drink-accent": drinkAccent } as CSSProperties}
      data-focused-card={focused ? "true" : undefined}
      data-drink-id={drink.id}
      data-table-side={side}
      data-focus-offset={offset}
      onClick={() => onClick(drink.id, side)}
      tabIndex={focused ? 0 : -1}
      aria-label={`${drink.name} ${focused ? "focused" : "drink"}`}
      aria-pressed={focused && face === "back"}
    >
      <span
        className={cx(
          "table-drink-card__inner",
          showBack && "table-drink-card__inner--back",
        )}
      >
        <span className="table-drink-card__face table-drink-card__face--front">
          <img
            src={imageSrc}
            alt={drink.name}
            className="drink-card__image"
            decoding="async"
            loading="eager"
          />
          <span className="table-drink-card__name">{drink.name}</span>
        </span>

        <span className="table-drink-card__face table-drink-card__face--back">
          <div className="table-drink-card__meta">
            <span className="table-drink-card__creator">
              By {drink.creator}
            </span>
            <span className="table-drink-card__description">
              {drink.description}
            </span>
          </div>
          <span
            className={cx(
              "table-drink-card__ingredients",
              denseIngredients && "table-drink-card__ingredients--dense",
            )}
          >
            {drink.ingredients.map((ingredient) => (
              <span key={ingredient}>{ingredient}</span>
            ))}
          </span>
          <strong className="table-drink-card__back-price">
            {drink.price}
          </strong>
          <span className="table-drink-card__back-name">{drink.name}</span>
        </span>
      </span>
    </button>
  );
});
