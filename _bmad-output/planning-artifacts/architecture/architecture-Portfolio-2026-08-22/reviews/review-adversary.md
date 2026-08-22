# Adversarial Architecture Review — Actuator Portfolio Spine

Reviewer: adversary (REVIEW ONLY)
Target: `ARCHITECTURE-SPINE.md` (draft, 2026-08-22)
Method: construct feature-level unit pairs that each satisfy every AD literally yet still integrate incompatibly; audit altitude coverage (decided / deferred / open) and FR traceability.

---

## Verdict

**CONDITIONAL PASS — spine is coherent and the AD set is genuinely load-bearing, but it under-specifies the shared data contract, ownership of simulation triggers vs. store writes, and operations/environment concerns. Several of the pairs below would pass every current AD and still fail to integrate.**

Overall: 6.5/10. The invariants prevent the classic drifts (per-component state, vendor leakage, graph libs), but the spine stops one level too high on *shapes*: nothing pins what a log entry's identity is, who owns node/pod selection state, how the SimulationEngine and user actions interleave on the same state, or how the app behaves when startup JSON fetch fails. Those gaps are exactly where two compliant implementations diverge.

---

## Part 1 — Compliant-yet-incompatible unit pairs

### Pair A: Log entry shape clash (Convention "Logs" is ambiguous)

**Units:** `terminal-console/log-pane.component.ts` and `health-dashboard/outage-controls.component.ts`.

Both obey AD-1 (state only via store methods), AD-8, and the Logs convention `{ timestamp, source, level, message }`. But:

- Health Dashboard writes logs where `source` = `"PaymentCircuitBreaker"` and adds an optional `traceId` field it invented for realism.
- Terminal Console renders assuming `source` is one of a fixed enum of actuator logger names (`SqlExceptionHelper`, `o.s.d.r.Repository`) and colorizes by prefix; the extra `traceId` breaks its column layout assumption.
- One treats `timestamp` as ISO string, the other as epoch millis number — both "plain numbers/strings from the JSON catalog" per the Formats convention.

**Root cause:** the convention names four fields but not their types, identity (are entries keyed? deduped?), or extension policy. Nothing forbids either choice.

**Fix altitude:** pin the `LogEntry` interface in the spine (or explicitly declare it a core/data-owned type with a single definition location), plus a no-extra-fields rule or an explicit open-fields policy.

### Pair B: Two owners of topology node state

**Units:** `topology/node-detail.component.ts` and `health-dashboard/outage-controls.component.ts`.

AD-1 says selected node lives in the store — good. But it does not say **who computes outage-derived node state**:

- Topology component implements its own `computed()` mapping `status → per-node red/degraded` including the payment→postgres edge logic from ASSUMPTION-2.
- Outage Controls instead pushes pre-computed `degradedNodes: NodeId[]` into the store via a store method during outage trigger.

Both are "state only through store methods" / "read via computed()" compliant. Result: two divergent sources of truth for which nodes are red; if the SimulationEngine later drives HALF_OPEN, they disagree about whether edges recover before metrics do.

**Root cause:** AD-1 governs *where* state lives but not the derivation direction (store holds raw status + selectors own derivations, vs. store holds derived artifacts). The paradigm sentence hints at computed selectors but no invariant enforces it.

**Fix altitude:** add an invariant: store persists only primitive/raw simulation state; all cross-panel derivations are pure functions of it (selectors), never stored.

### Pair C: Conflicting mutation paths for the same transition

**Units:** `simulation/simulation-engine.service.ts` and `health-dashboard/outage-controls.component.ts`, both acting on `ClusterStateService`.

- SimulationEngine is declared "pure event scripts" with "no timers inside components" — but nothing says where its clock lives. Engine version: self-schedules with setTimeout inside `core/simulation/`, emitting full sequences (`DEGRADED → HALF_OPEN → UP` with interleaved logs) asynchronously.
- Controls version: button calls `store.triggerOutage()`, which synchronously sets DEGRADED and asks the engine for the next script step on demand.

Both satisfy AD-1, AD-8, the "Simulation events" convention (scripted, engine-emitted). They are mutually exclusive runtimes: double-clicking recovery in one design races the engine's auto-sequence; in the other it doesn't. Also note the PRD's FR-2 buttons ("Simulate Network Outage" / "Trigger Auto-Recovery") vs. AD-9's automatic UP→DEGRADED→HALF-OPEN→UP transitions — who initiates HALF_OPEN, user or engine, is decided nowhere.

