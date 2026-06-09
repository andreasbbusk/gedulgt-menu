import type { ScreenPoint } from "../config/tableCalibration";
import type { TrackingQuality } from "./useHandTracking";

export type SwipeDirection = "left" | "right";
export type InteractionContext = "browse" | "detail";
export type HandPose = "unknown" | "open" | "fist";

export type GestureState =
  | "show-hand"
  | "aim"
  | "armed"
  | "pressing"
  | "swiping"
  | "out-of-bounds"
  | "reset-hand"
  | "selected";

export type GestureCoreConfig = {
  fistMinMs: number;
  fistMaxMs: number;
  fistMoveTolerance: number;
  fistReleaseMaxMs: number;
  intentDelayMs: number;
  selectionCooldownMs: number;
  swipeConfirmDistance: number;
  swipeConfirmMs: number;
  swipeCooldownMs: number;
  swipeDirectionAgreement: number;
  swipeDirectionMinSamples: number;
  swipeDirectionWindowMs: number;
  swipeMaxMs: number;
  swipeMaxOffAxisDistance: number;
  swipeMinDistance: number;
  swipeMinMs: number;
  swipeMinVelocity: number;
  swipeRecenterDistance: number;
  swipeRecenterHoldMs: number;
  swipeSegmentMinDistance: number;
  swipeAxis: "x" | "y" | "auto";
  swipeInvert: boolean;
  swipeSmoothing: number;
};

export type GestureCoreInput = {
  hasHand: boolean;
  point: ScreenPoint | null;
  targetId: string | null;
  handPose?: HandPose;
  isPinching?: boolean;
  insideProjection: boolean;
  interactionContext: InteractionContext;
  trackingQuality?: TrackingQuality;
  time: number;
};

export type GestureCoreState = {
  activePose: HandPose;
  cooldownUntil: number;
  fistConsumed: boolean;
  poseStartedAt: number;
  pressedTarget: string | null;
  pressStartedAt: number;
  pressPoint: ScreenPoint | null;
  pendingSwipeDirection: SwipeDirection | null;
  pendingSwipeStartedAt: number;
  smoothedPoint: ScreenPoint | null;
  swipeRecenterHoldStartedAt: number;
  swipeRecenterPoint: ScreenPoint | null;
  swipeSamples: SwipeMotionSample[];
  swipeStartedAt: number;
  swipeStartPoint: ScreenPoint | null;
  swipeLastPoint: ScreenPoint | null;
};

type SwipeAxis = "x" | "y";

type SwipeMotionSample = {
  point: ScreenPoint;
  time: number;
};

export type GestureCoreEvent = {
  hoverTarget: string | null;
  pressedTarget: string | null;
  selectedTarget: string | null;
  swipeDirection: SwipeDirection | null;
  gestureState: GestureState;
  gestureText: string;
};

export function getGestureConfig(width: number, height: number): GestureCoreConfig {
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);

  return {
    fistMinMs: 220,
    fistMaxMs: 1200,
    fistMoveTolerance: Math.max(82, Math.min(safeWidth, safeHeight) * 0.1),
    fistReleaseMaxMs: 2400,
    intentDelayMs: 110,
    selectionCooldownMs: 680,
    swipeConfirmDistance: Math.max(18, Math.min(36, safeWidth * 0.02)),
    swipeConfirmMs: 48,
    swipeCooldownMs: 920,
    swipeDirectionAgreement: 0.58,
    swipeDirectionMinSamples: 2,
    swipeDirectionWindowMs: 180,
    swipeMaxMs: 1220,
    swipeMaxOffAxisDistance: Math.max(180, safeHeight * 0.36),
    swipeMinDistance: Math.max(96, Math.min(210, safeWidth * 0.105)),
    swipeMinMs: 90,
    swipeMinVelocity: 0.2,
    swipeRecenterDistance: Math.max(
      56,
      Math.min(128, Math.min(safeWidth, safeHeight) * 0.075),
    ),
    swipeRecenterHoldMs: 180,
    swipeSegmentMinDistance: 2.5,
    swipeAxis: getSwipeAxisOption(),
    swipeInvert: getBooleanGestureOption("swipeInvert", "gedulgt:swipe-invert", false),
    swipeSmoothing: 0.5,
  };
}

