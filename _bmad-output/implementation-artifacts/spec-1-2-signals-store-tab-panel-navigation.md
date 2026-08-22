---
title: 'Story 1.2 — Signals Store & Tab Panel Navigation'
type: 'feature'
created: '2026-08-22'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'e6163a38759474922687d67fb0977727b5cc9a27'
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The shell renders only a static header and an empty panel area — visitors cannot move between dashboard sections because no shared state layer or tab mechanism exists.

**Approach:** Introduce `ClusterStateService` as the single signals store holding `selectedTab`, define the dashboard tabs as typed config, and wire the shell to render tab buttons from that config and swap visible panels off the signal — no reload, no URL change.

## Boundaries & Constraints

**Always:**
- Store pattern per AD-1: `selectedTab` exposed read-only (`asReadonly()`); all mutations go through a store method (e.g. `selectTab(id)`); components read via signals/`computed()` only.
- `ClusterStateService` provided at app level (`appConfig.providers`) so every feature reads one instance.
- Tabs defined as a typed union (`TabId`) plus a typed config array (`{ id, label }[]`); the shell renders buttons from that array — no duplicated hardcoded labels in template.
- Panel switching uses built-in control flow (`@switch`/`@case` or `@if`) keyed on `selectedTab()`; standalone OnPush components throughout.
- All styling references existing CSS custom properties in `src/styles.css`; hand-rolled CSS only.

**Ask First:**
- Changing the tab set, ordering, labels, or ids beyond the six planned sections below.
- Any new npm dependency or any state library (NgRx/RxJS subjects).

**Never:**
- No Angular Router import, no URL/hash/history manipulation, no deep links (AD-2).
- No component-local duplicate of the selected tab.
- No real panel content: Health Dashboard internals are Story 1.4; other panels stay themed placeholders.
- No git operations — the human owns version control.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Initial load | App bootstraps | Default tab is the health dashboard section; its panel area is visible, all others hidden | N/A |
| Tab switch | Click on any other tab button | That section's panel becomes visible; previous panel hides; clicked button shows active styling | N/A |
| Repeat click | Click already-active tab | State unchanged; same panel remains visible | N/A |

</frozen-after-approval>

## Code Map

- `src/app/core/state/` -- empty seed dir from scaffold plan; home of the new store
- `src/app/core/state/cluster-state.service.ts` -- NEW: `ClusterStateService` (`@Injectable({providedIn:'root'})` acceptable alternative to app-level provider — pick one, do not double-register); private writable `#tab = signal<TabId>('health-dashboard')`, public `readonly selectedTab`, public `selectTab(id: TabId)`
- `src/app/core/state/tabs.ts` -- NEW (optional split): `export type TabId = ...`; `TABS: {id: TabId; label: string}[]`. Planned sections in order: Health Dashboard, Terminal Console, Service Topology, Env Registry, Career Pods, Swagger Playground
- `src/app/app.config.ts:4` -- providers array currently `[provideBrowserGlobalErrorListeners()]`; add store here if using app-level provision
- `src/app/app.ts:10-11` -- header signals (`serviceTitle`, `statusLabel`) stay local (header chrome, not shared state); inject store for tab logic
- `src/app/app.html:11` -- `<main class="panel-area">` becomes: tab bar above it (buttons from `TABS`, `aria-pressed`/active class bound to selection) + `@switch` over `selectedTab()` rendering per-section panel containers; unbuilt sections render a themed placeholder block (e.g. "MODULE NOT DEPLOYED") styled with tokens
- `src/app/app.css` -- add tab-bar styles (tokens only); reuse `.panel-area` framing
- `src/app/app.spec.ts:25-33` -- existing shell tests must keep passing; extend with tab-switch assertions
- `src/app/core/state/cluster-state.service.spec.ts` -- NEW: store transition tests

## Tasks & Acceptance

**Execution:**
- [x] `src/app/core/state/tabs.ts` -- define `TabId` union and typed `TABS` config for the six planned sections -- single source of tab identity for shell and future features
- [x] `src/app/core/state/cluster-state.service.ts` -- implement store: read-only `selectedTab` signal (default `'health-dashboard'`) + `selectTab()` mutator -- AD-1 single-writer state seam
- [x] `src/app/app.config.ts` -- provide `ClusterStateService` at app level (or confirm `providedIn:'root'`) -- one shared instance
- [x] `src/app/app.html` + `app.ts` + `app.css` -- render tab bar from `TABS`, bind clicks to `store.selectTab()`, `@switch` panel visibility, active-tab styling, themed placeholders for unbuilt sections; tokens-only CSS -- delivers the AC behavior end-to-end
- [x] `src/app/core/state/cluster-state.service.spec.ts` -- unit tests: initial value, transition on select, re-select idempotence -- covers AC-3
- [x] `src/app/app.spec.ts` -- update shell tests: clicking a tab button swaps visible panel without reload; active styling follows selection -- integration coverage of AC-2

**Acceptance Criteria:**
- AC-1: Given the app compiles, when `ClusterStateService` is inspected, then `selectedTab` is a read-only signal and tab state can change only via its mutation method.
- AC-2: Given the shell renders tab buttons from typed config, when a different tab is clicked, then exactly that section's panel is visible, all others hide, and neither page reload nor URL change occurs.
- AC-3: Given `ng test` runs, then all store-transition and shell tab-selection tests pass under Vitest.
- AC-4: Given the source tree, when searched, then zero Router imports, zero raw color/spacing values outside `styles.css`, and OnPush on every touched component.

## Spec Change Log

## Verification

**Commands:**
- `npm run build` -- expected: production build succeeds, strict TS clean
- `npx ng test` -- expected: all specs pass including new store + shell tab tests
- `rg -i "router|location|history" src/ --glob '!*.spec.ts'` -- expected: no navigation-related matches
- `rg "#[0-9a-fA-F]{3,6}\b" src/app/app.css src/app/core/` -- expected: no matches (tokens only)

**Manual checks (if no CLI):**
- Serve app; click each tab: correct placeholder/panel shows, others hide, browser URL bar never changes

## Suggested Review Order

**Signals store (single source of tab truth)**

- Private writable signal + read-only exposure; single mutator — the AD-1 seam
  [`cluster-state.service.ts:6`](../../src/app/core/state/cluster-state.service.ts#L6)

- Typed tab identity: `TabId` union plus `TABS` config drive everything downstream
  [`tabs.ts:3`](../../src/app/core/state/tabs.ts#L3)

**Shell navigation**

- Tab bar rendered from config; `aria-selected` bound to the store signal
  [`app.html:11`](../../src/app/app.html#L11)

- `@switch` keeps exactly one panel visible; `@default` covers unbuilt and unknown ids
  [`app.html:26`](../../src/app/app.html#L26)

- Shell injects the store; header signals stay component-local chrome
  [`app.ts:16`](../../src/app/app.ts#L16)

- Tab styling references tokens only; active state mirrors selection
  [`app.css:48`](../../src/app/app.css#L48)

**Wiring & tests**

- App-level provider registration — the production composition root
  [`app.config.ts:5`](../../src/app/app.config.ts#L5)

- Real `appConfig.providers` exercised so DI wiring cannot silently break
  [`app.spec.ts:101`](../../src/app/app.spec.ts#L101)

- Every tab yields exactly one visible panel; URL never changes
  [`app.spec.ts:118`](../../src/app/app.spec.ts#L118)

- Store behavior: default value, read-only handle, transitions, idempotence
  [`cluster-state.service.spec.ts:13`](../../src/app/core/state/cluster-state.service.spec.ts#L13)
