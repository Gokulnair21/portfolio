# Epic 3 Context: Cluster Exploration Panels

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic delivers the three exploration panels where recruiters actually browse Gokul's work: an interactive service topology map presenting projects as a microservices dependency graph with clickable node inspection, a searchable `/actuator/env`-styled property table encoding skills and infrastructure knowledge as key/value pairs, and career history rendered as Kubernetes-style replica pods with a detail card. It also makes the topology react visually to the outage simulation (payment→database link and node borders turn red), keeping failure visuals consistent across the whole dashboard.

## Stories

- Story 3.1: Service Topology Map & Node Inspection
- Story 3.2: Topology Outage Degradation
- Story 3.3: Env Property Search & Career Replica Pods

## Requirements & Constraints

- The topology must render exactly five service nodes (`api-gateway`, `auth-service`, `payment-service`, `notify-service`, `postgresql-db`) connected by links.
- Clicking a topology node highlights it and opens a detail panel showing Description, Core Tech Stack, and Metrics for that node.
- During an active outage, the `payment-service` ↔ `postgresql-db` link and both node borders render degraded red; when `payment-service` details are open during an outage, its metrics show a 100% error rate.
- All node/link content (descriptions, tech stacks, metrics, env properties) comes from the JSON catalog — no hardcoded portfolio data in components; content changes require no code changes.
- The env table filters rows in real time as the user types, matching either property key or value (e.g. key `gokul.skills.languages` or value `Java 17`).
- Career history renders as running-pod styled replicas named after the real entries (e.g. `pod-experience-senior-neosoft-0`); clicking a pod updates the detail card with timeline, role description, and bulleted responsibilities.
- Page load stays under 1.5 seconds on mobile and desktop; keep asset footprint low (hand-authored SVG, no graph libraries).

## Technical Decisions

- Topology is hand-authored inline SVG in the Angular template; node/edge states (highlighted, degraded-red) are class/style bindings driven by store state. No D3/Cytoscape or any graph library.
- All shared state (selected node, selected pod, outage status) lives in `ClusterStateService` as Angular signals; components read via `computed()` selectors and mutate only through store methods. No component-local duplicates of shared state; degraded visuals derive from computed selectors so they restore automatically on recovery.
- Components never fetch content themselves — all panel content arrives hydrated from `public/portfolio-data.json` via the store, validated against typed interfaces in `src/app/core/data`.
- Styling uses design tokens only (status palette: up green / degraded red / info blue, monospace stack, spacing) defined as CSS custom properties; SVG stroke/fill attributes included. Hand-rolled CSS — no Tailwind or component library.
- Angular v22 idiom baseline: standalone components, signals-first, OnPush, built-in control flow (`@if/@for`), strict TypeScript. No router — panels appear under signal-driven tabs.
- Mock metrics are plain numbers/strings from the JSON catalog; dates are ISO `yyyy-MM-dd`.
- Relevant feature folders per the structural seed: `features/topology/`, `features/env-registry/`, `features/career-pods/`.

## UX & Interaction Patterns

- Node click → highlight + detail panel opens alongside the graph; selection lives in the store so it survives tab switches within the session pattern used app-wide.
- Env search: single filter input; filtering is instant (no submit button), case-insensitive substring match across both key and value columns.
- Pod list → click pod card → replica detail card updates; exactly one pod selected at a time.
- Outage degradation must be purely visual/state-driven: red links/borders appear automatically while the outage is active and revert without user action once recovery completes.

## Cross-Story Dependencies

- Story 3.2 depends on the outage state established by Epic 2 (`SimulationEngine` driving UP → DEGRADED → HALF-OPEN → UP through `ClusterStateService`); it consumes that state but must not write it — components never mutate outage status directly.
- Stories depend on Epic 1 foundations: design tokens, `ClusterStateService` signals store, tab navigation, and JSON content hydration (`PortfolioDataLoader`) providing topology node data, env properties, and career pod entries.
- Story 3.1's topology structure is a prerequisite for Story 3.2's degraded-link rendering.
