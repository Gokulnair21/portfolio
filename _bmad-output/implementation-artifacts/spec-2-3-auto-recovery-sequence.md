---
title: 'Story 2.3: Auto-Recovery Sequence'
type: 'feature'
created: '2026-08-22'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '57ed8d60166984522e15c0873c924c249f2708d4'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After Story 2.2 the mock cluster can crash into `DEGRADED`, but nothing heals it — the resilience demo promised by Epic 2 has no second act, so visitors never see the circuit breaker recover.

**Approach:** Extend the pure `SimulationEngine` with a "Trigger Auto-Recovery" command that stages the healing script in two observable phases: an immediate `HALF-OPEN` transition (themed fallback warning banner + mock cached-read logs stream into the console), then an engine-owned timed completion (connection-validation log, `HALF-OPEN -> CLOSED`) that clears the outage overlay so every panel returns to green `UP` via existing computeds.

## Boundaries & Constraints

**Always:**
- Every transition originates in `SimulationEngine`; UI controls invoke engine commands only (AD-10).
- All sequencing and timing lives only inside the engine — components remain timer-free.
- Shared state changes flow through `ClusterStateService` mutators (AD-1); panel visuals derive from existing computeds/selectors, never component-local duplicates.
- New status value and recovery log scripts follow the existing named-export `as const satisfies` style (see `SCRIPT` precedent at `simulation-engine.ts:7`); timestamps ISO-formatted.
- Styling uses design tokens only — the banner and half-open state color from `--status-warn`.

**Ask First:** <!-- Agent: if any of these trigger during execution, HALT and ask the user before proceeding. -->
- Making recovery instantaneous/synchronous like 2.2 instead of staged, or restructuring into multiple user-facing steps.
- A completion delay outside ~1–3 seconds.
- Any behavioral change to the existing "Simulate Network Outage" button from 2.2.

**Never:**
- No new npm dependencies, no router usage, no real network calls.
- No timers/scheduling inside components.
- No changes to `terminal-console` (it renders any log entries generically).
- Out of scope: the header `.status-dot`/`.status-badge` still reflecting only `dataStatus` (pre-existing gap, untouched here).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Recovery click while UP | `triggerAutoRecovery()` with no active outage | Silent no-op; store state unchanged | Guard returns early |
| Recovery click before hydration | `dataStatus()` is `loading`/`failed` | Silent no-op | Guard returns early |
| Stage 1 (happy path) | Click during active `DEGRADED` outage | Overlay status becomes `HALF-OPEN`; warning banner renders; cached-read logs (`OPEN -> HALF-OPEN` transition first) append in order | N/A |
| Repeat click mid-recovery | Second click before completion fires | Ignored — exactly one recovery runs per outage | Idempotent boolean guard |
| Stage 2 completion | Engine-owned delay elapses | Validation log, then `HALF-OPEN -> CLOSED` log, overlay cleared → `livenessStatus` falls back to JSON default `UP`, error rate restored to 0% | N/A |

</frozen-after-approval>

## Code Map

