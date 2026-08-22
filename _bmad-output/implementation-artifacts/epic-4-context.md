# Epic 4 Context: Swagger Contact Playground & Go-Live

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give recruiters a Swagger-style contact playground where they edit a `POST /api/v1/contact` request body and execute it against a mock API client that prints a mock `200 OK` response with a Kafka queuing receipt — while a real message is delivered to Gokul via EmailJS behind a port abstraction. Then take the whole site live on GitHub Pages through an automated push-to-main pipeline at $0/month, completing the contact success metric and the free-hosting constraint.

## Stories

- Story 4.1: Mock Swagger UI Request Editor
- Story 4.2: Contact Execution & Real Delivery
- Story 4.3: GitHub Pages Deployment Pipeline

## Requirements & Constraints

- The Swagger Playground panel shows an endpoint listing for `POST /api/v1/contact`, a "Try it out" toggle, and an editable JSON request body containing name, email, and message fields.
- Malformed JSON must produce an inline validation error and must not trigger any send.
- Executing valid JSON renders mock response headers (`200 OK`) plus a Kafka queuing receipt JSON built from the port's `DeliveryReceipt` type — the receipt is simulated client-side; there is no real Kafka.
- Execution appends structured ingestion logs to the Terminal Console (controller receiving the POST, producer publishing to partition 0).
- The message must actually reach Gokul by email (validates the real-delivery success metric). Delivery failures surface as a themed error banner, never as thrown SDK errors.
- Deployment is fully automated: pushing to `main` runs a production build with base-href set to `/<repo>/`, uploads the artifact, and deploys to GitHub Pages. All asset references — including the runtime `portfolio-data.json` fetch — must resolve correctly under the project-page subpath. Build output is never committed. Total maintenance cost must remain $0 using only free-tier services.

## Technical Decisions

- **MessageDelivery port (ports & adapters):** The playground depends only on the `MessageDelivery` port interface (`send(payload): Promise<DeliveryReceipt>`); EmailJS is one DI-provided adapter (`emailjs.adapter.ts`). Swapping vendors means one new adapter plus one provider token change — no component changes. No EmailJS SDK calls in components.
- **Typed, code-owned contracts:** The port defines its own payload and `DeliveryReceipt` types (including the Kafka-style receipt fields the UI displays) in code owned alongside `src/app/core/data`; content interfaces live in `src/app/core/data` as the canonical definitions. Failures are typed results, never thrown SDK errors.
- **Single signals store:** Shared state lives in `ClusterStateService` as Angular signals; components read via `computed()` and mutate only through store methods. Terminal log entries are structured `{ timestamp, source, level, message }`, capped at the last 200 entries.
- **Design tokens:** Status palette (up green, degraded red, info blue), monospace stack, and spacing are CSS custom properties in one global stylesheet; components (and SVG attributes) reference tokens only. Hand-rolled CSS — no Tailwind or component libraries.
- **Angular v22 idiom baseline:** Standalone components, signals-first, OnPush change detection, built-in control flow (`@if/@for`), strict TypeScript, no Angular Router anywhere.
- **Deployment mechanics:** Workflow at `.github/workflows/deploy.yml`; `ng build --configuration production` with base-href `/<repo>/`.
- **Secrets:** The EmailJS public key is the only secret permitted in the static bundle (public-facing key backed by free-tier quota). No other secrets ever ship in the bundle.

## Cross-Story Dependencies

- Stories 4.1 and 4.2 build one feature sequentially: the editor (4.1) defines the typed payload/receipt contracts that execution-and-delivery (4.2) consumes.
- Both depend on Epic 1 foundations: app shell/tab navigation (the Swagger panel appears behind a tab), runtime JSON hydration (contact details), design tokens, and the signals store.
- Story 4.2 depends on Epic 2's Terminal Console pane for ingestion-log display.
- Story 4.3 should land last: deployment ships the complete site including the working contact feature.
