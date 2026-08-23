---
stepsCompleted: [step-01, step-02, step-03, step-04-change-request]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-portfolio-2026-08-15/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-Portfolio-2026-08-22/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-23.md
---

# Portfolio - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Portfolio (Spring Boot Actuator themed personal portfolio), decomposing the requirements from the PRD and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Display real-time interactive health probe statuses — "Liveness Probe" defaulting to `UP` (green), "Active Broker Connections" defaulting to `2 / 2` (blue, Kafka + Zookeeper), and "Error Rate" defaulting to `0.00%` (green); metrics transition to red/degraded states during a simulated outage.
FR2: Provide outage simulation controls — clicking "Simulate Network Outage" shifts status to `DEGRADED` (red) and clicking "Trigger Auto-Recovery" shifts status back to `UP` (green); state changes emit structured log sequences (`SqlExceptionHelper`, `PaymentCircuitBreaker` transitions) into the Terminal Console and turn payment/database node borders red in the Service Topology Map.
FR3: Render a visual service topology network of five nodes (`api-gateway`, `auth-service`, `payment-service`, `notify-service`, `postgresql-db`); clicking a node highlights it and opens a detail panel with Description, Core Tech Stack, and Metrics; during an active outage, payment→database links turn red and `payment-service` metrics show a 100% error rate.
FR4: Provide an `/actuator/env`-styled searchable property table; typing in the filter field filters rows in real time by property key or value match.
FR5: Present career history as Kubernetes-style replica pods; clicking a pod (e.g. `pod-experience-senior-neosoft-0`) updates the replica details card showing timeline, role description, and bulleted responsibilities.
FR6: Provide a mock Swagger UI contact playground where the user edits a JSON request payload and clicks "Execute"; the interface prints a mock `200 OK` response header plus Kafka queuing receipt JSON, appends ingestion logs to the Terminal Console, and sends a real message behind the scenes via EmailJS.
FR7: Dynamically load all portfolio content (projects, experience, contact details, env properties) at runtime from a static JSON configuration file; content changes require no HTML or JS logic changes.

### NonFunctional Requirements

NFR1: Performance — page load under 1.5 seconds on mobile and desktop (SM-2), low asset footprint.
NFR2: Cost — $0/month maintenance; hosted on GitHub Pages using only free-tier services (SM-3).
NFR3: Static single-page application — no JVM server backend, no real Kafka cluster, no database persistence, no user login/auth.
NFR4: Single-page layout — everything bundled in one clean layout; no multiple HTML pages.

### Additional Requirements

- Starter/stack baseline: Angular v22 (CLI + core, @angular/build esbuild builder) with TypeScript ~6.0, Node ^22||^24||^26 (AD-8 idiom baseline: standalone components, signals-first, OnPush, built-in control flow `@if/@for`, strict TypeScript).
- Single signals store: all shared simulation state lives in `ClusterStateService` as Angular signals; components read via `computed()` and mutate only through store methods; no NgRx/RxJS stores, no component-local duplicates of shared state (AD-1).
- No router: tabs are a `selectedTab` signal in the store; deep links are a non-goal (AD-2).
- Content hydration seam: portfolio JSON fetched once at bootstrap from `public/portfolio-data.json` via `PortfolioDataLoader` and validated against TypeScript interfaces; components render typed shapes only; on fetch failure render a themed "SERVICE UNAVAILABLE" panel with retry (AD-3).
- Contact delivery port: Swagger Playground depends only on a `MessageDelivery` port interface returning typed `DeliveryReceipt`s / typed failures; EmailJS is one DI-provided adapter; swapping vendors requires one new adapter + one provider token change (AD-4, AD-11).
- Topology as hand-authored inline SVG with class/style bindings driven by store state; no graph libraries (D3/Cytoscape) (AD-5).
- Design tokens: status palette (up green, degraded red, info blue), monospace stack, spacing defined as CSS custom properties in one global stylesheet; components reference tokens only — hand-rolled CSS, no Tailwind/component library (AD-6).
- Deployment: push to `main` triggers GitHub Actions workflow running production build with base-href `/<repo>/`, artifact upload, Pages deploy; base-href-safe asset references; no build artifacts committed (AD-7).
- Testing: Vitest unit tests via `ng test` covering `ClusterStateService` transitions (UP → DEGRADED → HALF-OPEN → UP), log sequencing, and the `MessageDelivery` port with a mocked adapter; E2E deferred (AD-9).
- SimulationEngine single-writer rule: every cluster-state transition originates in the pure `SimulationEngine`; UI controls invoke engine commands only; engine emits full scripted sequences including HALF-OPEN and recovery; components never write outage status directly (AD-10).
- Typed code-owned contracts: `MessageDelivery` payload/receipt types and content interfaces (`LogEntry`, portfolio shapes) live in `src/app/core/data`; failures are typed results, never thrown SDK errors (AD-11).
- Conventions: structured log entries `{ timestamp, source, level, message }`; console capped at last 200 entries; no timers inside components; mock metrics as plain numbers/strings from JSON catalog; dates ISO `yyyy-MM-dd`; EmailJS public key is the only permitted bundle secret.

