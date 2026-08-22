---
title: 'Story 1.3 — Runtime JSON Content Hydration'
type: 'feature'
created: '2026-08-22'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'ec85c2d'
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** All portfolio content would have to be hardcoded in components — the site is not editable without code changes, violating FR-7/AD-3 (content lives in runtime-fetched JSON).

**Approach:** Add `public/portfolio-data.json`, canonical typed interfaces plus a validating `PortfolioDataLoader` in `src/app/core/data`, fetch the file once at bootstrap via HttpClient, and hydrate it into `ClusterStateService`. On fetch/parse/validation failure the shell renders a themed "SERVICE UNAVAILABLE" panel with a retry action instead of blank panels.

## Boundaries & Constraints

**Always:**
- Canonical content interfaces live in `src/app/core/data/portfolio-data.ts`; features import them — no local duplicates (AD-11).
- Validation is **runtime** (hand-rolled type guards over the parsed JSON), because compile-time TS types are erased before the fetch happens. Invalid shape = load failure, same as a bad fetch.
- One root JSON object with named sections (`projects`, `experience`, `contact`, `envProperties`); dates are ISO `yyyy-MM-dd` strings.
- Fetch exactly once at startup via `provideAppInitializer` in `app.config.ts`; components never inject `HttpClient` — they read hydrated signals from `ClusterStateService` (AD-1, AD-3).
- Load lifecycle lives in the store as a tri-state signal (`'loading' | 'ready' | 'failed'`); shell switches panel rendering off it; retry re-invokes the loader through the store flow, not ad-hoc component fetching.
- "SERVICE UNAVAILABLE" panel styled with existing tokens only (`--status-degraded` accent); reuse `.panel`/placeholder classes in `app.css`.

