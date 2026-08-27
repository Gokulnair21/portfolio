---
title: 'Terminal Toggle Visibility'
type: 'feature'
created: '2026-08-27'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '0869b27d442b8a9254f223a219f0234a32b7b0b5'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The terminal console (`app-terminal-console`) is permanently fixed-visible on all viewports, overlapping primary content on smaller aspect ratios/mobile and offering no user control. Users expect to hide the terminal when space is constrained and reveal it on demand via the header terminal icon, consistently on both desktop and mobile.

**Approach:** Make the terminal visibility user-controlled via the existing header terminal icon button (same behavior on desktop and mobile). Hide the terminal by default on smaller aspect ratios / narrow viewports and allow toggling visibility everywhere via a shared signal, with layout padding and accessibility states updating reactively.

## Boundaries & Constraints

**Always:** Terminal toggle state lives in application state — `ClusterStateService` signal (e.g., `terminalVisible`) or `App` signal if purely presentational — mutated only via store method or App method; components read via signal/computed; hand-rolled CSS only using design tokens (`--terminal-height`, `--footer-height`, `--safe-bottom`) for layout; keyboard and screen-reader accessibility preserved (aria-expanded, aria-controls, focus-visible, prefers-reduced-motion).

**Ask First:** Changing initial visibility default (visible vs hidden) on desktop if product wants different default; adding Escape/backdrop to dismiss terminal overlay variant.

**Never:** Introduce router, NgRx/RxJS stores, component-local duplicate of shared outage/tab state, Tailwind/component libraries, JS resize listeners (use `matchMedia`/`@media` or signals); remove or bypass `SimulationEngine` single-writer rule or `MessageDelivery` port; hardcode colors/spacing outside tokens.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Hide on small viewport | viewport switches to max-width 767px or small aspect ratio (e.g., max-aspect-ratio or narrow width) initially | terminal hidden, main-content bottom padding collapses to footer-only (`var(--footer-height) + var(--safe-bottom)`) | N/A |
| Show on terminal icon click | user clicks header terminal icon button while hidden | terminal slides into view (transform/visibility), main-content padding expands to include terminal height, button aria-expanded updates | N/A |
| Hide on terminal icon click again | user clicks header terminal icon while visible | terminal hides, padding collapses, focus stays on toggle button | N/A |
| Desktop toggle parity | user clicks terminal icon on desktop (>=768px) | same show/hide toggle behavior as mobile, no viewport-specific branch | N/A |
| Rapid toggle / orientation change | user rotates device or resizes while toggling | no layout jump/CLS, state preserved, transitions honor prefers-reduced-motion | N/A |

</frozen-after-approval>

## Code Map

- `src/app/app.html:1` -- Shell template: header `.top-nav__actions` terminal icon button (44-49) currently no-op `onTerminalClick()`, and `<app-terminal-console />` (144) always rendered at bottom. Add binding for visibility (e.g., `*ngIf`/`[class]`/`@if`) and aria attributes (`aria-expanded`, `aria-controls="terminal-console"`).
- `src/app/app.ts:90` -- Shell component: `onTerminalClick()` logs only; `sheetOpen` signal pattern to reuse for terminal visibility. Add `terminalVisible` signal (or delegate to store) and toggle method; computed for padding class.
- `src/app/app.css:308` -- Main content padding: `padding-bottom: calc(var(--terminal-height) + var(--footer-height) + ...)` assumes terminal always visible. Make conditional via class (e.g., `.main-content--terminal-visible` vs `--hidden`) or CSS custom property override bound to signal.
- `src/app/features/terminal-console/terminal-console.css:10` -- Terminal positioning: `position: fixed; bottom: calc(var(--footer-height)+var(--safe-bottom)); height: var(--terminal-height)`; always visible. Add hidden state (e.g., `transform: translateY(100%)`, `visibility: hidden`, `pointer-events: none`) and visible state with transition; honor `prefers-reduced-motion`.
- `src/app/features/terminal-console/terminal-console.html:1` -- Terminal markup: `<section class="terminal-console">`. Add id `terminal-console`, bind hidden/visible class, `aria-hidden`, and `inert` when hidden for accessibility.
- `src/app/features/terminal-console/terminal-console.ts:17` -- Component: `afterRenderEffect` auto-scrolls on `store.logs()`. Guard scroll when hidden or ensure scroll occurs after reveal; no new timers.
- `src/app/core/state/cluster-state.service.ts:37` -- Shared signals store: if terminal visibility is shared state, add signal here (`#terminalVisible` + readonly + toggle method) per AD-1; otherwise keep in `App` if purely presentational (decision to document in Design Notes).
- `src/styles.css:182` -- Design tokens: `--terminal-height`/`--footer-height` already responsive via media queries; reuse for hidden padding calculation; no new hardcoded values.
- `src/app/app.spec.ts` -- Existing shell tests: will need update to assert toggle behavior and that terminal hidden class appears when toggled.

## Tasks & Acceptance

