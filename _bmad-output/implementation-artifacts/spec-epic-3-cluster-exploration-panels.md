---
title: 'Complete Epic 3: Cluster Exploration Panels (Stories 3-1, 3-2, 3-3)'
type: 'feature'
created: '2026-08-22'
status: 'done'
baseline_revision: 'd291248e910fbb4447c44ab0a8090e739de67bbb'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: ['multiple-goals']
deferred:
  - summary: >-
      Add keyboard accessibility and assistive-tech semantics to the clickable
      topology SVG nodes (tabindex/role, Enter/Space activation, spoken degraded-state cue).
    evidence: |-
      Review found `.topo-node` groups are mouse-only — no tabindex, role, or key handling,
      and the degraded-red outage state is color-only for assistive tech; consistent with the
      project-wide i18n/a11y audit pass already deferred across epics 1-2 (tabs ARIA, console
      semantics, focus-visible tokens).
    location: >-
      src/app/features/topology/service-topology.html:21
    severity: medium
---

<intent-contract>

## Intent

**Problem:** All six dashboard tabs except two ship content: Service Topology, Env Registry, and Career Pods render only "MODULE NOT DEPLOYED" placeholders (`app.html` `@default` case), so Epic 3's exploration surface (FR3, FR4, FR5) is entirely missing.

**Approach:** Implement the three Epic 3 stories in ticket order — 3.1 Service Topology Map & Node Inspection, 3.2 Topology Outage Degradation, 3.3 Env Property Search & Career Replica Pods — as three separate git commits (one per story ticket), each passing the full verification gates before it is committed.

## Boundaries & Constraints

**Always:**
- All portfolio content (topology nodes/links/metrics, env properties, experience entries) comes from `public/portfolio-data.json`, validated by typed parsers in `src/app/core/data/portfolio-data.ts` — components render typed shapes only and never fetch or hardcode content (AD-3, AD-11).
- All shared state (selected node, selected pod, outage overlay) lives in `ClusterStateService` signals; components read via `computed()` selectors and mutate only through store methods (AD-1). Outage state is read-only for this epic — writes stay engine-only (AD-10).
- Topology SVG is hand-authored inline with class/style bindings to store state; design tokens only, including SVG stroke/fill attributes (AD-5, AD-6).
- Every component is standalone, OnPush, built-in control flow (`@if/@for/@switch`), strict TypeScript.
- Run `ng test` AND `ng build` green immediately before each of the three story commits; never commit a red tree.
- Commit messages lead with the story ticket id (e.g. `[3-1] ...`).

**Block If:**
- Baseline gates regress at any point beyond the newly added tests (start: 7 files / 90 tests passing) — fix forward within the story; if unfixable without an architecture change, HALT blocked.
- A required content shape cannot be represented in JSON without changing existing parser semantics for already-shipped sections (Epic 1/2 consumers) — HALT blocked rather than breaking hydration.
- The engine's outage overlay proves insufficient to derive degraded visuals (needs state the store does not expose) — HALT blocked instead of writing outage state from a component.

**Never:**
- No graph libraries (D3/Cytoscape), no Angular Router import, no Tailwind/component library, no NgRx/RxJS stores (AD-1/2/5/6).
- No timers inside components; sequencing stays in the engine.
- No Epic 4 work (Swagger playground, EmailJS, deployment pipeline).
- No deferred-pass items: focus-visible styling, ARIA tabs keyboard navigation, live-region announcements, terminal-console semantics stay deferred per `deferred-work.md`.
- No changes to shipped Epic 2 log scripts or simulation behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Node selection | Click any topology node | Node highlights via class binding; detail panel shows its Description, Core Tech Stack, Metrics from JSON | No error expected |
| Env filter hit | Filter text matching key OR value substring, case-insensitive (e.g. `gokul.skills`, `java`) | Rows reduce in real time to matches on key or value | No error expected |
| Env filter miss | Filter text matching no row | Table renders zero rows (empty-state text, not blank panel) | No error expected |
| Pod selection | Click a pod card | Store-selected pod updates; detail card shows timeline, role description, bulleted responsibilities; exactly one pod selected | No error expected |
| Outage active | Engine-driven outage in store while topology visible | payment-service↔postgresql-db link + both node borders render degraded red; payment details show 100% error rate | Derived purely from computed selectors |
| Recovery completes | Outage cleared | Normal styling and payment metrics restore automatically, no component-local state | No user action needed |

</intent-contract>

## Code Map