- `src/app/core/data/portfolio-data.ts` -- typed contracts (AD-11): `ClusterStatus = 'UP' \| 'DEGRADED'` :49 gains `'HALF-OPEN'`; `LogLevel` :51 (`INFO/WARN/ERROR` suffice — no new levels); `LogEntry` :53–58.
- `src/app/core/state/cluster-state.service.ts` -- signals store: `OutageOverlay {status, errorRate}` :7; private `#outage` :24; read-only exposures :26–30; `livenessStatus` computed :32–35 already flows overlay status through; `#currentErrorRate` :43–45 restores automatically when overlay nulls; mutators `appendLog` :63, `beginOutage(errorRate): boolean` :67 (hardcodes `'DEGRADED'` :69), `clearOutage(): boolean` :73. **Gap:** no mutator advances an active overlay to `HALF-OPEN`.
- `src/app/core/simulation/simulation-engine.ts` -- pure engine: `OUTAGE_ERROR_RATE = 41.37` :5; `SCRIPT` const-array pattern :7–24; sole command `triggerNetworkOutage()` :30–36 with readiness guard :31 and idempotency guard :32, staggered ISO timestamps :33–35. **Gap:** no recovery command/scripts/timing.
- `src/app/core/simulation/simulation-engine.spec.ts` -- TestBed + hydrate `VALID_DATA`; mirror: log order :48–68, guards via `TestBed.resetTestingModule()` :77–95, repeat-click idempotency :97–108, overlay-only write check :110–114.
- `src/app/features/health-dashboard/health-dashboard.html` -- probe rows class-bind `[class.status-up]`/`[class.status-degraded]` :4–24 (binary — need a half-open/warn branch); outage button precedent :26–34 (`[disabled]="outageActive \|\| store.dataStatus() !== 'ready'"`). **No recovery button or banner exists.**
- `src/app/features/health-dashboard/health-dashboard.ts` -- `outageActive` getter :15–17 mirrors for a recovery-enabled getter.
- `src/app/features/health-dashboard/health-dashboard.css` -- token color classes :47–57; `.outage-button` transparent-bg/currentColor-border idiom :59–70 to clone for the recovery button + banner (use `--status-warn`, `styles.css:13`).
- `src/app/features/health-dashboard/health-dashboard.spec.ts` -- `render()` helper + seeded health from real JSON; nested `describe('outage trigger')` shape to reuse.
- `src/app/features/terminal-console/` -- zero changes; generic level classes + `afterRenderEffect` auto-scroll handle new logs automatically.

## Tasks & Acceptance

**Execution:**
- [x] `src/app/core/data/portfolio-data.ts` -- extend the `ClusterStatus` union with `'HALF-OPEN'` -- canonical typed contract stays code-owned (AD-11)
- [x] `src/app/core/state/cluster-state.service.ts` -- add a boolean-guarded mutator that advances an active `DEGRADED` overlay to `HALF-OPEN` (no-op returning false otherwise); `clearOutage` already handles completion -- the store remains the single state writer (AD-1)
- [x] `src/app/core/simulation/simulation-engine.ts` -- add recovery script constants in the `SCRIPT` idiom (stage 1: Resilience4j `OPEN -> HALF-OPEN` transition + cached-read warnings; stage 2: connection validation + `PaymentCircuitBreaker HALF-OPEN -> CLOSED`) plus a `triggerAutoRecovery()` command that applies stage 1 immediately and schedules stage 2 with an engine-owned timer; guard against UP/no-outage/unhydrated/repeat invocation -- AD-10 single writer owns all sequencing
- [x] `src/app/features/health-dashboard/health-dashboard.ts` + `.html` + `.css` -- add "Trigger Auto-Recovery" button (clone the outage-button idiom; enabled only while an outage is active and data is ready) and a themed warning banner rendered while status is `HALF-OPEN`; add `.status-half-open` token-based styling for affected probe rows -- the user-facing recovery surface
- [x] `src/app/core/state/cluster-state.service.spec.ts` -- extend with advance-to-HALF-OPEN coverage (success, false when no outage, selector layering unchanged) -- store contract regression safety
- [x] `src/app/core/simulation/simulation-engine.spec.ts` -- extend asserting the full UP → DEGRADED → HALF-OPEN → UP lifecycle using fake timers: exact stage-1/stage-2 log order and content, guard no-ops, single-recovery enforcement, overlay cleared and error rate restored at completion -- AD-9 end-to-end sequence proof
- [x] `src/app/features/health-dashboard/health-dashboard.spec.ts` -- extend with recovery-button enabled/disabled matrix, click → `HALF-OPEN` banner render, and post-completion restored render -- UI wiring proof

**Acceptance Criteria:**
- Given the system is `DEGRADED`, when the visitor clicks "Trigger Auto-Recovery", then status displays `HALF-OPEN` with a `--status-warn`-themed fallback banner and mock cached-read logs appear in the Terminal Console in order.
- Given the recovery sequence continues, when the engine validates the mock connection, then logs show the validation step followed by `HALF-OPEN -> CLOSED`, status returns to green `UP`, and Error Rate is restored to 0% (FR2).
- Given an active outage or recovery state, when any panel observes store state, then degraded/half-open visuals derive from computed selectors with no component-local duplicates (AD-1).
- Given unit tests run via Vitest, when the full sequence UP → DEGRADED → HALF-OPEN → UP is exercised, then every transition, log order, and the final restored state are asserted (AD-9).
- Given the implementation is reviewed, when checked for timers, then none exist inside components; sequencing lives only in the engine.
- Given `ng test` and `ng build` run, then all suites pass with zero regressions under strict TypeScript.

