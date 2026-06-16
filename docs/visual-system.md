# Visual System

## Direction

The Gedulgt Table Menu should remain dark, mysterious, and exclusive. It should look like light projected onto a physical table, not like an app screen placed on a table.

The visuals should be useful enough for guests to browse and order, but the emotional impression matters: the menu is an artifact in Gedulgt's hidden universe.

## Canvas

Primary canvas:

- circular active table field
- rectangular browser viewport only acts as projection container
- no normal page sections
- no visible browser or app chrome
- no focus outlines or accessibility helper UI during guest use

Spatial layout:

```text
                         FAR GUEST

                   subtle far edge well

              ghost drink     FOCUSED     ghost drink
                    \           |           /
                     \          |          /

                            Tray

                     /          |          \
                    /           |           \
              ghost drink     FOCUSED     ghost drink

                  subtle near edge well

                        NEAR GUEST
```

The far focused card is rotated/readable for the far guest. The near focused card is readable for the near guest. These two visual cards represent the same focused drink.

## Visual Hierarchy

The table should prioritize:

1. Focused drink card on each side.
2. Central Tray when drinks have been selected.
3. Contextual hand/help cue when needed.
4. Ghosted surrounding drink cards.
5. Ambient smoke/light/noise.
6. Dormant brand mark.

Only one concept should feel dominant at a time.

## Dormant State

Dormant should show:

- subtle Gedulgt mark
- faint projector light pool
- minimal activation copy: `Place hand in light`
- subtle near/far edge wells
- barely-there ambience

Dormant should not look like an error, loading screen, or empty web page.

## Drink Cards

### Front Face

Front face content:

- abstract glass glyph or future drink media
- drink name

The first implementation should use abstract placeholders:

- glass silhouette
- liquid accent color
- soft glow
- light refraction
- smoke/noise texture

Avoid stock-photo feeling placeholders. The visual should be intentionally atmospheric until real drink media exists.

### Back Face

Back face content:

- drink name
- flavor words
- short description
- ingredients
- creator
- price

Back face should stay compact. It should feel like the card has revealed information, not like a full detail page opened.

## Tray

The Tray is central and radial.

Tray token content:

- small drink glyph
- quantity count

Tray visual behavior:

- selected tokens gather around the center
- tokens should not become long text labels during browsing
- repeated adds increment quantity in place
- clicking a token decrements/removes it
- trying to add a seventh drink triggers a restrained refusal pulse
- the total price appears as a compact passive display

## Motion

Motion tone: responsive ritual.

Default pacing:

- common interactions: fast response, then elegant settle
- reveal/settle animations: roughly `400ms` to `800ms`
- activation/deactivation edge hold: `1.2s`
- two-user lockout: `700ms`

Motion patterns:

- Wheel rotation uses an orbital snap.
- Focused cards settle into near/far focus positions.
- Card flip uses a physical 3D flip with subtle light shimmer.
- Adding to Tray uses inward motion and a light pulse.
- Confirmation blooms out from the Tray.
- Dormant fades active elements back into a quiet light pool.

Motion should help guests understand cause and effect. It should not become decorative noise.

## Help Cues

Help cues are contextual only.

Use:

- projected hand line art
- motion strokes
- small copy
- light pulse on success

Do not keep hand icons visible all the time. They appear after failed attempts, incomplete motion, or onboarding steps.

Default onboarding copy:

- `Swipe to browse`
- `Tap to reveal`
- `Drag to tray`

Activation copy:

- `Place hand in light`

Confirmation copy:

- `Total`

## Brand Presence

Gedulgt branding appears in:

- dormant state

Branding should not be permanently visible during browsing unless later design work proves it improves the table. The atmosphere, light, and drink reveal should carry the brand during the main interaction.

## Color And Light

Baseline mood:

- deep black/green-black tabletop
- warm projected cream
- amber/gold light cues
- muted drink accent colors from data
- prismatic highlights in small doses
- smoke/noise in subtle responsive layers

Avoid:

- bright app backgrounds
- card-heavy SaaS UI
- large decorative gradients
- visible utility controls
- one-note purple/blue or beige palettes

## Typography

Typography is intentionally pending.

Current guidance:

- choose for projection readability first
- drink names may use a refined display style
- utility text should stay small, clear, and minimal
- do not treat current app fonts as final brand typography

Open decision:

- final font pairing
- uppercase/lowercase treatment
- whether Gedulgt's brand mark/type requires a custom asset

## Asset Strategy

Each drink should eventually support a media slot.

For v1:

- render abstract glass glyphs procedurally
- use drink accent color as a visual seed
- keep media optional

Later:

- replace or enhance glyphs with real drink photography/video/3D media
- preserve the same interaction model
- avoid changing drink selection behavior when media changes

## Ambience Implementation Note

Baseline ambience can be CSS/SVG:

- layered radial light pools
- soft noise texture
- smoke-like masks
- SVG motion strokes
- GSAP opacity/transform animation

A React smoke library may be tested later if it improves atmosphere without adding performance or maintenance issues.

Related docs: [README](./README.md), [Experience Concept](./experience-concept.md), [Interaction Model](./interaction-model.md), [Technical Architecture](./technical-architecture.md), [Refactor Plan](./refactor-plan.md).
