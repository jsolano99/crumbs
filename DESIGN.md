---
name: Crumbs
description: Paste a tweet, get what it means and how to do it — read aloud by a stage that lights itself from night to day.
colors:
  night: "#0b0d1a"
  night-deep: "#060710"
  cobalt: "#2f4b8f"
  cobalt-glow: "#4a6bc4"
  rose: "#d98a93"
  rose-ink: "#a04a5a"
  day: "#fdfbf7"
  paper: "#ffffff"
  ink: "#14151a"
  ink-soft: "#4a4c58"
  ember: "#f0a63b"
  ember-bright: "#ffc267"
  ember-ink: "#8a5a1f"
  error: "#c0392b"
  error-bright: "#ff8a7a"
  error-text: "#ffb3a6"
  mist: "rgba(255, 255, 255, 0.08)"
  hairline: "rgba(255, 255, 255, 0.12)"
typography:
  display:
    fontFamily: "var(--font-archivo), Archivo, system-ui, sans-serif"
    fontSize: "clamp(3rem, 9vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.03em"
  body:
    fontFamily: "var(--font-archivo), Archivo, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-stencil), Allerta Stencil, var(--font-archivo)"
    fontSize: "0.68rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.2em"
rounded:
  full: "999px"
  lg: "1rem"
  md: "0.85rem"
  sm: "0.75rem"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-5: "1.5rem"
  space-6: "2rem"
  space-7: "3rem"
  space-8: "4.5rem"
components:
  button-primary:
    backgroundColor: "linear-gradient(180deg, {colors.ember-bright}, {colors.ember})"
    textColor: "{colors.night-deep}"
    rounded: "{rounded.full}"
    padding: "0.85rem 2.1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "rgba(253, 251, 247, 0.78)"
    rounded: "{rounded.full}"
    padding: "0.6rem 1.3rem"
  card-band:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.space-5}"
  input-textarea:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.day}"
    rounded: "{rounded.md}"
    padding: "{spacing.space-4}"
  label-cue:
    backgroundColor: "rgba(6, 7, 16, 0.35)"
    textColor: "{colors.ember-bright}"
    rounded: "{rounded.full}"
    padding: "0.4rem 0.75rem 0.4rem 0.6rem"
---

# Design System: Crumbs

## Overview

**Creative North Star: "Dawn Cyclorama"**

Crumbs treats the act of a tweet becoming legible as literal stage light, not a chat-box card resolving a spinner. The entire viewport is a cyclorama — the curved backdrop behind a stage — that rises from night through first-light and dawn to day as the request actually moves through its lifecycle: idle, sent, streaming, complete. The transition is not decorative; it is bound to real `fetch` state (idle → first byte received → stream complete), so the light on stage always tells the truth about what the network is doing. A visitor pastes an opaque tweet onto a dark, near-empty stage, watches the light rise while Crumbs reads it, and receives the answer as three "horizon-band" cards — Core idea, Terms explained, How to implement it — that land on the now-lit stage like paper under daylight.

The system rejects the generic AI-assistant default (chat bubble, spinner, card-on-white). There is no chrome, no sidebar, no app shell — just the stage, the wordmark, the input, and the light. Depth comes from gradient and glow, never from applied drop shadows on the atmosphere itself. Typography splits cleanly in two: Allerta Stencil is stage signage — small, tracked-caps cue and label text, the kind of lettering that would sit on a physical cue card — and Archivo is everything a person actually reads. One ember accent marks every interactive control regardless of what hour the stage is showing, so the hand never loses the thing it's supposed to touch. An error is not a red toast; it's the lights cutting to black — "blackout" — fast and hard, the one moment this world intentionally breaks its own slow, eased rhythm.

**Key Characteristics:**
- Full-bleed atmosphere as the only "background" — five stacked gradient layers crossfade by phase, driven by real async state, not a timer.
- Two-font split with a hard boundary: Allerta Stencil for cue/label text only, Archivo for everything else.
- One accent (ember) that never changes hue across phases — it is the single constant in a screen that otherwise recolors itself continuously.
- Pill-and-soft-round geometry throughout; no hard right angles.
- A single named failure state (blackout) with its own fast, hard-cut motion, distinct from the slow crossfade every other phase shares.