**Root cause:** the spine names SimulationEngine and user actions as two writers to one store without declaring write arbitration or where the simulation clock/timers live (the "no timers inside components" rule implies timers exist somewhere but never locates them).

**Fix altitude:** decide: engine owns the clock and is the sole writer of transition sequences; UI actions enqueue *intents* into the engine, not direct store mutations. Or the inverse. Either way, decide it here — it's cross-feature by definition.

### Pair D: Content JSON shape divergence (AD-3 under-constrains)

**Units:** `core/data/portfolio-data-loader.service.ts` (written by whoever builds FR-7) and `career-pods/pod-card.component.ts` (FR-5).

AD-3 requires fetch-once + "validated against a TypeScript interface." Both comply:

- Loader A validates loosely (fields optional, defaults filled) and normalizes dates to `yyyy-MM-dd` strings.
- Pod card assumes strict non-null fields, arrays always present, and expects `replicaName` composed server-side in the JSON (`pod-experience-senior-neosoft-0`); loader B passes the JSON through verbatim after a shallow shape check.

Also: env registry (FR-4) needs key/value property rows while career pods need nested achievements — nothing says whether `portfolio-data.json` is one root object with sections or flat lists, nor which module owns the canonical interfaces (features importing loader types vs. redeclaring local interfaces).

**Root cause:** AD-3 mandates validation exists but not the contract's home or strictness. "Validated against a TypeScript interface" is unenforceable without saying where that interface lives and that compile-time type ≠ runtime validation (a TS check is erased; runtime needs a guard/parser — currently neither is required).

**Fix altitude:** declare canonical content interfaces live in `core/data/`, features import them (no local duplicates), and specify runtime validation (e.g., type guards or schema parse) with defined failure behavior.

### Pair E: Startup fetch failure — undefined behavior

**Units:** `app.component.ts` shell and `portfolio-data-loader.service.ts`.

AD-3 says fetched once at startup. Neither AD nor convention defines the failure path: blank dashboard, error panel, retry? One implementation blocks render behind a loading signal and shows an actuator-themed `DOWN` health banner (fitting theme); another silently renders empty tabs. Both fully compliant. On GitHub Pages there is no server-side fallback — this *will* happen in production eventually.

**Fix altitude:** even one line ("fetch failure renders a themed DOWN state; no silent empty panels") closes it.

### Pair F: Delivery port payload/receipt ambiguity (AD-4)

**Units:** `swagger-playground/contact-form.component.ts` and `delivery/emailjs/emailjs.adapter.ts`.

Port signature `send(payload): Promise<DeliveryReceipt>` — but:

- Payload: one side sends the raw user-edited JSON blob from the request body editor; other side sends a typed `{name,email,message}` DTO extracted from it. Both "depend only on the port."
- `DeliveryReceipt`: one treats it as vendor receipt id + timestamp; other expects Kafka-style queue receipt JSON to display in the mock HTTP response (which PRD FR-6 requires printing). If adapter returns EmailJS-shaped receipt, the playground's mandated "Kafka queuing receipt" display has no data.
- Failure semantics unspecified: does send() reject, or return a receipt with `failed: true`? Determines whether terminal shows ERROR logs or the form shows a toast.

**Fix altitude:** define the port's payload type, receipt fields, and error contract (reject vs. result-object) in the spine or name them as first deliverables of the delivery slice.

### Pair G: Styling token escape hatch (AD-6)

**Units:** `topology/topology.component.ts` and `env-registry/property-table.component.ts`.

Topology uses SVG `stroke` bindings — CSS custom properties work on SVG attributes inconsistently; implementer binds raw `#c0392b` inline "because tokens don't apply cleanly to SVG attrs," documents it, moves on. Env table hardcodes row hover color. AD-6 says "never raw values" but has no review-enforceable exception path, so one violation normalizes the next. Minor, but the rule as written will be quietly violated by the very first SVG binding.

**Fix altitude:** extend AD-6 with the SVG case (tokens usable via `var()` in style bindings, or explicitly bless a small SVG-specific token subset).

---

## Part 2 — Altitude coverage audit

Dimensions this altitude owns, and their disposition:

