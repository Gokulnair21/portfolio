---
title: 'Story 1.4 — Live System Health Probes Display'
type: 'feature'
created: '2026-08-22'
status: 'done'
review_loop_iteration: 0
baseline_commit: '2a8f048'
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Health Dashboard tab still shows a "HEALTH MODULE DEPLOYING" placeholder — the site's actuator theme promises live probe statuses that don't exist yet, so it doesn't feel like a real actuator health endpoint.

**Approach:** Seed default health probe values from a new `health` section in `portfolio-data.json`, expose them through computed selectors on `ClusterStateService`, and build the first feature panel component (`HealthDashboardComponent`) that renders "Liveness Probe" = `UP` (green), "Active Broker Connections" = `2 / 2` (blue), "Error Rate" = `0.00%` (green) using existing design tokens.

## Boundaries & Constraints

**Always:**
- Displayed values come from store computed selectors hydrated by the JSON config — never hardcoded in any component template/class.
- Health section joins the canonical typed contract in `src/app/core/data/portfolio-data.ts`: interface + strict runtime guard + entry in the `parsePortfolioDataDetailed` allowlist (guards construct results from known keys only, so an unextended allowlist silently drops the section).
- New panel is a standalone, OnPush component under `src/app/features/health-dashboard/`; shell imports it and swaps the placeholder for the component tag inside the `'health-dashboard'` tab case.
- Styling uses existing tokens only (`--status-up`, `--status-info`, surfaces, spacing) referenced from `styles.css`/`app.css` conventions — no raw color/spacing values (AD-6). Keep component CSS under the 4kB style budget.
- Follow established patterns: private writable signals + `.asReadonly()` exposure, mutator-only writes, `@if/@for` control flow, strict TS.

**Ask First:**
- Any new status color token (e.g. amber) — current plan needs none.
- Changing display formats of the three metrics or their labels.
- Any change to the load lifecycle or retry flow.

**Never:**
- No Router, no URL changes, no new npm dependencies.
- No reactive transitions to degraded/red states — Epic 2 owns outage simulation; these are static defaults this story.
- No git operations — the human owns version control.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path boot | Valid JSON containing `health` section | Panel shows `UP` green, `2 / 2` blue, `0.00%` green after hydration | N/A |
| Pre-hydration render | Store still `'loading'` | Selectors yield safe defaults matching FR1 values; no crash, no null leakage into template | N/A |
| Missing `health` section | JSON lacks `health` but rest is valid | Guard fails → treated as load failure: SERVICE UNAVAILABLE + RETRY (existing flow, unchanged) | Existing loader failure path |
| Malformed health values | e.g. connections not numeric strings | Guard rejects → same failure path as above | Existing loader failure path |

</frozen-after-approval>

## Code Map

- `public/portfolio-data.json` -- editable content source (52 lines, 4 sections); NEW `health` section here seeds the defaults
- `src/app/core/data/portfolio-data.ts` -- canonical contracts: `PortfolioData` (:34-39, exactly 4 sections today), per-section parsers (:60-100), `parsePortfolioDataDetailed` (:117-141) builds result from an explicit key allowlist — extend all three
- `src/app/core/data/portfolio-data-loader.service.ts` -- `load()` fetches once, guards, then `store.hydrate(result.value)` (:36); unchanged
- `src/app/core/state/cluster-state.service.ts` -- 30-line store: private signals (:9-11), readonly exposures (:13-15), `hydrate`/`markLoadFailed` mutators (:21-29); no computeds yet — ADD health computed selectors deriving from `#content`
- `src/app/core/state/tabs.ts` -- `DEFAULT_TAB = 'health-dashboard'` (:1); `TABS[0]` already labeled "Health Dashboard" (:16-23); no changes needed
- `src/app/app.html:28-32` -- `@case ('health-dashboard')` placeholder block to replace with component tag; outer `@switch (dataStatus())` at :25 gates everything
- `src/app/app.ts` -- standalone App, OnPush, injects store+loader (:15-17); ADD component import to its `imports` array
- `src/styles.css:10-12` -- tokens: `--status-up #22c55e`, `--status-degraded #ef4444`, `--status-info #38bdf8`; no amber token exists (not needed)
- `src/app/app.css:37-43` -- `.status-up/.status-down` badge classes as styling precedent
- Test fixtures: duplicate `VALID_DATA: PortfolioData` constants in `cluster-state.service.spec.ts:6-22`, `app.spec.ts:12-28`, loader spec — MUST gain the `health` field or compile breaks under strict TS
- `src/app/core/data/portfolio-json-contract.spec.ts` -- imports shipped JSON directly, asserts parse + per-section round-trips (:26-36); extend with health assertions
- Vitest setup: globals enabled (`vitest/globals`), service specs use plain `TestBed`, component specs use `fixture.whenStable()`; `npx ng test`

## Tasks & Acceptance