function getSwipeAxisOption(): GestureCoreConfig["swipeAxis"] {
  if (typeof window === "undefined") {
    return "auto";
  }

  const queryValue = new URLSearchParams(window.location.search).get("swipeAxis");
  const storedValue = safeGetLocalStorageValue("gedulgt:swipe-axis");
  const value = queryValue ?? storedValue;

  if (value === "x" || value === "y" || value === "auto") {
    return value;
  }

  return "auto";
}

function getBooleanGestureOption(
  queryKey: string,
  storageKey: string,
  fallback: boolean,
) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const queryValue = new URLSearchParams(window.location.search).get(queryKey);

  if (queryValue === "0" || queryValue === "false") {
    return false;
  }

  if (queryValue === "1" || queryValue === "true") {
    return true;
  }

  const storedValue = safeGetLocalStorageValue(storageKey);

  if (storedValue === "0" || storedValue === "false") {
    return false;
  }

  if (storedValue === "1" || storedValue === "true") {
    return true;
  }

  return fallback;
}

function safeGetLocalStorageValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function createGestureCoreState(): GestureCoreState {
  return {
    activePose: "unknown",
    cooldownUntil: 0,
    fistConsumed: false,
    poseStartedAt: 0,
    pressedTarget: null,
    pressStartedAt: 0,
    pressPoint: null,
    pendingSwipeDirection: null,
    pendingSwipeStartedAt: 0,
    smoothedPoint: null,
    swipeRecenterHoldStartedAt: 0,
    swipeRecenterPoint: null,
    swipeSamples: [],
    swipeStartedAt: 0,
    swipeStartPoint: null,
    swipeLastPoint: null,
  };
}

