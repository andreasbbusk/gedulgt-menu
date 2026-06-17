# Gedulgt Table Menu

This repository contains the technical prototype for the exam project in the
elective **Interactive Design & Development** at Business Academy Aarhus.

The project explores how a traditional cocktail menu can be reimagined as a
projected, gesture-based table experience for the cocktail bar Gedulgt in
Aarhus. The prototype should therefore not be read as a finished ordering
system, but as a proof of concept for the interplay between interaction design,
physical setup, hand tracking, and visual feedback.

- Prototype: <https://gedulgt-menu.vercel.app/>
- Report problem statement: How can we design and develop an interactive,
  projected cocktail menu for the cocktail bar Gedulgt, where the user can
  navigate the menu through gestures?

## Short Description

Gedulgt Table Menu is a browser-based React prototype intended to be projected
onto a tabletop. A webcam detects the user's hand, MediaPipe translates camera
input into hand landmarks, and our custom gesture engine translates movement
into menu actions.

The user can:

- activate and deactivate the menu with two open hands
- navigate between cocktails with horizontal swipes
- flip a drink card with a closed fist
- add a drink to the central Tray
- remove a selected drink again

The interface is designed around Gedulgt's dark, mysterious, and exclusive brand
universe. It uses a mirrored drink wheel, a central digital serving tray, and a
calm dormant state so the menu can become part of the table's physical staging.

## Run the Project

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Build the production version:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Camera tracking is enabled by default. To open the prototype without starting
the webcam/MediaPipe flow, use this query parameter:

```text
?gestures=false
```

Local example:

```text
http://localhost:5173/?gestures=false
```

## Use With Webcam

The prototype works well with a regular webcam. The full projector setup is
relevant for the physical experience, but hand tracking and gesture navigation
can be tested directly in front of a computer with a webcam.

For the best result:

- keep your hand clearly inside the camera frame
- perform one gesture at a time
- move your hand out of frame after an action before performing the next action
- move your hand back in when the next gesture should be detected

This rhythm makes it easier for the system to distinguish completed actions from
new intentions. This is especially important because hand tracking is less
precise than mouse/touch input, and because the prototype uses cooldowns and pose
changes to avoid duplicate or unintended detections.

Gestures in the prototype:

- two open hands: activate/deactivate the menu
- horizontal swipe: navigate between cocktails
- closed fist: flip the drink card
- swipe up: add the focused drink to the Tray
- swipe down: remove the focused drink from the Tray

## Controls During Review

If hand tracking is not used, the prototype can still be tested with fallback
input:

- `ArrowLeft` / `ArrowRight`: navigate between drinks
- `Enter`: flip the focused drink card
- `Space`: add the focused drink to the Tray
- `Escape`: return to the dormant state
- Mouse/trackpad: click cards, swipe/drag the wheel, and drag toward the center
  to add a drink

This fallback makes it easier for teachers/examiners to review the interface
without a full camera and projector setup.

## Guide to the Report Sections

This README acts as a reading guide from report sections to code.

