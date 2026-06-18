import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { useShallow } from "zustand/react/shallow";
import { useGestureEngine } from "../gestures/useGestureEngine";
import { useGedulgtTableStore } from "../store/gedulgtTableStore";
import type {
  CardFace,
  ExperiencePhase,
  RotateDirection,
  TableSide,
} from "../store/gedulgtTableStore";
import { OnboardingAddLayer } from "./OnboardingAddLayer";
import { OnboardingFlipLayer } from "./OnboardingFlipLayer";
import { OnboardingNavigateLayer } from "./OnboardingNavigateLayer";
import { OnboardingReadyLayer } from "./OnboardingReadyLayer";
import { OnboardingRemoveLayer } from "./OnboardingRemoveLayer";
import { OnboardingIntro } from "./table/OnboardingIntro";
import { usePointerInput } from "./table/usePointerInput";
import { POINTER_INWARD_SWIPE } from "./table/utils";

const ONBOARDING_REMOVE_SWIPE_DISTANCE = POINTER_INWARD_SWIPE;
const ONBOARDING_STEP_TRANSITION_MS = 620;

type OnboardingLayerKey =
  | "intro"
  | "navigate"
  | "add"
  | "remove"
  | "flip"
  | "ready";

type OnboardingLayer = {
  key: OnboardingLayerKey;
  node: ReactNode;
};

type OnboardingLayerTransitionState = {
  activeLayer: OnboardingLayer;
  exitingLayer: OnboardingLayer | null;
};

type OnboardingLayerTransitionAction =
  | { type: "refresh"; layer: OnboardingLayer }
  | {
      type: "start";
      layer: OnboardingLayer;
      previousLayer: OnboardingLayer;
    }
  | { type: "finish"; exitingKey: OnboardingLayerKey };

type OnboardingLayerOptions = {
  phase: ExperiencePhase;
  onboardingNavigatePosition: number;
  onboardingNavigatePreviousCompleted: boolean;
  onboardingNavigateNextCompleted: boolean;
  onboardingFlipFace: CardFace;
  navigateOnboarding: (direction: RotateDirection, side: TableSide) => void;
  flipOnboardingCocktail: (side: TableSide) => void;
};

type OnboardingScreenProps = {
  gesturesEnabled: boolean;
};

