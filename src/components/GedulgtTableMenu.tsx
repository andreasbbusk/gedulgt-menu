import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type RefObject,
} from "react";
import { useGSAP } from "@gsap/react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import gsap from "gsap";
import { useShallow } from "zustand/react/shallow";
import { FEEDBACK_SETTLE_MS, cx } from "./table/utils";
import { Dormant } from "./table/Dormant";
import { Guide } from "./table/Guide";
import { Tray } from "./table/Tray";
import { Wheel } from "./table/Wheel";
import { usePointerInput } from "./table/usePointerInput";
import {
  getFocusedDrink,
  getSelectedDrinkItems,
  getTotalSelectedCount,
  getWheelSlots,
} from "../domain/menu";
import { useGestureEngine } from "../gestures/useGestureEngine";
import {
  INACTIVITY_TIMEOUT_MS,
  useGedulgtTableStore,
  type ExperiencePhase,
  type GedulgtTableStore,
  type TableSide,
} from "../store/gedulgtTableStore";

type GedulgtTableMenuProps = {
  gesturesEnabled: boolean;
};

export function GedulgtTableMenu({ gesturesEnabled }: GedulgtTableMenuProps) {
  const tableRef = useRef<HTMLElement | null>(null);
  const {
    phase,
    focusedDrinkId,
    wheelPosition,
    cardFace,
    selectedItems,
    onboardingStep,
    feedback,
    lastInteractionAt,
    activate,
    deactivate,
    rotateWheel,
    focusDrink,
    toggleCardFace,
    addFocusedToTray,
    decrementTrayItem,
    inactivityTimeout,
    clearTrayFeedback,
  } = useGedulgtTableStore(
    useShallow((state) => ({
      phase: state.phase,
      focusedDrinkId: state.focusedDrinkId,
      wheelPosition: state.wheelPosition,
      cardFace: state.cardFace,
      selectedItems: state.selectedItems,
      onboardingStep: state.onboardingStep,
      feedback: state.trayFeedback,
      lastInteractionAt: state.lastInteractionAt,
      activate: state.activate,
      deactivate: state.deactivate,
      rotateWheel: state.rotateWheel,
      focusDrink: state.focusDrink,
      toggleCardFace: state.toggleCardFace,
      addFocusedToTray: state.addFocusedToTray,
      decrementTrayItem: state.decrementTrayItem,
      inactivityTimeout: state.inactivityTimeout,
      clearTrayFeedback: state.clearTrayFeedback,
    })),
  );

  const focusedDrink = useMemo(
    () => getFocusedDrink({ focusedDrinkId }),
    [focusedDrinkId],
  );
  const wheelSlots = useMemo(
    () => getWheelSlots({ focusedDrinkId }),
    [focusedDrinkId],
  );
  const selectedDrinks = useMemo(
    () => getSelectedDrinkItems(selectedItems),
    [selectedItems],
  );
  const selectedCount = useMemo(
    () => getTotalSelectedCount(selectedItems),
    [selectedItems],
  );

  const pointer = usePointerInput({
    tableRef,
    onAdd: addFocusedToTray,
    onRotate: rotateWheel,
  });

  const { videoRef } = useGestureEngine({ enabled: gesturesEnabled });

  useAmbientMotion(tableRef);
  usePhaseGlow(tableRef, phase);

  const lastInteractionRef = useRef(lastInteractionAt);

  useEffect(() => {
    lastInteractionRef.current = lastInteractionAt;
  }, [lastInteractionAt]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timer = window.setTimeout(() => {
      clearTrayFeedback(Date.now());
    }, FEEDBACK_SETTLE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [clearTrayFeedback, feedback]);

  useEffect(() => {
    if (!isInteractiveMenuPhase(phase)) {
      return;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();

      if (now - lastInteractionRef.current >= INACTIVITY_TIMEOUT_MS) {
        inactivityTimeout(now);
      }
    }, 1_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [inactivityTimeout, phase]);

  useKeyboardInput({
    phase,
    activate,
    deactivate,
    rotateWheel,
    toggleCardFace,
    addFocusedToTray,
  });

  const handleDrinkClick = useCallback(
    (drinkId: string, side: TableSide) => {
      if (drinkId === focusedDrinkId) {
        toggleCardFace(side);
        return;
      }

      focusDrink(drinkId, side);
      toggleCardFace(side);
    },
    [focusDrink, focusedDrinkId, toggleCardFace],
  );

  return (
    <section
      ref={tableRef}
      className={cx("projection-table", `projection-table--${phase}`)}
      style={
        {
          "--drink-accent":
            (focusedDrink as typeof focusedDrink & { accent?: string })
              .accent ?? "#78b99a",
        } as CSSProperties
      }
      aria-label="Gedulgt Table Menu"
      data-gestures={gesturesEnabled ? "enabled" : "disabled"}
      {...pointer}
    >
      <video
        ref={videoRef}
        style={{ display: "none" }}
        aria-hidden="true"
        tabIndex={-1}
      >
        <track kind="captions" />
      </video>

      {phase === "dormant" ? (
        <Dormant />
      ) : (
        <>
          <Wheel
            slots={wheelSlots}
            wheelPosition={wheelPosition}
            cardFace={cardFace}
            onDrinkClick={handleDrinkClick}
          />
          <Tray
            items={selectedDrinks}
            totalCount={selectedCount}
            feedback={feedback}
            onDecrement={(drinkId, side) => decrementTrayItem(drinkId, side)}
          />
          {phase === "onboarding" && <Guide step={onboardingStep} />}
        </>
      )}
    </section>
  );
}

function useAmbientMotion(tableRef: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const table = tableRef.current;

      if (!table) {
        return;
      }

      const q = gsap.utils.selector(table);

      const tl = gsap.timeline({ repeat: -1 });

      tl.to(
        q(".projection-table__smoke--a"),
        {
          xPercent: 4,
          yPercent: -3,
          scale: 1.08,
          rotation: 3,
          duration: 13,
          yoyo: true,
          repeat: 1,
          ease: "sine.inOut",
        },
        0,
      )
        .to(
          q(".projection-table__smoke--b"),
          {
            xPercent: -5,
            yPercent: 4,
            scale: 1.12,
            rotation: -4,
            duration: 17,
            yoyo: true,
            repeat: 1,
            ease: "sine.inOut",
          },
          0,
        )
        .to(
          q(".projection-table__prism"),
          { rotation: 360, duration: 28, ease: "none" },
          0,
        )
        .to(
          q(".projection-table__light-pool"),
          {
            scale: 1.04,
            autoAlpha: 0.86,
            duration: 5.5,
            yoyo: true,
            repeat: 1,
            ease: "sine.inOut",
          },
          0,
        )
        .to(
          q(".projection-table__grain"),
          {
            x: 18,
            y: -14,
            duration: 9,
            yoyo: true,
            repeat: 1,
            ease: "steps(5)",
          },
          0,
        );

      return () => {
        tl.kill();
      };
    },
    { scope: tableRef },
  );
}

