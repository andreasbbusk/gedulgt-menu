import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { X } from "lucide-react";
import { DrinkCarousel } from "./components/DrinkCarousel";
import { TrackingPreview } from "./components/TrackingPreview";
import { VirtualCursor } from "./components/VirtualCursor";
import {
  GEDULGT_DRINKS,
  GEDULGT_SECTIONS,
  getSectionById,
  type GedulgtDrink,
  type GedulgtSection,
} from "./data/gedulgtDrinks";
import {
  useGestureController,
  type SwipeDirection,
} from "./hooks/useGestureController";
import { useHandTracking } from "./hooks/useHandTracking";

gsap.registerPlugin(useGSAP);

const SHOWCASE_DRINKS = GEDULGT_DRINKS.slice(0, 8);

type ViewMode = "browse" | "detail";
type ParsedGestureTarget =
  | { type: "drink"; id: string }
  | { type: "nav"; id: "previous" | "next" }
  | { type: "back" }
  | null;

const PREVIEW_QUERY_KEYS = ["preview", "cameraPreview", "camera"] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isEnabledParamValue(value: string | null) {
  if (value === null) {
    return false;
  }

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

  return (
    event.code === "KeyC" ||
    event.code === "KeyV" ||
    key === "c" ||
    key === "v"
  );
}

function getDrinkIndex(drinks: GedulgtDrink[], drinkId: string | null) {
  return Math.max(
    0,
    drinks.findIndex((drink) => drink.id === drinkId),
  );
}

function getDrinkAfterSwipe(
  drinks: GedulgtDrink[],
  currentDrinkId: string | null,
  direction: SwipeDirection,
) {
  const currentIndex = getDrinkIndex(drinks, currentDrinkId);
  const offset = direction === "left" ? 1 : -1;
  const nextIndex = (currentIndex + offset + drinks.length) % drinks.length;

  return drinks[nextIndex];
}

function getGestureTargetId(target: string | null) {
  if (!target) {
    return null;
  }

  const [type, id] = target.split(":");

  if (type === "drink" && id) {
    return { type, id } satisfies ParsedGestureTarget;
  }

  if (type === "nav" && (id === "previous" || id === "next")) {
    return { type, id } satisfies ParsedGestureTarget;
  }

  if (target === "back") {
    return { type: "back" } satisfies ParsedGestureTarget;
  }

  return null;
}

type DrinkDetailProps = {
  selectedDrink: GedulgtDrink;
  selectedDrinkSection: GedulgtSection;
  hoverTarget: string | null;
  pressedTarget: string | null;
  onClose: () => void;
};

function DrinkDetail({
  selectedDrink,
  selectedDrinkSection,
  hoverTarget,
  pressedTarget,
  onClose,
}: DrinkDetailProps) {
  const detailRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const detail = detailRef.current;

      if (!detail) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const q = gsap.utils.selector(detail);
      const tl = gsap.timeline({
        defaults: {
          duration: reduceMotion ? 0 : 0.54,
          ease: "power3.out",
        },
      });

      tl.fromTo(
        detail,
        { autoAlpha: 0, y: 0, scale: 0.965, rotationX: -4 },
        { autoAlpha: 1, y: 44, scale: 1, rotationX: 0 },
      ).fromTo(
        q(
          ".drink-detail__visual, .drink-detail__body, .drink-detail__flavors, .drink-detail__ingredients, .drink-detail__footer",
        ),
        { autoAlpha: 0, y: 0 },
        {
          autoAlpha: 1,
          y: 22,
          stagger: 0.05,
          duration: reduceMotion ? 0 : 0.42,
        },
        "<0.12",
      );
    },
    { dependencies: [selectedDrink.id], scope: detailRef },
  );

  return (
    <article ref={detailRef} className="drink-detail">
      <div className="drink-detail__header">
        <span>{selectedDrinkSection.title}</span>
        <button
          type="button"
          className={cx(
            "detail-close",
            hoverTarget === "back" && "detail-close--hovered",
            pressedTarget === "back" && "detail-close--pressed",
          )}
          onClick={onClose}
          data-gesture-target="back"
          aria-label="Close drink detail"
        >
          <X size={25} strokeWidth={1.7} aria-hidden="true" />
        </button>
      </div>

      <div className="drink-detail__content">
        <div
          className="drink-detail__visual"
          data-model-slot={selectedDrink.id}
          aria-hidden="true"
        >
          <span className="drink-detail__glass">
            <span className="drink-detail__liquid" />
          </span>
          <span className="drink-detail__halo" />
        </div>

        <div className="drink-detail__body">
          <h2>{selectedDrink.name}</h2>
          <p>{selectedDrink.description}</p>
        </div>
      </div>

      <div className="drink-detail__flavors" aria-label="Flavor profile">
        {selectedDrink.flavorTags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>

      <div className="drink-detail__ingredients">
        {selectedDrink.ingredients.map((ingredient) => (
          <span key={ingredient}>{ingredient}</span>
        ))}
      </div>

      <footer className="drink-detail__footer">
        <span>{selectedDrink.creator}</span>
        <strong>{selectedDrink.price}</strong>
      </footer>
    </article>
  );
}

type DetailStageProps = {
  selectedDrink: GedulgtDrink;
  selectedDrinkSection: GedulgtSection;
  hoverTarget: string | null;
  pressedTarget: string | null;
  onClose: () => void;
};