## Colors

The palette is a single continuous light cycle — night, cobalt, rose, day — with one constant accent riding on top of it and a fifth, deliberately discontinuous state (blackout) reserved for failure.

### Primary
- **Ember** (`#f0a63b`): the one accent that appears in every phase without ever recoloring. Used on the submit button, focus outlines, and the cue-pill's glowing status dot. It is the single thing on screen that does not participate in the day/night cycle.
- **Ember Bright** (`#ffc267`): the lighter gradient stop on the submit button and the cue-label's text/dot color on the night, first-light, and dawn phases.
- **Ember Ink** (`#8a5a1f`): the on-paper, AA-safe expression of the accent — used for the cue label once the stage reaches day, and for the "How to implement it" band's label dot. Ember never appears at full saturation against a light surface; Ember Ink is what stands in for it.

### Secondary
- **Cobalt** (`#2f4b8f`): the first-light wash — the backdrop's color the instant a request is sent, before any bytes come back. Reused directly (no separate "ink" variant needed) as the "Core idea" band's label-dot color, since it's already dark enough for AA text on white.
- **Cobalt Glow** (`#4a6bc4`): the soft radial highlight blended into the first-light gradient; not used outside the backdrop.

### Tertiary
- **Rose** (`#d98a93`): the dawn wash — the backdrop's color once the stream starts arriving. Reused directly (no separate "glow" variant, unlike Cobalt) for the radial highlight blended into the dawn gradient.
- **Rose Ink** (`#a04a5a`): a darkened, AA-safe expression of rose, used only for the "Terms explained" band's label dot — the same relationship Ember Ink has to Ember.

### Neutral
- **Night** (`#0b0d1a`) / **Night Deep** (`#060710`): the idle stage ground, and the top of the blackout gradient — the two darkest points the stage ever reaches.
- **Day** (`#fdfbf7`): the completed-breakdown backdrop wash and the wordmark's resting (dark-phase) color.
- **Paper** (`#ffffff`): the breakdown band cards — the one surface in the system that is always the same color regardless of phase.
- **Ink** (`#14151a`) / **Ink Soft** (`#4a4c58`): text on paper/day surfaces — Ink for band body copy and the day-phase wordmark, Ink Soft for the tagline and reset button once the stage is lit.
- **Mist** (`rgba(255,255,255,0.08)`) / **Hairline** (`rgba(255,255,255,0.12)`): the translucent surface and border used for the textarea and cue pill on every dark phase, paired with `backdrop-filter: blur()` so they read as glass catching the stage light rather than opaque UI chrome.
- **Error / Error Bright / Error Text** (`#c0392b` / `#ff8a7a` / `#ffb3a6`): reserved exclusively for the blackout phase — the error card's fill, the cue-pill's text/dot, and the error card's body text, respectively. These never appear in night, first-light, dawn, or day.

### Named Rules
**The Ember Constant Rule.** Every other color on screen belongs to a phase and changes when the phase changes. Ember does not. If a new control is added to any phase, it takes the ember accent, unchanged — it is the one thing a user can always find.

**The Blackout Exception Rule.** The error trio (`error`, `error-bright`, `error-text`) is off-limits outside the blackout phase. A red toast or inline validation error elsewhere in the product is not "using the error color correctly" — blackout is a whole-stage event, not a per-field state.

## Typography

**Display Font:** Archivo (with system-ui, sans-serif fallback)
**Body Font:** Archivo (with system-ui, sans-serif fallback)
**Label/Cue Font:** Allerta Stencil (with Archivo fallback)

**Character:** Archivo carries the entire reading experience — wordmark, tagline, input, and every word of the breakdown — at a confident, slightly heavy weight for the wordmark and a plain workmanlike weight for everything else. Allerta Stencil never carries a sentence; it exists only as small, uppercase, wide-tracked signage, evoking a physical cue card rather than a UI label.

