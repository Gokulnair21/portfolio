# Epic 1 Context: Dashboard Foundation & Live System Health

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Deliver the working skeleton of the Actuator-themed portfolio: an Angular v22 app scaffolded with the project's idiom baseline and design-token stylesheet, a shell with signal-driven tab navigation between panels, runtime hydration of all portfolio content from a static JSON file, and the Health Dashboard panel showing default live probe statuses. After this epic the site functions as a real portfolio homepage — themed correctly, navigable without page reloads, and content-editable via JSON only — setting the structural foundation that every later epic builds panels on top of.

## Stories

- Story 1.1: Project Scaffold & Actuator Theme Shell
- Story 1.2: Signals Store & Tab Panel Navigation
- Story 1.3: Runtime JSON Content Hydration
- Story 1.4: Live System Health Probes Display

## Requirements & Constraints

- Default health metrics must display exactly: "Liveness Probe" = `UP` (green), "Active Broker Connections" = `2 / 2` (blue), "Error Rate" = `0.00%` (green). These values later transition to red/degraded states during outages (Epic 2), so they must be store-driven, not hardcoded in components.
- All portfolio content (projects, experience, contact details, env properties) loads at runtime from `public/portfolio-data.json`; changing content requires no HTML or JS changes.
- On JSON fetch or parse failure, render a themed "SERVICE UNAVAILABLE" panel with a retry action — never a blank page or console-only error.
- Page load under 1.5 seconds on mobile and desktop; keep asset footprint low.
- Static single-page application only: no backend server, no real Kafka/database, no auth, no multiple HTML pages.
- Unit tests run via `ng test` (Vitest); this epic's tests cover tab selection transitions and initial health state matching the defaults above.

## Technical Decisions

- **Stack:** Angular ^22.1 (CLI + core) with @angular/build (esbuild) builder, TypeScript ~6.0, Node ^22||^24||^26.
- **Idiom baseline:** standalone components, signals-first, OnPush change detection, built-in control flow (`@if/@for`), strict TypeScript. No NgModules, no Angular Router import anywhere in the app.
- **Single signals store:** all shared state lives in `ClusterStateService` as signals; components read via `computed()` selectors and mutate only through store methods. No NgRx/RxJS stores, no component-local duplicates of shared state.
- **No router:** tabs are a `selectedTab` signal in the store; deep links are a non-goal. Tab switching causes no page reload or URL change.
- **Content hydration seam:** `PortfolioDataLoader` fetches `public/portfolio-data.json` once at bootstrap via HttpClient and validates it against TypeScript interfaces in `src/app/core/data`. Components render typed shapes only and never fetch content themselves.
- **Design tokens:** status palette (up green, degraded red, info blue), monospace font stack, and spacing scale are CSS custom properties defined in one global stylesheet. Components reference tokens only — no raw color/spacing values anywhere, including SVG stroke/fill attributes. Hand-rolled CSS only: no Tailwind, no component library.
- **Typed code-owned contracts:** content interfaces (`LogEntry`, portfolio shapes) live canonically in `src/app/core/data`.
- **Relevant structural seed locations:** `src/app/core/state/` (store), `src/app/core/data/` (loader + interfaces), `src/app/features/health-dashboard/`, `src/app/app.component.*` (shell + tabs).

## UX & Interaction Patterns

- The overall visual identity is a Spring Boot Actuator / enterprise microservices dashboard — recruiters should immediately recognize backend expertise. Themed header plus panel area in the shell.
- Tab navigation: shell renders tab buttons from typed config; clicking a tab shows its panel and hides all others, with no reload.
- Status color vocabulary is semantic: green = up/healthy, blue = informational metrics, red = degraded (used by later epics' outage visuals).
- Failure state UX: the "SERVICE UNAVAILABLE" panel must match the theme, not look like a generic error.

## Cross-Story Dependencies

- Story 1.1 (scaffold, tokens, shell) is the base for everything else; 1.2 depends on it for the shell and token styles; 1.4's health display reads through the store created in 1.2.
- Story 1.3's hydrated content enters the store from 1.2; Story 1.4 seeds health values from JSON config via store computed selectors.
- Downstream: Epics 2–4 add panels that plug into this shell's tab mechanism and read/write the same store; the health metrics built here become reactive to outage simulation in Epic 2.
