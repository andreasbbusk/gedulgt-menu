import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { GEDULGT_DRINKS, type GedulgtDrink } from "../data/gedulgtDrinks";

export type ExperiencePhase =
  | "dormant"
  | "onboarding"
  | "browseWheel"
  | "trayFeedback"
  | "orderConfirmation";

export type TableSide = "near" | "far";
export type CardFace = "front" | "back";
export type InteractionSource = "mouse" | "touch" | "gesture" | "keyboard";
export type OnboardingStep = "browse" | "reveal" | "add";

export type SelectedDrinkItem = {
  drinkId: string;
  quantity: number;
};

export type InputLockout = {
  side: TableSide;
  until: number;
};

export type TrayFeedback =
  | { type: "added"; drinkId: string }
  | { type: "incremented"; drinkId: string }
  | null;

export type WheelSlot = {
  slotId: string;
  drinkId: string;
  side: TableSide;
  canonicalIndex: number;
  offsetFromFocus: number;
  focused: boolean;
  mirrored: boolean;
};

export type RotateDirection = "previous" | "next";

export type GedulgtTableState = {
  phase: ExperiencePhase;
  focusedDrinkId: string;
  wheelPosition: number;
  cardFace: CardFace;
  selectedItems: SelectedDrinkItem[];
  onboardingCompleted: boolean;
  onboardingStep: OnboardingStep;
  activeSide: TableSide;
  inputLockout: InputLockout | null;
  trayFeedback: TrayFeedback;
  lastInteractionAt: number;
  lastInteractionSource: InteractionSource | null;
};

type GedulgtTableActions = {
  activate: (
    side: TableSide,
    source: InteractionSource,
    time?: number,
  ) => void;
  deactivate: (
    side: TableSide,
    source: InteractionSource,
    time?: number,
  ) => void;
  rotateWheel: (
    direction: RotateDirection,
    side: TableSide,
    source: InteractionSource,
    time?: number,
  ) => void;
  focusDrink: (
    drinkId: string,
    side: TableSide,
    source: InteractionSource,
    time?: number,
  ) => void;
  toggleCardFace: (
    side: TableSide,
    source: InteractionSource,
    time?: number,
  ) => void;
  addFocusedToTray: (
    side: TableSide,
    source: InteractionSource,
    time?: number,
  ) => void;
  decrementTrayItem: (
    drinkId: string,
    side: TableSide,
    source: InteractionSource,
    time?: number,
  ) => void;
  confirmOrder: (
    side: TableSide,
    source: InteractionSource,
    time?: number,
  ) => void;
  resetExperience: (source: InteractionSource, time?: number) => void;
  inactivityTimeout: (time?: number) => void;
  clearTrayFeedback: (time?: number) => void;
};

export type GedulgtTableStore = GedulgtTableState & GedulgtTableActions;

export const INACTIVITY_TIMEOUT_MS = 60_000;
export const SIDE_INPUT_LOCKOUT_MS = 700;
export const ONBOARDING_STORAGE_KEY = "gedulgt:onboarding-completed";

const CANONICAL_DRINKS = GEDULGT_DRINKS.slice(0, 6);
const FIRST_DRINK_ID = CANONICAL_DRINKS[0]?.id ?? GEDULGT_DRINKS[0]?.id ?? "";

function getLiveState(time: number): Omit<GedulgtTableState, "onboardingCompleted"> {
  return {
    phase: "dormant",
    focusedDrinkId: FIRST_DRINK_ID,
    wheelPosition: getCanonicalIndex(FIRST_DRINK_ID),
    cardFace: "front",
    selectedItems: [],
    onboardingStep: "browse",
    activeSide: "near",
    inputLockout: null,
    trayFeedback: null,
    lastInteractionAt: time,
    lastInteractionSource: null,
  };
}

function getCanonicalIndex(drinkId: string) {
  const index = CANONICAL_DRINKS.findIndex((drink) => drink.id === drinkId);

  return index >= 0 ? index : 0;
}

function getCircularOffset(index: number, activeIndex: number, total: number) {
  let offset = index - activeIndex;

  if (offset > total / 2) {
    offset -= total;
  }

  if (offset < -total / 2) {
    offset += total;
  }

  return offset;
}

function canUseSide(state: GedulgtTableState, side: TableSide, time: number) {
  return !(
    state.inputLockout &&
    state.inputLockout.side !== side &&
    time < state.inputLockout.until
  );
}

