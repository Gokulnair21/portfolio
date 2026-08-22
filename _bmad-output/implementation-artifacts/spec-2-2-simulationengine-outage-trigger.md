---
title: 'SimulationEngine & Outage Trigger'
type: 'feature'
created: '2026-08-22'
status: 'done'
baseline_commit: 'NO_VCS'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The outage simulation has no driver. There is no `SimulationEngine`, the store cannot represent a degraded state (its health selectors read only from hydrated JSON defaults), and nothing on screen can trigger an outage — so Stories 2.3, 3.2, and the PRD's climax interaction are all blocked.

**Approach:** Introduce a pure scripted `SimulationEngine` in `src/app/core/simulation` as the single writer of outage state (AD-10). Give `ClusterStateService` an outage overlay signal plus mutators so the existing health computed selectors layer simulation state over the JSON defaults. Add a "Simulate Network Outage" control on the Health Dashboard that invokes an engine command only; the engine flips status to `DEGRADED`, spikes the error rate, and streams the scripted failure logs into the console via the existing `appendLog`.

## Boundaries & Constraints

**Always:**
- `SimulationEngine` lives in `src/app/core/simulation` and is pure/scripted: every cluster-state transition originates there (AD-10). UI controls invoke engine commands only; components never write outage status directly.
- The store stays the single writer of app state (AD-1): the engine writes only through store mutators; signals exposed read-only; degraded panel visuals derive from computed selectors, not component-local copies.
- Angular v22 idioms (AD-8): standalone, signals-first, OnPush, `inject()` into `protected readonly` fields, built-in control flow, strict TypeScript.
- All colors/spacing/fonts from design tokens in `src/styles.css` (AD-6): reuse `--status-up`, `--status-degraded`, `--status-info`, `--status-warn`.
- Log entries conform to the canonical `LogEntry`/`LogLevel` contract in `src/app/core/data/portfolio-data.ts`; timestamps ISO-formatted.
- Any scheduling/timing introduced for log sequencing lives only inside the engine — never in components.

**Ask First:**
- Renaming or removing existing store signals/selectors, or changing existing public method signatures (adding new ones is expected this story).
- Any new npm dependency.
- Changes to the tab bar or `TabId` definitions.

**Never:**
- No recovery behavior: no HALF-OPEN state, no "Trigger Auto-Recovery" button, no fallback warning banner (all Story 2.3).
- No timers/intervals/scheduling inside components.
- No router, no Tailwind/component/graph libraries.
- No seeding fake data outside the engine's script.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Trigger outage from UP | Button clicked while idle and data ready | Status → `DEGRADED` (red), Error Rate spikes above 0%, failure logs appended in script order ending with circuit breaker transition | N/A |
| Repeat click while degraded | Button clicked during active outage | Ignored — no duplicate script, state unchanged (button disabled and/or guarded in engine/store) | Guard prevents double-fire |
| Click attempt before hydration | `dataStatus` is `loading` or `failed` | Control disabled or hidden; no transition occurs | N/A |

</frozen-after-approval>

## Code Map

- `src/app/core/state/cluster-state.service.ts` -- the signals store. Private signals `#tab` :15, `#dataStatus` :16, `#content` :17, `#logs` :18; read-only exposures :20–23; computeds `livenessStatus` :25–27 (reads `#content()?.health?.liveness ?? 'UP'`), `livenessUp` :28, `brokerConnections` :29–34, `errorRate` :35–37, `errorRateIsZero` :38–40; mutators `selectTab` :42, `hydrate` :46, `markLoadFailed` :51, `appendLog` :56–58; `LOG_CAP` :11. **Gap:** health selectors derive only from `#content` — this story adds an outage overlay checked first, falling back to today's derivation.
- `src/app/core/data/portfolio-data.ts` -- typed contracts home (AD-11): `LogLevel` :49, `LogEntry` :51–56, named-export style throughout. New `ClusterStatus` union goes here.
- `src/app/core/simulation/` -- does not exist yet; create with the engine.
- `src/app/features/health-dashboard/health-dashboard.html` -- display-only probe grid :4–21; rows class-bind `store.livenessUp()` / `errorRateIsZero()`. **No buttons exist.** `.ts` :11 shows the `protected readonly store = inject(...)` idiom.
- `src/app/app.html` :43–51 -- `.retry-button` precedent for control styling; `app.css` has its rules.
- `src/styles.css` :10–13 -- `--status-up`, `--status-degraded`, `--status-info`, `--status-warn`.
- `src/app/features/terminal-console/terminal-console.ts` :23–33 -- reads `store.logs()`; emitted logs render automatically once appended.
- Spec idioms: `cluster-state.service.spec.ts` :37–40 (TestBed providers + readonly-exposure checks); `health-dashboard.spec.ts` :23–35 (seeded real store via `parsePortfolioData` + `render()` helper).

## Tasks & Acceptance

