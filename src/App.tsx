import { useEffect, useState } from "react";
import { GedulgtTableMenu } from "./components/GedulgtTableMenu";
import { TrackingPreview } from "./components/TrackingPreview";
import { useHandTracking } from "./hooks/useHandTracking";

const PREVIEW_QUERY_KEYS = ["preview", "cameraPreview", "camera"] as const;
const GESTURE_QUERY_KEYS = ["gestures", "handTracking", "tracking"] as const;

function isEnabledParamValue(value: string | null) {
  return value === "" || value === "1" || value === "true" || value === "open";
}

function isDisabledParamValue(value: string | null) {
  return value === "0" || value === "false" || value === "off";
}

function getInitialCameraPreviewOpen() {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);

  return PREVIEW_QUERY_KEYS.some((key) => isEnabledParamValue(params.get(key)));
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

function shouldToggleCameraPreview(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }

  const key = event.key.toLowerCase();

  return event.code === "KeyC" || event.code === "KeyV" || key === "c" || key === "v";
}

function App() {
  const [cameraPreviewOpen, setCameraPreviewOpen] = useState(
    getInitialCameraPreviewOpen,
  );
  const [gestureTrackingEnabled] = useState(getInitialGestureTrackingEnabled);
  const handTrackingEnabled = gestureTrackingEnabled || cameraPreviewOpen;
  const { videoRef, trackingRef, status, error } = useHandTracking({
    enabled: handTrackingEnabled,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!shouldToggleCameraPreview(event)) {
        return;
      }

      event.preventDefault();
      setCameraPreviewOpen((open) => !open);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <main className="tabletop-menu">
      <GedulgtTableMenu
        gesturesEnabled={gestureTrackingEnabled}
        trackingRef={trackingRef}
      />
      <TrackingPreview
        videoRef={videoRef}
        trackingRef={trackingRef}
        open={cameraPreviewOpen}
        status={status}
        error={error}
        gesturesEnabled={gestureTrackingEnabled}
      />
    </main>
  );
}

export default App;
