import type { CSSProperties } from "react";
import type { GedulgtDrink } from "../../data/gedulgtDrinks";
import { cx } from "./utils";

type GlyphProps = {
  drink: GedulgtDrink;
  small?: boolean;
};

export function Glyph({ drink, small = false }: GlyphProps) {
  return (
    <span
      className={cx("drink-glyph", small && "drink-glyph--small")}
      style={{ "--drink-accent": drink.accent } as CSSProperties}
      aria-hidden="true"
    >
      <span className="drink-glyph__stem" />
      <span className="drink-glyph__bowl">
        <span className="drink-glyph__liquid" />
        <span className="drink-glyph__flare drink-glyph__flare--a" />
        <span className="drink-glyph__flare drink-glyph__flare--b" />
      </span>
      <span className="drink-glyph__caustic" />
    </span>
  );
}
