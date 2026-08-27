# Epic 6 Context: Mobile Aspect Ratio Support

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Make the Actuator portfolio fully usable across mobile aspect ratios (19:9 to 4:3) and both orientations — handling viewport-fit, safe-area insets, orientation-aware layouts, dvh-based terminal/footer, touch targets ≥48px, fluid typography, and bottom-sheet detail patterns. Validates NFR1 (1.5s mobile load) and AD-6. This epic contains no new business logic or content changes, only responsive layout and interaction adaptations built with hand-rolled CSS.

## Stories

- Story 6.1: Viewport, Safe-Area & Design Token Foundation
- Story 6.2: App Shell Responsive — Header, Tabs, Main Layout & Orientation
- Story 6.3: Adaptive Terminal Console & Footer
- Story 6.4: Feature Panels Mobile UX — Topology, Career Pods, Env Registry
- Story 6.5: Swagger Playground Mobile Form
- Story 6.6: Touch Targets, Fluid Typography & Accessibility Audit

## Requirements & Constraints

- **Viewport and safe areas:** width=device-width, initial-scale=1, viewport-fit=cover with user-scalable=yes and maximum-scale=5; content must respect env(safe-area-inset-*) on notched devices and avoid horizontal scroll at 320, 375, 393, 430, 768 widths including notch simulation.
- **Orientation awareness:** portrait stacks vertically with full-width touch targets; landscape efficiently uses horizontal space; transitions preserve tab state with CLS <0.1 and no overlap or unreadable content.
- **Touch targets:** every interactive element ≥48×48px on mobile (56px comfortable), ≥8px spacing between adjacent targets, accessible via bottom sheet or hamburger menu where tabs collapse.
- **Terminal and footer:** terminal height scales with viewport using dvh units (clamp 120px,35dvh,200px portrait; clamp 100px,25dvh,150px landscape; 120px desktop); footer 56px mobile; main-content padding-bottom calculated from terminal + footer + safe-bottom so no content hides behind fixed elements.
- **Fluid typography and spacing:** clamp()-based fluid tokens for text and spacing, container queries on main-content, code/monospace remains ≥11px and wraps or scrolls without page overflow.
- **Topology mobile adaptation:** SVG viewBox with preserveAspectRatio, container max-height 60vh, touch-action pan/pinch-zoom for native gestures, 56×56 invisible node hit-areas, degraded link and node borders ≥3px.
- **Consistent bottom-sheet pattern:** detail panels for topology, career pods replica detail, and env registry details open as bottom sheets (max 60vh, drag handle, role dialog, focus-trapped, ESC/backdrop/swipe-down dismiss) rather than side panels on mobile.
- **Env registry adaptation:** below 480px use card layout with key/value stacking and 48px search input; 480–767px use table with overflow-x auto, sticky key column and sticky header.
- **Swagger mobile form:** JSON editor full-width min-height 200px, font-size ≥16px to avoid iOS zoom, overflow-x auto, Execute button full-width 56px sticky above keyboard via dvh, response in scrollable modal/bottom sheet 90vw max with 48×48 Copy button.
- **Accessibility gates:** reduced-motion disables animations, forced-colors uses 2px solid CanvasText outlines and currentColor strokes, 200% zoom reflows without horizontal scroll, 400% shows no overflow, Lighthouse mobile preset at 393×852 must hit Performance ≥90, Accessibility 100, Best Practices ≥90.

## Technical Decisions

- All new responsive values defined as CSS custom properties in src/styles.css design token section — never raw values in component styles; extend existing token structure not replace it; hand-rolled CSS only, no Tailwind or component libraries, no JS resize listeners.
- Layout uses container queries (main-content container-name dashboard) and orientation media queries (orientation landscape with max-height 500px); Angular v22 idiom preserved: standalone, OnPush, signals-first, built-in control flow, strict TypeScript.
- Shared layout state lives in ClusterStateService as signals if cross-component, otherwise component-local purely presentational state is allowed; tabs remain selectedTab signal in store, no router added.
- GitHub Pages deployment compatibility: all asset references remain base-href-safe, no build config changes, no additional JS bundles, CSS additions minimal leveraging browser-native features.
- Performance budget: page load under 1.5s on mobile, no new JS bundle, only token CSS additions.

## UX & Interaction Patterns

- Mobile navigation: below 768px top-nav tabs hidden, 48×48 hamburger opens bottom sheet with full-width 56px tab buttons at 12px spacing; selecting a tab dismisses sheet and switches panels via existing selectedTab signal; landscape tabs may use horizontal scroll with gradient fade or remain in sheet.
- Bottom sheet interaction: max 60vh, drag handle at top, backdrop tap and ESC and swipe-down dismiss, focus trapped inside, aria-modal true, animates only when prefers-reduced-motion allows.
- Terminal and footer remain fixed but adapt height via CSS vars; log cap reduces from 200 to 100 entries on mobile for performance while preserving auto-scroll.
- Topology interaction: native pan-x pan-y pinch-zoom via touch-action CSS, no JS graph library; node selection opens bottom sheet detail.

## Cross-Story Dependencies

- Story 6.1 is the foundation — all later stories depend on viewport meta and token correctness and must be demo-verifiable via DevTools before proceeding.
- Story 6.2 blocks all panel testing because shell owns navigation and layout container; orientation logic centralizes here.
- Story 6.3 isolates fixed-element overlap before feature panels to ensure content never hides behind terminal/footer.
- Stories 6.4 and 6.5 depend on 6.2 and 6.3 for layout and fixed-element spacing; they share the same bottom-sheet pattern and should reuse its CSS.
- Story 6.6 is the polish sweep after all components are responsive — it enforces touch minima, fluid token application, and Lighthouse gates across every panel.