### Hierarchy
- **Display** (800, `clamp(3rem, 9vw, 5.5rem)`, line-height 0.95, letter-spacing -0.03em): the "Crumbs" wordmark only. Recolors between Day (`#fdfbf7`) and Ink (`#14151a`) as the stage lights change; the family and weight never change.
- **Body** (400, 1rem, line-height 1.5–1.6): tagline, textarea input, and band body copy (band body runs slightly looser at line-height 1.6 and caps at 58ch measure for readability). Submit/reset button labels are a bolder body variant (700 / 400 respectively, 0.85–0.95rem) rather than a separate hierarchy tier.
- **Label** (400, 0.66–0.68rem, letter-spacing 0.18–0.2em, uppercase): the state-cue pill (top-left, always visible) and each band's eyebrow dot-label (Core idea / Terms explained / How to implement it). Always uppercase, always Allerta Stencil, always paired with a small `currentColor` dot before the text.

### Named Rules
**The Cue Voice Rule.** Allerta Stencil is reserved for tracked-caps label/cue text under ~0.7rem. It never sets a headline, a button, or a sentence of body copy — the moment stencil would run past a few words, the world's own internal logic (this is signage, not prose) is being violated.

## Layout

A single centered column (max-width `42rem`) on a full-bleed, `100dvh`-minimum stage, with the atmosphere backdrop as five absolutely-positioned, full-`inset` gradient layers behind it (`z-index: 0`) and content stacked above (`z-index: 1`). The state-cue pill breaks out of the column and sits `position: fixed` at the top-left corner (`z-index: 2`), so it stays visible regardless of scroll or breakdown length.

Vertical rhythm runs on an 8-step spacing scale from `0.25rem` to `4.5rem` (`--space-1` … `--space-8`); page padding, column gaps, and card padding all draw from it rather than one-off values. At the `30rem` (480px) breakpoint, page padding tightens, the cue pill's type and padding shrink slightly, and band card padding drops one step — a density adjustment, not a layout restructure; the single-column, centered composition holds at every width.

## Elevation & Depth

Crumbs is a hybrid: the atmosphere itself is flat (crossfading gradient layers, no shadow), while the one surface that sits "above" the stage — the breakdown band cards — gets a single soft, ambient lift. Two other surfaces (the cue pill, the textarea) fake depth with `backdrop-filter: blur()` over translucency instead of a shadow, reading as glass catching the stage light rather than physically raised material.

### Shadow Vocabulary
- **Band lift** (`box-shadow: 0 20px 40px -28px rgba(6, 7, 16, 0.55)`): the only shadow in the system. Used on every breakdown band card, at rest — not a hover-triggered effect.
- **Ember glow** (`box-shadow: 0 8px 24px -8px rgba(240, 166, 59, 0.65)`): a hover-only glow under the submit button, colored to the ember accent rather than a neutral shadow color.

### Named Rules
**The No-Shadow-On-Light Rule.** The backdrop, wordmark, and typography never take a drop shadow — depth for the "world" comes from the gradient's own light, not from applied elevation. Shadows are reserved for the two things that sit as physical objects on top of the stage: cards and the button's hover state.

## Shapes

Fully round and softly round geometry only — nothing in Crumbs has a hard right-angle corner. Pills (`999px`) cover every button and the cue label; band cards use a generous `1rem` radius; the textarea uses `0.85rem`; the (blackout-only) error card uses the smallest radius in the system, `0.75rem`. Borders are hairline-weight (`1px`) and always translucent — `rgba(255,255,255,0.12)` on dark phases, a matching low-opacity ink border on day — never a solid, opaque stroke.

## Components

### Buttons
- **Shape:** fully round (`999px` — see `{rounded.full}`).
- **Primary (submit):** ember gradient fill (`linear-gradient(180deg, {colors.ember-bright}, {colors.ember})`), `{colors.night-deep}` text, weight 700, padding `0.85rem 2.1rem`. Hover lifts `translateY(-1px)` and adds the ember glow shadow; disabled drops to 55% opacity with a `progress` cursor (used while a request is in flight, not just for empty input).
- **Ghost (reset — "Paste another tweet"):** transparent fill, translucent border/text (`rgba(253,251,247,0.3)` / `rgba(253,251,247,0.78)` on dark phases, ink-soft equivalents on day), same pill shape. Never gains a fill on hover — only the border and text brighten.

