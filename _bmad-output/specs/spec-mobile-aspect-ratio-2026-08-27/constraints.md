---
name: 'Mobile Aspect Ratio Support — Constraints & Technical Decisions'
type: companion
purpose: constraints
altitude: epic
spec: spec-mobile-aspect-ratio-2026-08-27
status: draft
created: 2026-08-27
updated: 2026-08-27
---

# Constraints & Technical Decisions — Mobile Aspect Ratio Support

## Hard Constraints (Invariants)

### CON-1: Design Token System Integrity
**Rule:** All responsive values MUST be defined as CSS custom properties in `src/styles.css` design token section.
**Rationale:** Maintains single source of truth for theming; enables design-token-driven architecture (AD-6); allows future theme variants.
**Enforcement:** Code review checks for hardcoded pixel values in component CSS; lint rule for `px` units outside token definitions.

### CON-2: No Framework Dependencies
**Rule:** Implementation must use hand-rolled CSS only — no Tailwind, no component libraries, no JavaScript-based responsive libraries.
**Rationale:** Architecture invariant (AD-6); keeps bundle size minimal; avoids vendor lock-in; team expertise in CSS.
**Enforcement:** `package.json` dependency audit; no `@import` from UI libraries in CSS.

### CON-3: Angular v22 Idiom Compliance
**Rule:** All components must remain standalone, OnPush, signals-first, using built-in control flow (`@if/@for`).
**Rationale:** Architecture invariant (AD-8); ensures consistency with existing codebase; performance via OnPush.
**Enforcement:** TypeScript strict mode; Angular compiler checks; component template linting.

### CON-4: Single Signals Store Architecture
**Rule:** Any layout-related state shared across components must live in `ClusterStateService` as signals. Component-local layout state allowed only for purely presentational concerns.
**Rationale:** Architecture invariant (AD-1); prevents state divergence; enables debugging via store inspection.
**Enforcement:** Architecture review; no `BehaviorSubject` or component `@Input` for shared layout state.

### CON-5: GitHub Pages Deployment Compatibility
**Rule:** All asset references must remain base-href-safe. No changes to build configuration or deployment pipeline.
**Rationale:** Architecture invariant (AD-7); deployment pipeline is stable and tested.
**Enforcement:** Build verification; deployment smoke test on Pages.

### CON-6: Accessibility (WCAG 2.1 AA)
**Rule:** All new interactive patterns must maintain keyboard navigation, focus visible states, reduced motion support, and forced-colors support.
**Rationale:** Legal/compliance requirement; inclusive design; existing codebase already compliant.
**Enforcement:** axe-core automated tests; manual keyboard testing; forced-colors media query testing.

### CON-7: Performance Budget
**Rule:** Page load under 1.5s on mobile (NFR1). No additional JavaScript bundles. CSS additions must be minimal and leverage browser-native responsive features.
**Rationale:** User experience; SEO; conversion; existing NFR.
**Enforcement:** Lighthouse CI in GitHub Actions; bundle size monitoring.

## Technical Decisions

### TD-1: CSS Container Queries Over Media Queries for Components
**Decision:** Use `@container` queries on `.main-content` for component-level responsiveness instead of viewport media queries.
**Reasoning:** 
- Components adapt to their actual container size, not viewport
- Works correctly in multi-panel layouts (future)
- Aligns with modern CSS best practices
- Reduces breakpoint duplication

**Implementation:**
```css
/* In app.css - define container */
.main-content {
  container-name: dashboard;
  container-type: inline-size;
}

/* In component CSS */
@container dashboard (max-width: 480px) {
  .component-element { /* mobile styles */ }
}
```

**Fallback:** For browsers without container query support (none in modern targets), media query fallback in global styles.

### TD-2: Dynamic Viewport Units (dvh) for Fixed Elements
**Decision:** Use `dvh` (dynamic viewport height) for terminal console and footer positioning.
**Reasoning:**
- Handles browser UI chrome (address bar, tab bar) appearing/disappearing on scroll
- Native browser support in all target browsers (Chrome 108+, Safari 15.4+, Firefox 101+)
- No JavaScript polyfill needed

**Implementation:**
```css
.terminal-console {
  height: var(--terminal-height-mobile-portrait); /* uses dvh in token */
  /* Token: --terminal-height-mobile-portrait: clamp(120px, 35dvh, 200px); */
}

.main-content {
  padding-bottom: calc(var(--terminal-height) + var(--footer-height));
}
```

