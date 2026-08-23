---
title: 'Redesign UI to Match design.html Mockups'
type: 'feature'
created: '2026-08-23'
status: 'done'
review_loop_iteration: 1
baseline_commit: '38fa618ed99b34e43fe0a99b02e6637d7f6a77a8'
context:
  - '{project-root}/design.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Angular portfolio UI is functional but does not visually match the approved mockups in `design.html` (Material-3 dark terminal theme: green primary on dark surfaces, JetBrains Mono/Inter typography, Material Symbols icons).

**Approach:** Port the `design.html` token system into the app's plain-CSS custom properties and restyle the app shell plus every feature component to mirror its corresponding mockup section, preserving all existing behavior, data bindings, signal/state logic, and component APIs.

## Boundaries & Constraints

**Always:**
- Preserve every existing class name asserted by `*.spec.ts` tests (see Code Map); update a spec file only when structural change makes an assertion impossible.
- Bind all displayed text/values to existing `ClusterStateService` / `portfolio-data.json` data exactly as today; restyling changes presentation only.
- Use CSS custom properties derived from the `design.html` Tailwind config tokens (lines 18–110); keep the plain-CSS approach — no Tailwind runtime.
- Load Inter, JetBrains Mono, and Material Symbols Outlined via Google Fonts in `index.html` with `font-display: swap` and local `@font-face` fallbacks for all three families.
- **Accessibility (WCAG 2.1 AA):** Every new animation has `@media (prefers-reduced-motion: reduce)` guard disabling it; every focusable element has visible focus in `@media (forced-colors: active)` (CanvasText outline); all icon fonts have text fallbacks (CSS `::before` content or SVG alternative); new tab bar implements full ARIA tab pattern (role=tablist, arrow keys, home/end, aria-disabled mirroring); all `[disabled]` bindings mirrored with `[attr.aria-disabled]`.
- **Cross-browser:** Scrollbar styling includes Firefox `scrollbar-color`/`scrollbar-width` with `@supports`; SVG diagrams use responsive `viewBox` + `preserveAspectRatio` + aspect-ratio container; no hardcoded colors in CSS — all via CSS variables.
- **CSS variable hygiene:** Every new `var(--token)` used in components has a fallback `var(--token, #fallback)`; legacy aliases reference only new tokens, never vice versa; no circular references.
- **Responsive robustness:** Truncation uses `max-width: min(<fixed>, 100%)` or container queries; flex/grid parents of ellipsis items have `min-width: 0`; no `nth-child` for semantic styling — use data attributes or per-type CSS variables.
- **Binding safety:** All signal bindings in templates use optional chaining / nullish coalescing (`?.`, `??`) for null/undefined safety; mutually exclusive class bindings include a default fallback class.
- **Test coverage:** Every new class binding (`[class.*]`, `[ngClass]`) added by the redesign is asserted by at least one test in the corresponding `*.spec.ts`.
- **Debounce:** Filter/search inputs use `debounceTime(300)` or equivalent.
- **Z-index scale:** Define `--z-header`, `--z-modal`, `--z-tooltip` tokens and use consistently; header ≤ modal ≤ tooltip.
- **Buttons:** All `<button>` elements explicit `type="button"` unless inside a `<form>` intending submit.

**Ask First:** Any case where matching the mockup seems to require new data, new API calls, or removing an existing user capability.

**Never:** No changes to `core/simulation/*`, `core/data/portfolio-data*`, `core/state/cluster-state.service.ts`, `delivery/**`, routing/tab semantics, or the simulation/outage/recovery behaviors. No light mode. Do not invent content that is not already available from the data layer (mockup copy like "Chaos Engineering" descriptions may be used verbatim as static labels).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Outage active | Simulation engine reports degraded/down | Restyled panels show error tokens (`--error`, `--error-container`) mirroring mockup degraded states | N/A |
| No selection | Tab loaded, no pod/node selected | Placeholder/empty states restyled (`detail-placeholder`, `console-empty`) | N/A |
| Data load failure | `dataStatus()` failed | Existing failure panel + retry button, restyled with error tokens | N/A |

</frozen-after-approval>

## Code Map

