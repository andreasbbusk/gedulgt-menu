import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { useShallow } from "zustand/react/shallow";
import { useGestureEngine } from "../gestures/useGestureEngine";
import { useGedulgtTableStore } from "../store/gedulgtTableStore";
import { OnboardingAddLayer } from "./OnboardingAddLayer";
import { OnboardingNavigateLayer } from "./OnboardingNavigateLayer";
import { OnboardingRemoveLayer } from "./OnboardingRemoveLayer";
import { OnboardingIntro } from "./table/OnboardingIntro";
import { usePointerInput } from "./table/usePointerInput";

const ONBOARDING_REMOVE_SWIPE_DISTANCE = 94;

type OnboardingScreenProps = {
  gesturesEnabled: boolean;
};

export function OnboardingScreen({ gesturesEnabled }: OnboardingScreenProps) {
  const screenRef = useRef<HTMLElement | null>(null);
  const {
    phase,
    onboardingNavigatePosition,
    activate,
    completeActivation,
    navigateOnboarding,
    completeOnboardingNavigation,
    addOnboardingCocktail,
    completeOnboardingAdd,
    removeOnboardingCocktail,
    completeOnboardingRemove,
  } = useGedulgtTableStore(
    useShallow((state) => ({
      phase: state.phase,
      onboardingNavigatePosition: state.onboardingNavigatePosition,
      activate: state.activate,
      completeActivation: state.completeActivation,
      navigateOnboarding: state.navigateOnboarding,
      completeOnboardingNavigation: state.completeOnboardingNavigation,
      addOnboardingCocktail: state.addOnboardingCocktail,
      completeOnboardingAdd: state.completeOnboardingAdd,
      removeOnboardingCocktail: state.removeOnboardingCocktail,
      completeOnboardingRemove: state.completeOnboardingRemove,
    })),
  );
  const removePointerStartRef = useRef<{
    pointerId: number;
    y: number;
  } | null>(null);
  const { videoRef } = useGestureEngine({ enabled: gesturesEnabled });
  const pointer = usePointerInput({
    tableRef: screenRef,
    onAdd: addOnboardingCocktail,
    onRotate: navigateOnboarding,
  });

  useEffect(() => {
    if (phase !== "onboardingIntroConfirmation") {
      return;
    }

    const timer = window.setTimeout(() => {
      completeActivation(Date.now());
    }, 950);

    return () => {
      window.clearTimeout(timer);
    };
  }, [completeActivation, phase]);

  useEffect(() => {
    if (phase !== "onboardingNavigateConfirmation") {
      return;
    }

    const timer = window.setTimeout(() => {
      completeOnboardingNavigation(Date.now());
    }, 950);

    return () => {
      window.clearTimeout(timer);
    };
  }, [completeOnboardingNavigation, phase]);

  useEffect(() => {
    if (phase !== "onboardingAddConfirmation") {
      return;
    }

    const timer = window.setTimeout(() => {
      completeOnboardingAdd(Date.now());
    }, 1_350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [completeOnboardingAdd, phase]);

  useEffect(() => {
    if (phase !== "onboardingRemoveConfirmation") {
      return;
    }

    const timer = window.setTimeout(() => {
      completeOnboardingRemove(Date.now());
    }, 1_050);

    return () => {
      window.clearTimeout(timer);
    };
  }, [completeOnboardingRemove, phase]);

  const handleForward = useCallback(() => {
    if (phase === "onboardingIntro") {
      activate("near");
      return;
    }

    if (phase === "onboardingNavigate") {
      navigateOnboarding("next", "near");
    }
  }, [activate, navigateOnboarding, phase]);

  const handleBack = useCallback(() => {
    if (phase === "onboardingIntro") {
      activate("near");
      return;
    }

    if (phase === "onboardingNavigate") {
      navigateOnboarding("previous", "near");
    }
  }, [activate, navigateOnboarding, phase]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      pointer.onPointerDown(event);

      if (phase !== "onboardingRemove") {
        removePointerStartRef.current = null;
        return;
      }

      const startedOnDrink = Boolean(
        (event.target as HTMLElement).closest("[data-focused-card='true']"),
      );

      removePointerStartRef.current = startedOnDrink
        ? { pointerId: event.pointerId, y: event.clientY }
        : null;
    },
    [phase, pointer],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      pointer.onPointerMove(event);

      const removeStart = removePointerStartRef.current;

      if (
        phase !== "onboardingRemove" ||
        !removeStart ||
        removeStart.pointerId !== event.pointerId
      ) {
        return;
      }

      if (event.clientY - removeStart.y >= ONBOARDING_REMOVE_SWIPE_DISTANCE) {
        removePointerStartRef.current = null;
        removeOnboardingCocktail("near");
      }
    },
    [phase, pointer, removeOnboardingCocktail],
  );

  const handlePointerEnd = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      pointer.onPointerUp(event);

      if (removePointerStartRef.current?.pointerId === event.pointerId) {
        removePointerStartRef.current = null;
      }
    },
    [pointer],
  );

  useHotkeys(
    [
      {
        hotkey: "ArrowLeft",
        callback: handleBack,
      },
      {
        hotkey: "ArrowRight",
        callback: handleForward,
      },
      {
        hotkey: "Enter",
        callback: handleForward,
      },
      {
        hotkey: "Space",
        callback: handleForward,
      },
    ],
    { preventDefault: true, stopPropagation: false },
  );

  return (
    <section
      ref={screenRef}
      className="onboarding-screen"
      aria-label="Gedulgt Onboarding"
      data-gestures={gesturesEnabled ? "enabled" : "disabled"}
      onClickCapture={pointer.onClickCapture}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
    >
      <video
        ref={videoRef}
        style={{ display: "none" }}
        aria-hidden="true"
        tabIndex={-1}
      >
        <track kind="captions" />
      </video>
      {phase === "onboardingNavigate" ||
      phase === "onboardingNavigateConfirmation" ? (
        <OnboardingNavigateLayer
          position={onboardingNavigatePosition}
          confirmed={phase === "onboardingNavigateConfirmation"}
          onRotate={navigateOnboarding}
        />
      ) : phase === "onboardingAdd" || phase === "onboardingAddConfirmation" ? (
        <OnboardingAddLayer confirmed={phase === "onboardingAddConfirmation"} />
      ) : phase === "onboardingRemove" ||
        phase === "onboardingRemoveConfirmation" ? (
        <OnboardingRemoveLayer
          confirmed={phase === "onboardingRemoveConfirmation"}
        />
      ) : (
        <OnboardingIntro confirmed={phase === "onboardingIntroConfirmation"} />
      )}
    </section>
  );
}