**Ask First:**
- Any new npm dependency (e.g. zod-style schema libs) — hand-rolled guards are the default.
- Changing the top-level JSON sections beyond the four above (health config seeding is Story 1.4's business).
- Real personal data (projects/contact details) — ship plausible placeholder content now; human edits the JSON afterwards.

**Never:**
- No Router, no URL changes, no blocking-the-render hacks outside the initializer pattern (AD-2).
- No raw color/spacing values outside `styles.css` (AD-6).
- No git operations — the human owns version control.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path boot | Valid `portfolio-data.json` served | Store reaches `'ready'` with typed content; shell renders tabs as in Story 1.2 | N/A |
| Fetch fails | 404 / network error at boot | Store reaches `'failed'`; shell shows themed SERVICE UNAVAILABLE panel with RETRY button — no blank page | Retry refetches; success exits failure state |
| Invalid JSON body | Malformed JSON or shape failing guards | Treated identically to fetch failure: `'failed'` + retry panel | Same as above |
| Content-only edit | Value changed in JSON only, app reloaded | Updated content renders with zero component/logic changes | N/A |
| Repeat retry click | RETRY clicked while still down | Re-fetch attempted each click; panel stays until success | No duplicate concurrent fetches required |

</frozen-after-approval>

## Code Map

- `public/` -- currently only favicon.ico; NEW `public/portfolio-data.json` here (served verbatim by angular.json asset glob)
- `src/app/core/data/` -- does not exist yet; NEW dir: `portfolio-data.ts` (interfaces + type guards) and `portfolio-data-loader.service.ts`
- `src/app/core/state/cluster-state.service.ts:5-13` -- existing store (`#tab` signal, `selectTab()` mutator); extend with `#dataStatus`/`#content` private writable signals, read-only exposures, `hydrate(data)` + `markLoadFailed()` mutators — single-writer seam per AD-1
- `src/app/app.config.ts:5` -- providers array `[provideBrowserGlobalErrorListeners(), ClusterStateService]`; add `provideHttpClient(withFetch())` + `provideAppInitializer(...)` invoking the loader
- `src/main.ts:6` -- plain `bootstrapApplication(App, appConfig)`; no change expected (initializer handles async)
- `src/app/app.html:25-38` -- `<main class="panel-area">` `@switch (store.selectedTab())`; wrap with outer branch on data status: `'failed'` renders SERVICE UNAVAILABLE + RETRY, `'loading'` may reuse placeholder block, `'ready'` renders existing tab switch untouched
- `src/app/app.css` -- `.panel` / placeholder styles to reuse for the failure panel; tokens-only additions
- `src/styles.css:6-48` -- token definitions (`--status-up/degraded/info`, spacing, mono stack) — reference only
- `src/app/app.spec.ts:101-116` -- "real application providers" test consumes `appConfig.providers`; will need `provideHttpClientTesting` + flush of the boot fetch
- `src/app/core/state/cluster-state.service.spec.ts` -- extend with hydration/lifecycle transition tests
- Vitest setup: `@angular/build:unit-test` builder, jsdom, no vitest.config; first HTTP tests in repo will introduce `HttpTestingController`

## Tasks & Acceptance

**Execution:**
- [x] `public/portfolio-data.json` -- author initial root object with `projects`, `experience`, `contact`, `envProperties` sections using plausible placeholder data -- the editable content source
- [x] `src/app/core/data/portfolio-data.ts` -- define canonical interfaces (`PortfolioData` and section shapes) plus exported runtime type guards returning validated data or `null` -- AD-11 contract home + Pair D strictness
- [x] `src/app/core/data/portfolio-data-loader.service.ts` -- NEW service: fetch `portfolio-data.json` once via `HttpClient`, run guards, call `store.hydrate(...)` on success / `store.markLoadFailed()` on any failure; expose `load()` used by both initializer and retry -- one code path for boot and retry
- [x] `src/app/core/state/cluster-state.service.ts` -- add tri-state data-status signal (default `'loading'`), content signal, and the two mutators -- hydration enters the single store
- [x] `src/app/app.config.ts` -- register `provideHttpClient(withFetch())` and `provideAppInitializer` calling `loader.load()` -- fetch-once-at-bootstrap requirement
- [x] `src/app/app.html` + `app.ts` (+ minimal `app.css`) -- branch shell rendering on data status; themed SERVICE UNAVAILABLE panel with RETRY bound to loader/store flow; ready state keeps Story 1.2 tab behavior unchanged -- AC failure-path UX
- [x] `src/app/core/data/portfolio-data-loader.service.spec.ts` -- NEW: `HttpTestingController` tests for success-hydrates, malformed JSON, guard rejection, HTTP error, and retry-after-failure -- covers I/O matrix edges
- [x] `src/app/core/state/cluster-state.service.spec.ts` -- extend: status transitions `loading→ready` and `loading→failed`, content set only on valid hydrate -- store contract coverage
- [x] `src/app/app.spec.ts` -- update real-providers test for HTTP testing provider; add: failure shows SERVICE UNAVAILABLE panel with working retry; success renders tabs -- integration coverage

**Acceptance Criteria:**
- AC-1: Given a valid `public/portfolio-data.json`, when the app bootstraps, then content is fetched exactly once via HttpClient, passes runtime guards, and components render only store-exposed typed shapes.
- AC-2: Given the JSON is missing, malformed, or fails validation, when the app renders, then the themed SERVICE UNAVAILABLE panel with a functioning RETRY appears — never a blank page or console-only error.
- AC-3: Given a value changed in the JSON file only, when the app reloads, then updated content renders with zero component or logic code edits.
- AC-4: Given `ng test` runs, then all new loader/store/shell specs pass under Vitest; given `npm run build` runs, then strict TS compiles clean.

## Spec Change Log

## Design Notes

Why runtime guards despite "validated against TypeScript interface": TS types vanish at compile time; the architecture review (Pair D) flags loose-vs-strict divergence as a day-one integration breaker. Decision: strict guards — every field required, arrays present, unknown extra fields ignored — so downstream features (career pods, env registry) can assume non-null shapes.

Status machine (store-owned):

```
'loading' --hydrate(validData)--> 'ready'
'loading' --markLoadFailed()----> 'failed'
'failed'  --load() retry--------> 'loading' --> ...
```

Retry reuses `load()`; there is deliberately no direct `content.set()` outside the two mutators.

Implementation note: only the two mutators (`hydrate`, `markLoadFailed`) exist, so during a retry-in-flight after failure the status deliberately remains `'failed'` (panel + RETRY stay visible) until the refetch resolves into `'ready'` or re-fails — exactly the behavior the I/O matrix row "Repeat retry click" prescribes ("panel stays until success"). The diagram's `'failed' -> 'loading'` edge is therefore not materialized as a separate store transition.

JSON shape sketch:

```json
{
  "projects": [{ "name": "...", "description": "...", "stack": ["..."], "repoUrl": "..." }],
  "experience": [{ "company": "...", "role": "...", "period": "...", "highlights": ["..."] }],
  "contact": { "email": "...", "github": "...", "linkedin": "..." },
  "envProperties": [{ "key": "...", "value": "..." }]
}
```

Exact field names within sections may be refined during implementation as long as guards, JSON, and this sketch stay consistent — flag deviations in Design Notes if they diverge materially.

## Verification

**Commands:**
- `npm run build` -- expected: production build succeeds, strict TS clean
- `npx ng test` -- expected: all specs pass including new loader/store/shell tests
- `rg -n "HttpClient" src/app --glob '!*.spec.ts' -l` -- expected: only files under `src/app/core/data/`
- `rg "#[0-9a-fA-F]{3,6}\b" src/app/app.css` -- expected: no matches (tokens only)

**Manual checks (if no CLI):**
- Serve app; rename `public/portfolio-data.json` temporarily: SERVICE UNAVAILABLE panel shows, RETRY restores content after renaming back; normal boot renders tabs with hydrated content

## Suggested Review Order

**Load lifecycle & race safety**

- Entry point: one `load()` path serves boot and retry; sequence guard drops stale responses
  [`portfolio-data-loader.service.ts:22`](../../src/app/core/data/portfolio-data-loader.service.ts#L22)

- Read-only pending signal drives RETRY's disabled state
  [`portfolio-data-loader.service.ts:20`](../../src/app/core/data/portfolio-data-loader.service.ts#L20)

- Base-href-aware URL resolution keeps GitHub Pages sub-path deploys working (AD-7)
  [`portfolio-data-loader.service.ts:15`](../../src/app/core/data/portfolio-data-loader.service.ts#L15)

**Runtime validation contract**

- Typed parse result carries field-level failure reasons for diagnostics
  [`portfolio-data.ts:41`](../../src/app/core/data/portfolio-data.ts#L41)

- Strict per-entry guards — every field required, invalid shape = load failure (Pair D)
  [`portfolio-data.ts:60`](../../src/app/core/data/portfolio-data.ts#L60)

**Store seam**

- Tri-state data-status signal defaults `'loading'`; content hidden behind read-only exposure
  [`cluster-state.service.ts:10`](../../src/app/core/state/cluster-state.service.ts#L10)

- Only two mutators — the AD-1 single-writer hydration seam
  [`cluster-state.service.ts:21`](../../src/app/core/state/cluster-state.service.ts#L21)

**Shell rendering**

- Outer `@switch` on data status; `'ready'` branch leaves Story 1.2 behavior untouched
  [`app.html:25`](../../src/app/app.html#L25)

- Themed SERVICE UNAVAILABLE panel: `role="alert"`, RETRY gated on loader pending
  [`app.html:41`](../../src/app/app.html#L41)

- Tab buttons disabled until content reaches `'ready'`
  [`app.html:15`](../../src/app/app.html#L15)

- Header badge computes `DOWN` on load failure instead of hardcoded healthy `UP`
  [`app.ts:19`](../../src/app/app.ts#L19)

**Wiring**

- Composition root: HttpClient, loader, and app initializer fetching once at bootstrap
  [`app.config.ts:16`](../../src/app/app.config.ts#L16)

**Content source & tests**

- The editable JSON source — content-only edits need zero code changes
  [`portfolio-data.json:1`](../../public/portfolio-data.json#L1)

- Contract test validates the shipped JSON against the runtime guards
  [`portfolio-json-contract.spec.ts:10`](../../src/app/core/data/portfolio-json-contract.spec.ts#L10)

- Loader edge tests: malformed JSON, guard rejection, HTTP error, retry recovery
  [`portfolio-data-loader.service.spec.ts:53`](../../src/app/core/data/portfolio-data-loader.service.spec.ts#L53)

- Race coverage: superseded late success/failure never touch the store
  [`portfolio-data-loader.service.spec.ts:80`](../../src/app/core/data/portfolio-data-loader.service.spec.ts#L80)