### UX Design Requirements

(No dedicated UX design document was provided. Theme vocabulary is carried by PRD feature descriptions and Architecture design tokens (AD-6).)

### Change Requirements (Sprint Change Proposal 2026-08-23)

CR1: Replace all placeholder portfolio content (contact, experience, projects, envProperties) with real CV data — Neosoft Technologies identity, three client projects (Bank ABC, TATA AIG, EKAM), real email/GitHub/LinkedIn
CR2: Re-theme the service topology to the multi-region core banking platform — exactly 5 nodes: bff-gateway, onboarding-service, payment-service, deposit-service, core-bank-db, with links bff-gateway → {onboarding, payment, deposit} and {payment, deposit} → core-bank-db
CR3: Remove repoUrl from ProjectEntry schema and its parser validation (zero UI impact — projects[] not rendered by any feature)
CR4: Update portfolio-json-contract.spec.ts expectations (new node IDs, payment-service → core-bank-db link, drop repoUrl assertions) and strip repoUrl from all test fixtures
CR5: Zero placeholder strings remain anywhere in rendered UI (example.com, Example Corp, your-handle, etc.)

### FR Coverage Map

FR1: Epic 1 - Health probes & metrics display
FR2: Epic 2 - Outage simulation controls + log sequences
FR3: Epic 3 - Topology node graph & detail panel
FR4: Epic 3 - Env property search filtering
FR5: Epic 3 - Career pod selection & details
FR6: Epic 4 - Swagger execution + EmailJS delivery
FR7: Epic 1 - Runtime JSON content hydration
CR1: Epic 5 - Real CV content population
CR2: Epic 5 - Core-banking topology re-theme
CR3: Epic 5 - Schema & contract updates (repoUrl removal)
CR4: Epic 5 - Contract spec & fixture updates
CR5: Epic 5 - Placeholder elimination audit

## Epic List

### Epic 1: Dashboard Foundation & Live System Health
Visitors land on a themed Actuator dashboard showing live probe statuses and can navigate panels via signal-driven tabs — the site works as a real portfolio homepage from day one. Includes project scaffolding (Angular v22 baseline, design tokens, signals store, no router) and runtime JSON content hydration.
**FRs covered:** FR1, FR7

### Epic 2: Interactive Outage Simulation & Terminal Console
Visitors crash the mock cluster and watch recovery happen in real time — the PRD's climax feature. SimulationEngine drives scripted UP → DEGRADED → HALF-OPEN → UP transitions, feeding a fixed terminal log pane; health metrics react through the shared store.
**FRs covered:** FR2

