import { GEDULGT_DRINKS, type GedulgtDrink } from "../data/gedulgtDrinks";
import type {
  SelectedDrinkItem,
  TableSide,
  WheelSlot,
} from "../store/gedulgtTableStore";

export function getCanonicalIndex(drinkId: string) {
  return Math.max(
    0,
    GEDULGT_DRINKS.slice(0, 6).findIndex((drink) => drink.id === drinkId),
  );
}

export function isCanonicalDrink(drinkId: string) {
  return GEDULGT_DRINKS.slice(0, 6).some((drink) => drink.id === drinkId);
}

export function getCircularOffset(index: number, activeIndex: number) {
  let offset = index - activeIndex;

  if (offset > 3) {
    offset -= 6;
  }

  if (offset < -3) {
    offset += 6;
  }

  return offset;
}

export function getFocusedDrink(state: { focusedDrinkId: string }) {
  return (
    GEDULGT_DRINKS.slice(0, 6).find(
      (drink) => drink.id === state.focusedDrinkId,
    ) ?? GEDULGT_DRINKS[0]
  );
}

export function getWheelSlots(state: { focusedDrinkId: string }): WheelSlot[] {
  const focusedIndex = getCanonicalIndex(state.focusedDrinkId);

  return (["far", "near"] satisfies TableSide[]).flatMap((side) =>
    GEDULGT_DRINKS.slice(0, 6).map((drink, canonicalIndex) => {
      const offsetFromFocus = getCircularOffset(canonicalIndex, focusedIndex);

      return {
        slotId: `${side}-${drink.id}`,
        drinkId: drink.id,
        side,
        canonicalIndex,
        offsetFromFocus,
        focused: offsetFromFocus === 0,
        mirrored: side === "far",
      };
    }),
  );
}

export function getSelectedDrinkItems(items: SelectedDrinkItem[]) {
  return items
    .map((item) => {
      const drink = GEDULGT_DRINKS.slice(0, 6).find(
        (drink) => drink.id === item.drinkId,
      );

      return drink ? { ...item, drink } : null;
    })
    .filter(
      (item): item is SelectedDrinkItem & { drink: GedulgtDrink } =>
        item !== null,
    );
}

export function getTotalSelectedCount(items: SelectedDrinkItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function parseDrinkPrice(price: string) {
  const match = price.match(/\d+/);

  return match ? Number(match[0]) : 0;
}

export function formatPrice(amount: number) {
  return `${amount},-`;
}

export function getOrderTotal(items: SelectedDrinkItem[]) {
  return getSelectedDrinkItems(items).reduce(
    (total, item) => total + parseDrinkPrice(item.drink.price) * item.quantity,
    0,
  );
}
