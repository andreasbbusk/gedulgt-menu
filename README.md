# Gedulgt Table Menu

Dette repository indeholder den tekniske prototype til eksamensprojektet i
valgfaget **Interactive Design & Development** på Erhvervsakademi Aarhus.

Projektet undersøger, hvordan et klassisk drinkskort kan gentænkes som en
projekteret, gestusbaseret bordoplevelse for cocktailbaren Gedulgt i Aarhus.
Prototypen skal derfor ikke læses som et færdigt bestillingssystem, men som et
proof of concept for samspillet mellem interaktionsdesign, fysisk setup,
håndtracking og visuel feedback.

- Prototype: <https://gedulgt-menu.vercel.app/>
- Rapportens problemformulering: Hvordan kan vi designe og udvikle et
  interaktivt, projekteret drinkskort til cocktailbaren Gedulgt, hvor brugeren
  gennem gestikulering kan navigere i menuen?

## Kort Beskrivelse

Gedulgt Table Menu er en browserbaseret React-prototype, som er tænkt til at
blive vist på en bordplade via projektor. Et webcam registrerer brugerens hånd,
MediaPipe omsætter kamera-input til hånd-landmarks, og vores egen
gesture-engine oversætter bevægelserne til handlinger i menuen.

Brugeren kan:

- aktivere og deaktivere menukortet med to åbne hænder
- navigere mellem cocktails med horisontale swipes
- vende et drinkskort med en knyttet hånd
- tilføje en drink til den centrale Tray
- fjerne en valgt drink igen

Interfacet er designet til Gedulgts mørke, mystiske og eksklusive brandunivers.
Det bruger et spejlet drink-hjul, en central digital serveringsbakke og en
rolig dormant-tilstand, så menuen kan fungere som en del af bordets fysiske
iscenesættelse.

## Kør Projektet

Installer dependencies:

```bash
npm install
```

Start lokal udviklingsserver:

```bash
npm run dev
```

Byg produktionsversion:

```bash
npm run build
```

Kør tests:

```bash
npm test
```

Kamera-tracking er slået til som standard. Hvis prototypen skal åbnes uden at
starte webcam/MediaPipe, kan den køres med query parameteren:

```text
?gestures=false
```

Eksempel lokalt:

```text
http://localhost:5173/?gestures=false
```

## Brug Med Webcam

Prototypen fungerer fint med et almindeligt webcam. Det fulde projektor-setup er
relevant for den fysiske oplevelse, men håndtracking og gestus-navigation kan
afprøves direkte foran en computer med webcam.

For bedst resultat:

- hold hånden tydeligt inden for kameraets synsfelt
- lav én gestus ad gangen
- flyt hånden ud af frame efter en handling, før næste handling udføres
- før hånden ind igen, når den næste gestus skal registreres

Denne rytme gør det lettere for systemet at skelne mellem afsluttede handlinger
og nye intentioner. Det er især vigtigt, fordi håndtracking er mindre præcist
end mus/touch, og fordi prototypen bruger cooldowns og pose-skift til at undgå
dobbelte eller utilsigtede registreringer.

Gestus i prototypen:

- to åbne hænder: aktiver/deaktiver menukortet
- horisontalt swipe: naviger mellem cocktails
- knyttet hånd: vend drinkskortet
- swipe op: tilføj den fokuserede drink til Tray
- swipe ned: fjern den fokuserede drink fra Tray

## Betjening Under Gennemgang

Hvis håndtracking ikke bruges, kan prototypen stadig afprøves med fallback input:

- `ArrowLeft` / `ArrowRight`: naviger mellem drinks
- `Enter`: vend det fokuserede drinkskort
- `Space`: tilføj den fokuserede drink til Tray
- `Escape`: vend tilbage til dormant-tilstand
- Mus/trackpad: klik på kort, swipe/drag i hjulet og træk ind mod midten for at
  tilføje en drink

Denne fallback gør det lettere for lærer/censor at gennemgå interfacet uden et
fuldt kamera- og projektor-setup.

## Guide Til Rapportens Afsnit

README'en fungerer som læsevejledning fra rapportens afsnit til koden.