### Epic 3: Cluster Exploration Panels
Recruiters explore Gokul's work: click topology nodes to inspect projects, search the `/actuator/env` skills table, browse career history as Kubernetes replica pods. Topology degrades visually during active outages from Epic 2.
**FRs covered:** FR3, FR4, FR5

### Epic 4: Swagger Contact Playground & Go-Live
Recruiters send a real message via the mock Swagger UI (EmailJS behind the `MessageDelivery` port) and the site deploys to GitHub Pages via GitHub Actions — completing SM-1 and SM-3 ($0 hosting).
**FRs covered:** FR6 (+ SM-1, AD-7 deployment)

### Epic 5: Real CV Content Alignment & Go-Live Readiness
Replace every scaffold placeholder with Gokul's actual CV identity and re-theme the topology to his real multi-region core banking platform — making the portfolio a truthful job-seeking asset before go-live. Validates the content-driven architecture delivered by Epics 1–4: a pure data swap with no structural code changes.
**Requirements covered:** CR1, CR2, CR3, CR4, CR5

## Epic 1: Dashboard Foundation & Live System Health

Visitors land on a themed Actuator dashboard showing live probe statuses and can navigate panels via signal-driven tabs — the site works as a real portfolio homepage from day one.

### Story 1.1: Project Scaffold & Actuator Theme Shell

As a recruiter,
I want to load a Spring Boot Actuator–themed dashboard page,
So that I immediately recognize Gokul's backend expertise.

**Acceptance Criteria:**

**Given** the repository is cloned and dependencies installed
**When** the dev server or production build runs
**Then** an Angular v22 application builds and serves successfully using the @angular/build (esbuild) builder
**And** TypeScript strict mode is enabled

**Given** the global stylesheet
**When** inspected
**Then** status palette tokens (up green, degraded red, info blue), monospace font stack, and spacing scale are defined as CSS custom properties
**And** no component uses raw color/spacing values outside tokens (SVG stroke/fill attributes included)

**Given** the app shell renders
**When** the page loads
**Then** a themed header and panel area are visible, hand-rolled CSS only (no Tailwind or component library)
**And** no Angular Router import exists anywhere in the app
**And** all components are standalone with OnPush change detection and built-in control flow (@if/@for)

### Story 1.2: Signals Store & Tab Panel Navigation

As a visitor,
I want to switch between dashboard panels via tabs,
So that I can explore each section without page reloads.

**Acceptance Criteria:**

**Given** `ClusterStateService` is provided at app level
**When** inspected
**Then** it exposes a read-only `selectedTab` signal and a method to select a tab
**And** components mutate tab state only through store methods (AD-1)

**Given** the shell renders tab buttons from typed config
**When** a visitor clicks a different tab
**Then** the corresponding panel becomes visible and all other panels hide
**And** no page reload or URL change occurs (AD-2)

**Given** unit tests run via `ng test` (Vitest)
**When** tab selection methods are exercised
**Then** the `selectedTab` signal transitions correctly

### Story 1.3: Runtime JSON Content Hydration

As a builder (Gokul),
I want all portfolio content loaded from a static JSON configuration file,
So that adding projects or updating contact info requires no HTML or JS changes.

**Acceptance Criteria:**

**Given** `public/portfolio-data.json` exists with initial portfolio content
**When** the app bootstraps
**Then** `PortfolioDataLoader` fetches it once via HttpClient and validates it against TypeScript interfaces in `src/app/core/data`
**And** hydrated content enters `ClusterStateService`; components render only typed shapes and never fetch content themselves (AD-3, AD-11)

**Given** the JSON fetch or parse fails
**When** the shell renders
**Then** a themed "SERVICE UNAVAILABLE" panel appears with a retry action — never a blank page or console-only error

**Given** a content value is changed in the JSON file only
**When** the app reloads
**Then** the updated content renders without any component or logic code changes

### Story 1.4: Live System Health Probes Display

