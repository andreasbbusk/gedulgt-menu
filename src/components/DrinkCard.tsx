import type { CSSProperties } from "react";

export type DrinkCardProps = {
  id: string;
  name: string;
  accent: string;
  hovered: boolean;
  pressed: boolean;
  active: boolean;
  onOpen: (drinkId: string) => void;
};

export function DrinkCard({
  id,
  name,
  accent,
  hovered,
  pressed,
  active,
  onOpen,
}: DrinkCardProps) {
  const style = {
    "--drink-accent": accent,
  } as CSSProperties;
  const cardClassName = [
    "drink-card",
    active ? "drink-card--active" : "",
    hovered ? "drink-card--hovered" : "",
    pressed ? "drink-card--pressed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={cardClassName}
      style={style}
      onClick={() => onOpen(id)}
      data-drink-id={id}
      data-gesture-target={`drink:${id}`}
      data-carousel-card
      aria-current={active}
      tabIndex={active ? 0 : -1}
    >
      <span className="drink-card__visual" data-model-slot={id} aria-hidden="true">
        <span className="drink-card__glass">
          <span className="drink-card__liquid" />
        </span>
        <span className="drink-card__shadow" />
      </span>

      <span className="drink-card__copy">
        <span className="drink-card__name">{name}</span>
      </span>
    </button>
  );
}