**Execution:**
- [x] `public/portfolio-data.json` -- add `health` section with FR1 defaults (liveness `UP`, broker connections total/active `2`/`2`, error rate `0.00`) -- the JSON-configured seed values
- [x] `src/app/core/data/portfolio-data.ts` -- add `HealthConfig` interface + strict parser; extend `PortfolioData` and the `parsePortfolioDataDetailed` allowlist -- typed contract + runtime validation
- [x] `src/app/core/state/cluster-state.service.ts` -- add computed selectors (e.g. `livenessStatus`, `brokerConnections`, `errorRate`) deriving from `#content()?.health` with FR1-default fallbacks while null -- single source the panel reads
- [x] `src/app/features/health-dashboard/` -- NEW standalone OnPush component (ts/html/css): renders the three probe rows with token-based status coloring -- establishes the features/ pattern
- [x] `src/app/app.ts` + `src/app/app.html` -- import component; replace placeholder `@case` body with `<app-health-dashboard />` -- wire the panel into the shell
- [x] `cluster-state.service.spec.ts`, `app.spec.ts`, loader spec -- update `VALID_DATA` fixtures with `health` -- keep strict TS compiling
- [x] `cluster-state.service.spec.ts` -- add tests: default selector values match FR1 before hydration and after hydrate reflect JSON values -- epic AC coverage
- [x] `src/app/core/data/portfolio-json-contract.spec.ts` -- assert shipped JSON's `health` parses and round-trips -- contract coverage
- [x] `src/app/features/health-dashboard/health-dashboard.spec.ts` -- NEW: renders three probes with expected labels/values/status classes given seeded store -- panel integration coverage

**Acceptance Criteria:**
- AC-1: Given the system is in default state, when the Health Dashboard panel renders, then "Liveness Probe" displays `UP` in green, "Active Broker Connections" displays `2 / 2` in blue, and "Error Rate" displays `0.00%` in green.
- AC-2: Given displayed health values, when traced to their source, then they originate from store computed selectors seeded by the JSON config — zero hardcoded metric values in component templates or classes.
- AC-3: Given unit tests run, when initial health state is evaluated, then the store's default selector outputs match the FR1 defaults.
- AC-4: Given `npx ng test` and `npm run build` run, then all specs pass and strict TS compiles clean.

## Spec Change Log

## Design Notes

Selector shape sketch (values are illustrative of the seam, exact types yours):

```ts
livenessStatus = computed(() => this.#content()?.health?.liveness ?? 'UP');
brokerConnections = computed(() =>
  `${this.#content()?.health?.brokerActive ?? 2} / ${this.#content()?.health?.brokerTotal ?? 2}`);
```

Rationale: deriving from `#content()` keeps hydrate/markLoadFailed as the only writers (AD-1 single-writer survives untouched); the null-fallback exists purely for the brief pre-hydration window and mirrors FR1 defaults so early renders never flash wrong values. Do NOT add a separate writable health signal — two sources of truth would break the Epic 2 outage handoff.

Panel visual language: reuse the header-badge class vocabulary (`.status-up` green / info blue via `--status-info`) rather than inventing new classes where practical; monospace font and panel surface come free from global styles.

## Verification

**Commands:**
- `npx ng test` -- expected: all specs pass including new health selector/panel/contract tests
- `npm run build` -- expected: production build succeeds, strict TS clean
- `rg -n "UP|2 / 2|0.00%" src/app/features src/app/app.html` -- expected: no literal metric matches in component code (values flow from store)
- `rg "#[0-9a-fA-F]{3,6}" src/app/features` -- expected: no matches (tokens only)

**Manual checks (if no CLI):**
- Serve app: Health Dashboard tab (default) shows the three probes with correct values and colors; edit `health` values in JSON, reload → panel reflects them without code changes

## Suggested Review Order

**Health contract & validation**

- Entry point: strict health guard — types, non-negative checks, active<=total invariant
  [`portfolio-data.ts:117`](../../src/app/core/data/portfolio-data.ts#L117)

- Health joins the canonical four-section typed contract
  [`portfolio-data.ts:41`](../../src/app/core/data/portfolio-data.ts#L41)

- The JSON-configured seed values — single place a human edits health defaults
  [`portfolio-data.json:52`](../../public/portfolio-data.json#L52)

**Store selectors**

- Computed selectors derive from #content() with FR1 fallbacks; no new writable signal
  [`cluster-state.service.ts:22`](../../src/app/core/state/cluster-state.service.ts#L22)

- Value-derived color flags keep styling logic in the store, literals out of features/
  [`cluster-state.service.ts:25`](../../src/app/core/state/cluster-state.service.ts#L25)

**Panel rendering**

- Three probe rows; classes bound to store flags so DOWN/non-zero render degraded
  [`health-dashboard.html:5`](../../src/app/features/health-dashboard/health-dashboard.html#L5)

- Tokens-only colors plus fixed grid measure (spacing token misuse patched)
  [`health-dashboard.css:19`](../../src/app/features/health-dashboard/health-dashboard.css#L19)

**Shell wiring**

- Placeholder swapped for the first feature component import
  [`app.html:29`](../../src/app/app.html#L29)

**Tests**

- Required-health-section pin: absent key fails even when all else is valid
  [`portfolio-data-loader.service.spec.ts:142`](../../src/app/core/data/portfolio-data-loader.service.spec.ts#L142)

- Impossible broker counts rejected at load
  [`portfolio-data-loader.service.spec.ts:158`](../../src/app/core/data/portfolio-data-loader.service.spec.ts#L158)

- FR1 defaults pre-hydration and JSON-driven values after hydrate
  [`cluster-state.service.spec.ts:70`](../../src/app/core/state/cluster-state.service.spec.ts#L70)

- DOWN-seeded panel asserts degraded classes, not just text
  [`health-dashboard.spec.ts:60`](../../src/app/features/health-dashboard/health-dashboard.spec.ts#L60)

- Shipped JSON round-trips through the health guards
  [`portfolio-json-contract.spec.ts:44`](../../src/app/core/data/portfolio-json-contract.spec.ts#L44)