As a recruiter,
I want to see liveness probe, broker connections, and error rate stats on the dashboard,
So that the site feels like a real actuator health endpoint.

**Acceptance Criteria:**

**Given** the system is in default state
**When** the Health Dashboard panel renders
**Then** "Liveness Probe" displays `UP` in green, "Active Broker Connections" displays `2 / 2` in blue, and "Error Rate" displays `0.00%` in green (FR1)

**Given** health values are displayed
**When** traced to their source
**Then** they come from store computed selectors seeded by the JSON config, not hardcoded in the component

**Given** unit tests run
**When** initial health state is evaluated
**Then** the store's default status values match FR1 defaults

## Epic 2: Interactive Outage Simulation & Terminal Console

Visitors crash the mock cluster and watch recovery happen in real time — the PRD's climax feature.

### Story 2.1: Terminal Console Log Pane

As a visitor,
I want to watch simulated backend logs stream in a fixed terminal pane,
So that I feel like I'm observing a live system.

**Acceptance Criteria:**

**Given** the Terminal Console component renders as a fixed pane
**When** log entries exist in the store
**Then** each entry renders with its structured fields `{ timestamp, source, level, message }`

**Given** new log entries are appended to the store
**When** the console updates
**Then** new entries appear at the end and the view auto-scrolls to the latest entry

**Given** more than 200 log entries accumulate
**When** a new entry is added
**Then** the oldest entries are dropped, keeping the console capped at the last 200 entries

**Given** unit tests run
**When** append and cap behavior is exercised
**Then** ordering and the 200-entry cap are verified

### Story 2.2: SimulationEngine & Outage Trigger

As a recruiter,
I want to click "Simulate Network Outage" and see the cluster go DEGRADED,
So that I can inspect realistic failure behavior.

**Acceptance Criteria:**

**Given** `SimulationEngine` exists as a pure scripted engine in `src/app/core/simulation`
**When** any cluster-state transition occurs
**Then** it originates from the engine — UI controls invoke engine commands only and components never write outage status directly (AD-10)

**Given** the system is UP
**When** the visitor clicks "Simulate Network Outage"
**Then** status transitions to `DEGRADED` (red) and Error Rate spikes (FR2)

**Given** the outage sequence runs
**When** the engine emits its script
**Then** the Terminal Console shows structured logs including a database connection limit exception (`SqlExceptionHelper`) and circuit breaker transition (`PaymentCircuitBreaker CLOSED -> OPEN`)

**Given** the implementation is reviewed
**When** checked for timers
**Then** no timers or scheduling exist inside components; sequencing lives only in the engine

### Story 2.3: Auto-Recovery Sequence

As a recruiter,
I want to click "Trigger Auto-Recovery" and watch the circuit breaker heal,
So that I see resilience patterns demonstrated end-to-end.

**Acceptance Criteria:**

**Given** the system is DEGRADED
**When** the visitor clicks "Trigger Auto-Recovery"
**Then** the engine emits a HALF-OPEN state with a themed fallback warning banner and mock cached-read logs

**Given** the recovery sequence continues
**When** the engine validates a mock connection
**Then** logs show the validation step followed by `HALF-OPEN -> CLOSED`, and status returns to green `UP` with metrics restored (FR2)

**Given** an active outage state exists
**When** any panel observes store state
**Then** degraded visuals are derivable via computed selectors without component-local duplicates (AD-1)

**Given** unit tests run via Vitest
**When** the full sequence UP -> DEGRADED -> HALF-OPEN -> UP is exercised
**Then** every transition, log order, and final restored state is asserted (AD-9)

## Epic 3: Cluster Exploration Panels

Recruiters explore Gokul's work: click topology nodes to inspect projects, search the `/actuator/env` skills table, browse career history as Kubernetes replica pods.

### Story 3.1: Service Topology Map & Node Inspection

As a recruiter,
I want to view an interactive microservices topology graph and click nodes for details,
So that I can explore Gokul's projects as a system architecture.

