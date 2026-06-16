# Technical Architecture

## Implementation Direction

Implement the Gedulgt Table Menu as an experience rewrite. Reuse foundations from the current prototype where they still fit, but do not preserve the current carousel/detail structure as the primary architecture.

Current foundations worth reusing:

- `src/data/gedulgtDrinks.ts` for menu data
- MediaPipe hand tracking hook concepts
- projection calibration concepts
- GSAP animation setup
- hidden tracking preview pattern
- browser/mouse support

Current concepts to replace:

- screen-style horizontal carousel
- full-screen detail panel
- detail close button as primary navigation
- conventional rectangular page layout

## Stack

Target stack:

- React
- TypeScript
- Vite
- CSS
- GSAP
- Zustand for client state
- MediaPipe hand tracking retained/adapted later

Do not add Tailwind for this refactor unless a later decision explicitly changes the styling system.

## State Store

Use Zustand as the main client state store for the experience. The store should own product state, not low-level pointer/tracking frame data.

Suggested store shape:

```ts
type ExperiencePhase =
  | "dormant"
  | "onboarding"
  | "browseWheel"
  | "trayFeedback";

type TableSide = "near" | "far";
type CardFace = "front" | "back";
type InteractionSource = "mouse" | "touch" | "gesture" | "keyboard";

type OnboardingStep = "browse" | "reveal" | "add";

type SelectedDrinkItem = {
  drinkId: string;
  quantity: number;
};

type InputLockout = {
  side: TableSide;
  until: number;
};

type TrayFeedback =
  | { type: "added"; drinkId: string }
  | { type: "incremented"; drinkId: string }
  | { type: "full" }
  | null;

type GedulgtTableState = {
  phase: ExperiencePhase;
  focusedDrinkId: string;
  cardFace: CardFace;
  selectedItems: SelectedDrinkItem[];
  onboardingCompleted: boolean;
  onboardingStep: OnboardingStep;
  activeSide: TableSide;
  inputLockout: InputLockout | null;
  trayFeedback: TrayFeedback;
  lastInteractionAt: number;
  lastInteractionSource: InteractionSource | null;
};
```

Suggested constants:

```ts
const MAX_SELECTED_DRINKS = 6;
const INACTIVITY_TIMEOUT_MS = 60_000;
const EDGE_HOLD_MS = 1_200;
const SIDE_INPUT_LOCKOUT_MS = 700;
const ONBOARDING_STORAGE_KEY = "gedulgt:onboarding-completed";
```

## Store Actions

Suggested actions:

```ts
type ExperienceAction =
  | {
      type: "ACTIVATE";
      side: TableSide;
      source: InteractionSource;
      time: number;
    }
  | {
      type: "DEACTIVATE";
      side: TableSide;
      source: InteractionSource;
      time: number;
    }
  | {
      type: "COMPLETE_ONBOARDING_STEP";
      step: OnboardingStep;
      source: InteractionSource;
      time: number;
    }
  | {
      type: "ROTATE_WHEEL";
      direction: "previous" | "next";
      side: TableSide;
      source: InteractionSource;
      time: number;
    }
  | {
      type: "FOCUS_DRINK";
      drinkId: string;
      side: TableSide;
      source: InteractionSource;
      time: number;
    }
  | {
      type: "TOGGLE_CARD_FACE";
      side: TableSide;
      source: InteractionSource;
      time: number;
    }
  | {
      type: "ADD_FOCUSED_TO_TRAY";
      side: TableSide;
      source: InteractionSource;
      time: number;
    }
  | {
      type: "DECREMENT_TRAY_ITEM";
      drinkId: string;
      side: TableSide;
      source: InteractionSource;
      time: number;
    }
  | { type: "INACTIVITY_TIMEOUT"; time: number }
  | { type: "CLEAR_TRAY_FEEDBACK"; time: number };
```

Implementation can use Zustand actions directly instead of a reducer, but the behavior should stay equivalent to this action model.

## Persistence

Persist only:

- `onboardingCompleted`

Do not persist:

- selected Tray items
- current focused drink
- card face
- active phase
- input lockout
- transient help/failure state

Dormant clears live state but must not clear persisted onboarding completion.

## Derived Selectors

Recommended selectors:

- First six `GEDULGT_DRINKS` entries - canonical drinks for v1.
- `getFocusedDrink()` - drink matching `focusedDrinkId`.
- `getWheelSlots()` - twelve visible slots derived from six canonical drinks.
- `getNearFocusedSlot()` - near-side focused visual card.
- `getFarFocusedSlot()` - far-side focused visual card.
- `getTotalSelectedCount()` - sum of quantities.
- `getOrderTotal()` - sum of selected quantities multiplied by parsed drink prices.
- `canAddFocusedDrink()` - total selected count less than `MAX_SELECTED_DRINKS`.
- `isOppositeSideLocked(side, time)` - lockout helper.

