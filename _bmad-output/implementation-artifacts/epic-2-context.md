# Epic 2 Context: Interactive Outage Simulation & Terminal Console

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Deliver the PRD's climax feature: visitors crash the mock cluster by clicking "Simulate Network Outage" and watch scripted failure and recovery unfold in real time. A pure `SimulationEngine` drives the full state lifecycle UP → DEGRADED → HALF-OPEN → UP, streaming structured backend-style logs (database connection exception, circuit breaker transitions) into a fixed Terminal Console pane, while shared health metrics react through the single signals store so every panel stays consistent.

## Stories

- Story 2.1: Terminal Console Log Pane
- Story 2.2: SimulationEngine & Outage Trigger
- Story 2.3: Auto-Recovery Sequence

## Requirements & Constraints

Functional:
- Clicking "Simulate Network Outage" transitions status to `DEGRADED` (red) with a spiking error rate; clicking "Trigger Auto-Recovery" returns status to green `UP` with metrics restored.
- The outage sequence emits structured logs including a database connection limit exception (`SqlExceptionHelper`) and circuit breaker transition (`PaymentCircuitBreaker CLOSED -> OPEN`).
- Recovery emits a themed fallback warning banner with mock cached-read logs, a connection-validation step, then `HALF-OPEN -> CLOSED`.
- Log entries render with structured fields `{ timestamp, source, level, message }`, append in order, auto-scroll to the newest entry, and the console is capped at the last 200 entries (oldest dropped).

Non-functional / success criteria:
- Unit tests via `ng test` (Vitest) must cover the full transition sequence UP → DEGRADED → HALF-OPEN → UP, log ordering/capping, and log sequencing.
- No timers or scheduling inside components — sequencing lives only in the engine.
- Page load stays fast; keep asset footprint low (static-only simulation).

## Technical Decisions

- **SimulationEngine is the single writer of outage state** (AD-10): every cluster-state transition originates in the pure `SimulationEngine` in `src/app/core/simulation`. UI controls invoke engine commands only; the engine emits the full scripted event sequence into the store. Components never write outage status directly.
- **Single signals store** (AD-1): all shared simulation state (`status`, `errorRate`, `logs[]`) lives in `ClusterStateService` as Angular signals; signals exposed read-only to components; mutation only via store methods. Derived views are computed selectors in the store — no component-local duplicates of outage/health state.
- **Angular v22 idiom baseline** (AD-8): standalone components, signals-first, OnPush change detection, built-in control flow (`@if/@for`), strict TypeScript. No router involvement.
- **Typed contracts in `src/app/core/data`** (AD-11): the `LogEntry` interface is code-owned there and canonical everywhere.
- **Design tokens only** (AD-6): status colors (up green, degraded red, info blue), monospace stack, spacing come from CSS custom properties in one global stylesheet — no raw values anywhere, hand-rolled CSS only.
- Naming conventions: services as `*.service.ts`; mock services named after real ones (e.g. `payment-service`); timestamps ISO-formatted.

## UX & Interaction Patterns

- The Terminal Console is a fixed pane at the bottom of the workspace, monospace-styled per the actuator theme, printing simulated real-time backend execution logs.
- Outage/recovery control buttons live on the Health Dashboard panel (built in Epic 1); this epic wires them to engine commands.
- During HALF-OPEN recovery, show a themed fallback warning banner alongside mock cached-read logs so resilience behavior reads visually before status returns green.
- Degraded visuals across panels derive from computed selectors on store state — they appear/disappear automatically with no extra wiring.

## Cross-Story Dependencies

- Depends on Epic 1: app scaffold/design tokens (1.1), `ClusterStateService` with signal-driven tabs (1.2), JSON content hydration providing seeded health defaults via `PortfolioDataLoader` (1.3), and the initial health probes display whose values this epic's transitions mutate (1.4).
- Story 2.1 (Terminal Console) should exist first — stories 2.2 and 2.3 stream logs into it; 2.3's recovery sequence builds on the engine introduced in 2.2.
- Epic 3 consumes this epic's store state: topology nodes/links degrade red during active outages (Story 3.2), so degraded-state computed selectors must be clean, reusable store outputs rather than console-specific logic.