function DetailStage({
  selectedDrink,
  selectedDrinkSection,
  hoverTarget,
  pressedTarget,
  onClose,
}: DetailStageProps) {
  return (
    <section className="detail-stage" aria-label={selectedDrink.name}>
      <DrinkDetail
        selectedDrink={selectedDrink}
        selectedDrinkSection={selectedDrinkSection}
        hoverTarget={hoverTarget}
        pressedTarget={pressedTarget}
        onClose={onClose}
      />
    </section>
  );
}

function App() {
  const {
    videoRef,
    trackingRef,
    isFistClosed,
  } = useHandTracking();
  const [selectedDrinkId, setSelectedDrinkId] = useState(SHOWCASE_DRINKS[0].id);
  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [isCameraPreviewOpen, setIsCameraPreviewOpen] = useState(
    getInitialCameraPreviewOpen,
  );

  const selectedDrink = useMemo(
    () =>
      SHOWCASE_DRINKS.find((drink) => drink.id === selectedDrinkId) ??
      SHOWCASE_DRINKS[0],
    [selectedDrinkId],
  );
  const selectedDrinkSection =
    getSectionById(selectedDrink.sectionId) ?? GEDULGT_SECTIONS[0];

  const selectDrink = useCallback((drinkId: string, nextMode: ViewMode) => {
    const drink = SHOWCASE_DRINKS.find((candidate) => candidate.id === drinkId);

    if (!drink) {
      return;
    }

    setSelectedDrinkId(drink.id);
    setViewMode(nextMode);
  }, []);

  const moveDrink = useCallback((direction: SwipeDirection) => {
    if (viewMode !== "browse") {
      return;
    }

    setSelectedDrinkId((currentDrinkId) => {
      const drink = getDrinkAfterSwipe(
        SHOWCASE_DRINKS,
        currentDrinkId,
        direction,
      );

      return drink.id;
    });
  }, [viewMode]);

  const closeDetail = useCallback(() => {
    setViewMode("browse");
  }, []);

  const handleSelectTarget = useCallback(
    (targetId: string) => {
      const target = getGestureTargetId(targetId);

      if (!target) {
        return;
      }

      if (target.type === "drink") {
        selectDrink(target.id, "detail");
        return;
      }

      if (target.type === "nav") {
        moveDrink(target.id === "next" ? "left" : "right");
        return;
      }

      if (target.type === "back") {
        closeDetail();
      }
    },
    [closeDetail, moveDrink, selectDrink],
  );

  const gesture = useGestureController({
    trackingRef,
    interactionContext: viewMode,
    fallbackTargetId:
      viewMode === "browse" ? `drink:${selectedDrink.id}` : null,
    onSelectTarget: handleSelectTarget,
    onSwipe: moveDrink,
  });

  const hoveredTarget = getGestureTargetId(gesture.hoverTarget);
  const pressedTarget = getGestureTargetId(gesture.pressedTarget);
  const hoveredDrinkId = hoveredTarget?.type === "drink" ? hoveredTarget.id : null;
  const pressedDrinkId = pressedTarget?.type === "drink" ? pressedTarget.id : null;

  const handleKeyboardNavigation = useEffectEvent((event: KeyboardEvent) => {
    if (shouldToggleCameraPreview(event)) {
      event.preventDefault();
      setIsCameraPreviewOpen((currentValue) => !currentValue);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveDrink("right");
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveDrink("left");
      return;
    }

    if ((event.key === "Enter" || event.key === " ") && viewMode === "browse") {
      event.preventDefault();
      selectDrink(selectedDrink.id, "detail");
      return;
    }

    if (event.key === "Escape" && viewMode === "detail") {
      event.preventDefault();
      closeDetail();
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboardNavigation);

    return () => {
      window.removeEventListener("keydown", handleKeyboardNavigation);
    };
  }, []);

  return (
    <main
      className={`tabletop-menu tabletop-menu--${viewMode}`}
      style={
        {
          "--section-accent": selectedDrinkSection.accent,
          "--drink-accent": selectedDrink.accent,
        } as CSSProperties
      }
    >
      {!isCameraPreviewOpen && (
        <VirtualCursor
          trackingRef={trackingRef}
          isFistClosed={isFistClosed}
          gestureState={gesture.gestureState}
        />
      )}

      <TrackingPreview
        videoRef={videoRef}
        trackingRef={trackingRef}
        open={isCameraPreviewOpen}
      />

      <section className="projection-stage" aria-label="Gedulgt drink menu">
        <div className="menu-view">
          {viewMode === "browse" ? (
            <DrinkCarousel
              drinks={SHOWCASE_DRINKS}
              activeDrinkId={selectedDrink.id}
              hoveredDrinkId={hoveredDrinkId}
              pressedDrinkId={pressedDrinkId}
              onOpenDrink={(drinkId) => selectDrink(drinkId, "detail")}
              onSwipe={moveDrink}
            />
          ) : (
            <DetailStage
              selectedDrink={selectedDrink}
              selectedDrinkSection={selectedDrinkSection}
              hoverTarget={gesture.hoverTarget}
              pressedTarget={gesture.pressedTarget}
              onClose={closeDetail}
            />
          )}
        </div>

      </section>
    </main>
  );
}

export default App;