**Execution:**
- [x] `src/app/core/data/portfolio-data.ts` -- add a `ClusterStatus` union (`'UP' | 'DEGRADED'`) in the existing named-export style -- canonical typed contract (AD-11)
- [x] `src/app/core/state/cluster-state.service.ts` -- add private outage overlay signal + read-only exposure + `beginOutage()` mutator (idempotent guard); layer `livenessStatus`/`livenessUp`/`errorRate`/`errorRateIsZero` computeds to consult the overlay first, falling back to current JSON-derived values -- lets one store write drive every panel reactively (AD-1)
- [x] `src/app/core/simulation/simulation-engine.ts` -- create pure scripted `SimulationEngine`: command method flips the store to `DEGRADED` with a spiked error rate and appends the ordered failure-log script (database connection-limit exception from `SqlExceptionHelper`, then `PaymentCircuitBreaker CLOSED -> OPEN`) via `appendLog`; ignores commands while an outage is active -- AD-10 single writer
- [x] `src/app/features/health-dashboard/health-dashboard.ts` + `.html` + `.css` -- add "Simulate Network Outage" button invoking the engine command only; disabled while degraded or while data isn't ready; styled from tokens like the `.retry-button` precedent -- the user-facing trigger
- [x] `src/app/core/simulation/simulation-engine.spec.ts` -- assert full UP → DEGRADED transition, exact log order/content per I/O matrix, repeat-click guard, and that the engine is the only mutation path
- [x] `src/app/core/state/cluster-state.service.spec.ts` -- extend with overlay-layering tests: degraded selectors win over JSON defaults, defaults return when overlay clears, existing behaviors unchanged
- [x] `src/app/features/health-dashboard/health-dashboard.spec.ts` -- extend with click → DEGRADED render coverage and disabled-state cases

**Acceptance Criteria:**
- Given `SimulationEngine` exists in `src/app/core/simulation`, when any cluster-state transition occurs, then it originates from the engine — UI controls invoke engine commands only and components never write outage status directly (AD-10)
- Given the system is UP, when the visitor clicks "Simulate Network Outage", then status displays `DEGRADED` in red and Error Rate spikes above zero (FR2)
- Given the outage sequence ran, when the Terminal Console renders, then structured logs include the `SqlExceptionHelper` database connection-limit exception followed by `PaymentCircuitBreaker CLOSED -> OPEN`
- Given the implementation is reviewed, when checked for timers, then none exist inside components; sequencing lives only in the engine
- Given unit tests run via `ng test`, when all suites execute, then they pass with zero regressions

## Spec Change Log

## Design Notes

Selector layering, not replacement: keep `#content` untouched so hydration/loading semantics stay intact. Pattern:

```ts
livenessStatus = computed<ClusterStatus>(() =>
  this.#outage()?.status ?? this.#content()?.health?.liveness ?? 'UP');
```

Keep the engine synchronous this story — the full script appends in one command call. If staged timing is wanted later, only the engine may introduce it (components stay timer-free either way).

Error-rate spike value is an engine-owned constant (a believable mid-range percentage, e.g. ~40%), never hardcoded in the component or template.

## Verification

**Commands:**
- `ng test` -- expected: all suites pass including new engine/store/dashboard specs, zero regressions
- `ng build` -- expected: production build succeeds under strict TypeScript

## Suggested Review Order

**Outage engine (entry point)**

- Single command method — the AD-10 boundary where every transition originates
  [`simulation-engine.ts:30`](../../src/app/core/simulation/simulation-engine.ts#L30)

- Readiness guard: no outage can start before hydration succeeds
  [`simulation-engine.ts:31`](../../src/app/core/simulation/simulation-engine.ts#L31)

- Scripted failure log sequence ending on the circuit-breaker transition
  [`simulation-engine.ts:8`](../../src/app/core/simulation/simulation-engine.ts#L8)

- Engine-owned spike constant with staggered ISO timestamps per entry
  [`simulation-engine.ts:5`](../../src/app/core/simulation/simulation-engine.ts#L5)

**Store outage overlay**

- Overlay signal checked first by selectors, JSON defaults preserved underneath
  [`cluster-state.service.ts:24`](../../src/app/core/state/cluster-state.service.ts#L24)

- Liveness layering — DEGRADED wins, falls back to hydrated content
  [`cluster-state.service.ts:32`](../../src/app/core/state/cluster-state.service.ts#L32)

- Shared numeric-rate computed feeding both errorRate and errorRateIsZero
  [`cluster-state.service.ts:43`](../../src/app/core/state/cluster-state.service.ts#L43)

- Idempotent begin/clear mutators return success booleans for guard flows
  [`cluster-state.service.ts:67`](../../src/app/core/state/cluster-state.service.ts#L67)

**Dashboard control**

- Button invokes the engine only; disabled while degraded or data not ready
  [`health-dashboard.html:28`](../../src/app/features/health-dashboard/health-dashboard.html#L28)

- Token-only styling mirroring the retry-button precedent
  [`health-dashboard.css:59`](../../src/app/features/health-dashboard/health-dashboard.css#L59)

**Contract**

- Canonical ClusterStatus union every consumer now shares
  [`portfolio-data.ts:49`](../../src/app/core/data/portfolio-data.ts#L49)

**Root wiring**

- Engine registered as a root provider beside the store
  [`app.config.ts:17`](../../src/app/app.config.ts#L17)

**Tests**

- Transition, exact log order/content, repeat-click guard, readiness guard
  [`simulation-engine.spec.ts:20`](../../src/app/core/simulation/simulation-engine.spec.ts#L20)

- Overlay-layering suite: degraded wins, defaults return after clear
  [`cluster-state.service.spec.ts:179`](../../src/app/core/state/cluster-state.service.spec.ts#L179)

- Click-through coverage including disabled states and no-op clicks
  [`health-dashboard.spec.ts:90`](../../src/app/features/health-dashboard/health-dashboard.spec.ts#L90)
