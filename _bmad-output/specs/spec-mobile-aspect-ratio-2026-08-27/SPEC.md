---
name: 'Mobile Aspect Ratio Support'
type: spec
purpose: feature-extension
altitude: epic
paradigm: 'Responsive-first CSS architecture with design-token-driven breakpoints'
scope: 'Add comprehensive mobile aspect ratio support to the Actuator Portfolio SPA — handling portrait/landscape orientations, safe areas, touch targets, and content scaling across mobile devices'
status: draft
created: 2026-08-27
updated: 2026-08-27
binds: [NFR1, NFR3, NFR4]
sources: []
companions: ['capabilities.md', 'constraints.md', 'ux-requirements.md']
---

# SPEC — Mobile Aspect Ratio Support

## Why

The Actuator Portfolio is a Spring Boot Actuator-themed personal portfolio SPA targeting recruiters and engineering peers. Currently, the responsive design uses basic width-based breakpoints (768px, 1024px) but lacks comprehensive mobile aspect ratio handling. Mobile visitors (especially on modern phones with notches, dynamic islands, and varying aspect ratios from 19:9 to 4:3) experience:

- Content overflow or clipping in landscape orientation
- Fixed footer and terminal console overlapping content
- Touch targets too small for comfortable interaction
- No safe-area handling for notched devices
- Tab navigation hidden on mobile without alternative access
- Terminal console fixed height not adapting to viewport height

This spec defines the requirements to make the portfolio fully usable and visually correct across all mobile aspect ratios and orientations.

## Capabilities

### CAP-1: Viewport & Safe-Area Foundation
**Intent:** Establish a robust viewport configuration and CSS environment variable support for safe-area insets on notched devices.
**Success:** The app renders without horizontal scroll on all mobile devices; content respects safe-area-inset-{top,right,bottom,left} on iOS Safari and Android Chrome; no content is clipped by notches, dynamic islands, or system bars.

### CAP-2: Orientation-Aware Layout System
**Intent:** Provide layout adaptations for both portrait and landscape orientations across mobile aspect ratios (19:9, 18:9, 4:3, 3:2).
**Success:** In portrait, all panels stack vertically with full-width touch targets; in landscape, the topology map and other wide panels utilize horizontal space efficiently; no content overlaps or becomes unreadable in either orientation; transitions between orientations are smooth without layout shift.

### CAP-3: Touch-Optimized Interaction Targets
**Intent:** Ensure all interactive elements meet minimum 48×48dp touch target size on mobile with adequate spacing.
**Success:** All buttons, tabs, links, and form controls are ≥48×48px on mobile; 8dp minimum spacing between adjacent touch targets; tab navigation accessible via bottom sheet or hamburger menu on mobile; swipe gestures supported for tab switching.

### CAP-4: Adaptive Terminal Console & Footer
**Intent:** Make the fixed terminal console and footer adapt to mobile viewport heights and orientations.
**Success:** Terminal console height scales with viewport (min 120px, max 40vh); footer remains accessible but non-intrusive; in landscape, terminal reduces height to preserve content area; both use CSS `dvh` units for dynamic viewport height awareness.

### CAP-5: Content Scaling & Typography Responsiveness
**Intent:** Implement fluid typography and spacing that scales appropriately across mobile viewports.
**Success:** Font sizes use `clamp()` for fluid scaling between mobile and desktop; spacing tokens adapt via container queries or viewport-relative units; no horizontal overflow from text; code/monospace content remains readable at minimum widths.

### CAP-6: Topology Map Mobile Adaptation
**Intent:** Make the SVG topology map usable on mobile screens with pan/zoom and node selection.
**Success:** Topology map fits within viewport without horizontal scroll; pinch-to-zoom and pan enabled on touch devices; node tap targets enlarged for touch; detail panel opens as bottom sheet on mobile; degraded link highlighting remains visible.

### CAP-7: Career Pods & Env Registry Mobile UX
**Intent:** Optimize career pods list and env registry table for mobile scrolling and interaction.
**Success:** Career pods stack vertically with full-width cards; env registry uses horizontal scroll with sticky key column or card-based layout on mobile; search/filter remains accessible; replica detail opens as modal or bottom sheet.

### CAP-8: Swagger Playground Mobile Form
**Intent:** Make the Swagger contact form usable on mobile with proper keyboard handling.
**Success:** JSON editor adapts to mobile width with horizontal scroll; "Execute" button is full-width touch target; keyboard doesn't obscure form fields; mock response and receipt display in scrollable modal.

## Constraints

### CON-1: Design Token System Integrity
All new responsive values MUST be defined as CSS custom properties in `src/styles.css` design token section. No hardcoded values in component styles. Existing token structure (spacing, typography, colors) must be extended, not replaced.

### CON-2: No Framework Dependencies
Implementation must use hand-rolled CSS only — no Tailwind, no component libraries, no JavaScript-based responsive libraries. Container queries and modern CSS features preferred over JS resize listeners.

### CON-3: Angular v22 Idiom Compliance
All components must remain standalone, OnPush, signals-first, using built-in control flow (`@if/@for`). No NgRx, no RxJS subjects for layout state.

### CON-4: Single Signals Store Architecture
Any layout-related state (orientation, viewport size class) must live in `ClusterStateService` as signals if shared across components. Component-local layout state allowed only for purely presentational concerns.

### CON-5: GitHub Pages Deployment Compatibility
All asset references must remain base-href-safe. No changes to build configuration or deployment pipeline.

### CON-6: Accessibility (WCAG 2.1 AA)
All new interactive patterns must maintain keyboard navigation, focus visible states, reduced motion support, and forced-colors support. Touch targets must not compromise keyboard usability.

### CON-7: Performance Budget
Page load under 1.5s on mobile (NFR1). No additional JavaScript bundles. CSS additions must be minimal and leverage browser-native responsive features.

## Non-Goals

- Native app wrapper or PWA/offline support
- Device-specific native UI patterns (iOS vs Android differentiation beyond safe areas)
- Horizontal carousel/swiper components (use native scroll)
- Server-side rendering or hydration changes
- Deep linking or router addition (AD-2 invariant holds)
- Content changes — only layout and interaction adaptations

## Success Signals

1. **Lighthouse Mobile Score ≥ 90** — Performance, Accessibility, Best Practices, SEO
2. **Zero horizontal scroll** on Chrome DevTools device toolbar for: iPhone SE (375×667), iPhone 15 Pro (393×852), Galaxy S24 (360×800), iPad Mini (768×1024), in both orientations
3. **Touch target audit passes** — all interactive elements ≥ 48×48px with 8px spacing on mobile viewports
4. **Safe-area compliance** — no content clipped by notch/dynamic island on iPhone 15 Pro simulation
5. **Orientation switch** — no layout shift > 1 CLS score when rotating device
6. **Terminal/Footer usability** — terminal console readable and footer accessible in all orientations without overlapping primary content