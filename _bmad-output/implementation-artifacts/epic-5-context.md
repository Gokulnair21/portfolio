# Epic 5 Context: Real CV Content Alignment & Go-Live Readiness

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Replace every scaffold placeholder in `public/portfolio-data.json` with Gokul Nair's actual CV identity (Neosoft Technologies, real client projects, real contact details) and re-theme the service topology to his real multi-region core banking platform. This makes the portfolio a truthful job-seeking asset before go-live, and validates the content-driven architecture delivered by Epics 1–4: it must be achievable as a pure data swap with no structural code changes. The approved source document for this epic is the Sprint Change Proposal of 2026-08-23 — its data tables are the authoritative content spec.

## Stories

- Story 5.1: Schema & Contract Updates — Remove repoUrl
- Story 5.2: CV Content Population & Placeholder Elimination

## Requirements & Constraints

- **Real CV content everywhere:** contact details (email, GitHub, LinkedIn), a single experience entry (Neosoft Technologies, Associate Team Lead — Java Backend Engineer, Jun 2021 – Present, with 5 CV highlights), three client projects (Bank ABC, TATA AIG, EKAM — Union Bank of India), and 11 skill rows mapped from CV Technical Skills must replace all fictional scaffold data.
- **Topology re-theme:** exactly 5 core-banking nodes (`bff-gateway`, `onboarding-service`, `payment-service`, `deposit-service`, `core-bank-db`) with links gateway → {onboarding, payment, deposit} and {payment, deposit} → db. Must stay at `MAX_TOPOLOGY_NODES = 5`. Metrics are simulated plausible values anchored to real CV claims where fitting.
- **Zero placeholders:** no placeholder strings (`example.com`, `Example Corp`, `your-handle`, etc.) may remain anywhere in the rendered UI.
- **repoUrl removal:** repo links are dropped entirely (not pointed at non-existent repos) because no public repos exist; this has zero UI impact since `projects[]` is not rendered by any feature.
- **No structural code changes:** hydration completes without any component or logic changes — this is the epic's architectural validation criterion.
- **Success gate:** full unit suite passes via `ng test` (including updated contract spec), lint/typecheck clean, app boots and hydrates.

## Technical Decisions

- All content lives in `public/portfolio-data.json`, fetched once at bootstrap and validated against TypeScript interfaces — components render typed shapes only and never fetch content themselves (content-driven seam).
- Typed contracts are code-owned: remove `repoUrl` from `ProjectEntry` in `src/app/core/data/portfolio-data.ts` and drop its validation line from the parser in lockstep — schema and parser never diverge.
- The JSON contract spec asserts hard-coded topology node IDs and links; update round-trip expectations to the new node IDs and the `payment-service → core-bank-db` link.
- The simulation engine operates generically over topology nodes, so the re-theme requires no engine changes; `health` section is unchanged (simulation input, not CV content).
- Consumed JSON sections are: `experience`, `envProperties`, `topology`, `health`, `contact.email`; `projects[]` is currently unconsumed by any feature.

## Cross-Story Dependencies

- Story 5.1 (schema + test updates) should land before or with Story 5.2's data swap so the contract spec matches the populated JSON when the suite runs.
- Depends on Epics 1–3 delivering the hydration seam, topology panel, career pods, and env registry; on Epic 4's Swagger Playground consuming `contact.email`.
- Touches only deliverable *content* of the runtime-hydration story (Epic 1) — the hydration mechanism itself is unaffected.