### Cards / Containers (Bands)
- **Corner Style:** `1rem` (`{rounded.lg}`).
- **Background:** always `{colors.paper}` (`#ffffff`), regardless of stage phase — the one surface immune to the atmosphere cycle.
- **Shadow Strategy:** the single "band lift" ambient shadow (see Elevation & Depth); no hover shadow change.
- **Internal Padding:** `{spacing.space-5}` (`1.5rem`), dropping to `{spacing.space-4}` under `30rem`.
- **Entrance:** each band animates in with a 0.7s eased "raise" (fade + `translateY(14px→0)`), staggered 0.08s apart in Core → Terms → Steps order — the three cards visibly arrive in sequence, not all at once.

### Inputs / Fields
- **Style:** `{rounded.md}` (`0.85rem`) radius, hairline border, translucent mist fill (`rgba(255,255,255,0.08)`) with `blur(6px)` behind it on dark phases, switching to solid `{colors.paper}` on day.
- **Focus:** `2px` solid `{colors.ember}` outline, `2px` offset — the accent color doing focus duty, not a separate focus-ring token.
- **Disabled:** used while a request is in flight (`isBusy`); no distinct visual treatment beyond the browser default plus the surrounding form being non-interactive.

### The Stage (signature component)
The backdrop is five full-bleed, absolutely-positioned gradient layers (night / first-light / dawn / day / blackout) stacked at `z-index: 0`, each permanently rendered but at `opacity: 0` until its phase is active. Phase changes toggle opacity via a `data-phase` attribute on the root `<main>`, and every layer but blackout shares one crossfade: `opacity 1.3s cubic-bezier(0.19, 1, 0.22, 1)`. Blackout alone overrides this to `opacity 0.15s linear` — an abrupt hard cut standing in deliberate contrast to the slow, eased rhythm everywhere else, so an error registers as a break in the world's own rules, not just a red color. Paired with the stage is the **cue pill**: a fixed, pill-shaped, blurred-glass label (`label-cue`) that names the current phase in Allerta Stencil ("Night — paste a tweet", "Dawn — reading it", "Blackout — something went wrong") with a glowing `currentColor` dot — the one piece of UI that is always visible and always states, in words, what light the stage is currently showing.

## Do's and Don'ts

### Do:
- **Do** drive every backdrop phase change off real request state (idle / sent / first byte / complete / errored) — never a fixed-duration timer or a scroll trigger.
- **Do** keep the ember accent (`{colors.ember}` / `{colors.ember-bright}` / `{colors.ember-ink}`) constant across every phase; it is the one color a new control should never have to re-derive per phase.
- **Do** give any new backdrop phase the shared `1.3s cubic-bezier(0.19, 1, 0.22, 1)` crossfade unless it is, like blackout, an explicit failure/interrupt state.
- **Do** keep Allerta Stencil scoped to uppercase, tracked-caps cue/label text under ~0.7rem; Archivo carries every sentence.
- **Do** keep band-card and pill-button corners fully round or generously soft (`{rounded.full}` / `{rounded.lg}` / `{rounded.md}`) — no sharp corners anywhere in this world.

### Don't:
- **Don't** soften blackout's `0.15s linear` cut to match the other phases' crossfade — the abruptness is what tells the user something broke, not progressed.
- **Don't** use the error trio (`{colors.error}` / `{colors.error-bright}` / `{colors.error-text}`) for anything outside the blackout phase; it is a whole-stage failure signal, not a general-purpose red.
- **Don't** add a fourth band-label hue beyond the cobalt / rose-ink / ember-ink triad — each is tied 1:1 to one of the three fixed breakdown sections (Core idea / Terms explained / How to implement it).
- **Don't** apply a drop shadow to the backdrop, the wordmark, or any atmosphere-level element — depth there comes from the gradient's own light, not applied elevation.
- **Don't** set Allerta Stencil at body-copy scale or above — past label size it stops reading as stage signage and starts reading as a display face doing a job it isn't built for.

