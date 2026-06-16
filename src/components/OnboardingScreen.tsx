import { useCallback, useEffect, useRef } from "react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { useShallow } from "zustand/react/shallow";
import { useGestureEngine } from "../gestures/useGestureEngine";
import { useGedulgtTableStore } from "../store/gedulgtTableStore";
import { OnboardingAddLayer } from "./OnboardingAddLayer";
import { OnboardingNavigateLayer } from "./OnboardingNavigateLayer";
import { OnboardingIntro } from "./table/OnboardingIntro";
import { usePointerInput } from "./table/usePointerInput";

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
    })),
  );
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
      {phase === "onboardingNavigate" ||
      phase === "onboardingNavigateConfirmation" ? (
        <OnboardingNavigateLayer
          position={onboardingNavigatePosition}
          confirmed={phase === "onboardingNavigateConfirmation"}
          onRotate={navigateOnboarding}
        />
      ) : phase === "onboardingAdd" || phase === "onboardingAddConfirmation" ? (
        <OnboardingAddLayer confirmed={phase === "onboardingAddConfirmation"} />
      ) : (
        <OnboardingIntro confirmed={phase === "onboardingIntroConfirmation"} />
      )}
    </section>
  );
}