function withInteraction(
  side: TableSide,
  source: InteractionSource,
  time: number,
) {
  return {
    activeSide: side,
    inputLockout: {
      side,
      until: time + SIDE_INPUT_LOCKOUT_MS,
    },
    lastInteractionAt: time,
    lastInteractionSource: source,
  } satisfies Partial<GedulgtTableState>;
}

function getNextOnboardingStep(step: OnboardingStep): OnboardingStep {
  if (step === "browse") {
    return "reveal";
  }

  if (step === "reveal") {
    return "add";
  }

  return "add";
}

function getTotalFromItems(items: SelectedDrinkItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

function getUpdatedItemsAfterAdd(
  items: SelectedDrinkItem[],
  drinkId: string,
): { items: SelectedDrinkItem[]; feedback: TrayFeedback } {
  const existingItem = items.find((item) => item.drinkId === drinkId);

  if (!existingItem) {
    return {
      items: [...items, { drinkId, quantity: 1 }],
      feedback: { type: "added", drinkId },
    };
  }

  return {
    items: items.map((item) =>
      item.drinkId === drinkId
        ? { ...item, quantity: item.quantity + 1 }
        : item,
    ),
    feedback: { type: "incremented", drinkId },
  };
}

export const useGedulgtTableStore = create<GedulgtTableStore>()(
  persist(
    (set) => ({
      ...getLiveState(Date.now()),
      onboardingCompleted: false,

      activate: (side, source, time = Date.now()) => {
        set((state) => {
          if (!canUseSide(state, side, time)) {
            return state;
          }

          return {
            phase: state.onboardingCompleted ? "browseWheel" : "onboarding",
            focusedDrinkId: state.focusedDrinkId || FIRST_DRINK_ID,
            cardFace: "front",
            trayFeedback: null,
            ...withInteraction(side, source, time),
          };
        });
      },

      deactivate: (side, source, time = Date.now()) => {
        set((state) => {
          if (!canUseSide(state, side, time)) {
            return state;
          }

          return {
            ...getLiveState(time),
            onboardingCompleted: state.onboardingCompleted,
            ...withInteraction(side, source, time),
            phase: "dormant",
            inputLockout: null,
          };
        });
      },

      rotateWheel: (direction, side, source, time = Date.now()) => {
        set((state) => {
          if (state.phase === "dormant" || !canUseSide(state, side, time)) {
            return state;
          }

          const currentIndex = getCanonicalIndex(state.focusedDrinkId);
          const offset = direction === "next" ? 1 : -1;
          const nextIndex =
            (currentIndex + offset + CANONICAL_DRINKS.length) %
            CANONICAL_DRINKS.length;

          return {
            focusedDrinkId: CANONICAL_DRINKS[nextIndex].id,
            wheelPosition: state.wheelPosition + offset,
            cardFace: "front",
            onboardingStep:
              state.phase === "onboarding" && state.onboardingStep === "browse"
                ? getNextOnboardingStep(state.onboardingStep)
                : state.onboardingStep,
            trayFeedback: null,
            phase: state.phase === "trayFeedback" ? "browseWheel" : state.phase,
            ...withInteraction(side, source, time),
          };
        });
      },

      focusDrink: (drinkId, side, source, time = Date.now()) => {
        set((state) => {
          if (
            state.phase === "dormant" ||
            !CANONICAL_DRINKS.some((drink) => drink.id === drinkId) ||
            !canUseSide(state, side, time)
          ) {
            return state;
          }

          return {
            focusedDrinkId: drinkId,
            wheelPosition:
              state.wheelPosition +
              getCircularOffset(
                getCanonicalIndex(drinkId),
                getCanonicalIndex(state.focusedDrinkId),
                CANONICAL_DRINKS.length,
              ),
            cardFace: "front",
            trayFeedback: null,
            phase: state.phase === "trayFeedback" ? "browseWheel" : state.phase,
            ...withInteraction(side, source, time),
          };
        });
      },

      toggleCardFace: (side, source, time = Date.now()) => {
        set((state) => {
          if (state.phase === "dormant" || !canUseSide(state, side, time)) {
            return state;
          }

          return {
            cardFace: state.cardFace === "front" ? "back" : "front",
            onboardingStep:
              state.phase === "onboarding" && state.onboardingStep === "reveal"
                ? getNextOnboardingStep(state.onboardingStep)
                : state.onboardingStep,
            trayFeedback: null,
            phase: state.phase === "trayFeedback" ? "browseWheel" : state.phase,
            ...withInteraction(side, source, time),
          };
        });
      },

      addFocusedToTray: (side, source, time = Date.now()) => {
        set((state) => {
          if (state.phase === "dormant" || !canUseSide(state, side, time)) {
            return state;
          }

          if (state.phase === "onboarding" && state.onboardingStep === "add") {
            return {
              onboardingCompleted: true,
              onboardingStep: "browse",
              phase: "browseWheel",
              selectedItems: [],
              trayFeedback: { type: "added", drinkId: state.focusedDrinkId },
              cardFace: "front",
              ...withInteraction(side, source, time),
            };
          }

          const { items, feedback } = getUpdatedItemsAfterAdd(
            state.selectedItems,
            state.focusedDrinkId,
          );

          return {
            selectedItems: items,
            phase: "trayFeedback",
            trayFeedback: feedback,
            ...withInteraction(side, source, time),
          };
        });
      },

      decrementTrayItem: (drinkId, side, source, time = Date.now()) => {
        set((state) => {
          if (
            state.phase === "dormant" ||
            state.phase === "onboarding" ||
            !canUseSide(state, side, time)
          ) {
            return state;
          }

          return {
            selectedItems: state.selectedItems
              .map((item) =>
                item.drinkId === drinkId
                  ? { ...item, quantity: item.quantity - 1 }
                  : item,
              )
              .filter((item) => item.quantity > 0),
            trayFeedback: null,
            phase: state.phase === "trayFeedback" ? "browseWheel" : state.phase,
            ...withInteraction(side, source, time),
          };
        });
      },

      confirmOrder: (side, source, time = Date.now()) => {
        set((state) => {
          if (
            state.phase === "dormant" ||
            state.phase === "onboarding" ||
            getTotalFromItems(state.selectedItems) === 0 ||
            !canUseSide(state, side, time)
          ) {
            return state;
          }

          return {
            phase: "orderConfirmation",
            trayFeedback: null,
            cardFace: "front",
            ...withInteraction(side, source, time),
          };
        });
      },

      resetExperience: (source, time = Date.now()) => {
        set((state) => ({
          ...getLiveState(time),
          onboardingCompleted: state.onboardingCompleted,
          lastInteractionSource: source,
        }));
      },

      inactivityTimeout: (time = Date.now()) => {
        set((state) => {
          if (state.phase === "dormant") {
            return state;
          }

          return {
            ...getLiveState(time),
            onboardingCompleted: state.onboardingCompleted,
          };
        });
      },

      clearTrayFeedback: (time = Date.now()) => {
        set((state) => ({
          trayFeedback: null,
          phase: state.phase === "trayFeedback" ? "browseWheel" : state.phase,
          lastInteractionAt: state.phase === "trayFeedback"
            ? state.lastInteractionAt
            : time,
        }));
      },
    }),
    {
      name: ONBOARDING_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        onboardingCompleted: state.onboardingCompleted,
      }),
    },
  ),
);