export function OnboardingScreen({ gesturesEnabled }: OnboardingScreenProps) {
  const screenRef = useRef<HTMLElement | null>(null);
  const {
    phase,
    onboardingNavigatePosition,
    onboardingNavigatePreviousCompleted,
    onboardingNavigateNextCompleted,
    onboardingFlipFace,
    activate,
    completeActivation,
    navigateOnboarding,
    completeOnboardingNavigation,
    addOnboardingCocktail,
    completeOnboardingAdd,
    removeOnboardingCocktail,
    completeOnboardingRemove,
    flipOnboardingCocktail,
    completeOnboardingFlip,
    completeOnboardingReady,
  } = useGedulgtTableStore(
    useShallow((state) => ({
      phase: state.phase,
      onboardingNavigatePosition: state.onboardingNavigatePosition,
      onboardingNavigatePreviousCompleted:
        state.onboardingNavigatePreviousCompleted,
      onboardingNavigateNextCompleted: state.onboardingNavigateNextCompleted,
      onboardingFlipFace: state.onboardingFlipFace,
      activate: state.activate,
      completeActivation: state.completeActivation,
      navigateOnboarding: state.navigateOnboarding,
      completeOnboardingNavigation: state.completeOnboardingNavigation,
      addOnboardingCocktail: state.addOnboardingCocktail,
      completeOnboardingAdd: state.completeOnboardingAdd,
      removeOnboardingCocktail: state.removeOnboardingCocktail,
      completeOnboardingRemove: state.completeOnboardingRemove,
      flipOnboardingCocktail: state.flipOnboardingCocktail,
      completeOnboardingFlip: state.completeOnboardingFlip,
      completeOnboardingReady: state.completeOnboardingReady,
    })),
  );
  const removePointerStartRef = useRef<{
    pointerId: number;
    y: number;
  } | null>(null);
  const pointer = usePointerInput({
    tableRef: screenRef,
    onAdd: addOnboardingCocktail,
    onRotate: navigateOnboarding,
  });
  const currentLayer = useMemo(
    () =>
      getOnboardingLayer({
        phase,
        onboardingNavigatePosition,
        onboardingNavigatePreviousCompleted,
        onboardingNavigateNextCompleted,
        onboardingFlipFace,
        navigateOnboarding,
        flipOnboardingCocktail,
      }),
    [
      flipOnboardingCocktail,
      navigateOnboarding,
      onboardingFlipFace,
      onboardingNavigateNextCompleted,
      onboardingNavigatePosition,
      onboardingNavigatePreviousCompleted,
      phase,
    ],
  );
  const { isTransitioning, layers } =
    useOnboardingLayerTransition(currentLayer);
  const { videoRef } = useGestureEngine({
    enabled: gesturesEnabled && !isTransitioning,
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

  useEffect(() => {
    if (phase !== "onboardingFlipConfirmation") {
      return;
    }

    const timer = window.setTimeout(() => {
      completeOnboardingFlip(Date.now());
    }, 950);

    return () => {
      window.clearTimeout(timer);
    };
  }, [completeOnboardingFlip, phase]);

  useEffect(() => {
    if (phase !== "onboardingReady") {
      return;
    }

    const timer = window.setTimeout(() => {
      completeOnboardingReady(Date.now());
    }, 4_000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [completeOnboardingReady, phase]);

  const handleForward = useCallback(() => {
    if (isTransitioning) {
      return;
    }

    if (phase === "onboardingIntro") {
      activate("near");
      return;
    }

    if (phase === "onboardingNavigate") {
      navigateOnboarding("next", "near");
    }
  }, [activate, isTransitioning, navigateOnboarding, phase]);

  const handleBack = useCallback(() => {
    if (isTransitioning) {
      return;
    }

    if (phase === "onboardingIntro") {
      activate("near");
      return;
    }

    if (phase === "onboardingNavigate") {
      navigateOnboarding("previous", "near");
    }
  }, [activate, isTransitioning, navigateOnboarding, phase]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (isTransitioning) {
        return;
      }

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
    [isTransitioning, phase, pointer],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (isTransitioning) {
        return;
      }

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
    [isTransitioning, phase, pointer, removeOnboardingCocktail],
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
      aria-busy={isTransitioning ? "true" : "false"}
      data-gestures={gesturesEnabled ? "enabled" : "disabled"}
      data-transitioning={isTransitioning ? "true" : "false"}
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
      {layers}
    </section>
  );
}

function getOnboardingLayer({
  phase,
  onboardingNavigatePosition,
  onboardingNavigatePreviousCompleted,
  onboardingNavigateNextCompleted,
  onboardingFlipFace,
  navigateOnboarding,
  flipOnboardingCocktail,
}: OnboardingLayerOptions): OnboardingLayer {
  if (
    phase === "onboardingNavigate" ||
    phase === "onboardingNavigateConfirmation"
  ) {
    return {
      key: "navigate",
      node: (
        <OnboardingNavigateLayer
          position={onboardingNavigatePosition}
          confirmed={phase === "onboardingNavigateConfirmation"}
          previousCompleted={onboardingNavigatePreviousCompleted}
          nextCompleted={onboardingNavigateNextCompleted}
          onRotate={navigateOnboarding}
        />
      ),
    };
  }

  if (phase === "onboardingAdd" || phase === "onboardingAddConfirmation") {
    return {
      key: "add",
      node: (
        <OnboardingAddLayer confirmed={phase === "onboardingAddConfirmation"} />
      ),
    };
  }

  if (
    phase === "onboardingRemove" ||
    phase === "onboardingRemoveConfirmation"
  ) {
    return {
      key: "remove",
      node: (
        <OnboardingRemoveLayer
          confirmed={phase === "onboardingRemoveConfirmation"}
        />
      ),
    };
  }

  if (phase === "onboardingFlip" || phase === "onboardingFlipConfirmation") {
    return {
      key: "flip",
      node: (
        <OnboardingFlipLayer
          face={onboardingFlipFace}
          confirmed={phase === "onboardingFlipConfirmation"}
          onFlip={flipOnboardingCocktail}
        />
      ),
    };
  }

  if (phase === "onboardingReady") {
    return {
      key: "ready",
      node: <OnboardingReadyLayer />,
    };
  }

  return {
    key: "intro",
    node: (
      <OnboardingIntro confirmed={phase === "onboardingIntroConfirmation"} />
    ),
  };
}

function useOnboardingLayerTransition(layer: OnboardingLayer) {
  const [{ activeLayer, exitingLayer }, dispatch] = useReducer(
    onboardingLayerTransitionReducer,
    {
      activeLayer: layer,
      exitingLayer: null,
    },
  );
  const activeLayerRef = useRef(layer);

  useLayoutEffect(() => {
    if (layer.key === activeLayerRef.current.key) {
      activeLayerRef.current = layer;
      dispatch({ type: "refresh", layer });
      return;
    }

    const previousLayer = activeLayerRef.current;
    activeLayerRef.current = layer;
    dispatch({ type: "start", layer, previousLayer });

    const transitionDuration = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? 0
      : ONBOARDING_STEP_TRANSITION_MS;

    const timer = window.setTimeout(() => {
      dispatch({ type: "finish", exitingKey: previousLayer.key });
    }, transitionDuration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [layer]);

  const isTransitioning =
    exitingLayer !== null || layer.key !== activeLayer.key;

  return {
    isTransitioning,
    layers: (
      <>
        {exitingLayer ? (
          <div
            key={exitingLayer.key}
            className="onboarding-step-layer"
            data-transition-state="exiting"
            aria-hidden="true"
          >
            {exitingLayer.node}
          </div>
        ) : null}
        <div
          key={activeLayer.key}
          className="onboarding-step-layer"
          data-transition-state={exitingLayer ? "entering" : "present"}
        >
          {activeLayer.node}
        </div>
      </>
    ),
  };
}

function onboardingLayerTransitionReducer(
  state: OnboardingLayerTransitionState,
  action: OnboardingLayerTransitionAction,
): OnboardingLayerTransitionState {
  if (action.type === "refresh") {
    if (state.activeLayer === action.layer) {
      return state;
    }

    return {
      ...state,
      activeLayer: action.layer,
    };
  }

  if (action.type === "start") {
    return {
      activeLayer: action.layer,
      exitingLayer: action.previousLayer,
    };
  }

  if (state.exitingLayer?.key !== action.exitingKey) {
    return state;
  }

  return {
    ...state,
    exitingLayer: null,
  };
}