**Acceptance Criteria:**

**Given** the Topology panel renders
**When** inspected
**Then** an inline SVG shows five service nodes (`api-gateway`, `auth-service`, `payment-service`, `notify-service`, `postgresql-db`) connected by links (FR3)
**And** no graph library (D3/Cytoscape) is used (AD-5)

**Given** a visitor clicks a service node
**When** the selection registers in the store
**Then** the node highlights and a detail panel opens showing Description, Core Tech Stack, and Metrics sourced from the JSON catalog

**Given** node and edge visuals are rendered
**When** their styling is traced
**Then** highlight/normal states come from class or style bindings to store state, using design tokens only

### Story 3.2: Topology Outage Degradation

As a recruiter,
I want to see payment-to-database links turn red during a simulated outage,
So that failure is visually consistent across all panels.

**Given** an outage is active in the store
**When** the topology renders
**Then** the link between `payment-service` and `postgresql-db` and both node borders render degraded red (FR2, ASSUMPTION-2)

**Given** the outage is active
**When** `payment-service` details are opened
**Then** its metrics display a 100% error rate

**Given** degraded visuals derive from computed selectors
**When** recovery completes
**Then** normal styling restores automatically with no component-local state

### Story 3.3: Env Property Search & Career Replica Pods

As a recruiter,
I want to search Gokul's skills in an `/actuator/env` table and browse career history as replica pods,
So that I can quickly verify his stack and experience.

**Acceptance Criteria:**

**Given** the Env Registry panel renders
**When** property rows display
**Then** each row shows key/value pairs from the JSON catalog styled after `/actuator/env`

**Given** the visitor types in the search filter
**When** input changes
**Then** rows filter in real time matching either property key or value (e.g. `gokul.skills.languages`, `Java 17`) (FR4)

**Given** the Career Pods panel renders
**When** pod cards display
**Then** employment history appears as Kubernetes-style replicas (e.g. `pod-experience-senior-neosoft-0`) with running-pod visual states

**Given** a visitor clicks a pod
**When** selection updates in the store
**Then** the replica detail card shows timeline, role description, and bulleted responsibilities for that entry (FR5)

## Epic 4: Swagger Contact Playground & Go-Live

Recruiters send a real message via the mock Swagger UI (EmailJS behind the `MessageDelivery` port) and the site deploys to GitHub Pages via GitHub Actions.

### Story 4.1: Mock Swagger UI Request Editor

As a recruiter,
I want a Swagger-style interface where I can edit a `POST /api/v1/contact` request body,
So that I can interact with Gokul's API like a real developer.

**Acceptance Criteria:**

**Given** the Swagger Playground panel renders
**When** inspected
**Then** it shows an endpoint listing for `POST /api/v1/contact`, a "Try it out" toggle, and an editable JSON request body with name, email, and message fields (FR6)

**Given** payload and receipt shapes are needed by the UI
**When** traced to their source
**Then** they are typed contracts code-owned by the `MessageDelivery` port definition (AD-11)

**Given** the visitor enters malformed JSON
**When** Execute is pressed
**Then** an inline validation error appears and no request is sent

### Story 4.2: Contact Execution & Real Delivery

As a recruiter,
I want clicking Execute to show a mock 200 OK response and actually deliver my message,
So that I can genuinely reach Gokul.

**Acceptance Criteria:**

**Given** valid JSON is submitted via Execute
**When** the action completes
**Then** the UI prints mock response headers (`200 OK`) plus a Kafka queuing receipt JSON built from the port's `DeliveryReceipt` type (FR6)

**Given** execution occurs
**When** logs are emitted
**Then** the Terminal Console appends structured ingestion logs of the controller receiving the POST and the producer publishing to partition 0

**Given** delivery crosses the external seam
**When** the message is sent
**Then** it goes through the `MessageDelivery` port implemented by the EmailJS adapter — no EmailJS SDK calls in components (AD-4)
**And** failures return as typed results rendered as a themed error banner, never thrown SDK errors (AD-11)

