---
title: 'Complete Epic 4: Swagger Contact Playground & Go-Live (Stories 4-1, 4-2, 4-3)'
type: 'feature'
created: '2026-08-22'
status: 'done'
baseline_revision: '8ed2bb0d57732f55a6c6b4db92080baf07ccc84b'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: ['multiple-goals', 'oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** The final dashboard tab (`swagger-playground`) renders only a "MODULE NOT DEPLOYED" placeholder, so FR6 (mock Swagger contact execution with real email delivery behind the `MessageDelivery` port) is missing, and the site has no automated GitHub Pages deployment pipeline (AD-7, SM-1/SM-3).

**Approach:** Implement the three Epic 4 stories in ticket order — 4.1 Mock Swagger UI Request Editor, 4.2 Contact Execution & Real Delivery, 4.3 GitHub Pages Deployment Pipeline — as three separate git commits (one per story ticket), each passing the full verification gates before it is committed.

## Boundaries & Constraints

**Always:**
- All portfolio content shown by the playground (recipient identity, endpoint copy) comes from hydrated JSON content via store selectors — never hardcoded in components (AD-3).
- The playground depends only on the `MessageDelivery` port (`send(payload): Promise<DeliveryReceipt>`); the EmailJS SDK is called exclusively inside the EmailJS adapter class — zero SDK imports anywhere else (AD-4).
- Payload, `DeliveryReceipt`, and failure types are code-owned by the port definition; failures return as typed results, never thrown SDK errors (AD-11).
- Shared state (request/response/receipt display state may be local; anything another panel observes — i.e. terminal ingestion logs — goes through `ClusterStateService.appendLog`) follows AD-1: components mutate shared state only through store methods.
- Every component is standalone, OnPush, built-in control flow, strict TypeScript, design tokens only in CSS (AD-6, AD-8); no Router import (AD-2).
- Run `ng test` AND `ng build` green immediately before each of the three story commits; never commit a red tree.
- Commit messages lead with the story ticket id (e.g. `[4-1] ...`).
- Deployment workflow builds production with base-href derived from the repository name (`/<repo>/`), uses free-tier GitHub Actions/Pages only, uploads the built artifact, and deploys Pages — no build output committed (AD-7).

**Block If:**
- Baseline gates regress beyond newly added tests (start: 10 files / 128 tests passing) and cannot be fixed forward within the story — HALT blocked.
- Adding an npm dependency (EmailJS SDK) fails or pulls incompatible peer versions — HALT blocked rather than vendoring SDK code.
- A required behavior cannot ship without embedding a secret other than the EmailJS public key/config identifiers in the bundle — HALT blocked.

**Never:**
- No Angular Router import, no Tailwind/component library, no NgRx/RxJS stores, no graph libraries.
- No timers inside components; any sequencing stays outside component classes.
- No real backend/Kafka/database; the 200 OK response and Kafka receipt are mock artifacts rendered client-side from typed shapes.
- No changes to shipped Epic 1–3 log scripts, simulation behavior, or existing panel components beyond the app-shell tab registration.
- No deferred-pass items: focus-visible styling, ARIA tabs keyboard navigation, live-region announcements stay deferred per `deferred-work.md`.
- No real EmailJS service/template/public-key values invented: placeholder configuration ships, actual credential entry is builder-owned.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Try it out toggled | Visitor clicks "Try it out" | Editor becomes editable with a prefilled valid JSON body containing name, email, message fields | No error expected |
| Malformed JSON + Execute | Editor contains syntactically invalid JSON | Inline validation error appears near the editor; no delivery attempted, no receipt rendered | Typed parse failure stays inline |
| Valid JSON + Execute | Valid payload with name/email/message | Mock `200 OK` response headers plus Kafka queuing receipt JSON rendered from `DeliveryReceipt`; ingestion logs appended to Terminal Console (controller receives POST, producer publishes to partition 0) | No error expected |
| Adapter rejects | Port resolves a typed failure | Themed error banner renders; no thrown exception escapes to global handlers | Typed result path |
| Empty/non-object body | Editor contains `""`, `[]`, or `null` | Inline validation error; no send | Same as malformed case |

</intent-contract>

## Code Map

- `src/app/core/state/tabs.ts:9,22` -- `swagger-playground` TabId and TABS entry already exist; no changes expected.
- `src/app/app.html:27-45` -- `@switch (store.selectedTab())`; add `@case ('swagger-playground')`; `src/app/app.ts:14` imports list gains the new feature component.
- `src/app/core/state/cluster-state.service.ts:114-116` -- `appendLog(entry)` is the sole sanctioned write path for terminal ingestion logs; `LOG_CAP = 200` (:22) applies automatically.
- `src/app/core/data/portfolio-data.ts` -- canonical content contracts; `ContactInfo` (:23) already parsed; follow `parseContactInfo` (:136) pattern if any new JSON section were needed (none planned).
- `src/app/features/env-registry/*` -- smallest feature quadruple (ts/html/css/spec) to copy for structure/conventions; component-local signal input precedent (:14).
- `src/app/features/health-dashboard/*` -- button/badge/token styling precedent for Swagger chrome.
- `src/app/core/simulation/simulation-engine.ts:16-66` -- log script shape `{ source, level, message }` + monotonic-timestamp append pattern to mirror for ingestion logs.
- `src/app/app.config.ts` -- provider list where the delivery binding (`{ provide: MESSAGE_DELIVERY, useClass/useValue: ... }`) registers; `ClusterStateService`/`SimulationEngine` precedents.
- `src/app/app.spec.ts` -- per-tab component-render assertions added by the epic-3 review patch; extend with the swagger tab case.
- `src/index.html:5` -- `<base href="/">`; workflow overrides at build time with `--base-href`.
- `angular.json:12-46` -- `@angular/build:application` builder; assets copied from `public/` so `portfolio-data.json` fetch is relative to base-href (base-href-safe by construction).
- `.github/workflows/` -- does not exist yet; created in story 4-3 (checkout → Node setup → ci install → `ng test` → `ng build --configuration production --base-href /<repo>/` → configure-pages/upload-pages-artifact/deploy-pages).
- `.gitignore` -- confirm `dist/` and `node_modules/` ignored so the deployment story can never commit artifacts.
- `src/app/delivery/` -- new directory (architecture seed layout): `message-delivery.port.ts` (interface + types + injection token), `emailjs/emailjs.adapter.ts` (+ spec), config constant file with placeholder service/template/public-key values.

## Tasks & Acceptance

**Execution:**

Story 4-1 — Mock Swagger UI Request Editor (commit 1):
- `src/app/delivery/message-delivery.port.ts` -- define `MessagePayload` (name/email/message), `DeliveryReceipt` (Kafka-style fields: topic/partition/offset/timestamp/messageId/status), typed `DeliveryResult` union, `MessageDelivery` interface, and `MESSAGE_DELIVERY` injection token -- code-owned contracts at the seam (AD-11)
- `src/app/features/swagger-playground/swagger-playground.{ts,html,css}` -- Swagger-style panel: `POST /api/v1/contact` endpoint listing, "Try it out" toggle, editable JSON request body prefilled with name/email/message fields, Execute button (wired fully in 4-2) -- Story 4.1 ACs (FR6)
- `src/app/features/swagger-playground/swagger-playground.spec.ts` + `app.spec.ts` -- editor rendering, try-it-out toggle, malformed-JSON inline rejection (no send), tab registration coverage
- `src/app/app.ts`, `src/app/app.html` -- register under `swagger-playground` tab
- Commit `[4-1]` after `ng test` + `ng build` pass

Story 4-2 — Contact Execution & Real Delivery (commit 2):
- `package.json` -- add `@emailjs/browser` dependency (npm install) -- vendor SDK for the adapter only
- `src/app/delivery/emailjs/emailjs.adapter.ts` + spec -- implements `MessageDelivery` by wrapping the SDK; maps every failure mode to the typed failure result; reads placeholder service/template/public-key config from a sibling config constant file -- one DI-provided adapter behind the port (AD-4)
- `src/app/delivery/message-delivery.port.spec.ts` (or adapter spec) -- port exercised against a mocked adapter per AD-9
- `src/app/features/swagger-playground/swagger-playground.{ts,html,css}` + spec -- Execute: validate JSON, emit controller-receives-POST and producer-partition-0 ingestion logs through `store.appendLog`, call the port, render mock `200 OK` headers + receipt JSON, themed error banner on typed failure, disabled/busy state while sending -- Story 4.2 ACs (FR6)
- `src/app/app.config.ts` -- bind `MESSAGE_DELIVERY` to the EmailJS adapter -- single provider-token swap point
- Commit `[4-2]` after gates pass

Story 4-3 — GitHub Pages Deployment Pipeline (commit 3):
- `.github/workflows/deploy.yml` -- push-to-main workflow: checkout, Node 24 + npm ci, `ng test`, `ng build --configuration production --base-href "/${{ github.event.repository.name }}/"`, upload artifact, deploy to Pages via official actions -- AD-7 go-live
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- flip 4-1/4-2/4-3 and `epic-4` to done, refresh `last_updated`
- `_bmad-output/implementation-artifacts/deferred-work.md` -- append epic-4-retrospective decision entry
- Commit `[4-3]` after gates pass
- Finalize: commit this spec + `epic-4-context.md` as a closing docs commit (epic-3 precedent)

**Acceptance Criteria:**
- Given the Swagger Playground tab renders, when inspected, then an endpoint listing for `POST /api/v1/contact`, a working "Try it out" toggle, and an editable JSON request body containing name, email, and message fields are visible.
- Given the payload and receipt shapes used by the UI, when traced to their source, then they are typed exports of `message-delivery.port.ts` and no EmailJS SDK symbol appears outside the adapter file.
- Given the visitor enters malformed JSON and presses Execute, when validation runs, then an inline error appears and no delivery, receipt, or ingestion log is produced.
- Given valid JSON is submitted via Execute, when the action completes, then mock `200 OK` response headers plus a Kafka queuing receipt built from `DeliveryReceipt` render, structured ingestion logs appear in the Terminal Console (controller receiving POST, producer publishing to partition 0), and delivery crossed the `MessageDelivery` port only.
- Given the adapter reports a typed failure, when the result returns, then a themed error banner renders and no exception reaches global error handlers.
- Given `.github/workflows/deploy.yml` on `main`, when pushed to, then it tests, production-builds with base-href `/<repo>/`, uploads the artifact, deploys Pages, and no build output is ever committed.
- Given `git log` after completion, when inspected, then three story commits exist in ticket order `[4-1]`, `[4-2]`, `[4-3]`, each created only after `ng test` and `ng build` passed, and sprint-status.yaml reflects every Epic 4 story plus `epic-4` as done.
- Given the full suite runs, when compared to baseline, then all pre-existing 128 tests still pass alongside new suites.

## Spec Change Log

## Review Triage Log

### 2026-08-22 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 7: (high 0, medium 4, low 3)
- defer: 0
- reject: 19
- addressed_findings:
  - `[medium]` `[patch]` EmailJS SDK `send()` can resolve without throwing even on provider failure; adapter now inspects the resolved response status and maps non-2xx to a typed `provider-error` result, with specs for 401-resolve and 201-receipt paths.
  - `[medium]` `[patch]` Production `MESSAGE_DELIVERY` DI binding was never asserted under real app providers — deleting or misnaming the provider line shipped green; added an assertion in the real-providers suite that `TestBed.inject(MESSAGE_DELIVERY)` is an `EmailJsAdapter`.
  - `[medium]` `[patch]` Required-field branches of `parseMessageBody` (missing/empty name, email, message) were never executed by any test; extended parametrized rejection coverage over object-shaped invalid bodies asserting inline error, zero port calls, zero logs.
  - `[medium]` `[patch]` `actions/configure-pages@v5` lacked `enablement: true`, so the first push would fail unless Pages was pre-enabled manually; added enablement to the step.
  - `[low]` `[patch]` `execute()` had no try/finally around the port await — an unexpected throw left Execute permanently disabled; wrapped in try/finally so `sending` always resets.
  - `[low]` `[patch]` Toggling Try-it-out off left stale receipt/delivery-error visible into the next session; both signals now clear on toggle-off.
  - `[low]` `[patch]` `DeliveryFailureReason` carried a dead `'invalid-request'` member produced by nothing; removed it from the union.

## Design Notes

Credentials are deliberately placeholder constants in the delivery module: real EmailJS service/template/public-key values are builder-owned secrets that cannot be invented unattended (the PRD permits only the public key in the bundle, and the repo already ships placeholder contact data such as `you@example.com`). Structure the config as one clearly-marked constant file so Gokul swaps three strings to go truly live; SM-1's "actual email received" remains human verification after credentials exist. The base-href unknown is resolved dynamically: the workflow derives `/<repo>/` from `github.event.repository.name`, so the pipeline works regardless of final repo naming without hardcoding.

Receipt realism: `DeliveryReceipt` mirrors a Kafka producer ack (`topic: 'contact-ingest'`, `partition: 0`, monotonically increasing `offset`, ISO timestamp, `status: 'QUEUED'`) so the printed JSON reads authentically while remaining a pure client-side artifact.

## Verification

**Commands:**
- `npx ng test` -- expected: baseline 10 files / 128 tests keep passing plus new suites all green (run before each commit)
- `npx ng build` -- expected: production build succeeds under strict TypeScript (run before each commit)
- `git log --oneline -4` -- expected: three commits headed `[4-1]`, `[4-2]`, `[4-3]` in order, clean working tree after final commit

**Manual checks (if no CLI):**
- Grep `src/` for `@emailjs`: matches only inside `src/app/delivery/emailjs/`
- Inspect `.github/workflows/deploy.yml`: base-href flag present, no artifact paths committed, Pages deploy steps use official actions

## Auto Run Result

Status: done

### Summary
Epic 4 implemented in full as three ticket-ordered commits — `[4-1]` mock Swagger UI request editor (typed `MessageDelivery` port contracts, endpoint listing, Try-it-out toggle, editable JSON body with inline validation), `[4-2]` contact execution and real delivery (`@emailjs/browser` adapter behind the port, ingestion logs through the store, mock 200 OK headers + Kafka receipt, typed failure banner), `[4-3]` GitHub Pages deployment pipeline (push-to-main workflow, repo-derived base-href, Pages enablement) closing sprint tracking — plus a closing docs commit. Review pass applied 7 patches (provider status check, DI-binding assertion, field-validation coverage, Pages enablement, try/finally, stale-state clearing, dead union member removal) and deferred none.

### Files changed
- `src/app/delivery/message-delivery.port.ts` -- `MessagePayload`, `DeliveryReceipt`, `DeliveryFailure`/`DeliveryResult`, `MessageDelivery` interface, `MESSAGE_DELIVERY` token; review patch removed the dead `'invalid-request'` reason.
- `src/app/delivery/emailjs/emailjs.{adapter,config}.ts` + adapter spec -- EmailJS adapter (SDK confined here), placeholder credential constants; review patch added resolved-response status checking mapped to typed failure.
- `src/app/features/swagger-playground/swagger-playground.{ts,html,css}` + spec -- Swagger-style panel with Try-it-out editor, JSON validation, Execute flow (ingestion logs, receipt render, error banner, busy state); review patches: try/finally around send, stale receipt/error cleared on toggle-off.
- `src/app/app.ts`, `src/app/app.html`, `src/app/app.spec.ts` -- playground registered under `swagger-playground` tab; review patch asserts real-provider binding resolves to `EmailJsAdapter`.
- `src/app/app.config.ts` -- binds `{ provide: MESSAGE_DELIVERY, useClass: EmailJsAdapter }`.
- `package.json`, `package-lock.json` -- added `@emailjs/browser@^4.4.1`.
- `.github/workflows/deploy.yml` -- push-to-main pipeline: npm ci, `ng test`, production build with base-href `/<repo>/` derived from `github.event.repository.name`, Pages upload/deploy; review patch added `enablement: true`.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- 4-1/4-2/4-3 and epic-4 flipped to done (in `[4-3]` commit).
- `_bmad-output/implementation-artifacts/deferred-work.md` -- appended epic-4-retrospective human-owned decision entry (in `[4-3]` commit).
- `_bmad-output/implementation-artifacts/spec-epic-4-swagger-contact-playground-go-live.md`, `epic-4-context.md` -- this spec and the compiled epic context (committed at finalize).

### Review findings breakdown
- Patches applied: 7 (medium 4, low 3) — see Review Triage Log 2026-08-22.
- Items deferred: 0.
- Items rejected: 19.

### Follow-up review recommendation
true — patched counts by severity: medium 4, low 3; score = 3×4 + 1×3 = 15 ≥ 5.

### Verification performed
- Per-commit gates: `npx ng test` + `npx ng build` green before each of `[4-1]` (11 files/133 tests), `[4-2]`/`[4-3]` (12 files/140 tests).
- Post-review: `npx ng test` — 12 files / 144 tests pass; `npx ng build` — production build succeeds (208.79 kB initial).
- Manual greps: `@emailjs` matches only inside `src/app/delivery/emailjs/`; deploy.yml inspected for base-href derivation, enablement flag, and absence of committed artifacts.
- I/O matrix audit: all five rows covered by running tests (try-it-out prefill/toggle, malformed JSON rejection, valid execute → headers/receipt/logs, typed-failure banner, empty/array/null body rejection).

### Residual risks
- EmailJS ships placeholder credentials by design; real delivery (SM-1 "actual email received") requires Gokul to swap three strings in `emailjs.config.ts` and is human verification.
- The Pages pipeline is unexecuted until pushed to a GitHub remote with Pages available (`enablement: true` now handles first-run enablement); artifact path assumes the Angular project stays named `portfolio`.
