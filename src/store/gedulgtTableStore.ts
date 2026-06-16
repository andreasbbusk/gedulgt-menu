import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { GEDULGT_DRINKS } from "../data/gedulgtDrinks";
import {
  getCanonicalIndex,
  getCircularOffset,
  isCanonicalDrink,
} from "../domain/menu";

export type ExperiencePhase =
  | "dormant"
  | "activationSuccess"
  | "onboarding"
  | "browseWheel"
  | "trayFeedback";

export type TableSide = "near" | "far";
export type CardFace = "front" | "back";
export type OnboardingStep = "browse" | "reveal" | "add";

export type SelectedDrinkItem = {
  drinkId: string;
  quantity: number;
};

export type InputLockout = {
  side: TableSide;
  until: number;
};

export type TrayFeedback = {
  type: "added" | "incremented";
  drinkId: string;
} | null;

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
  inputLockout: InputLockout | null;
  trayFeedback: TrayFeedback;
  lastInteractionAt: number;
};

type GedulgtTableActions = {
  activate: (side: TableSide, time?: number) => void;
  completeActivation: (time?: number) => void;
  deactivate: (side: TableSide, time?: number) => void;
  rotateWheel: (
    direction: RotateDirection,
    side: TableSide,
    time?: number,
  ) => void;
  focusDrink: (drinkId: string, side: TableSide, time?: number) => void;
  toggleCardFace: (side: TableSide, time?: number) => void;
  addFocusedToTray: (side: TableSide, time?: number) => void;
  decrementTrayItem: (drinkId: string, side: TableSide, time?: number) => void;
  inactivityTimeout: (time?: number) => void;
  clearTrayFeedback: (time?: number) => void;
};

export type GedulgtTableStore = GedulgtTableState & GedulgtTableActions;

export const INACTIVITY_TIMEOUT_MS = 60_000;

function getDormantState(
  time: number,
): Omit<GedulgtTableState, "onboardingCompleted"> {
  return {
    phase: "dormant",
    focusedDrinkId: GEDULGT_DRINKS[0]?.id ?? "",
    wheelPosition: 0,
    cardFace: "front",
    selectedItems: [],
    onboardingStep: "browse",
    inputLockout: null,
    trayFeedback: null,
    lastInteractionAt: time,
  };
}

function canUseSide(state: GedulgtTableState, side: TableSide, time: number) {
  return !(
    state.inputLockout &&
    state.inputLockout.side !== side &&
    time < state.inputLockout.until
  );
}

