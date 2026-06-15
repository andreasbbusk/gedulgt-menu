import { useState } from "react";
import { GedulgtTableMenu } from "./components/GedulgtTableMenu";

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

  return (
    <main className="tabletop-menu">
      <GedulgtTableMenu gesturesEnabled={gestureTrackingEnabled} />
    </main>
  );
}

export default App;
