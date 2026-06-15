# Gedulgt Table Menu Docs

This folder is the source of truth for the Gedulgt Table Menu refactor. The goal is to preserve the experience decisions before implementation starts, so the eventual build can stay aligned with the table, projector, brand mood, and interaction model.

The Gedulgt Table Menu is a projected, gesture-ready menu experience for a round bar table. It should feel like a shared table ritual rather than a normal website.

## Reading Order

1. [Experience Concept](./experience-concept.md) - physical context, guest experience, and design rationale.
2. [Interaction Model](./interaction-model.md) - state flow, onboarding, mirrored wheel, card flip, Tray, and order confirmation.
3. [Visual System](./visual-system.md) - projected table layout, dark Gedulgt tone, motion, help cues, and UI copy.
4. [Technical Architecture](./technical-architecture.md) - React architecture, Zustand store shape, input model, setup, calibration, and debug tools.
5. [Refactor Plan](./refactor-plan.md) - phased implementation checklist for the experience rewrite.

## Locked Decisions

- The experience is called **Gedulgt Table Menu**.
- The central selection area is called the **Tray**.
- The app starts in a **dormant** state.
- The app uses a round table projection as the primary canvas.
- The first implementation is an experience rewrite, not a visual skin over the current carousel/detail UI.
- The current full-screen detail view is replaced by a focused card flip.
- The menu uses six canonical drinks, mirrored into twelve visible cards.
- The same **focused drink** appears near both guests and flips together on both mirrored sides.
- The near side is the default onboarding side.
- After onboarding, both table halves can interact with the same shared state.
- Two-user interactions use a `700ms` lockout after a valid action.
- Near/far edge wells toggle dormant/non-dormant with a `1.2s` hold.
- A `60s` inactivity timeout returns the experience to dormant.
- Dormant clears live order/focus state but preserves completed onboarding.
- Onboarding completion persists in local browser memory.
- The Tray can contain a maximum of six total selected drinks.
- Duplicate drink selections increase quantity.
- The confirmation state shows individual prices and total price in compact DKK format.
- Exact hand gesture recognition is future work; docs define semantic actions first.

## Open Decisions

| Decision                      | Status  | Notes                                                                                                          |
| ----------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| Typography                    | Pending | Keep open until brand/type direction is chosen. Current app fonts should not be treated as final.              |
| Final drink media             | Pending | The first build uses abstract glass glyphs. Real drink media will later fill asset slots.                      |
| Smoke/ambience implementation | Pending | Baseline can use CSS/SVG. A React smoke library may be tested if it improves mood without hurting performance. |
| Exact hand gestures           | Pending | The app should first implement semantic actions. Gesture recognition and thresholds are tuned later.           |
| Final menu content            | Pending | Use first six current drinks for v1; final content can replace these later.                                    |

## Core Vocabulary

| Term               | Meaning                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Gedulgt Table Menu | The full projected table menu experience.                                                                   |
| dormant            | Quiet hidden state with subtle Gedulgt mark and projector light cue.                                        |
| active             | Any non-dormant state where the table menu is visible.                                                      |
| focused drink      | The canonical drink currently highlighted on both mirrored halves.                                          |
| Tray               | The central radial area where selected drink tokens gather.                                                 |
| mirrored wheel     | The circular drink wheel rendered once for the near guest and once for the far guest.                       |
| edge well          | A subtle near/far table-edge hold zone for activating or deactivating the experience.                       |
| semantic action    | A product-level action such as rotate, flip, add to Tray, or deactivate, independent from the input device. |

## Source Context

The current repo is a React/Vite prototype with drink data, GSAP animation, MediaPipe hand tracking, projection calibration, a carousel, and a detail view. The refactor should reuse useful foundations where appropriate, but the target experience is a new table-first interaction model.

Related docs: [Experience Concept](./experience-concept.md), [Interaction Model](./interaction-model.md), [Visual System](./visual-system.md), [Technical Architecture](./technical-architecture.md), [Refactor Plan](./refactor-plan.md).