Design reference — `design.html` sections (Tailwind config = token source at lines 18–110):
- Career Pods: lines 144–335 (sidebar pod list, `$ kubectl describe pod` header, bento detail grid, achievements log, tech chips, liveness bars)
- Health Dashboard: lines 337–686 (3 overview stat cards, bio/JVM profile card, throughput chart mockup, Chaos Engineering controls, footer console)
- Env Registry: lines 1214–1368 (Property Registry title + filter, profiles badge bar, grid key/value table)
- Topology: lines 1369–1757 (schematic-grid canvas, HTML node cards, dashed animated SVG connections, slide-in detail sidebar)
- Shared: TopNavBar (146–167), footer status strip (325–334 / 1746–1756), scrollbar styles (111–126)

Implementation targets:
- `src/index.html` -- add font/icon `<link>`s
- `src/styles.css` -- replace token block: M3 palette (`--primary #a2ffaa`, `--secondary #adc6ff`, `--error #ffb4ab`, surface ladder `#0a0e14→#31353c`, `--outline #849582`, `--outline-variant #3b4b3b`, text `#dfe2eb`/`#bacbb7`), type scale (label-mono-sm 10px … display-lg 32px), radius scale, spacing scale, scrollbar styles
- `src/app/app.css` + `app.html` -- shell: top nav (terminal glyph + bold mono title + tab links, active = primary text + 2px bottom border), main area, bottom status/footer strip
- `src/app/features/health-dashboard.*` -- stat cards grid, profile card, chaos-controls column; keep `.probe-*`, `.outage-button`, `.recovery-button`, `.fallback-banner`
- `src/app/features/career-pods.*` -- sidebar list layout (`.pod-card` becomes sidebar item w/ left accent border) + bento detail canvas; keep `.pod-name/-status`, `.timeline-*`, `.detail-role/-company`, `.highlight-item`
- `src/app/features/topology.*` -- schematic-grid canvas + node cards + slide-in sidebar detail; keep `.topo-node/.node-label/.node-selected/.node-degraded/.link-degraded`, `.metric-row/-label/-value`, `.tech-item`
- `src/app/features/env-registry.*` -- registry header/filter/profiles/table per mockup; keep `.filter-input`, `.property-row`, `.registry-endpoint`, `.registry-empty`
- `src/app/features/swagger-playground.*` -- no dedicated mockup: apply shared tokens/patterns (mono labels, bordered cards, ghost/primary buttons per Chaos buttons styling); keep all tested classes
- `src/app/features/terminal-console.*` -- restyle as footer-style log strip/panel per mockup console; keep `.log-row`, `.log-level-*`, `.console-count`
- Fragile tests asserting DOM/classes: `src/app/*.spec.ts` + each feature `*.spec.ts` -- update only if forced by restructuring

## Tasks & Acceptance

**Execution:**
- [x] `src/index.html` -- add Google Fonts links (Inter, JetBrains Mono, Material Symbols Outlined) with font-display: swap and local @font-face fallbacks -- enables icon glyphs and typography with offline resilience
- [x] `src/styles.css` -- replace token definitions with design.html palette/type/radius/spacing values + webkit/Firefox scrollbar styles; add z-index scale tokens; ensure all new vars have fallbacks; no circular aliases -- single source of theme truth
- [x] `src/app/app.css`, `src/app/app.html` -- rebuild shell chrome as TopNavBar + content area + footer status strip; restyle tabs/status badge/failure panel; implement full ARIA tab pattern (role=tablist, arrow keys, home/end, aria-disabled mirroring); z-index tokens -- matches shared mockup frame
- [x] `src/app/features/health-dashboard/health-dashboard.html|css` -- restyle to stat-card grid + controls column layout, same bindings; add reduced-motion guards on chip-pulse, link-flow; forced-colors focus fallbacks; nth-child replaced with data attributes; test coverage for chip-* and bars-* classes -- mockup 337–686
- [x] `src/app/features/career-pods/career-pods.html|css` -- restyle to sidebar + bento canvas layout, same bindings; reduced-motion guards on dot-pulse; truncation with max-width: min(); forced-colors focus; test coverage for new classes -- mockup 144–335
- [x] `src/app/features/topology/service-topology.html|css` (+ `.ts` template refs if needed) -- restyle to grid canvas + node cards + slide-in sidebar; responsive SVG viewBox + preserveAspectRatio + aspect-ratio container; schematic-grid uses var(--outline-variant); reduced-motion on link-flow; forced-colors focus -- mockup 1524–1757
- [x] `src/app/features/env-registry/env-registry.html|css` -- restyle to registry header/filter/profiles/table per mockup (profiles badge bar as static mockup copy per human decision); filter input with debounceTime(300); forced-colors focus; Firefox scrollbar; test coverage for new elements -- mockup 1275–1356
- [x] `src/app/features/swagger-playground/swagger-playground.html|css` -- apply shared token styling to existing layout; add type="button" on buttons; reduced-motion on execute-button shadow; forced-colors focus on request-editor; test coverage -- consistency, no mockup
- [x] `src/app/features/terminal-console/terminal-console.html|css` -- restyle log rows/colors to console aesthetic; reduced-motion on log-entry for all variants; blinking-cursor text fallback; forced-colors focus -- mockup footer console
- [x] `*.spec.ts` files -- extend suites to assert every new class binding added by redesign; patch only assertions broken by required structural change -- keep suite green