**Execution:**
- [x] `src/app/core/state/cluster-state.service.ts` -- Add `terminalVisible` signal (or document why App-local) with `toggleTerminal()`/`setTerminalVisible(boolean)` and optional media-query initialization (hidden by default on `max-width: 767px` or small aspect ratio) -- rationale: single source of truth for cross-viewport toggle, matches tab/sheet signal pattern.
- [x] `src/app/app.ts` -- Wire header terminal icon button to toggle signal: replace `onTerminalClick()` log with toggle, expose `terminalVisible` computed/signal to template, set `aria-expanded` and `aria-controls` bindings -- rationale: user-visible entry point, parity for desktop/mobile.
- [x] `src/app/app.html` -- Bind terminal visibility to shell: conditional class on `<app-terminal-console>` and `<main class="main-content">` (e.g., `[class.main-content--terminal-visible]="terminalVisible()"`), add `id="terminal-console"` target for a11y, ensure icon button has `aria-expanded`/`aria-controls` -- rationale: propagate state to layout without duplicating logic.
- [x] `src/app/features/terminal-console/terminal-console.css` -- Implement hidden/visible states: hidden = `transform: translateY(calc(100% + var(--footer-height)))` + `visibility:hidden` + `pointer-events:none`; visible = `transform: translateY(0)` + `visibility:visible`; transition on `transform` with `prefers-reduced-motion: reduce` disabling -- rationale: hides terminal UI and frees viewport on small aspect ratios, animates on toggle.
- [x] `src/app/features/terminal-console/terminal-console.html` -- Add visibility bindings (`[class.terminal-console--hidden]`, `[attr.aria-hidden]`, `[attr.inert]`) tied to signal input -- rationale: accessibility when hidden.
- [x] `src/app/app.css` -- Adjust main-content bottom padding reactively: default (hidden) = `calc(var(--footer-height) + var(--safe-bottom) + var(--space-xl))`; visible = `calc(var(--terminal-height) + var(--footer-height) + var(--safe-bottom) + var(--space-xl))` via class variants; ensure topology override (`:has(app-service-topology)`) respects both states -- rationale: prevents fixed terminal overlapping content.
- [x] `src/app/app.spec.ts` + `src/app/features/terminal-console/*spec.ts` if needed -- Add unit tests: toggle flips signal, clicking button shows/hides terminal DOM, padding class toggles, aria-expanded updates -- rationale: verifies I/O matrix.

**Acceptance Criteria:**
- Given viewport is narrow (max-width 767px or small aspect ratio) on load, when shell renders, then terminal console is hidden (not visible, no overlap) and main-content bottom padding excludes terminal height.
- Given terminal is hidden, when user clicks the header terminal icon button, then terminal becomes visible, main-content padding expands to include terminal height, and button `aria-expanded="true"` and `aria-controls="terminal-console"` are correct.
- Given terminal is visible, when user clicks the header terminal icon again, then terminal hides, padding collapses, `aria-expanded="false"`, and focus remains on the button (no focus loss).
- Given user is on desktop (>=768px), when user clicks terminal icon, then same toggle show/hide behavior occurs (parity with mobile).
- Given `prefers-reduced-motion: reduce` is active, when terminal toggles, then no transform/opacity transition runs.

## Spec Change Log

## Design Notes

Visibility state ownership: prefer `ClusterStateService` signal if terminal visibility needs to be read by multiple features (e.g., future keyboard shortcut); otherwise App-local `signal<boolean>` is acceptable for purely presentational toggle — choose one and document. Initial value: `false` (hidden) to satisfy "hide on smaller aspect ratio" and "same for desktop" (hidden by default everywhere, revealed on click). If product wants desktop to default visible, invert initial value for `min-width:768px` via `matchMedia` on init and on `change` event, but keep toggle parity.

Example bindings:
```html
<!-- app.html -->
<button class="top-nav__icon-btn" aria-label="Terminal" aria-controls="terminal-console" [attr.aria-expanded]="terminalVisible()" (click)="toggleTerminal()">
  <span class="material-symbols-outlined">terminal</span>
</button>
<app-terminal-console id="terminal-console" [class.terminal-console--hidden]="!terminalVisible()" />
<main class="main-content" [class.main-content--terminal-visible]="terminalVisible()">
```

## Verification

**Commands:**
- `npm run build -- --configuration production` -- expected: succeeds, no new bundle, CSS token changes only
- `npx ng test --watch=false` -- expected: all tests pass including new toggle specs
- `npx ng lint` if available -- expected: no lint errors

**Manual checks (if no CLI):**
- Resize viewport 320↔1920 and toggle terminal icon: terminal shows/hides, content never hidden behind terminal/footer, no horizontal scroll, focus visible on toggle, screen reader announces expanded state.

## Suggested Review Order

**State & Toggle Entry Point**

- Core signal holding visibility, hidden by default on all viewports
  [`cluster-state.service.ts:45`](../../src/app/core/state/cluster-state.service.ts#L45)

- Toggle and explicit setter mutating only via store methods
  [`cluster-state.service.ts:153`](../../src/app/core/state/cluster-state.service.ts#L153)

- Shell delegation from header icon to store signal
  [`app.ts:90`](../../src/app/app.ts#L90)

**Header & Shell Wiring**

- Terminal icon with dynamic label, aria-controls and aria-expanded binding
  [`app.html:45`](../../src/app/app.html#L45)

- Main content padding class reacting to visibility
  [`app.html:85`](../../src/app/app.html#L85)

- Host id for aria-controls target
  [`app.html:146`](../../src/app/app.html#L146)

**Terminal Hide/Show UI**

- Section classes, aria-hidden and inert tied to store visibility
  [`terminal-console.html:3`](../../src/app/features/terminal-console/terminal-console.html#L3)

- Fixed-position slide with transform, visibility and reduced-motion guard
  [`terminal-console.css:32`](../../src/app/features/terminal-console/terminal-console.css#L32)

**Layout Adaptation**

- Main content padding collapsed vs expanded variants
  [`app.css:326`](../../src/app/app.css#L326)

- Topology-aware padding variant when terminal visible
  [`app.css:339`](../../src/app/app.css#L339)

**Verification**

- Store and UI toggle tests covering hidden/visible, aria and inert
  [`app.spec.ts:285`](../../src/app/app.spec.ts#L285)

- Store signal read-only and rapid toggle resilience tests
  [`cluster-state.service.spec.ts:434`](../../src/app/core/state/cluster-state.service.spec.ts#L434)