| Report section | Relevant files | What to look for |
| --- | --- | --- |
| Introduction and concept description | [src/App.tsx](src/App.tsx), [src/components/GedulgtTableMenu.tsx](src/components/GedulgtTableMenu.tsx) | The overall table experience, dormant state, and how the menu is rendered as a projected interface. |
| Theory and methods | [src/components/table/Guide.tsx](src/components/table/Guide.tsx), [src/store/gedulgtTableStore.ts](src/store/gedulgtTableStore.ts), [src/gestures/gestureEngine.ts](src/gestures/gestureEngine.ts) | Emotional Design appears in mood and feedback, Fogg appears in simple prompts/onboarding, and Design Thinking appears in the ongoing interaction iterations. |
| Concept development and prototyping | [docs/README.md](docs/README.md), [src/components/table/Wheel.tsx](src/components/table/Wheel.tsx), [src/components/table/Tray.tsx](src/components/table/Tray.tsx), [src/components/table/usePointerInput.ts](src/components/table/usePointerInput.ts) | How the concept is translated into a mirrored drink wheel, a central Tray, and fallback interaction for testing without hand tracking. |
| Design, branding, and illustrations | [src/index.css](src/index.css), [src/components/table](src/components/table), [src/components/table/Silk.tsx](src/components/table/Silk.tsx), [src/assets](src/assets) | The dark visual expression, silk background, drink cards, mirrored wheel, Tray, and mood-building animation. |
| Usability and onboarding | [src/store/gedulgtTableStore.ts](src/store/gedulgtTableStore.ts), [src/components/table/Guide.tsx](src/components/table/Guide.tsx), [src/components/table/Wheel.tsx](src/components/table/Wheel.tsx), [src/components/table/Tray.tsx](src/components/table/Tray.tsx) | The phases dormant, onboarding, browseWheel, and trayFeedback, plus visible system status. |
| Technical tools and prototype | [package.json](package.json), [src/main.tsx](src/main.tsx), [src/App.tsx](src/App.tsx) | React, TypeScript, Vite, Zustand, GSAP, and MediaPipe as the technical foundation. |
| Hardware/software and calibration | [src/gestures/useHandTracking.ts](src/gestures/useHandTracking.ts), [src/config/tableCalibration.ts](src/config/tableCalibration.ts) | Webcam input, MediaPipe HandLandmarker, and translation from camera/screen coordinates to the projection area. |
| Technical implementation | [src/gestures/gestureEngine.ts](src/gestures/gestureEngine.ts), [src/gestures/useGestureEngine.ts](src/gestures/useGestureEngine.ts), [src/gestures/handPose.ts](src/gestures/handPose.ts), [src/store/gedulgtTableStore.ts](src/store/gedulgtTableStore.ts) | The flow from hand landmarks to hand pose, gesture event, and interface state update. |
| Prototype testing | [src/gestures/__tests__](src/gestures/__tests__) | Unit tests for gestures, sequences, hand pose classification, and mapping from gesture engine to menu actions. |
| Appendix and process documentation | [docs/README.md](docs/README.md) | Supporting documentation about the experience concept, interaction model, visual direction, and technical architecture. |

## Suggested Code Reading Path

1. Start in `src/App.tsx` to see how the background, global phase, and gesture
   tracking are connected.
2. Continue to `src/components/GedulgtTableMenu.tsx` to see the main flow:
   dormant view, drink wheel, Tray, onboarding, and keyboard/pointer fallback.
3. Read `src/store/gedulgtTableStore.ts` to understand the prototype state
   machine: activation, onboarding, navigation, card flipping, adding to the
   Tray, and inactivity timeout.
4. Read `src/gestures/useHandTracking.ts` and `src/gestures/handPose.ts` to see
   how webcam and MediaPipe input becomes hand pose and position data.
5. Read `src/gestures/gestureEngine.ts` and `src/gestures/useGestureEngine.ts`
   to see how movement becomes concrete menu actions.
6. Finish with the test files in `src/gestures/__tests__/`, which show the most
   important technical assumptions around swipes, cooldowns, repeated input, and
   hand poses.

## Architecture at a Glance

```text
Webcam
  -> MediaPipe HandLandmarker
  -> handPose classification
  -> tableCalibration
  -> gestureEngine
  -> useGestureEngine
  -> Zustand store
  -> React interface
```

The key architectural decision is that camera input is first translated into
semantic actions such as `SWIPE`, `FIST_TAP`, `SWIPE_UP`, `SWIPE_DOWN`, and
`DOUBLE_OPEN`. The rest of the application does not need to know about raw
MediaPipe landmarks, and can instead react to clear interaction events.

## Scope

The prototype does not include a backend, payment flow, inventory status, or
integration with a real point-of-sale system. It is scoped to the experience and
interactions explored in the report: a projected cocktail menu, gesture-based
navigation, visual feedback, and technical testing of the input method.

The physical setup with projector and webcam requires practical calibration. The
default calibration lives in `src/config/tableCalibration.ts` and acts as a
starting point for matching the camera's field of view with the projection area.