**Acceptance Criteria:**
- Given the app is served, when any tab is opened, then the screen presents the design.html theme (dark surface ladder, green primary accents, JetBrains Mono headings/labels, Material Symbols icons) without altering displayed data values.
- Given the full test suite runs, when `npm test` completes, then all specs pass (original or minimally updated assertions).
- Given an outage is simulated, when panels render degraded state, then error tokens from the mockup palette are used and behavior is unchanged.
- Given `npm run build`, when it completes, then production build succeeds with no new dependencies beyond none (no Tailwind/font npm packages).

## Spec Change Log

- **Review loop 1 (2026-08-23):** 22 bad_spec findings from adversarial review (verification-gap + edge-case-hunter + blind-hunter). Root cause: original spec did not mandate accessibility (reduced-motion, forced-colors, ARIA), cross-browser support, CSS variable hygiene, test coverage for new bindings, responsive layout robustness, or binding safety — all required for a "Ready for Development" spec.
- **Amended:** Boundaries & Constraints → Always section expanded with 12 new invariant rules covering font fallbacks, WCAG AA guards, Firefox scrollbars, SVG responsiveness, CSS var fallbacks/no-circular-refs, truncation safety, nth-child avoidance, null-safe bindings, default class fallbacks, mandatory test coverage for new bindings, debounce, z-index scale, explicit button types.
- **Known-bad state avoided:** Shipping redesign with unverified Google Fonts CDN, missing reduced-motion guards on 7 animations, invisible focus in high-contrast mode, broken Firefox scrollbars, clipped topology SVG, circular CSS vars, brittle nth-child hover colors, unguarded null signals, missing ARIA tab pattern — all would pass 147 tests but fail real users.
- **KEEP instructions (preserve in re-derivation):** visual fidelity to design.html mockups (token palette, type scale, component layouts); all existing test-asserted class names preserved; zero spec edits needed in first pass; token system in styles.css as single source of truth; env-registry profiles badge as static mockup copy (human-approved); angular.json budget bump accepted.

## Design Notes

Token mapping example (old → new): `--bg-base #0b0f14` → `--background #10141a`; `--status-up #22c55e` → primary-family `#a2ffaa`; `--text-muted #768390` → `--outline #849582` / `--on-surface-variant #bacbb7`. Status colors map: up→primary, info→secondary, degraded/warn→error, down→error-container. Active-tab pattern: `color: var(--primary); border-bottom: 2px solid var(--primary)`.

## Verification

**Commands:**
- `npm test` -- expected: all unit suites pass
- `npm run build` -- expected: production build succeeds

**Manual checks (if no CLI):**
- Serve app (`npm start`), click through Dashboard/Topology/Environment/Replica Pods/Swagger tabs: verify theme consistency, icon rendering, hover states, and that simulated outage/recovery still visibly drives colors and logs.

## Suggested Review Order

**Theme & Token System**

- Single source of truth: M3 dark palette, type/radius/spacing scales, z-index tokens, reduced-motion/forced-colors guards, Firefox scrollbars, CSS var fallbacks
  [`src/styles.css`](../../src/styles.css)