**Given** a recruiter submits their real contact details
**When** delivery completes
**Then** Gokul receives the actual email, validating SM-1

### Story 4.3: GitHub Pages Deployment Pipeline

As a builder (Gokul),
I want push-to-main deployments,
So that the site stays live at $0/month with zero manual steps.

**Acceptance Criteria:**

**Given** `.github/workflows/deploy.yml` exists
**When** code is pushed to `main`
**Then** the workflow runs `ng build --configuration production` with base-href set to `/<repo>/`, uploads the artifact, and deploys to Pages (AD-7)

**Given** the deployed site loads under the project-page subpath
**When** assets and JSON content are requested
**Then** all references resolve correctly (base-href-safe), including the runtime portfolio-data.json fetch

**Given** the repository is inspected after deploy
**When** checked for build output
**Then** no build artifacts are ever committed

**Given** the site is live on GitHub Pages
**When** monthly costs are reviewed
**Then** total maintenance cost is $0 using only free-tier services (NFR2, SM-3)

## Epic 5: Real CV Content Alignment & Go-Live Readiness

Replace every scaffold placeholder with Gokul's actual CV identity and re-theme the topology to his real multi-region core banking platform — making the portfolio a truthful job-seeking asset before go-live. Validates the content-driven architecture delivered by Epics 1–4: a pure data swap with no structural code changes. Source: `sprint-change-proposal-2026-08-23.md` (approved).

### Story 5.1: Schema & Contract Updates — Remove repoUrl

As a builder (Gokul),
I want the `ProjectEntry` schema to drop `repoUrl` and all tests updated in lockstep,
So that the content contract matches reality (no public repos exist) with no broken tests.

**Acceptance Criteria:**

**Given** `src/app/core/data/portfolio-data.ts`
**When** inspected
**Then** `repoUrl` is removed from `ProjectEntry` and its validation line removed from `parseProjectEntry` (CR3)

**Given** `portfolio-json-contract.spec.ts`
**When** run
**Then** round-trip expectations assert node IDs `bff-gateway, onboarding-service, payment-service, deposit-service, core-bank-db`, the link `payment-service → core-bank-db`, and contain no `repoUrl` assertions (CR4)

**Given** fixtures in `app.spec.ts`, `portfolio-data-loader.service.spec.ts`, and `cluster-state.service.spec.ts`
**When** inspected
**Then** no fixture contains `repoUrl` (CR4)

**Given** the full unit suite runs via `ng test`
**When** completed
**Then** all tests pass and lint/typecheck are clean

### Story 5.2: CV Content Population & Placeholder Elimination

As a recruiter,
I want every panel to show Gokul's real experience, skills, projects, and contact details,
So that the portfolio truthfully represents him as a job-seeking asset.

**Acceptance Criteria:**

**Given** `public/portfolio-data.json`
**When** hydrated
**Then** career-pods shows the Neosoft Technologies pod (`Associate Team Lead — Java Backend Engineer`, Jun 2021 — Present) with the 5 CV highlights; env-registry renders the 11 skill rows from CV Technical Skills; swagger-playground targets `gokul.nairmurali@gmail.com` (CR1)

**Given** the service-topology panel renders
**When** inspected
**Then** it shows the 5 core-banking nodes (`bff-gateway`, `onboarding-service`, `payment-service`, `deposit-service`, `core-bank-db`) with their real stack/metrics and links per the proposal, staying at `MAX_TOPOLOGY_NODES = 5` (CR2)

**Given** any panel of the rendered app
**When** audited for placeholder strings (`example.com`, `Example Corp`, `your-handle`, etc.)
**Then** zero placeholders remain anywhere in the UI (CR5)

**Given** the app boots after the data swap
**When** hydration completes
**Then** no component or logic code changes were required — validating AD-3/AD-11's content-driven seam