### TD-3: Bottom Sheet Pattern for Mobile Panels
**Decision:** Use CSS-only bottom sheets (slide-up panels) for mobile detail views (topology detail, career pod detail, Swagger response).
**Reasoning:**
- Native feel on mobile
- No JavaScript state management needed (CSS `:target` or checkbox hack)
- Accessible with proper focus trapping
- Works with Angular's OnPush (no layout state in store)

**Implementation Options:**
1. **CSS `:target` + anchor positioning** (modern, clean)
2. **Checkbox hack** (broader support, slightly more markup)
3. **Angular CDK Overlay** (adds dependency, violates CON-2)

**Chosen:** CSS `:target` with anchor positioning (progressive enhancement). Fallback to inline display for non-supporting browsers.

### TD-4: Touch Target Enlargement via Pseudo-Elements
**Decision:** Enlarge touch targets using `::before` pseudo-elements with negative margins rather than increasing visual button size.
**Reasoning:**
- Preserves visual design density
- Meets 48×48dp requirement without visual bloat
- Standard accessibility technique

**Implementation:**
```css
.touch-target-enlarge::before {
  content: '';
  position: absolute;
  inset: -8px; /* Expands 40px button to 56×56 touch area */
}
```

### TD-5: Orientation Media Queries Over JavaScript Detection
**Decision:** Use `@media (orientation: portrait/landscape)` for orientation-specific styles.
**Reasoning:**
- Native, performant, no JS listeners
- Works with container queries
- Reactive to actual device orientation

**Note:** Combine with width queries for precise control:
```css
@media (orientation: landscape) and (max-height: 500px) {
  /* Landscape mobile styles */
}
```

### TD-6: Safe-Area Insets via CSS Environment Variables
**Decision:** Use `env(safe-area-inset-*)` directly in CSS custom properties.
**Reasoning:**
- Native browser support
- No JavaScript needed
- Updates automatically on orientation change / keyboard appearance

**Implementation:**
```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}

:host {
  padding-top: var(--safe-top);
  padding-bottom: calc(var(--terminal-height) + var(--footer-height) + var(--safe-bottom));
  padding-left: var(--safe-left);
  padding-right: var(--safe-right);
}
```

### TD-7: Fluid Typography with clamp()
**Decision:** Extend typography tokens with `clamp(min, preferred, max)` values using viewport-relative units for preferred.
**Reasoning:**
- Smooth scaling between breakpoints
- Reduces number of breakpoint-specific overrides
- Maintains readability at extremes
- Native browser calculation

**Implementation:** New token set alongside existing fixed tokens; components opt-in via `@media` or container queries.

### TD-8: Topology Map Pan/Zoom via Native Touch
**Decision:** Enable native touch pan/zoom on SVG container via `touch-action: pan-x pan-y pinch-zoom`.
**Reasoning:**
- Zero JavaScript
- Smooth, native performance
- User expectation on mobile
- Works with existing SVG structure

**Implementation:**
```css
.topology-svg-container {
  touch-action: pan-x pan-y pinch-zoom;
  overflow: auto; /* Enables scroll as fallback */
}
```

## Cross-Cutting Concerns

### Browser Support Matrix
| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| `dvh` units | 108+ | 15.4+ | 101+ | 108+ |
| Container Queries | 105+ | 16+ | 110+ | 105+ |
| `env(safe-area-inset-*)` | 76+ | 11+ | 69+ | 79+ |
| `touch-action` | 55+ | 13+ | 59+ | 79+ |
| `clamp()` | 79+ | 13.1+ | 75+ | 79+ |

**Target:** All supported versions are ≥ 2 years old — safe for production.

### Testing Strategy
1. **Automated:** Lighthouse CI in GitHub Actions (mobile preset)
2. **Visual Regression:** Storybook + Chromatic (if adopted) or manual screenshot comparison
3. **Device Testing:** Chrome DevTools device toolbar for iPhone SE, iPhone 15 Pro, Galaxy S24, iPad Mini
4. **Orientation Testing:** Manual rotate in DevTools + real device spot-check
5. **Accessibility:** axe-core + manual keyboard + screen reader (VoiceOver/TalkBack)

### Migration Path
1. **Phase 1:** Tokens + viewport + safe areas (foundation)
2. **Phase 2:** Layout adaptations per component (app shell, panels)
3. **Phase 3:** Touch targets + terminal/footer adaptation
4. **Phase 4:** Feature-specific mobile UX (topology, pods, env, swagger)
5. **Phase 5:** Polish, testing, accessibility audit

Each phase delivers incremental value and can be validated independently.