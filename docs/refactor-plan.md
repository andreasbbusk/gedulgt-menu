# Refactor Plan

## Summary

This refactor should rebuild the app around the Gedulgt Table Menu experience model. Treat it as an experience rewrite that reuses useful foundations, not as a styling pass on the existing carousel/detail prototype.

The implementation should proceed in phases so each layer can be verified before adding more theatrical behavior.

## Phase 1: State Foundation

Goal: create the product state model before changing visuals heavily.

Tasks:

- Add Zustand.
- Create the Gedulgt Table Menu store.
- Define phases: `dormant`, `onboarding`, `browseWheel`, `trayFeedback`, `orderConfirmation`.
- Add persisted `onboardingCompleted` using local browser memory.
- Add non-persisted live session state: focused drink, card face, selected items, active side, lockout, feedback, last interaction time.
- Add constants for max drinks, timeout, edge hold, and side lockout.
- Add selectors for focused drink, canonical drinks, mirrored wheel slots, total selected count, and order total.
- Unit test core store transitions.

Acceptance criteria:

- Dormant clears live order/focus state.
- Dormant does not clear onboarding completion.
- Adding duplicate drinks increments quantity.
- Adding beyond six total drinks returns Tray-full feedback.
- Price total can be calculated from current drink data.

## Phase 2: Experience Shell

Goal: replace the current page shell with the round projected table structure.

Tasks:

- Create the main `GedulgtTableMenu` shell.
- Add `ProjectionTable` with circular active field.
- Add phase routing for dormant, onboarding, browse, Tray feedback, and confirmation.
- Add near/far edge wells.
- Add inactivity timer dispatching `INACTIVITY_TIMEOUT` after `60s`.
- Keep tracking preview hidden behind existing or equivalent query/debug controls.

Acceptance criteria:

- App starts dormant.
- Edge well activation enters onboarding or wheel depending on persisted onboarding.
- Edge well hold deactivates to dormant after `1.2s`.
- Inactivity returns active experience to dormant.
- No visible debug chrome appears in normal mode.

## Phase 3: Mirrored Wheel And Cards

Goal: build the primary table menu visual.

Tasks:

- Derive six canonical drinks from the first six current drinks.
- Render near and far mirrored wheel slots.
- Highlight the same focused drink on both sides.
- Ghost non-focused cards.
- Implement orbital snap rotation.
- Build `DrinkCard` front face with abstract glass glyph plus name.
- Build back face with compact drink details.
- Implement shared card flip for both focused cards.

Acceptance criteria:

- Six canonical drinks render as twelve visual cards.
- Rotating changes one shared focused drink.
- Near and far focused cards show the same canonical drink.
- Clicking the focused card flips both focused cards.
- No full-screen detail panel remains in the main experience.

## Phase 4: Mouse/Web Interaction Adapter

Goal: make the prototype usable in a browser without special hardware.

Tasks:

- Normalize mouse/touch input into semantic actions.
- Horizontal drag/swipe rotates the wheel.
- Click focused card flips it.
- Drag/swipe focused card inward adds it to the Tray.
- Click Tray token decrements/removes quantity.
- Click Tray confirmation action opens order confirmation.
- Detect near/far side by table half.
- Add `700ms` opposite-side input lockout.

Acceptance criteria:

- The full flow works with mouse only.
- Mouse behavior mirrors the intended gesture semantics.
- Opposite-side lockout prevents conflicting rapid interactions.
- There are no ordinary visible debug controls in guest mode.

## Phase 5: Tray And Confirmation

Goal: complete ordering behavior visually.

Tasks:

- Render central radial Tray.
- Show selected glyph tokens with quantity.
- Add success pulse on add.
- Add restrained Tray-full pulse when exceeding six total drinks.
- Add confirmation affordance once at least one drink is selected.
- Implement `OrderConfirmation` blooming from Tray.
- Show `Your order`, names, quantities, individual prices, and total.
- Add manual reset returning to dormant.

Acceptance criteria:

- Tray shows quantities clearly without becoming a normal list.
- Confirmation is readable enough to show a waiter.
- Reset from confirmation clears live state and returns dormant.
- Total price uses compact DKK format.

## Phase 6: Onboarding And Help Cues

Goal: teach the experience without persistent UI clutter.

Tasks:

- Build three onboarding steps: `Swipe to browse`, `Tap to reveal`, `Drag to tray`.
- Use projected hand line icon and motion traces.
- Add light pulse success feedback.
- Persist onboarding completion locally.
- Add contextual help after repeated failed attempts.
- Keep cues hidden during normal successful browsing.

Acceptance criteria:

- First activation forces onboarding.
- Completing all three steps enters the wheel.
- Reload/future activation skips onboarding after completion.
- Help appears only after friction, not constantly.

## Phase 7: Visual Atmosphere

Goal: raise the prototype from functional to Gedulgt-like.

Tasks:

- Add dark projected table atmosphere.
- Add subtle Gedulgt mark in dormant and confirmation.
- Add light pool, prismatic accents, smoke/noise layers.
- Tune card glyphs per drink accent.
- Add physical card flip shimmer.
- Tune orbital snap and Tray bloom motion.
- Keep typography open until final direction is chosen.

Acceptance criteria:

- The table feels dark, mysterious, and exclusive.
- Ambient effects do not compete with the focused drink.
- Motion feels responsive but ritual-like.
- Typography remains documented as pending, not accidentally finalized.

## Phase 8: Future Gesture Integration

Goal: connect hand tracking once the product behavior is stable.

Tasks:

- Map hand tracking outputs to semantic actions.
- Tune activation/deactivation gesture.
- Tune horizontal swipe recognition.
- Tune reveal/flip gesture.
- Tune inward add-to-Tray gesture.
- Preserve mouse/web parity.
- Keep hidden tracking preview for setup.

Acceptance criteria:

- Gesture changes do not require rewriting product state.
- Mouse mode still works.
- Debug preview remains hidden unless requested.
- The same semantic actions drive both input modes.

## Verification Checklist

Before calling the refactor complete:

- Run `npm run lint`.
- Run `npm run build`.
- Test first-run onboarding.
- Test persisted onboarding skip after reload.
- Test mouse-only flow from dormant to confirmation.
- Test repeated quantity add and decrement.
- Test max-six Tray full pulse.
- Test reset from confirmation.
- Test 60-second timeout.
- Test near/far side lockout.
- Test normal mode has no visible debug preview.
- Capture desktop/projector-like screenshots for visual review.

## Risks And Watchpoints

- Mirroring can become confusing if it looks like two separate menus.
- The Tray can become cluttered if tokens are too large or text-heavy.
- Card back content may be too dense for projection.
- Smoke/ambient effects can hurt performance or readability.
- Gesture tuning can destabilize product behavior if semantic actions are not kept separate.
- Typography may accidentally become final if not revisited.

## Out Of Scope For First Build

- Backend order submission.
- Staff/bartender workflow.
- Final drink photography.
- Final gesture thresholds.
- Accessibility pass.
- Independent per-guest menus.
- Category navigation.

Related docs: [README](./README.md), [Experience Concept](./experience-concept.md), [Interaction Model](./interaction-model.md), [Visual System](./visual-system.md), [Technical Architecture](./technical-architecture.md).
