# Brainstorm Intent — Settings Icon Actions

**Topic:** `settings-icon-actions`
**Goal:** Define what actions live behind the settings gear on SpringActuator-Portfolio dashboard.
**Status:** Complete — 2026-08-27

## Chosen Direction

**Single keeper: Recruiter-default Content Lens Switch (Recruiter ↔ Engineer)**

- Toggles same portfolio content between Recruiter and Engineer lenses.
- **Default:** Recruiter on first visit; persists per-device via `localStorage`.
- **Responsive:** bottom-sheet on mobile (reuse `src/app/app.html:56` pattern), popover on iPad/desktop.
- **Discoverability:** footer View chip (`src/app/app.html:138`) + terminal tip (`> tip: toggle view in settings`); no coachmark/tutorial.
- Lean by design — one setting replaces many.

## Non-Goals / Rejected

- **DJ Equalizer / Density sliders** — rejected, over-complex.
- **Contact Dock / Business Card** — rejected, keep settings minimal.
- **Ambient Control (Day Ops / Night Ops / Focus presets)** — blended then rejected; not a theme/motion preset bundle.
- **Coachmark overlay** — rejected, keep discoverability subtle.
- **Private Session, Smart referrer / Balanced defaults** — rejected in favor of Recruiter-default + `localStorage`.

## Key Constraints

- Static GitHub Pages — no backend.
- Actuator / Microservices Dashboard theme — must fit visually.
- Must support mobile / iPad / desktop aspect ratios.

## Next Step

- Hand off to `bmad-spec` / `bmad-prd`.
- Implementation anchors: `onSettingsClick` at `src/app/app.ts:86`, gear at `src/app/app.html:37`.