- Font loading with offline resilience: Google Fonts preconnect + `font-display: swap` + local `@font-face` fallbacks for Inter, JetBrains Mono, Material Symbols
  [`src/index.html:1`](../../src/index.html#L1)

**App Shell & Navigation (ARIA tab pattern, keyboard nav, focus management)**

- TopNavBar structure: terminal glyph, mono title, tab links with active underline, settings/terminal icons
  [`src/app/app.html:1`](../../src/app/app.html#L1)

- Shell CSS: header, tab bar (ARIA roles, arrow/Home/End keys, aria-disabled), main area, fixed footer strip with log count
  [`src/app/app.css:1`](../../src/app/app.css#L1)

- App component: keyboard navigation handler (`@HostListener`), tab focus management, status badge logic
  [`src/app/app.ts:1`](../../src/app/app.ts#L1)

**Health Dashboard (stat cards, bio/profile, chaos controls, new test coverage)**

- Layout: 3 stat cards (Liveness/Brokers/Error) with chip pulse, bio/profile card, throughput SVG chart, Chaos Engineering controls column
  [`src/app/features/health-dashboard/health-dashboard.html:1`](../../src/app/features/health-dashboard/health-dashboard.html#L1)

- Styling: data-attribute hover borders (no nth-child), reduced-motion guards on chip/link-flow, forced-colors focus, status-chip defaults
  [`src/app/features/health-dashboard/health-dashboard.css:1`](../../src/app/features/health-dashboard/health-dashboard.css#L1)

- Tests: asserts chip-up/half-open/degraded, bars-degraded, outage/recovery button aria-disabled, stat-card data attributes
  [`src/app/features/health-dashboard/health-dashboard.spec.ts:1`](../../src/app/features/health-dashboard/health-dashboard.spec.ts#L1)

**Career Pods (sidebar list + bento detail canvas, achievements log)**

- Sidebar pod items with left accent border/pulse dot; bento grid with core info, achievements log (`::before` INFO/DEBUG chips), tech chips, liveness bars
  [`src/app/features/career-pods/career-pods.html:1`](../../src/app/features/career-pods/career-pods.html#L1)

- Responsive truncation, reduced-motion on dot-pulse, forced-colors focus, watermark icon via `::after`
  [`src/app/features/career-pods/career-pods.css:1`](../../src/app/features/career-pods/career-pods.css#L1)

- Tests: sidebar selection, detail canvas bindings, tech chips, liveness bars
  [`src/app/features/career-pods/career-pods.spec.ts:1`](../../src/app/features/career-pods/career-pods.spec.ts#L1)

**Topology (schematic grid, node cards, animated SVG, slide-in sidebar)**

- Canvas: schematic-grid background (CSS var), responsive SVG viewBox/preserveAspectRatio, positioned node cards with status icons, animated dashed flow links
  [`src/app/features/topology/service-topology.html:1`](../../src/app/features/topology/service-topology.html#L1)

- Slide-in detail sidebar with metrics grid; reduced-motion on link-flow; forced-colors focus; no hardcoded colors
  [`src/app/features/topology/service-topology.css:1`](../../src/app/features/topology/service-topology.css#L1)

- Component: node click handler, sidebar state, SVG path generation, metric data binding
  [`src/app/features/topology/service-topology.ts:1`](../../src/app/features/topology/service-topology.ts#L1)

**Env Registry (header/filter/profiles/table, debounced input)**

- Header with Property Registry title, search-icon filter input (debounce 300ms), static profiles badge bar, grid key/value table
  [`src/app/features/env-registry/env-registry.html:1`](../../src/app/features/env-registry/env-registry.html#L1)

- Firefox scrollbar support, forced-colors focus on filter, responsive table truncation
  [`src/app/features/env-registry/env-registry.css:1`](../../src/app/features/env-registry/env-registry.css#L1)

**Terminal Console (footer-style log strip, prompt, level colors)**

- `$` idle prompt, INFO→primary / WARN+ERROR→error, DEBUG muted, fade-in animation, blinking cursor text fallback
  [`src/app/features/terminal-console/terminal-console.html:1`](../../src/app/features/terminal-console/terminal-console.html#L1)

- Reduced-motion on all log-entry variants, forced-colors focus, console-empty prompt fallback
  [`src/app/features/terminal-console/terminal-console.css:1`](../../src/app/features/terminal-console/terminal-console.css#L1)

**Swagger Playground (shared token styling only)**

- Primary method chip, ghost try button, solid execute button, error banners, dark editor/viewer surfaces
  [`src/app/features/swagger-playground/swagger-playground.css:1`](../../src/app/features/swagger-playground/swagger-playground.css#L1)

- type="button" on buttons, reduced-motion on execute shadow, forced-colors focus on editor
  [`src/app/features/swagger-playground/swagger-playground.html:1`](../../src/app/features/swagger-playground/swagger-playground.html#L1)

**Config & Peripherals**

- Component style budget raised to 16kB warn / 32kB error for redesigned CSS
  [`angular.json:1`](../../angular.json#L1)

- Deferred work logged: ARIA live regions, loading skeletons, error boundaries, RTL, print, animation perf, theming, container queries, token docs, font bundle
  [`_bmad-output/implementation-artifacts/deferred-work.md:1`](../../deferred-work.md#L1)