- `src/app/app.html:27-35` -- `@switch (store.selectedTab())`; replace the `@default` placeholder path by adding `@case ('service-topology')`, `@case ('env-registry')`, `@case ('career-pods')` panels; `src/app/app.ts:11` imports list gains the new feature components.
- `src/app/core/state/tabs.ts` -- tab ids `service-topology` / `env-registry` / `career-pods` already exist; no changes expected.
- `src/app/core/state/cluster-state.service.ts` -- signals store to extend: private `signal` + `asReadonly()` pattern (:20-30), mutation methods (:49-51), computed selector pattern (:32-47). Add selected-node signal+method+selectors, selected-pod signal+method, `outageActive`/degradation selectors, payment-metrics overlay selector.
- `src/app/core/data/portfolio-data.ts` -- contracts + runtime guards; follow `parseEnvProperty` (:119) / `parseEntries` (:147) patterns when adding topology node/link interfaces and wiring them into `parsePortfolioDataDetailed` (:163) and `PortfolioData` (:41).
- `public/portfolio-data.json` -- content catalog: extend with `topology.nodes` (five nodes: api-gateway, auth-service, payment-service, notify-service, postgresql-db; each label/description/techStack/metrics) and `topology.links` (must include payment-service→postgresql-db); enrich `envProperties` with skill keys like `gokul.skills.languages` → `Java 17` (FR4 example).
- `src/app/core/simulation/simulation-engine.ts` -- READ-ONLY reference: outage lifecycle UP→DEGRADED→HALF-OPEN→UP via store; `OUTAGE_ERROR_RATE` exists but topology must display 100% for payment-service during outage per AC.
- `src/app/features/health-dashboard/*` -- style precedent: `.panel` layout, token-only status classes, button/border treatment; degraded-red usage via `--status-degraded`.
- `src/app/features/terminal-console/terminal-console.html:9-19` -- `@for (…; track $index)` rendering precedent for list panes.
- `src/app/features/topology/`, `src/app/features/env-registry/`, `src/app/features/career-pods/` -- new directories (ts/html/css/spec quadruples matching sibling features).
- `src/app/core/state/cluster-state.service.spec.ts`, `src/app/core/data/portfolio-json-contract.spec.ts` -- extend with new suites following existing describe/it conventions.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- flip `3-1…`, `3-2…`, `3-3…` to `done` and then `epic-3: done` as stories complete; refresh `last_updated` only.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- append epic-3-retrospective human-owned decision entry at epic close (mirrors epic-2 precedent :24-26).

## Tasks & Acceptance

**Execution:**

Story 3-1 — Service Topology Map & Node Inspection (commit 1):
- `public/portfolio-data.json` -- add `topology` section (5 nodes + links incl. payment-service→postgresql-db) -- data source for the panel
- `src/app/core/data/portfolio-data.ts` -- add `TopologyNode`/`TopologyLink` interfaces, guards, wire into root parser -- typed contract (AD-11)
- `src/app/core/data/portfolio-json-contract.spec.ts` -- cover valid + invalid topology payloads -- hydration safety
- `src/app/core/state/cluster-state.service.ts` -- `selectedNodeId` signal + `selectNode()` method + topology content selectors -- shared selection in store (AD-1)
- `src/app/features/topology/service-topology.{ts,html,css}` -- inline SVG five-node graph, click-to-select, detail panel (Description/Core Tech Stack/Metrics) -- Story 3.1 ACs (FR3, AD-5)
- `src/app/features/topology/service-topology.spec.ts` + `cluster-state.service.spec.ts` -- component and store coverage
- `src/app/app.ts`, `src/app/app.html` -- register under `service-topology` tab
- Commit `[3-1]` after `ng test` + `ng build` pass

Story 3-2 — Topology Outage Degradation (commit 2):
- `src/app/core/state/cluster-state.service.ts` -- `outageActive` + payment-degradation computed selectors; payment metrics overlay (100% error rate during outage) -- visuals derivable from store (AD-1)
- `src/app/features/topology/service-topology.{html,css}` + spec -- red link/border bindings for payment-service & postgresql-db while outage active; auto-restore on recovery; 100% error metric in open payment details -- Story 3.2 ACs (FR2)
- Commit `[3-2]` after gates pass

