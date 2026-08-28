# Epic 7 Context: Settings Icon — Content Lens Switch (Recruiter-default)

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Visitors toggle the portfolio between Recruiter and Engineer lenses via the gear settings; preference persists per-device via localStorage with Recruiter as the non-negotiable default, discoverable through a footer View chip and terminal tip, with a responsive bottom-sheet on mobile and popover on iPad/desktop that fits the Actuator theme. The gear at `src/app/app.html:37` finally does something — one minimal setting that reframes the same content for two audiences without a page reload.

## Stories

- Story 7.1: Lens State Signal, Recruiter Default & localStorage Persistence
- Story 7.2: Responsive Settings Surface — Bottom-Sheet (Mobile) / Popover (Desktop)
- Story 7.3: Lens Toggle Control & Live Content Reframing
- Story 7.4: Ambient Discoverability — Footer View Chip & Terminal Tip

## Requirements & Constraints

- **Content lens switch:** exactly two states (Recruiter ↔ Engineer) reframing the same underlying `public/portfolio-data.json` data through audience-appropriate copy; switching updates visible panels live without reload; current lens visually indicated in settings surface.
- **Per-device persistence:** first visit with no stored value defaults to Recruiter and writes that default to a namespaced localStorage key; after toggling and reloading the last selected lens restores before first paint; corrupted or unknown stored values fall back to Recruiter without crash; lens is the only persisted setting; no network request ever.
- **Responsive settings surface:** gear click opens a bottom-sheet on mobile (<768px) reusing the existing `.mobile-tab-sheet` pattern and a popover anchored to the gear on iPad/desktop (≥768px) — same single control, two presentations via CSS, not separate settings; dismissible via backdrop, close affordance, and Escape with focus returning to gear.
- **Ambient discoverability only:** footer displays a read-only View chip reflecting current lens (`View: Recruiter` / `View: Engineer`); terminal shows tip `> tip: toggle view in settings`; no coachmark, overlay tutorial, or onboarding ring may exist.
- **Single-setting minimalism:** one toggle only; no density sliders, multi-preset bundles, or additional controls.
- **Static hosting:** no backend; all state client-side — GitHub Pages compatible, $0/month constraint intact.
- **Theme compliance:** surface, chip, and tip must use Actuator tokens (monospace, status-chip, terminal palette, spacing/safe-area tokens) and remain legible 320px through desktop.

## Technical Decisions

- **Single signals store (AD-1):** `lens` signal typed `Lens = 'recruiter' | 'engineer'` lives in `ClusterStateService` (`src/app/core/state/cluster-state.service.ts`) with `setLens`/`toggleLens`; components read via `computed()` and mutate only through store methods; no component-local duplicates, no NgRx/RxJS stores.
- **No router (AD-2):** tabs remain `selectedTab` signal; lens switching causes no route change and no Angular Router import.
- **Design tokens (AD-6):** status palette (up green, degraded red, info blue), monospace stack, spacing, and `var(--safe-bottom)`/`dvh` tokens defined in `src/styles.css`; hand-rolled CSS only, no Tailwind or component library; no raw color literals outside tokens (SVG included).
- **Angular v22 baseline (AD-8):** standalone components, signals-first, OnPush, built-in control flow `@if/@for`, strict TypeScript.
- **Testing (AD-9):** Vitest via `ng test` covers lens default, set→persist→reload→restore, corrupted fallback, computed variant selection, and absence of network calls.
- **Implementation anchors:** reuse gear at `src/app/app.html:37` / `onSettingsClick` at `src/app/app.ts:86`, bottom-sheet pattern at `src/app/app.html:56`, footer slot at `src/app/app.html:138`; `onSettingsClick` toggles a `settingsOpen` signal driving visibility with `aria-expanded`/`aria-controls`.
- **Persistence seam:** namespaced key (`portfolio:lens` or `portfolio:content-lens`, documented) written immediately on lens change via effect; hydration happens at store init before first render; key holds only this setting.
- **Content contract (AD-11):** lens variants are additive to `public/portfolio-data.json` (e.g. `description` plus `descriptionRecruiter`/`descriptionEngineer` or `{ recruiter, engineer }` object) validated against interfaces in `src/app/core/data` via `PortfolioDataLoader`; components never fetch content themselves; missing variant falls back to base content; reframing is presentation/copy only and affects all tabs uniformly; any animation must respect `prefers-reduced-motion`.

## UX & Interaction Patterns

- **Gear affordance:** toggles `settingsOpen`; reflects open state via `aria-expanded`/`aria-controls`; focus returns to gear on dismiss.
- **Bottom-sheet (mobile <768px):** max 60vh, backdrop, drag handle, visible 48×48 close button, `role="dialog" aria-modal="true"`, respects `var(--safe-bottom)` and `dvh`.
- **Popover (desktop ≥768px):** absolute positioned right-aligned to `.top-nav__actions`, same template as sheet switched via media/container query.
- **Focus and dismiss:** Escape, backdrop click, or close button dismisses; focus traps inside (first/last wrap), keyboard-only navigable.
- **Toggle control:** exactly one control — segmented control (two buttons) or `role="switch"` with `aria-checked`/`aria-label` — active state visually distinct via status tokens; keyboard Space/Enter flips lens; only two states exist.
- **Live reframing:** computed selectors reading `lens()` update health-dashboard, topology, env-registry, career-pods, and swagger-playground instantly without reload.
- **Footer chip:** read-only status-chip in footer (`.footer__right` or `.footer__left`) showing exact text `View: Recruiter` / `View: Engineer`, updating live when lens toggles.
- **Terminal tip:** line `> tip: toggle view in settings` (lowercase, `>` prefix, monospace terminal palette) visible after boot logs; shown on every visit while Recruiter default holds, suppressed when Engineer (document chosen trigger); no coachmark or highlight ring anywhere.
- **Verification:** single manual pass across mobile (320/375/393) and desktop plus localStorage inspection confirms chip, tip, toggle, and persistence without horizontal scroll.

## Cross-Story Dependencies

- Story 7.1 is the foundation — provides `lens` signal and localStorage hydrator that 7.2, 7.3, and 7.4 all consume; must be verifiable via unit tests before UI stories.
- Story 7.2 provides the responsive surface that hosts the toggle from 7.3; its open/close and focus-trap behavior gates 7.3 testing.
- Story 7.3 depends on 7.1 for state and 7.2 for container; its computed selectors and schema-additive variants reuse the Epic 1 JSON hydration seam.
- Story 7.4 is independently renderable but end-to-end verification requires 7.3 toggling to observe chip/tip updates and reload persistence.
- Builds on Epic 1–4 foundations: `ClusterStateService` signals store, `PortfolioDataLoader` once-at-bootstrap pattern, and Actuator token sheet — no structural changes to those seams.