export const useGedulgtTableStore = create<GedulgtTableStore>()(
  persist(
    (set) => ({
      ...getDormantState(Date.now()),
      onboardingCompleted: false,

      activate: (side, time = Date.now()) => {
        set((state) => {
          if (!canUseSide(state, side, time)) {
            return state;
          }

          return {
            phase: "activationSuccess",
            focusedDrinkId:
              state.focusedDrinkId || (GEDULGT_DRINKS[0]?.id ?? ""),
            cardFace: "front",
            trayFeedback: null,
            inputLockout: { side, until: time + 700 },
            lastInteractionAt: time,
          };
        });
      },

      completeActivation: (time = Date.now()) => {
        set((state) => {
          if (state.phase !== "activationSuccess") {
            return state;
          }

          return {
            phase: "browseWheel",
            onboardingCompleted: true,
            trayFeedback: null,
            inputLockout: null,
            lastInteractionAt: time,
          };
        });
      },

      deactivate: (side, time = Date.now()) => {
        set((state) => {
          if (!canUseSide(state, side, time)) {
            return state;
          }

          return {
            ...getDormantState(time),
            onboardingCompleted: state.onboardingCompleted,
          };
        });
      },

      rotateWheel: (direction, side, time = Date.now()) => {
        set((state) => {
          if (
            state.phase === "dormant" ||
            state.phase === "activationSuccess" ||
            !canUseSide(state, side, time)
          ) {
            return state;
          }

          const currentIndex = getCanonicalIndex(state.focusedDrinkId);
          const offset = direction === "next" ? 1 : -1;
          const nextIndex = (currentIndex + offset + 6) % 6;

          return {
            focusedDrinkId: GEDULGT_DRINKS[nextIndex].id,
            wheelPosition: state.wheelPosition + offset,
            cardFace: "front",
            onboardingStep:
              state.phase === "onboarding" && state.onboardingStep === "browse"
                ? "reveal"
                : state.onboardingStep,
            trayFeedback: null,
            phase: state.phase === "trayFeedback" ? "browseWheel" : state.phase,
            inputLockout: { side, until: time + 700 },
            lastInteractionAt: time,
          };
        });
      },

      focusDrink: (drinkId, side, time = Date.now()) => {
        set((state) => {
          if (
            state.phase === "dormant" ||
            state.phase === "activationSuccess" ||
            !isCanonicalDrink(drinkId) ||
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
              ),
            cardFace: "front",
            trayFeedback: null,
            phase: state.phase === "trayFeedback" ? "browseWheel" : state.phase,
            inputLockout: { side, until: time + 700 },
            lastInteractionAt: time,
          };
        });
      },

      toggleCardFace: (side, time = Date.now()) => {
        set((state) => {
          if (
            state.phase === "dormant" ||
            state.phase === "activationSuccess" ||
            !canUseSide(state, side, time)
          ) {
            return state;
          }

          return {
            cardFace: state.cardFace === "front" ? "back" : "front",
            onboardingStep:
              state.phase === "onboarding" && state.onboardingStep === "reveal"
                ? "add"
                : state.onboardingStep,
            trayFeedback: null,
            phase: state.phase === "trayFeedback" ? "browseWheel" : state.phase,
            inputLockout: { side, until: time + 700 },
            lastInteractionAt: time,
          };
        });
      },

      addFocusedToTray: (side, time = Date.now()) => {
        set((state) => {
          if (
            state.phase === "dormant" ||
            state.phase === "activationSuccess" ||
            !canUseSide(state, side, time)
          ) {
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
              inputLockout: { side, until: time + 700 },
              lastInteractionAt: time,
            };
          }

          const existingItem = state.selectedItems.find(
            (item) => item.drinkId === state.focusedDrinkId,
          );

          return {
            selectedItems: existingItem
              ? state.selectedItems.map((item) =>
                  item.drinkId === state.focusedDrinkId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item,
                )
              : [
                  ...state.selectedItems,
                  { drinkId: state.focusedDrinkId, quantity: 1 },
                ],
            phase: "trayFeedback",
            trayFeedback: {
              type: existingItem ? "incremented" : "added",
              drinkId: state.focusedDrinkId,
            },
            inputLockout: { side, until: time + 700 },
            lastInteractionAt: time,
          };
        });
      },

      decrementTrayItem: (drinkId, side, time = Date.now()) => {
        set((state) => {
          if (
            state.phase === "dormant" ||
            state.phase === "activationSuccess" ||
            state.phase === "onboarding" ||
            !canUseSide(state, side, time)
          ) {
            return state;
          }

          return {
            selectedItems: state.selectedItems.flatMap((item) => {
              const quantity =
                item.drinkId === drinkId ? item.quantity - 1 : item.quantity;

              return quantity > 0 ? [{ ...item, quantity }] : [];
            }),
            trayFeedback: null,
            phase: state.phase === "trayFeedback" ? "browseWheel" : state.phase,
            inputLockout: { side, until: time + 700 },
            lastInteractionAt: time,
          };
        });
      },

      inactivityTimeout: (time = Date.now()) => {
        set((state) => {
          if (state.phase === "dormant") {
            return state;
          }

          return {
            ...getDormantState(time),
            onboardingCompleted: state.onboardingCompleted,
          };
        });
      },

      clearTrayFeedback: (time = Date.now()) => {
        set((state) => ({
          trayFeedback: null,
          phase: state.phase === "trayFeedback" ? "browseWheel" : state.phase,
          lastInteractionAt:
            state.phase === "trayFeedback" ? state.lastInteractionAt : time,
        }));
      },
    }),
    {
      name: "gedulgt:onboarding-completed",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        onboardingCompleted: state.onboardingCompleted,
      }),
    },
  ),
);
