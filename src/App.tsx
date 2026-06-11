import { useEffect, useState } from "react";
import { GedulgtTableMenu } from "./components/GedulgtTableMenu";
import { TrackingPreview } from "./components/TrackingPreview";
import { useHandTracking } from "./hooks/useHandTracking";

const PREVIEW_QUERY_KEYS = ["preview", "cameraPreview", "camera"] as const;

function isEnabledParamValue(value: string | null) {
  return value === "" || value === "1" || value === "true" || value === "open";
}

function getInitialCameraPreviewOpen() {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);

  return PREVIEW_QUERY_KEYS.some((key) => isEnabledParamValue(params.get(key)));
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
  const { videoRef, trackingRef } = useHandTracking({
    enabled: cameraPreviewOpen,
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
      <GedulgtTableMenu />
      <TrackingPreview
        videoRef={videoRef}
        trackingRef={trackingRef}
        open={cameraPreviewOpen}
      />
    </main>
  );
}

export default App;