export function getCanonicalDrinks() {
  return CANONICAL_DRINKS;
}

export function getFocusedDrink(state: Pick<GedulgtTableState, "focusedDrinkId">) {
  return (
    CANONICAL_DRINKS.find((drink) => drink.id === state.focusedDrinkId) ??
    CANONICAL_DRINKS[0]
  );
}

export function getWheelSlots(
  state: Pick<GedulgtTableState, "focusedDrinkId">,
): WheelSlot[] {
  const focusedIndex = getCanonicalIndex(state.focusedDrinkId);

  return (["far", "near"] satisfies TableSide[]).flatMap((side) =>
    CANONICAL_DRINKS.map((drink, canonicalIndex) => {
      const offsetFromFocus = getCircularOffset(
        canonicalIndex,
        focusedIndex,
        CANONICAL_DRINKS.length,
      );

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

export function getDrinkById(drinkId: string) {
  return CANONICAL_DRINKS.find((drink) => drink.id === drinkId) ?? null;
}

export function getSelectedDrinkItems(items: SelectedDrinkItem[]) {
  return items
    .map((item) => {
      const drink = getDrinkById(item.drinkId);

      return drink ? { ...item, drink } : null;
    })
    .filter(
      (item): item is SelectedDrinkItem & { drink: GedulgtDrink } =>
        item !== null,
    );
}

export function getTotalSelectedCount(items: SelectedDrinkItem[]) {
  return getTotalFromItems(items);
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
