---
title: 'Terminal Console Log Pane'
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

**Problem:** Stories 2.2, 2.3, and 4.2 all stream simulated backend logs somewhere for visitors to watch — but no console exists. The store has no log state, there is no `LogEntry` contract, and the workspace has no bottom pane.

**Approach:** Add the canonical `LogEntry` contract in `core/data`, add capped `logs[]` state plus an `appendLog` mutator to `ClusterStateService`, and build a `TerminalConsole` feature component docked as a fixed pane at the bottom of the workspace that renders entries `{ timestamp, source, level, message }` in order with auto-scroll to the newest entry.

## Boundaries & Constraints

**Always:**
- `LogEntry` is code-owned in `src/app/core/data/portfolio-data.ts` (AD-11) and used everywhere; fields `timestamp` (ISO string), `source`, `level`, `message`; level values via a small exported union (e.g. `'INFO' | 'WARN' | 'ERROR'`).
- The store is the single writer of logs (AD-1): the 200-entry cap is enforced inside the store's append method, never in the component.
- Angular v22 idioms (AD-8): standalone component, signals-first, OnPush, built-in control flow (`@for`), strict TypeScript; DI via `inject()` into a `protected readonly` field.
- All colors/fonts/spacing come from design tokens in `src/styles.css` (AD-6); monospace text uses `--font-mono`. If a needed token does not exist (e.g. a warn-level color), add it to the same `:root` block rather than using raw values.
- Auto-scroll to the newest entry whenever entries change.

**Ask First:**
- Any change to the tab bar or `TabId` definitions (the existing `terminal-console` tab stays untouched this story).
- Removing or renaming existing store signals/selectors.
- Any new dependency.

**Never:**
- No timers, intervals, or scheduling inside components (engine sequencing is Story 2.2).
- No wiring of outage controls, SimulationEngine, or any log emission — the store starts empty and stays empty until later stories feed it.
- No router, no Tailwind/component library, no `position: fixed` overlay covering panel content.
- No seeding fake log data in UI code just to "see something".

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Append below cap | `appendLog(entry)` called with < 200 stored entries | Entry appended at end of `logs`; renders last, in order | N/A |
| Cap exceeded | Append when 200 entries stored | Oldest entry dropped; length stays exactly 200 | N/A |
| Empty store | No entries appended yet | Console renders themed idle placeholder line; no crash | N/A |
| Entries change while rendered | One or more appends after initial render | View scrolls so newest entry is visible | N/A |

</frozen-after-approval>

## Code Map

- `src/app/core/state/cluster-state.service.ts` -- the signals store. Private writable signals `#tab`/`#dataStatus`/`#content` (:14–16) exposed via `asReadonly()` (:18–20); derived computeds :22–37; plain-method mutators `selectTab` :39, `hydrate` :43, `markLoadFailed` :48. Follow this exact pattern for `#logs` + `appendLog`.
- `src/app/core/data/portfolio-data.ts` -- typed contracts; named `export interface` style (`ProjectEntry` :9 … `ParseResult<T>` :49). Add `LogEntry` here.
- `src/styles.css` -- global tokens, `:root` :6–48. Available: `--status-info` :12, `--status-degraded` :11 (red/error), `--status-up` :10, surfaces :15–20, `--font-mono` :23–25, `--space-*` :35–42. **No warn color exists yet.**
- `src/app/app.html` -- shell composition: `.header` → `.tab-bar` :9 → `<main class="panel-area">` :24–61. Console mounts as a sibling section after `</main>` :61.
- `src/app/app.css` -- `.shell` flex-column min-height 100vh :1–5; `.panel-area` `flex: 1` + margins :75–85. Adjust so the docked bottom pane gets a bounded height with internal scrolling.
- `src/app/features/health-dashboard/*` -- reference component idiom: OnPush, separate html/css, `protected readonly store = inject(...)` (ts:4–12); spec idiom: TestBed + local `render()` helper querying `fixture.nativeElement` (spec:19–35).
- `src/app/core/state/cluster-state.service.spec.ts` -- service test idiom: `TestBed.configureTestingModule({ providers: [ClusterStateService] })` :28–31, read-only enforcement check :37–39.
- `src/app/core/state/tabs.ts` -- `TabId` includes `'terminal-console'` :5/:18 (existing tab; out of scope).

## Tasks & Acceptance