Story 3-3 — Env Property Search & Career Replica Pods (commit 3):
- `public/portfolio-data.json` -- enrich envProperties with skills-style keys/values -- FR4 example data
- `src/app/features/env-registry/env-registry.{ts,html,css}` + spec -- `/actuator/env`-styled key/value table, real-time case-insensitive substring filter over key OR value, empty-state row handling -- FR4
- `src/app/features/career-pods/career-pods.{ts,html,css}` + spec -- pods from experience entries named `pod-experience-{slug(company)}-{index}` with running-pod visuals; click selects via store; detail card shows period timeline, role, bulleted highlights -- FR5
- `src/app/core/state/cluster-state.service.ts` + spec -- `selectedPodIndex` signal + setter -- one pod selected app-wide (AD-1)
- `src/app/app.ts`, `src/app/app.html` -- register both tabs
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- flip 3-1/3-2/3-3 and `epic-3` to done, refresh `last_updated`
- `_bmad-output/implementation-artifacts/deferred-work.md` -- append epic-3-retrospective decision entry
- Commit `[3-3]` after gates pass

**Acceptance Criteria:**
- Given the Service Topology tab renders, when inspected, then exactly five named service nodes connected by links appear as hand-authored inline SVG, no graph library is imported anywhere, and all visuals bind to tokens/store state.
- Given a visitor clicks a service node, when selection registers through the store, then the node highlights and the detail panel shows that node's Description, Core Tech Stack, and Metrics sourced from JSON.
- Given the engine has driven an outage, when the topology renders, then the payment-service↔postgresql-db link and both node borders are token-degraded red and payment-service details show a 100% error rate; given recovery completes, when state clears, then normal styling restores with zero component-local duplicates.
- Given the Env Registry tab renders, when the filter input changes, then rows filter live matching key or value case-insensitively, with a themed empty state on zero matches.
- Given the Career Pods tab renders, when a pod card is clicked, then exactly one pod is store-selected and the detail card shows timeline, role description, and bulleted responsibilities for that entry.
- Given `git log` after completion, when inspected, then three story commits exist in ticket order `[3-1]`, `[3-2]`, `[3-3]`, each created only after `ng test` and `ng build` passed, and sprint-status.yaml reflects every Epic 3 story plus `epic-3` as done.
- Given the full suite runs, when compared to baseline, then all pre-existing 90 tests still pass alongside new suites.

## Spec Change Log

## Review Triage Log

### 2026-08-22 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 7: (high 0, medium 1, low 6)
- defer: 1: (medium 1)
- reject: 17
- addressed_findings:
  - `[medium]` `[patch]` Tab→component wiring was unverified at the App root — a typo'd `@case` or dropped import would ship "MODULE NOT DEPLOYED" behind a green suite; added app.spec.ts assertions that each of the three new tabs renders its component selector.
  - `[low]` `[patch]` Parser accepted duplicate topology node ids (corrupts `track node.id`, selection, layout); added rejection guard + contract test.
  - `[low]` `[patch]` Parser accepted self-referencing links (degenerate zero-length edge); added rejection guard + contract test.
  - `[low]` `[patch]` Detail-panel `@for`s tracked by value (`tech`, `metric.label`) so duplicate entries would throw Angular duplicate-key errors; switched to `track $index`.
  - `[low]` `[patch]` More than five nodes silently overlapped via modulo slot wrap; added `MAX_TOPOLOGY_NODES = 5` parser cap so oversized catalogs fail hydration loudly + contract test.
  - `[low]` `[patch]` Dead `isNodeDegraded()` and literal `[attr.width]="132"` desynced from `NODE_WIDTH`; template now uses the method and a constant-backed field.
  - `[low]` `[patch]` Contradictory optionality: required `topology` still accessed with impossible double-optional fallback in store selectors; simplified.
  - `[medium]` `[defer]` Clickable SVG nodes are mouse-only with color-only degraded state; deferred to the project-wide i18n/a11y audit pass per established precedent.

## Design Notes

Pod naming derives at render time from JSON data (slugified company + replica index) rather than new JSON fields — the Kubernetes aesthetic is presentation, not content. Env-filter text is component-local UI input state (not shared across components), so it may be a local signal without violating AD-1; selections (node/pod) are shared and belong in the store.

SVG geometry guidance (not a contract): fixed viewBox ~`0 0 640 360`, gateway top-center, auth left, notify right, payment bottom-center, postgresql-db bottom-left-of-center; links as `<line>`/`<path>` between node centers, nodes as `<g>` with `<rect>` + `<text>` labels. Payment→postgresql link must exist in JSON `topology.links` so degradation can target it by id pair.

## Verification

