import { useState } from "react";
import { GedulgtTableMenu } from "./components/GedulgtTableMenu";
import { OnboardingScreen } from "./components/OnboardingScreen";
import Silk from "./components/table/Silk";
import { useGedulgtTableStore } from "./store/gedulgtTableStore";

const GESTURE_QUERY_KEYS = ["gestures", "handTracking", "tracking"] as const;

function isEnabledParamValue(value: string | null) {
  return value === "" || value === "1" || value === "true" || value === "open";
}

function isDisabledParamValue(value: string | null) {
  return value === "0" || value === "false" || value === "off";
}

function getInitialGestureTrackingEnabled() {
  if (typeof window === "undefined") {
    return true;
  }

  const params = new URLSearchParams(window.location.search);

  if (GESTURE_QUERY_KEYS.some((key) => isDisabledParamValue(params.get(key)))) {
    return false;
  }

  if (GESTURE_QUERY_KEYS.some((key) => isEnabledParamValue(params.get(key)))) {
    return true;
  }

  try {
    const storedValue = window.localStorage.getItem("gedulgt:gestures-enabled");

    if (isDisabledParamValue(storedValue)) {
      return false;
    }

    if (isEnabledParamValue(storedValue)) {
      return true;
    }
  } catch {
    return true;
  }

  return true;
}

function App() {
  const [gestureTrackingEnabled] = useState(getInitialGestureTrackingEnabled);
  const phase = useGedulgtTableStore((s) => s.phase);
  const silkOpacity = phase === "dormant" ? 1 : 0.5;
  const showOnboardingScreen =
    phase === "onboardingIntro" ||
    phase === "onboardingIntroConfirmation" ||
    phase === "onboardingNavigate" ||
    phase === "onboardingNavigateConfirmation" ||
    phase === "onboardingAdd" ||
    phase === "onboardingAddConfirmation" ||
    phase === "onboardingRemove" ||
    phase === "onboardingRemoveConfirmation" ||
    phase === "onboardingFlip" ||
    phase === "onboardingFlipConfirmation";

  return (
    <main className="tabletop-menu">
      <div
        className="silk-background"
        aria-hidden="true"
        style={{ opacity: silkOpacity }}
      >
        <Silk
          speed={5}
          scale={1.2}
          color="#3a373d"
          noiseIntensity={1.5}
          rotation={0}
        />
      </div>
      {showOnboardingScreen ? (
        <OnboardingScreen gesturesEnabled={gestureTrackingEnabled} />
      ) : (
        <GedulgtTableMenu gesturesEnabled={gestureTrackingEnabled} />
      )}
    </main>
  );
}

export default App;