**Execution:**
- [x] `src/app/core/data/portfolio-data.ts` -- add `LogLevel` union and `LogEntry` interface following existing export style -- canonical contract (AD-11)
- [x] `src/app/core/state/cluster-state.service.ts` -- add private `#logs` signal, read-only `logs` exposure, and `appendLog(entry: LogEntry)` mutator that appends then trims to the last 200 -- single-writer store pattern (AD-1)
- [x] `src/app/features/terminal-console/` -- create standalone `TerminalConsole` component (ts/html/css/spec): fixed bottom pane bound to `store.logs()`, one row per entry rendering timestamp/source/level/message with level-based token color, idle placeholder when empty, auto-scroll container to newest on change (signal query + post-render effect) -- the user-facing deliverable
- [x] `src/app/app.ts` + `src/app/app.html` -- import component and mount `<app-terminal-console />` after `</main>` -- docks the pane into the shell
- [x] `src/app/app.css` -- give `.shell` a viewport-bounded column layout so the console keeps a bounded height with internal scroll and panels remain reachable -- prevents overlay/overflow regressions
- [x] `src/styles.css` -- add warn-level status token to `:root` if the chosen palette needs one -- AD-6 tokens-only rule
- [x] `src/app/core/state/cluster-state.service.spec.ts` -- extend with append-ordering and 200-entry cap tests per I/O matrix -- locks cap semantics before stories 2.2/2.3 depend on them
- [x] `src/app/features/terminal-console/terminal-console.spec.ts` -- render tests: rows show structured fields, empty state, newest-visible scroll behavior -- component-level AC coverage

**Acceptance Criteria:**
- Given the shell renders, when any tab is selected or data is loading/failed, then the Terminal Console remains visible as a docked bottom pane
- Given log entries exist in the store, when the console renders, then each entry shows its `{ timestamp, source, level, message }` fields with level-derived styling from design tokens
- Given more than 200 appends occur, when inspecting `store.logs()`, then length is exactly 200 and the oldest entries are absent in append order
- Given unit tests run via `ng test`, when append/cap/render behavior executes, then all new specs pass with zero regressions in existing suites

## Spec Change Log

## Design Notes

Auto-scroll must not fight OnPush: read `logs()` inside an effect/`afterRenderEffect`, then set the scroll container's `scrollTop = scrollHeight` after DOM update (Angular signal `viewChild` query works well). Do not use `scrollIntoView` on individual rows during `@for` render.

Trimming after append (append-then-slice) preserves insertion order without re-sorting; keep the stored array immutable-style (`[...logs, entry].slice(-200)`).

Level-to-token mapping suggestion: `INFO` → `--status-info`, `WARN` → warn token added this story, `ERROR` → `--status-degraded`.

## Verification

**Commands:**
- `ng test` -- expected: all suites pass including new store cap/order tests and console component tests
- `ng build` -- expected: production build succeeds with strict TypeScript

**Manual checks (if no CLI):**
- Serve (`npm start`) and confirm the console pane is docked at the bottom, visible across tabs, shows the idle placeholder, and panel content above stays fully reachable/scannable.

## Suggested Review Order

**Log contract & store state**

- Canonical `LogEntry`/`LogLevel` contract every producer will share
  [`portfolio-data.ts:49`](../../src/app/core/data/portfolio-data.ts#L49)

- Capped `logs` signal follows the store's private-signal/read-only-exposure pattern
  [`cluster-state.service.ts:18`](../../src/app/core/state/cluster-state.service.ts#L18)

- Append-then-slice keeps insertion order and enforces the 200-entry cap in one place
  [`cluster-state.service.ts:56`](../../src/app/core/state/cluster-state.service.ts#L56)

- Exported `LOG_CAP` — single source of the cap, imported by tests
  [`cluster-state.service.ts:11`](../../src/app/core/state/cluster-state.service.ts#L11)

**Console pane**

- Auto-scroll via signal query + post-render effect reading `logs()`
  [`terminal-console.ts:24`](../../src/app/features/terminal-console/terminal-console.ts#L24)

- Level-to-token class mapping (no raw colors)
  [`terminal-console.ts:31`](../../src/app/features/terminal-console/terminal-console.ts#L31)

- Row rendering with structured fields; idle placeholder when empty
  [`terminal-console.html:7`](../../src/app/features/terminal-console/terminal-console.html#L7)

- Docked pane styling from design tokens only
  [`terminal-console.css:5`](../../src/app/features/terminal-console/terminal-console.css#L5)

**Shell integration & tokens**

- Mount point after the panel area — visible on every tab and data state
  [`app.html:62`](../../src/app/app.html#L62)

- Viewport-bounded shell with overflow fallback for short screens
  [`app.css:4`](../../src/app/app.css#L4)

- New warn-level token (AD-6 tokens-only rule)
  [`styles.css:13`](../../src/styles.css#L13)

**Tests**

- Cap/ordering tests assert against the real exported constant
  [`cluster-state.service.spec.ts:153`](../../src/app/core/state/cluster-state.service.spec.ts#L153)

- Component render coverage: rows, empty state, level classes, scroll
  [`terminal-console.spec.ts:41`](../../src/app/features/terminal-console/terminal-console.spec.ts#L41)

- App-level mount pin so the console cannot silently disappear
  [`app.spec.ts:59`](../../src/app/app.spec.ts#L59)
