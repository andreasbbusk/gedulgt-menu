import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { GEDULGT_DRINKS } from "../data/gedulgtDrinks";
import {
  getCanonicalIndex,
  getCircularOffset,
  isCanonicalDrink,
} from "../domain/menu";

export type ExperiencePhase =
  | "onboardingIntro"
  | "dormant"
  | "onboardingIntroConfirmation"
  | "onboardingNavigate"
  | "onboardingNavigateConfirmation"
  | "onboardingAdd"
  | "onboardingAddConfirmation"
  | "onboardingRemove"
  | "onboardingRemoveConfirmation"
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
  onboardingNavigatePosition: number;
  onboardingNavigatePreviousCompleted: boolean;
  onboardingNavigateNextCompleted: boolean;
  inputLockout: InputLockout | null;
  trayFeedback: TrayFeedback;
  lastInteractionAt: number;
};

type GedulgtTableActions = {
  activate: (side: TableSide, time?: number) => void;
  completeActivation: (time?: number) => void;
  navigateOnboarding: (
    direction: RotateDirection,
    side: TableSide,
    time?: number,
  ) => void;
  completeOnboardingNavigation: (time?: number) => void;
  addOnboardingCocktail: (side: TableSide, time?: number) => void;
  completeOnboardingAdd: (time?: number) => void;
  removeOnboardingCocktail: (side: TableSide, time?: number) => void;
  completeOnboardingRemove: (time?: number) => void;
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
    onboardingNavigatePosition: 0,
    onboardingNavigatePreviousCompleted: false,
    onboardingNavigateNextCompleted: false,
    inputLockout: null,
    trayFeedback: null,
    lastInteractionAt: time,
  };
}

function getInitialState(
  time: number,
): Omit<GedulgtTableState, "onboardingCompleted"> {
  return {
    ...getDormantState(time),
    phase: "onboardingIntro",
  };
}

function isInteractiveMenuPhase(phase: ExperiencePhase) {
  return (
    phase === "onboarding" ||
    phase === "browseWheel" ||
    phase === "trayFeedback"
  );
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
      ...getInitialState(Date.now()),
      onboardingCompleted: false,

      activate: (side, time = Date.now()) => {
        set((state) => {
          if (!canUseSide(state, side, time)) {
            return state;
          }

          if (state.phase === "onboardingIntro") {
            return {
              phase: "onboardingIntroConfirmation",
              focusedDrinkId:
                state.focusedDrinkId || (GEDULGT_DRINKS[0]?.id ?? ""),
              cardFace: "front",
              trayFeedback: null,
              inputLockout: { side, until: time + 700 },
              lastInteractionAt: time,
            };
          }

          if (state.phase === "dormant") {
            return {
              phase: state.onboardingCompleted ? "browseWheel" : "onboarding",
              focusedDrinkId:
                state.focusedDrinkId || (GEDULGT_DRINKS[0]?.id ?? ""),
              cardFace: "front",
              trayFeedback: null,
              inputLockout: { side, until: time + 700 },
              lastInteractionAt: time,
            };
          }

          if (isInteractiveMenuPhase(state.phase)) {
            return state;
          }

          return {
            phase: state.onboardingCompleted ? "browseWheel" : "onboarding",
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
          if (state.phase !== "onboardingIntroConfirmation") {
            return state;
          }

          return {
            phase: "onboardingNavigate",
            trayFeedback: null,
            inputLockout: null,
            lastInteractionAt: time,
          };
        });
      },

      navigateOnboarding: (direction, side, time = Date.now()) => {
        set((state) => {
          if (
            state.phase !== "onboardingNavigate" ||
            !canUseSide(state, side, time)
          ) {
            return state;
          }

          const offset = direction === "next" ? 1 : -1;
          const previousCompleted =
            state.onboardingNavigatePreviousCompleted ||
            direction === "previous";
          const nextCompleted =
            state.onboardingNavigateNextCompleted || direction === "next";

          return {
            onboardingNavigatePosition:
              (state.onboardingNavigatePosition + offset + 3) % 3,
            onboardingNavigatePreviousCompleted: previousCompleted,
            onboardingNavigateNextCompleted: nextCompleted,
            phase:
              previousCompleted && nextCompleted
                ? "onboardingNavigateConfirmation"
                : "onboardingNavigate",
            inputLockout: { side, until: time + 700 },
            lastInteractionAt: time,
          };
        });
      },

      completeOnboardingNavigation: (time = Date.now()) => {
        set((state) => {
          if (state.phase !== "onboardingNavigateConfirmation") {
            return state;
          }

          return {
            phase: "onboardingAdd",
            onboardingNavigatePosition: 0,
            onboardingNavigatePreviousCompleted: false,
            onboardingNavigateNextCompleted: false,
            inputLockout: null,
            lastInteractionAt: time,
          };
        });
      },

      addOnboardingCocktail: (side, time = Date.now()) => {
        set((state) => {
          if (
            state.phase !== "onboardingAdd" ||
            !canUseSide(state, side, time)
          ) {
            return state;
          }

          return {
            phase: "onboardingAddConfirmation",
            inputLockout: { side, until: time + 700 },
            lastInteractionAt: time,
          };
        });
      },

      completeOnboardingAdd: (time = Date.now()) => {
        set((state) => {
          if (state.phase !== "onboardingAddConfirmation") {
            return state;
          }

          return {
            phase: "onboardingRemove",
            inputLockout: null,
            lastInteractionAt: time,
          };
        });
      },

      removeOnboardingCocktail: (side, time = Date.now()) => {
        set((state) => {
          if (
            state.phase !== "onboardingRemove" ||
            !canUseSide(state, side, time)
          ) {
            return state;
          }

          return {
            phase: "onboardingRemoveConfirmation",
            inputLockout: { side, until: time + 700 },
            lastInteractionAt: time,
          };
        });
      },

      completeOnboardingRemove: (time = Date.now()) => {
        set((state) => {
          if (state.phase !== "onboardingRemoveConfirmation") {
            return state;
          }

          return {
            phase: state.onboardingCompleted ? "browseWheel" : "onboarding",
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

          if (!isInteractiveMenuPhase(state.phase)) {
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
            !isInteractiveMenuPhase(state.phase) ||
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
            !isInteractiveMenuPhase(state.phase) ||
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
            !isInteractiveMenuPhase(state.phase) ||
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
            !isInteractiveMenuPhase(state.phase) ||
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
            !isInteractiveMenuPhase(state.phase) ||
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
          if (!isInteractiveMenuPhase(state.phase)) {
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