| Dimension | Status | Note |
| --- | --- | --- |
| Paradigm / state management | Decided (AD-1, AD-8) | Solid |
| Routing / navigation | Decided (AD-2) | Good, explicit non-goal |
| Content sourcing | Decided w/ revisit (AD-3) | Contract details open (Pair D/E) |
| External integration seam | Decided (AD-4) | Port contract details open (Pair F) |
| Visualization approach | Decided (AD-5) | OK |
| Theming/styling | Decided (AD-6) | SVG gap |
| Deployment | Partially decided (AD-7) | Build+deploy pipeline covered — see ops gaps below |
| Testing strategy | Decided (AD-9) | E2E properly deferred |
| Idiom baseline | Decided (AD-8) | OK |
| **Environments/config** | **OPEN — undecided, not deferred** | No word on dev vs. prod configurations, environment-specific API/token config for EmailJS keys, or how secrets (EmailJS public key/service id) are provided in a static-hosted SPA. For a static site this is thin, but the contact credentials placement should be named (they'll be in the client bundle regardless — say so). |
| **Operations/runbook** | **OPEN** | No error monitoring, no lighthouse/perf budget, no custom 404 for Pages subpath deep-ish URLs, no CSP headers note (Pages limitation worth acknowledging since a portfolio is public attack surface for injected JSON content). At minimum record "accepted: none of these for MVP" rather than silence. |
| **Loading/failure UX at startup** | **OPEN** | Pair E. |
| E2E, PWA/analytics/SEO, i18n/a11y, content→TS migration | Deferred, justified | Table is fine |

The Deferred table is healthy; my complaint is items listed above are *open* (undecided, will be improvised per-feature) rather than *deferred* (explicitly postponed with rationale).

## Part 3 — FR traceability

| FR | Covered by | Gap |
| --- | --- | --- |
| FR-1 probes/metrics | AD-1 binds FR-1 | OK; metric shapes inherit Pair D risk |
| FR-2 outage controls | AD-1, conventions | Write-arbitration gap (Pair C) |
| FR-3 topology | AD-5 | Derivation-ownership gap (Pair B) |
| FR-4 env search | AD-1 binds FR-4 | Search state location implied by AD-1 (`selected...tab`) but filter-text-as-shared-state vs. component-local is ambiguous — arguably fine, but say it |
| FR-5 pod selection | AD-1 | Data-shape gap (Pair D) |
| FR-6 swagger/contact | AD-4 | Receipt/payload contract gap (Pair F); PRD also requires terminal logging of ingestion — cross-feature dependency on Pair A shapes |
| FR-7 JSON hydration | AD-3 | Validation strictness + failure path (Pairs D/E) |
| SM-1 real email | AD-4 | OK |
| SM-2, SM-3 | AD-7 (deploy) / implicit | SM-3 (Pages deploy) well covered; SM-2 binding unstated in any AD — verify what SM-2 is and bind it explicitly |

All seven FRs have *some* coverage — no orphan features. The gaps are integration seams between covered features, not missing coverage.

---

## Prioritized findings

| # | Severity | Finding |
| --- | --- | --- |
| 1 | High | Simulation clock/write arbitration undecided (Pair C): engine-timed auto-sequences vs. user-driven transitions are both compliant and mutually exclusive; also HALF_OPEN initiator (user vs. auto) conflicts implicitly between FR-2 and AD-9 |
| 2 | High | Shared data contracts unspecified: LogEntry field types/extension policy (Pair A), content JSON interfaces' canonical home + runtime validation + fetch-failure behavior (Pairs D/E). These are the most likely day-one integration breakers |
| 3 | Medium | Derivation ownership: store may hold derived artifacts (degradedNodes) or raw status + selectors; AD-1 doesn't forbid the former (Pair B) |
| 4 | Medium | MessageDelivery port contract incomplete: payload type, DeliveryReceipt fields (PRD demands a Kafka-style receipt display), error semantics (Pair F) |
| 5 | Low | Environments/secrets and operations posture are open-not-deferred; EmailJS key placement in a static bundle should be acknowledged; AD-6 SVG token exception (Pair G); SM-2 not bound by any AD |

## Recommendation

Accept as draft with amendments: add ~2 invariants (write arbitration/engine-clock ownership; raw-state-in-store + selectors-only derivations), promote the LogEntry/content-interface/port-receipt contracts to named spine-level types (even one-line signatures), add a startup-failure rule, and convert the environments/ops silence into explicit deferrals.