function usePhaseGlow(tableRef: RefObject<HTMLElement | null>, phase: string) {
  useGSAP(
    () => {
      const table = tableRef.current;

      if (!table) {
        return;
      }

      gsap.to(table, {
        "--phase-glow": phase === "dormant" ? 0.18 : 0.38,
        "--phase-scale": phase === "dormant" ? 0.985 : 1,
        duration: 0.72,
        ease: "power3.out",
        overwrite: "auto",
      });
    },
    { dependencies: [phase], scope: tableRef },
  );
}

function isInteractiveMenuPhase(phase: ExperiencePhase) {
  return (
    phase === "onboarding" ||
    phase === "browseWheel" ||
    phase === "trayFeedback"
  );
}

type KeyboardInput = {
  phase: ExperiencePhase;
  activate: GedulgtTableStore["activate"];
  deactivate: GedulgtTableStore["deactivate"];
  rotateWheel: GedulgtTableStore["rotateWheel"];
  toggleCardFace: GedulgtTableStore["toggleCardFace"];
  addFocusedToTray: GedulgtTableStore["addFocusedToTray"];
};

function useKeyboardInput({
  phase,
  activate,
  deactivate,
  rotateWheel,
  toggleCardFace,
  addFocusedToTray,
}: KeyboardInput) {
  const activateOr = useCallback(
    (callback: () => void) => {
      if (phase === "dormant") {
        activate("near");
        return;
      }

      callback();
    },
    [activate, phase],
  );

  useHotkeys(
    [
      {
        hotkey: "Escape",
        callback: () => {
          if (isInteractiveMenuPhase(phase)) {
            deactivate("near");
          }
        },
      },
      {
        hotkey: "ArrowLeft",
        callback: () => activateOr(() => rotateWheel("previous", "near")),
      },
      {
        hotkey: "ArrowRight",
        callback: () => activateOr(() => rotateWheel("next", "near")),
      },
      {
        hotkey: "Enter",
        callback: () => activateOr(() => toggleCardFace("near")),
      },
      {
        hotkey: "Space",
        callback: () => activateOr(() => addFocusedToTray("near")),
      },
    ],
    { preventDefault: true, stopPropagation: false },
  );
}