## Wheel Slot Model

Six canonical drinks become twelve visual slots at render time.

```ts
type WheelSlot = {
  slotId: string;
  drinkId: string;
  side: "near" | "far";
  canonicalIndex: number;
  offsetFromFocus: number;
  focused: boolean;
  mirrored: boolean;
};
```

Do not duplicate drink objects. Slot generation should be pure derived state.

## Component Map

Suggested component responsibilities:

| Component              | Responsibility                                                    |
| ---------------------- | ----------------------------------------------------------------- |
| `GedulgtTableMenu`     | App shell, phase routing, global timers.                          |
| `ProjectionTable`      | Round table field, ambient layers, edge wells.                    |
| `DormantState`         | Gedulgt mark, light cue, activation prompt.                       |
| `OnboardingGuide`      | Three-step guided interaction with hand icons and success pulses. |
| `MirroredDrinkWheel`   | Computes/renders near and far drink cards.                        |
| `DrinkCard`            | Front/back card faces, focused state, flip animation.             |
| `Tray`                 | Radial selected tokens, add feedback, and passive total display.  |
| `GestureHelpCue`       | Contextual hand icon, motion traces, success/failure pulse.       |
| `EdgeWell`             | Near/far activation/deactivation hold zones.                      |
| `InputAdapter`         | Normalizes mouse/touch/gesture input into semantic actions.       |
| `TrackingDebugPreview` | Hidden camera/tracking preview for setup only.                    |

Names can change during implementation, but responsibilities should remain separated.

## Input Architecture

Inputs should flow through adapters:

```text
mouse/touch events      hand tracking events       keyboard debug shortcuts
        |                       |                           |
        v                       v                           v
                  semantic action dispatcher
                              |
                              v
                        Zustand store
                              |
                              v
                    visual components/selectors
```

The semantic action layer prevents gesture tuning from rewriting product behavior.

Mouse/web mappings:

- horizontal drag/swipe -> `ROTATE_WHEEL`
- focused card click -> `TOGGLE_CARD_FACE`
- inward drag/swipe -> `ADD_FOCUSED_TO_TRAY`
- Tray token click -> `DECREMENT_TRAY_ITEM`
- edge well hold -> `ACTIVATE` or `DEACTIVATE`

## Side Detection And Lockout

Side detection:

- pointer/hand in lower table half = `near`
- pointer/hand in upper table half = `far`

After a valid state-changing action:

- set active side
- set lockout until `time + 700ms`
- ignore opposite-side state-changing actions until lockout expires

Same-side actions should remain responsive unless another action-specific cooldown is needed.

## Inactivity Timer

Any valid semantic action updates `lastInteractionAt`.

If `Date.now() - lastInteractionAt >= 60_000` while active:

- dispatch `INACTIVITY_TIMEOUT`
- clear live state
- return to dormant

Timer should pause or become irrelevant while already dormant.

## Physical Setup And Calibration

The app should support practical demo setup without visible guest controls.

Configuration can remain in:

- code constants
- query params
- localStorage values

Documented setup assumptions:

- browser full-screen on projector
- camera sees the table surface/hand area
- calibration maps camera coordinates into projection bounds
- tracking preview is hidden unless explicitly opened

The current `tableCalibration` concept can be adapted. A future setup screen may be useful, but it is not part of this documentation pass.

## Debug And Preview

Keep the camera/tracking preview as a hidden debug tool:

- query param such as `?preview=1`
- keyboard shortcut acceptable for development
- never visible during normal guest use

Debug tools should not influence the visual design of the guest-facing table.

## Pricing

Current prices are strings such as `110,-`. For order totals, implementation should parse the leading numeric amount and format totals in the same compact DKK style:

```ts
formatPrice(690); // "690,-"
formatTotal(690); // "Total 690,-"
```

If future content changes price format, update parsing/formatting in one shared helper.

## Assets

Extend drink data with an optional media slot later:

```ts
type DrinkMedia = {
  imageSrc?: string;
  videoSrc?: string;
  alt?: string;
};
```

For v1, abstract glass glyphs can be rendered from drink accent color and id. Final real drink media should not require changing the interaction model.

## Testing Targets

Technical implementation should eventually verify:

- store transitions
- persistence of onboarding only
- mirrored slot derivation
- max Tray quantity rules
- price total calculations
- mouse interaction parity
- inactivity timeout
- side lockout
- no visible debug UI in normal mode

Related docs: [README](./README.md), [Experience Concept](./experience-concept.md), [Interaction Model](./interaction-model.md), [Visual System](./visual-system.md), [Refactor Plan](./refactor-plan.md).