function getDistance(first: ScreenPoint, second: ScreenPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function smoothPoint(
  previousPoint: ScreenPoint | null,
  nextPoint: ScreenPoint,
  smoothing: number,
) {
  if (!previousPoint) {
    return nextPoint;
  }

  return {
    x: previousPoint.x + (nextPoint.x - previousPoint.x) * smoothing,
    y: previousPoint.y + (nextPoint.y - previousPoint.y) * smoothing,
  };
}

function getInputPose(input: GestureCoreInput): HandPose {
  if (input.handPose) {
    return input.handPose;
  }

  return input.isPinching ? "fist" : "unknown";
}

function applyPose(
  state: GestureCoreState,
  pose: HandPose,
  time: number,
): GestureCoreState {
  const poseChanged = state.activePose !== pose || state.poseStartedAt === 0;

  return {
    ...state,
    activePose: pose,
    fistConsumed:
      pose === "fist" && !poseChanged ? state.fistConsumed : false,
    poseStartedAt: poseChanged ? time : state.poseStartedAt,
  };
}

function resetPress(state: GestureCoreState): GestureCoreState {
  return {
    ...state,
    pressedTarget: null,
    pressStartedAt: 0,
    pressPoint: null,
  };
}

function resetSwipe(state: GestureCoreState): GestureCoreState {
  return {
    ...state,
    pendingSwipeDirection: null,
    pendingSwipeStartedAt: 0,
    swipeRecenterHoldStartedAt: 0,
    swipeRecenterPoint: null,
    swipeSamples: [],
    swipeStartedAt: 0,
    swipeStartPoint: null,
    swipeLastPoint: null,
  };
}

function resetInteraction(state: GestureCoreState): GestureCoreState {
  return resetSwipe(resetPress(state));
}

function resetAllMotion(state: GestureCoreState): GestureCoreState {
  return {
    ...resetInteraction(state),
    activePose: "unknown",
    fistConsumed: false,
    poseStartedAt: 0,
    smoothedPoint: null,
  };
}

function makeEvent(
  overrides: Partial<GestureCoreEvent> = {},
): GestureCoreEvent {
  const event: GestureCoreEvent = {
    hoverTarget: null,
    pressedTarget: null,
    selectedTarget: null,
    swipeDirection: null,
    gestureState: "show-hand",
    gestureText: "Show hand",
  };

  return { ...event, ...overrides };
}

function pressStayedCloseEnough(
  state: GestureCoreState,
  point: ScreenPoint,
  config: GestureCoreConfig,
) {
  return (
    state.pressPoint === null ||
    getDistance(state.pressPoint, point) <= config.fistMoveTolerance
  );
}

function isLockedControl(target: string | null) {
  return target === "back" || Boolean(target?.startsWith("nav:"));
}

function getSelectedText(target: string | null) {
  if (target === "back") {
    return "Closing";
  }

  if (target?.startsWith("nav:")) {
    return "Changing";
  }

  return "Opening";
}

function getReleaseText(target: string | null) {
  if (target === "back") {
    return "Release to close";
  }

  if (target?.startsWith("nav:")) {
    return "Release to change";
  }

  return "Release to open";
}

function getArmedText(context: InteractionContext, hoverTarget: string | null) {
  if (hoverTarget === "back") {
    return "Fist to close";
  }

  if (hoverTarget?.startsWith("nav:")) {
    return "Fist to change";
  }

  if (context === "detail") {
    return "Fist to close";
  }

  return "Open hand swipe / fist to open";
}

function getSwipeCue(
  point: ScreenPoint,
  startPoint: ScreenPoint,
  config: GestureCoreConfig,
) {
  const { axisDelta } = getSwipeDelta(point, startPoint, config);

  if (Math.abs(axisDelta) < 34) {
    return "Swipe left or right";
  }

  return axisDelta < 0 ? "Keep swiping left" : "Keep swiping right";
}

function getSwipeDelta(
  point: ScreenPoint,
  startPoint: ScreenPoint,
  config: GestureCoreConfig,
) {
  const deltaX = point.x - startPoint.x;
  const deltaY = point.y - startPoint.y;
  const axis =
    config.swipeAxis === "auto"
      ? Math.abs(deltaX) >= Math.abs(deltaY)
        ? "x"
        : "y"
      : config.swipeAxis;
  const rawDelta = axis === "x" ? deltaX : deltaY;

  return {
    axis,
    axisDelta: config.swipeInvert ? -rawDelta : rawDelta,
    crossAxisDelta: axis === "x" ? deltaY : deltaX,
  };
}

function appendSwipeSample(
  samples: SwipeMotionSample[],
  point: ScreenPoint,
  time: number,
  config: GestureCoreConfig,
) {
  const recentSamples = samples.filter(
    (sample) => time - sample.time <= config.swipeDirectionWindowMs,
  );
  const lastSample = recentSamples[recentSamples.length - 1];

  if (lastSample?.time === time) {
    return [...recentSamples.slice(0, -1), { point, time }];
  }

  return [...recentSamples, { point, time }];
}

function getSignedAxisDelta(
  firstPoint: ScreenPoint,
  secondPoint: ScreenPoint,
  axis: SwipeAxis,
  config: GestureCoreConfig,
) {
  const rawDelta =
    axis === "x"
      ? secondPoint.x - firstPoint.x
      : secondPoint.y - firstPoint.y;

  return config.swipeInvert ? -rawDelta : rawDelta;
}

function getReliableSwipeDirection(
  samples: SwipeMotionSample[],
  axis: SwipeAxis,
  config: GestureCoreConfig,
) {
  if (samples.length < config.swipeDirectionMinSamples) {
    return null;
  }

  const firstSample = samples[0];
  const lastSample = samples[samples.length - 1];
  const totalDelta = getSignedAxisDelta(
    firstSample.point,
    lastSample.point,
    axis,
    config,
  );
  const elapsed = Math.max(lastSample.time - firstSample.time, 1);
  const averageVelocity = totalDelta / elapsed;
  let leftMoves = 0;
  let rightMoves = 0;

  for (let index = 1; index < samples.length; index += 1) {
    const segmentDelta = getSignedAxisDelta(
      samples[index - 1].point,
      samples[index].point,
      axis,
      config,
    );

    if (Math.abs(segmentDelta) < config.swipeSegmentMinDistance) {
      continue;
    }

    if (segmentDelta < 0) {
      leftMoves += 1;
    } else {
      rightMoves += 1;
    }
  }

  const directionalMoves = leftMoves + rightMoves;

  if (
    directionalMoves === 0 ||
    Math.abs(averageVelocity) < config.swipeMinVelocity
  ) {
    return null;
  }

  const direction: SwipeDirection = totalDelta < 0 ? "left" : "right";
  const matchingMoves = direction === "left" ? leftMoves : rightMoves;
  const agreement = matchingMoves / directionalMoves;

  if (
    agreement < config.swipeDirectionAgreement ||
    (direction === "left" && averageVelocity >= 0) ||
    (direction === "right" && averageVelocity <= 0)
  ) {
    return null;
  }

  return direction;
}

export function updateGestureCore(
  state: GestureCoreState,
  input: GestureCoreInput,
  config: GestureCoreConfig,
) {
  if (!input.hasHand || !input.point) {
    return {
      state: resetAllMotion(state),
      event: makeEvent(),
    };
  }

  if (!input.insideProjection) {
    return {
      state: resetAllMotion(state),
      event: makeEvent({
        gestureState: "out-of-bounds",
        gestureText: "Move into the light",
      }),
    };
  }

  const pose = getInputPose(input);
  const point = smoothPoint(state.smoothedPoint, input.point, config.swipeSmoothing);
  const hoverTarget = input.targetId;
  const posedState = applyPose(
    {
      ...state,
      smoothedPoint: point,
    },
    pose,
    input.time,
  );
  const poseAge = input.time - posedState.poseStartedAt;
  const poseReady = poseAge >= config.intentDelayMs;

  if (input.time < state.cooldownUntil) {
    return {
      state: resetInteraction(posedState),
      event: makeEvent({
        hoverTarget,
        gestureState: "reset-hand",
        gestureText: pose === "fist" ? "Open hand to reset" : "Ready in a beat",
      }),
    };
  }

  if (input.trackingQuality === "none") {
    return {
      state: resetAllMotion(posedState),
      event: makeEvent(),
    };
  }

  const releasedFist = state.activePose === "fist" && pose !== "fist";
  const releasedPressDuration = input.time - state.pressStartedAt;

  if (
    releasedFist &&
    state.pressedTarget &&
    releasedPressDuration >= config.fistMinMs &&
    releasedPressDuration <= config.fistReleaseMaxMs
  ) {
    return {
      state: {
        ...resetInteraction(posedState),
        cooldownUntil: input.time + config.selectionCooldownMs,
      },
      event: makeEvent({
        hoverTarget,
        selectedTarget: state.pressedTarget,
        gestureState: "selected",
        gestureText: getSelectedText(state.pressedTarget),
      }),
    };
  }

  const canSwipe =
    input.interactionContext === "browse" &&
    (pose === "open" || pose === "unknown");

  if (canSwipe) {
    let baseState = resetPress({
      ...posedState,
      fistConsumed: false,
    });

    if (baseState.swipeRecenterPoint) {
      const isRecentered =
        getDistance(point, baseState.swipeRecenterPoint) <=
        config.swipeRecenterDistance;
      const recenterHoldStartedAt = isRecentered
        ? baseState.swipeRecenterHoldStartedAt || input.time
        : 0;
      const recenterReady =
        isRecentered &&
        input.time - recenterHoldStartedAt >= config.swipeRecenterHoldMs;

      if (!recenterReady) {
        return {
          state: {
            ...resetSwipe(baseState),
            swipeRecenterHoldStartedAt: recenterHoldStartedAt,
            swipeRecenterPoint: baseState.swipeRecenterPoint,
          },
          event: makeEvent({
            hoverTarget,
            gestureState: "reset-hand",
            gestureText: isRecentered ? "Hold hand steady" : "Re-center hand",
          }),
        };
      }

      baseState = resetSwipe(baseState);
    }

    if (pose === "open" && !poseReady) {
      return {
        state: resetSwipe(baseState),
        event: makeEvent({
          hoverTarget,
          gestureState: "armed",
          gestureText: "Hold open hand",
        }),
      };
    }

    const swipeSamples = appendSwipeSample(
      baseState.swipeSamples,
      point,
      input.time,
      config,
    );

    if (!baseState.swipeStartPoint) {
      return {
        state: {
          ...baseState,
          swipeSamples,
          swipeStartedAt: input.time,
          swipeStartPoint: point,
          swipeLastPoint: point,
        },
        event: makeEvent({
          hoverTarget,
          gestureState: "armed",
          gestureText: "Swipe left or right",
        }),
      };
    }

    const { axis, axisDelta, crossAxisDelta } = getSwipeDelta(
      point,
      baseState.swipeStartPoint,
      config,
    );
    const duration = input.time - baseState.swipeStartedAt;
    const speed = Math.abs(axisDelta) / Math.max(duration, 1);
    const offAxisLimit = Math.max(
      config.swipeMaxOffAxisDistance,
      Math.abs(axisDelta) * 1.05,
    );
    const offAxis =
      Math.abs(crossAxisDelta) > offAxisLimit &&
      Math.abs(crossAxisDelta) > Math.abs(axisDelta) * 1.35;
    const timedOut = duration > config.swipeMaxMs;
    const previousAxisDelta = baseState.swipeLastPoint
      ? getSignedAxisDelta(
          baseState.swipeStartPoint,
          baseState.swipeLastPoint,
          axis,
          config,
        )
      : axisDelta;
    const returnedTowardStart =
      Math.abs(previousAxisDelta) - Math.abs(axisDelta) >=
      Math.max(24, config.swipeRecenterDistance * 0.42);
    const abandonedPartialSwipe =
      duration >= config.swipeMinMs &&
      Math.abs(previousAxisDelta) >= config.swipeMinDistance * 0.58 &&
      Math.abs(axisDelta) < config.swipeMinDistance &&
      Math.abs(axisDelta) < Math.abs(previousAxisDelta) &&
      returnedTowardStart;

    if (offAxis || timedOut || abandonedPartialSwipe) {
      const shouldRecenter =
        getDistance(
          abandonedPartialSwipe ? baseState.swipeLastPoint ?? point : point,
          baseState.swipeStartPoint,
        ) >=
        config.swipeRecenterDistance;

      if (shouldRecenter) {
        return {
          state: {
            ...resetSwipe(baseState),
            swipeRecenterPoint: baseState.swipeStartPoint,
          },
          event: makeEvent({
            hoverTarget,
            gestureState: "reset-hand",
            gestureText: "Re-center hand",
          }),
        };
      }

      return {
        state: {
          ...resetSwipe(baseState),
          swipeSamples: [{ point, time: input.time }],
          swipeStartedAt: input.time,
          swipeStartPoint: point,
          swipeLastPoint: point,
        },
        event: makeEvent({
          hoverTarget,
          gestureState: "armed",
          gestureText: offAxis ? "Level hand swipe" : "Swipe again",
        }),
      };
    }

    if (
      duration >= config.swipeMinMs &&
      Math.abs(axisDelta) >= config.swipeMinDistance &&
      speed >= config.swipeMinVelocity
    ) {
      const thresholdDirection: SwipeDirection =
        axisDelta < 0 ? "left" : "right";
      const reliableDirection = getReliableSwipeDirection(
        swipeSamples,
        axis,
        config,
      );

      if (reliableDirection !== thresholdDirection) {
        return {
          state: {
            ...baseState,
            swipeSamples,
            pendingSwipeDirection: null,
            pendingSwipeStartedAt: 0,
            swipeLastPoint: point,
          },
          event: makeEvent({
            hoverTarget,
            gestureState: "swiping",
            gestureText: getSwipeCue(point, baseState.swipeStartPoint, config),
          }),
        };
      }

      const swipeDirection = thresholdDirection;
      const hasPendingSwipe =
        baseState.pendingSwipeDirection === swipeDirection &&
        baseState.pendingSwipeStartedAt > 0;
      const pendingDuration = input.time - baseState.pendingSwipeStartedAt;
      const hasFollowThrough =
        Math.abs(axisDelta) >=
        config.swipeMinDistance + config.swipeConfirmDistance;

      if (
        hasPendingSwipe &&
        (pendingDuration >= config.swipeConfirmMs || hasFollowThrough)
      ) {
        return {
          state: {
            ...resetSwipe(baseState),
            cooldownUntil: input.time + config.swipeCooldownMs,
          },
          event: makeEvent({
            hoverTarget,
            swipeDirection,
            gestureState: "selected",
            gestureText:
              swipeDirection === "left" ? "Swiped left" : "Swiped right",
          }),
        };
      }

      return {
        state: {
          ...baseState,
          swipeSamples,
          pendingSwipeDirection: swipeDirection,
          pendingSwipeStartedAt: hasPendingSwipe
            ? baseState.pendingSwipeStartedAt
            : input.time,
          swipeLastPoint: point,
        },
        event: makeEvent({
          hoverTarget,
          gestureState: "swiping",
          gestureText:
            swipeDirection === "left"
              ? "Keep swiping left"
              : "Keep swiping right",
        }),
      };
    }

    return {
      state: {
        ...baseState,
        swipeSamples,
        pendingSwipeDirection: null,
        pendingSwipeStartedAt: 0,
        swipeLastPoint: point,
      },
      event: makeEvent({
        hoverTarget,
        gestureState:
          Math.abs(axisDelta) > config.swipeMinDistance * 0.28
            ? "swiping"
            : "armed",
        gestureText: getSwipeCue(point, baseState.swipeStartPoint, config),
      }),
    };
  }

  if (pose === "fist") {
    const baseState = resetSwipe(posedState);

    if (baseState.fistConsumed) {
      return {
        state: resetPress(baseState),
        event: makeEvent({
          hoverTarget,
          gestureState: "reset-hand",
          gestureText: "Open hand to reset",
        }),
      };
    }

    const canStartPress = Boolean(hoverTarget);
    const shouldStartPress = !baseState.pressedTarget && canStartPress;
    const pressedTarget = shouldStartPress
      ? hoverTarget
      : baseState.pressedTarget;
    const pressPoint = shouldStartPress ? point : baseState.pressPoint;
    const pressStartedAt = shouldStartPress
      ? input.time
      : baseState.pressStartedAt;
    const pressState: GestureCoreState = {
      ...baseState,
      pressedTarget,
      pressPoint,
      pressStartedAt,
    };
    const stillValid =
      Boolean(pressedTarget) &&
      (isLockedControl(pressedTarget) ||
        pressStayedCloseEnough(pressState, point, config));
    const pressDuration = input.time - pressStartedAt;

    if (
      !pressedTarget ||
      !stillValid ||
      pressDuration > config.fistReleaseMaxMs
    ) {
      return {
        state: resetPress(pressState),
        event: makeEvent({
          hoverTarget,
          gestureState: "aim",
          gestureText: hoverTarget ? "Hold fist" : "Aim fist at card",
        }),
      };
    }

    return {
      state: {
        ...pressState,
        pressedTarget,
      },
      event: makeEvent({
        hoverTarget,
        pressedTarget,
        gestureState: "pressing",
        gestureText:
          poseReady && pressDuration >= config.fistMinMs
            ? getReleaseText(pressedTarget)
            : "Hold fist",
      }),
    };
  }

  return {
    state: resetInteraction(posedState),
    event: makeEvent({
      hoverTarget,
      gestureState: hoverTarget ? "armed" : "aim",
      gestureText: getArmedText(input.interactionContext, hoverTarget),
    }),
  };
}