## Spec Change Log

## Design Notes

Staged timing is deliberate: a synchronous one-shot (the 2.2 pattern) would flash the banner in a single tick, defeating the epic requirement that resilience behavior "reads visually before status returns green." Only the engine may own that timer. Keep both stages' scripts as module-level constants so tests assert order/content without duplicating strings. Engine shape sketch:

```ts
triggerAutoRecovery(): void {
  if (this.#store.dataStatus() !== 'ready') return;
  if (!this.#store.markHalfOpen()) return;      // false unless DEGRADED active
  this.#appendScript(RECOVERY_STAGE_1);
  setTimeout(() => {                            // engine-owned timer
    this.#appendScript(RECOVERY_STAGE_2);
    this.#store.clearOutage();
  }, AUTO_RECOVERY_DELAY_MS);
}
```

Mirror the 2.2 timestamp staggering within each script so entries remain uniquely ordered.

## Verification

**Commands:**
- `ng test` -- expected: all suites pass including extended engine/store/dashboard specs covering the full UP → DEGRADED → HALF-OPEN → UP lifecycle; zero regressions
- `ng build` -- expected: production build succeeds under strict TypeScript

## Suggested Review Order

**Recovery engine (entry point)**

- Staged two-phase command: guards, immediate HALF-OPEN, engine-owned timer
  [`simulation-engine.ts:65`](../../src/app/core/simulation/simulation-engine.ts#L65)

- Stage-2 callback re-validates HALF-OPEN before appending logs or clearing
  [`simulation-engine.ts:70`](../../src/app/core/simulation/simulation-engine.ts#L70)

- Recovery scripts follow the 2.2 SCRIPT const-array idiom (stage 1 cached reads, stage 2 validation)
  [`simulation-engine.ts:28`](../../src/app/core/simulation/simulation-engine.ts#L28)

- Monotonic timestamps make log ordering collision-proof across back-to-back scripts
  [`simulation-engine.ts:80`](../../src/app/core/simulation/simulation-engine.ts#L80)

**Store contract**

- Boolean-guarded mutator advances an active DEGRADED overlay to HALF-OPEN (null-safe updater)
  [`cluster-state.service.ts:73`](../../src/app/core/state/cluster-state.service.ts#L73)

- Canonical typed contract widened with 'HALF-OPEN' (AD-11)
  [`portfolio-data.ts:49`](../../src/app/core/data/portfolio-data.ts#L49)

**UI surface**

- Themed fallback banner renders while status is HALF-OPEN (role="status")
  [`health-dashboard.html:4`](../../src/app/features/health-dashboard/health-dashboard.html#L4)

- Recovery button disabled unless DEGRADED — no dead control during the recovery window
  [`health-dashboard.html:48`](../../src/app/features/health-dashboard/health-dashboard.html#L48)

- Half-open probe styling, banner, and button colors all from --status-warn token
  [`health-dashboard.css:59`](../../src/app/features/health-dashboard/health-dashboard.css#L59)

**Tests**

- Full UP → DEGRADED → HALF-OPEN → UP lifecycle with fake timers and boundary checks
  [`simulation-engine.spec.ts:135`](../../src/app/core/simulation/simulation-engine.spec.ts#L135)

- Immediate-recovery timestamp uniqueness plus outage-rejected-during-HALF-OPEN invariant
  [`simulation-engine.spec.ts:244`](../../src/app/core/simulation/simulation-engine.spec.ts#L244)

- Store mutator matrix: success, no-outage false, already-HALF-OPEN false, restored selectors
  [`cluster-state.service.spec.ts:242`](../../src/app/core/state/cluster-state.service.spec.ts#L242)

- Dashboard recovery-button enabled/disabled matrix, banner render, post-completion restore
  [`health-dashboard.spec.ts:161`](../../src/app/features/health-dashboard/health-dashboard.spec.ts#L161)