| Rapportafsnit | Relevante filer | Hvad man skal kigge efter |
| --- | --- | --- |
| Introduktion og konceptbeskrivelse | [src/App.tsx](src/App.tsx), [src/components/GedulgtTableMenu.tsx](src/components/GedulgtTableMenu.tsx) | Den samlede bordoplevelse, dormant state og hvordan menuen renderes som projekteret interface. |
| Teori og metoder | [src/components/table/Guide.tsx](src/components/table/Guide.tsx), [src/store/gedulgtTableStore.ts](src/store/gedulgtTableStore.ts), [src/gestures/gestureEngine.ts](src/gestures/gestureEngine.ts) | Emotional Design ses i stemning og feedback, Fogg ses i simple prompts/onboarding, og Design Thinking ses i de løbende iterationer af interaktionen. |
| Konceptudvikling og prototyping | [docs/README.md](docs/README.md), [src/components/table/Wheel.tsx](src/components/table/Wheel.tsx), [src/components/table/Tray.tsx](src/components/table/Tray.tsx), [src/components/table/usePointerInput.ts](src/components/table/usePointerInput.ts) | Hvordan konceptet er omsat til et spejlet drink-hjul, en central Tray og fallback-interaktion til test uden håndtracking. |
| Design, branding og illustrationer | [src/index.css](src/index.css), [src/components/table](src/components/table), [src/components/table/Silk.tsx](src/components/table/Silk.tsx), [src/assets](src/assets) | Mørkt visuelt udtryk, silkebaggrund, drinkkort, spejlet hjul, Tray og stemningsskabende animation. |
| Usability og onboarding | [src/store/gedulgtTableStore.ts](src/store/gedulgtTableStore.ts), [src/components/table/Guide.tsx](src/components/table/Guide.tsx), [src/components/table/Wheel.tsx](src/components/table/Wheel.tsx), [src/components/table/Tray.tsx](src/components/table/Tray.tsx) | Faserne dormant, onboarding, browseWheel og trayFeedback samt visuel systemstatus. |
| Tekniske værktøjer og prototype | [package.json](package.json), [src/main.tsx](src/main.tsx), [src/App.tsx](src/App.tsx) | React, TypeScript, Vite, Zustand, GSAP og MediaPipe som teknisk grundlag. |
| Hardware/software og kalibrering | [src/gestures/useHandTracking.ts](src/gestures/useHandTracking.ts), [src/config/tableCalibration.ts](src/config/tableCalibration.ts) | Webcam-input, MediaPipe HandLandmarker og oversættelse fra kamera-/skærmkoordinater til projektionsområde. |
| Teknisk implementering | [src/gestures/gestureEngine.ts](src/gestures/gestureEngine.ts), [src/gestures/useGestureEngine.ts](src/gestures/useGestureEngine.ts), [src/gestures/handPose.ts](src/gestures/handPose.ts), [src/store/gedulgtTableStore.ts](src/store/gedulgtTableStore.ts) | Flowet fra hånd-landmarks til håndpose, gesture-event og state update i interfacet. |
| Test af prototype | [src/gestures/__tests__](src/gestures/__tests__) | Unit tests af gestures, sekvenser, håndposeklassificering og mapping fra gesture-engine til menu-handlinger. |
| Bilag og procesdokumentation | [docs/README.md](docs/README.md) | Supplerende dokumentation om oplevelseskoncept, interaktionsmodel, visuel retning og teknisk arkitektur. |

## Foreslået Læserute I Koden

1. Start i `src/App.tsx` for at se, hvordan baggrund, global fase og
   gesture-tracking bindes sammen.
2. Gå videre til `src/components/GedulgtTableMenu.tsx` for at se hovedflowet:
   dormant view, drink-hjul, Tray, onboarding og keyboard/pointer fallback.
3. Læs `src/store/gedulgtTableStore.ts` for at forstå prototypens state machine:
   aktivering, onboarding, navigation, kort-vending, tilføjelse til Tray og
   inactivity timeout.
4. Læs `src/gestures/useHandTracking.ts` og `src/gestures/handPose.ts` for at
   se, hvordan webcam og MediaPipe omsættes til håndpose og position.
5. Læs `src/gestures/gestureEngine.ts` og `src/gestures/useGestureEngine.ts`
   for at se, hvordan bevægelse bliver til konkrete menu-handlinger.
6. Afslut med testfilerne i `src/gestures/__tests__/`, som viser de vigtigste
   tekniske antagelser omkring swipes, cooldowns, gentagne input og håndposer.

## Arkitektur I Kort Form

```text
Webcam
  -> MediaPipe HandLandmarker
  -> handPose klassificering
  -> tableCalibration
  -> gestureEngine
  -> useGestureEngine
  -> Zustand store
  -> React interface
```

Det vigtigste arkitektoniske valg er, at kamera-input først oversættes til
semantiske handlinger som `SWIPE`, `FIST_TAP`, `SWIPE_UP`, `SWIPE_DOWN` og
`DOUBLE_OPEN`. Resten af applikationen behøver derfor ikke kende til rå
MediaPipe-landmarks, men kan reagere på tydelige interaktions-events.

## Afgrænsning

Prototypen indeholder ikke backend, betaling, lagerstatus eller integration med
et reelt kassesystem. Den er afgrænset til den oplevelse og de interaktioner,
rapporten undersøger: et projekteret drinkskort, gestusbaseret navigation,
visuel feedback og teknisk test af inputmetoden.

Den fysiske opsætning med projektor og webcam kræver kalibrering i praksis.
Standardkalibreringen ligger i `src/config/tableCalibration.ts` og fungerer som
udgangspunkt for at matche kameraets synsfelt med projektionsområdet.
