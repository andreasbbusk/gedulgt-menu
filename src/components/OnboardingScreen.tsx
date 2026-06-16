import { useEffect } from "react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { useShallow } from "zustand/react/shallow";
import { useGestureEngine } from "../gestures/useGestureEngine";
import { useGedulgtTableStore } from "../store/gedulgtTableStore";
import { OnboardingIntro } from "./table/OnboardingIntro";

type OnboardingScreenProps = {
  gesturesEnabled: boolean;
};

export function OnboardingScreen({ gesturesEnabled }: OnboardingScreenProps) {
  const { phase, activate, completeActivation } = useGedulgtTableStore(
    useShallow((state) => ({
      phase: state.phase,
      activate: state.activate,
      completeActivation: state.completeActivation,
    })),
  );
  const { videoRef } = useGestureEngine({ enabled: gesturesEnabled });

  useEffect(() => {
    if (phase !== "onboardingConfirmation") {
      return;
    }

    const timer = window.setTimeout(() => {
      completeActivation(Date.now());
    }, 950);

    return () => {
      window.clearTimeout(timer);
    };
  }, [completeActivation, phase]);

  useHotkeys(
    [
      {
        hotkey: "ArrowLeft",
        callback: () => activate("near"),
      },
      {
        hotkey: "ArrowRight",
        callback: () => activate("near"),
      },
      {
        hotkey: "Enter",
        callback: () => activate("near"),
      },
      {
        hotkey: "Space",
        callback: () => activate("near"),
      },
    ],
    { preventDefault: true, stopPropagation: false },
  );

  return (
    <section
      className="onboarding-screen"
      aria-label="Gedulgt Onboarding"
      data-gestures={gesturesEnabled ? "enabled" : "disabled"}
    >
      <video
        ref={videoRef}
        style={{ display: "none" }}
        aria-hidden="true"
        tabIndex={-1}
      >
        <track kind="captions" />
      </video>
      <OnboardingIntro confirmed={phase === "onboardingConfirmation"} />
    </section>
  );
}
