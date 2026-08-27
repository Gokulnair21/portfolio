---
id: SPEC-settings-icon-actions
companions: []
sources: ["../../brainstorming/brainstorm-settings-icon-2026-08-27/brainstorm-intent.md"]
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Settings Icon Actions — Recruiter-default Content Lens Switch

## Why

The SpringActuator-Portfolio dashboard's gear icon at `src/app/app.html:37` (`onSettingsClick` at `src/app/app.ts:86`) currently does nothing. Prior brainstorming explored many settings (DJ Equalizer, Ambient presets, density sliders) but converged on a single lean keeper: a Content Lens Switch that reframes the same portfolio content for two audiences. Recruiters need outcome-focused framing on first visit; engineers need implementation-depth framing. Static GitHub Pages (no backend) and the Actuator/microservices dashboard theme constrain what can be added. This spec captures that single setting so downstream design and implementation have one non-negotiable toggle to ship.

## Capabilities

- **CAP-1**
  - **intent:** Visitor can toggle the portfolio between Recruiter and Engineer lenses to view the same underlying content through audience-appropriate framing.
  - **success:** Toggling switches visible copy/framing between lenses without page reload; current lens is visually indicated in the settings surface; exactly two states exist (Recruiter, Engineer).

- **CAP-2**
  - **intent:** Visitor's lens preference persists per-device so return visits restore their last choice, defaulting to Recruiter on first visit.
  - **success:** First visit (no stored value) renders Recruiter; after toggling and reloading, the last selected lens restores; preference stored in `localStorage` only; no network request.

- **CAP-3**
  - **intent:** Visitor can open and operate the settings surface on any viewport via a responsive affordance.
  - **success:** Gear click opens a bottom-sheet on mobile (reusing `src/app/app.html:56` pattern) and a popover anchored to the gear on iPad/desktop; sheet/popover can be dismissed via backdrop, close affordance, and Escape; focus traps correctly; works on mobile, iPad, and desktop.

- **CAP-4**
  - **intent:** Visitor can discover the lens switch without tutorial via ambient cues.
  - **success:** Footer displays a View chip at `src/app/app.html:138` reflecting current lens; terminal shows tip `> tip: toggle view in settings`; no coachmark or overlay tutorial is presented.

## Constraints

- Static GitHub Pages — no backend; all state is client-side (`localStorage`); no API or server persistence.
- Must fit Actuator / Microservices Dashboard theme visually (monospace, status-chip, terminal palette, existing design tokens in `src/styles.css`).
- Must support mobile / iPad / desktop aspect ratios — bottom-sheet vs popover are the same control, not separate settings.
- Single-setting minimalism — one toggle only; no density sliders, no multi-preset bundles, no additional controls in this scope.
- Reuse implementation anchors: gear at `src/app/app.html:37`, `onSettingsClick` at `src/app/app.ts:86`, bottom-sheet pattern at `src/app/app.html:56`, footer chip slot at `src/app/app.html:138`.
- Discoverability is subtle only — footer chip + terminal tip; no coachmark, no onboarding overlay.

## Non-goals

- DJ Equalizer / Density sliders — rejected, over-complex.
- Contact Dock / Business Card — rejected, keep settings minimal.
- Ambient Control presets (Day Ops / Night Ops / Focus) — rejected, not a theme/motion bundle.
- Coachmark overlay / tutorial — rejected, keep discoverability subtle.
- Private Session, Smart referrer / Balanced defaults — rejected in favor of Recruiter-default + `localStorage`.
- Additional settings beyond the single Content Lens Switch — out of scope.

## Success signal

A first-time visitor lands and sees Recruiter framing; toggling to Engineer reframes visible content and persists after reload; the gear opens a bottom-sheet on mobile and a popover on desktop; the footer chip and terminal tip are visible and no coachmark appears — verifiable in a single manual pass across mobile and desktop viewports with `localStorage` inspection.

## Assumptions

- Lens toggles presentation/copy framing of the same underlying portfolio data, not separate content sets.
- Footer View chip is a new read-only indicator reflecting current lens (not a second toggle).
- `localStorage` key is namespaced to the portfolio; lens is the only persisted setting; cross-tab sync via `storage` event is nice-to-have but not required.
- Lens change re-renders visible panels live without full page reload.

## Open Questions

- What exactly differs between Recruiter and Engineer lenses (copy tone, detail depth, which tabs/sections are affected)?
- Does lens switch require any transition/animation, and does it affect all tabs uniformly?
- Terminal tip trigger and wording: on every visit, once per device, or only while still on default? Exact placement/line in terminal?
