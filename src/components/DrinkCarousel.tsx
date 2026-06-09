import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { GedulgtDrink } from "../data/gedulgtDrinks";
import type { SwipeDirection } from "../hooks/useGestureController";
import { DrinkCard } from "./DrinkCard";

gsap.registerPlugin(useGSAP);

const POINTER_CLICK_SUPPRESS_DISTANCE = 14;
const POINTER_CLICK_SUPPRESS_MS = 360;
const POINTER_SWIPE_MIN_HOLD_MS = 80;

type DrinkCarouselProps = {
  drinks: GedulgtDrink[];
  activeDrinkId: string;
  hoveredDrinkId: string | null;
  pressedDrinkId: string | null;
  onOpenDrink: (drinkId: string) => void;
  onSwipe: (direction: SwipeDirection) => void;
};

type PointerDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startedAt: number;
  shouldSuppressClick: boolean;
  swiped: boolean;
};

function getCircularOffset(index: number, activeIndex: number, total: number) {
  let offset = index - activeIndex;

  if (offset > total / 2) {
    offset -= total;
  }

  if (offset < -total / 2) {
    offset += total;
  }

  return offset;
}

function getPointerSwipeMinDistance() {
  if (typeof window === "undefined") {
    return 96;
  }

  return Math.max(72, Math.min(150, window.innerWidth * 0.075));
}

function isHorizontalSwipe(deltaX: number, deltaY: number) {
  const absoluteX = Math.abs(deltaX);
  const absoluteY = Math.abs(deltaY);

  return absoluteY <= Math.max(72, absoluteX * 0.72);
}

export function DrinkCarousel({
  drinks,
  activeDrinkId,
  hoveredDrinkId,
  pressedDrinkId,
  onOpenDrink,
  onSwipe,
}: DrinkCarouselProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const pointerDragRef = useRef<PointerDragState | null>(null);
  const suppressClickUntilRef = useRef(0);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const activeIndex = useMemo(
    () => Math.max(0, drinks.findIndex((drink) => drink.id === activeDrinkId)),
    [activeDrinkId, drinks],
  );

  useEffect(() => {
    const handleResize = () => {
      setLayoutVersion((version) => version + 1);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useGSAP(
    () => {
      const root = rootRef.current;

      if (!root) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      gsap.fromTo(
        root,
        { autoAlpha: 0, y: 0, scale: 0.96 },
        {
          autoAlpha: 1,
          y: 34,
          scale: 1,
          duration: reduceMotion ? 0 : 0.62,
          ease: "power3.out",
        },
      );
    },
    { scope: rootRef },
  );

  useGSAP(
    () => {
      const slider = sliderRef.current;
      const cards = Array.from(
        slider?.querySelectorAll<HTMLButtonElement>("[data-carousel-card]") ?? [],
      );

      if (!slider || cards.length === 0) {
        return;
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const stageWidth = rootRef.current?.getBoundingClientRect().width ?? 1280;
      const slideStep = Math.max(390, Math.min(690, stageWidth * 0.34));

      cards.forEach((card, index) => {
        const offset = getCircularOffset(index, activeIndex, drinks.length);
        const absoluteOffset = Math.abs(offset);
        const active = absoluteOffset === 0;
        const neighbor = absoluteOffset === 1;
        const arcDepth = Math.min(absoluteOffset, 2);
        const direction = Math.sign(offset);

        gsap.to(card, {
          x: offset * slideStep,
          xPercent: -50,
          y: active ? -78 : arcDepth * 112,
          yPercent: -50,
          rotation: active ? 0 : direction * 15,
          rotationY: active ? 0 : direction * -4,
          skewY: 0,
          scale: active ? 1 : 1.02,
          transformPerspective: 900,
          transformOrigin: "50% 82%",
          filter: active ? "blur(0px)" : "blur(9px)",
          autoAlpha: active ? 1 : neighbor ? 0.68 : 0,
          zIndex: active ? 3 : neighbor ? 2 : 1,
          pointerEvents: active ? "auto" : "none",
          duration: reduceMotion ? 0 : 0.82,
          ease: "power3.inOut",
          overwrite: "auto",
        });
      });
    },
    { dependencies: [activeIndex, drinks.length, layoutVersion], scope: rootRef },
  );

  const finishPointerDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = pointerDragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      if (drag.shouldSuppressClick || drag.swiped) {
        suppressClickUntilRef.current =
          performance.now() + POINTER_CLICK_SUPPRESS_MS;
      }

      pointerDragRef.current = null;
      setIsPointerDragging(false);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      pointerDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startedAt: performance.now(),
        shouldSuppressClick: false,
        swiped: false,
      };

      setIsPointerDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = pointerDragRef.current;

      if (!drag || drag.pointerId !== event.pointerId || drag.swiped) {
        return;
      }

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const absoluteX = Math.abs(deltaX);
      const absoluteY = Math.abs(deltaY);
      const movedDistance = Math.hypot(deltaX, deltaY);

      if (movedDistance >= POINTER_CLICK_SUPPRESS_DISTANCE) {
        drag.shouldSuppressClick = true;
        event.preventDefault();
      }

      if (
        performance.now() - drag.startedAt >= POINTER_SWIPE_MIN_HOLD_MS &&
        absoluteX >= getPointerSwipeMinDistance() &&
        absoluteX > absoluteY &&
        isHorizontalSwipe(deltaX, deltaY)
      ) {
        drag.swiped = true;
        drag.shouldSuppressClick = true;
        suppressClickUntilRef.current =
          performance.now() + POINTER_CLICK_SUPPRESS_MS;
        onSwipe(deltaX < 0 ? "left" : "right");
      }
    },
    [onSwipe],
  );

  const handleClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (performance.now() >= suppressClickUntilRef.current) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    },
    [],
  );

  return (
    <section
      ref={rootRef}
      className={`catalog-stage${isPointerDragging ? " catalog-stage--dragging" : ""}`}
      aria-label="Gedulgt drinks"
      onClickCapture={handleClickCapture}
      onPointerCancel={finishPointerDrag}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerDrag}
    >
      <div ref={sliderRef} className="catalog-slider">
        {drinks.map((drink) => (
          <DrinkCard
            key={drink.id}
            {...drink}
            active={drink.id === activeDrinkId}
            hovered={hoveredDrinkId === drink.id}
            pressed={pressedDrinkId === drink.id}
            onOpen={onOpenDrink}
          />
        ))}
      </div>
    </section>
  );
}