**Commands:**
- `npx ng test` -- expected: baseline 7 files / 90 tests keep passing plus new suites all green (run before each commit)
- `npx ng build` -- expected: production build succeeds under strict TypeScript (run before each commit)
- `git log --oneline -4` -- expected: three commits headed `[3-1]`, `[3-2]`, `[3-3]` in order, clean working tree after final commit

**Manual checks (if no CLI):**
- Grep `src/` for `d3|cytoscape|@angular/router`: zero matches
- Grep new components for raw hex colors or hardcoded portfolio strings: zero matches outside tokens/JSON

## Auto Run Result

Status: done

### Summary
Epic 3 implemented in full as three ticket-ordered commits: `[3-1]` service topology map with store-driven node inspection (typed topology contracts, inline SVG, detail panel), `[3-2]` outage degradation derived purely from computed selectors (red payment↔postgres link/borders, 100% payment error rate during outage), and `[3-3]` env property search plus career replica pods with store-backed selection, closing sprint tracking (`epic-3: done`) and appending the epic-3 retrospective decision to deferred-work. Review pass applied 7 patches (tab-wiring test coverage, topology parser hardening, dead-code/consistency cleanups) and deferred one a11y item.

### Files changed
- `public/portfolio-data.json` -- added `topology` section (5 nodes + links incl. payment-service→postgresql-db); enriched `envProperties` with skills-style keys.
- `src/app/core/data/portfolio-data.ts` -- `TopologySection`/`TopologyNode`/`TopologyLink`/`TopologyMetric` contracts + guards wired into root parser; review patches: duplicate-id/self-loop/max-5-nodes rejections.
- `src/app/core/data/portfolio-json-contract.spec.ts` -- contract coverage for valid/invalid topology payloads and new rejection guards.
- `src/app/core/state/cluster-state.service.ts` -- `selectedNodeId`/`selectNode`, `selectedPodIndex`/`selectPod`, topology/outage/degradation/metrics-overlay computed selectors; review patch simplified impossible optional chain.
- `src/app/features/topology/service-topology.{ts,html,css}` + spec -- five-node inline SVG graph, click-to-select, detail panel, token-bound degraded styling; review patches: `$index` tracking, constant-bound width, live `isNodeDegraded`.
- `src/app/features/env-registry/env-registry.{ts,html,css}` + spec -- `/actuator/env` table with live case-insensitive key/value filter and themed empty state.
- `src/app/features/career-pods/career-pods.{ts,html,css}` + spec -- replica pods derived from experience entries, store-selected, detail card with timeline/role/highlights.
- `src/app/app.ts`, `src/app/app.html`, `src/app/app.spec.ts` -- three new tabs registered; review patch added per-tab component-render assertions.
- Fixture extensions in `cluster-state.service.spec.ts`, `simulation-engine.spec.ts`, `portfolio-data-loader.service.spec.ts`, `health-dashboard.spec.ts` for the now-required `topology` section; new store suites for selection/degradation/pods.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- 3-1/3-2/3-3 and epic-3 flipped to done (in `[3-3]` commit).
- `_bmad-output/implementation-artifacts/deferred-work.md` -- appended epic-3-retrospective human-owned decision entry (in `[3-3]` commit).
- `_bmad-output/implementation-artifacts/spec-epic-3-cluster-exploration-panels.md`, `epic-3-context.md` -- this spec and the compiled epic context (committed at finalize).

### Review findings breakdown
- Patches applied: 7 (medium 1, low 6) — see Review Triage Log 2026-08-22.
- Items deferred: 1 (medium — topology node keyboard/a11y semantics).
- Items rejected: 17.

### Follow-up review recommendation
true — patched counts by severity: medium 1, low 6; score = 3×1 + 1×6 = 9 ≥ 5.

### Verification performed
- Per-commit gates: `npx ng test` + `npx ng build` green before each of `[3-1]` (8 files/106 tests), `[3-2]` (113), `[3-3]` (124).
- Post-review: `npx ng test` — 10 files / 128 tests pass; `npx ng build` — production build succeeds (197.93 kB initial).
- Manual greps: zero matches for `d3|cytoscape|@angular/router`; zero raw hex colors in new feature directories.
- I/O matrix audit: all six rows covered by running tests (node selection, env filter hit/miss, pod selection, outage degradation + 100% metric, recovery restore).

### Residual risks
- Topology layout supports at most five nodes by design; oversized catalogs now fail hydration loudly rather than rendering overlapping nodes.
- Keyboard accessibility for clickable SVG nodes remains deferred to the project-wide audit pass (see frontmatter `deferred`).
