# Implementation Plan — Mobile Aspect Ratio Support (Epic 6)

Source: `SPEC.md` + `capabilities.md` + `ux-requirements.md` + `stories.yaml`
Stack: Angular v22, TypeScript 6, standalone OnPush, signals store, hand-rolled CSS, GitHub Pages

## Sequencing

Implement in story order 6.1 → 6.6. Each story is independently demo-able and verifies via DevTools + `ng test`/`ng build` before moving on.

```
6.1 Tokens/Viewport (foundation)
 └─► 6.2 App Shell (shell blocks all panels)
      └─► 6.3 Terminal/Footer (fixed elements overlap)
           └─► 6.4 Feature Panels (topology/pods/env share bottom-sheet)
                └─► 6.5 Swagger (keyboard/dvh edge case)
                     └─► 6.6 Polish/Audit (sweep + Lighthouse gate)
```

## Per-Story File Touch List

| Story | Primary Files | Risk |
|-------|---------------|------|
| **6.1** | `src/index.html` (viewport meta), `src/styles.css` (tokens) | Low — additive tokens only |
| **6.2** | `src/app/app.html`, `src/app/app.css`, `src/app/app.ts` + `core/state/cluster-state.service.ts` if bottom-sheet needs signal | Low — CSS `:target` preferred, no store change if possible |
| **6.3** | `src/app/features/terminal-console/terminal-console.css`, `src/app/app.css`, `src/styles.css`, `src/app/core/state/cluster-state.service.ts` (100-cap), `src/app/core/state/cluster-state.service.spec.ts` | Medium — log cap logic needs spec update |
| **6.4** | `src/app/features/topology/service-topology.*`, `career-pods.*`, `env-registry.*` | Medium — SVG touch-action, card vs table logic |
| **6.5** | `src/app/features/swagger-playground/swagger-playground.*` | Low — form CSS only; keep `delivery/message-delivery.port.ts` + `emailjs.adapter.ts` untouched (AD-4) |
| **6.6** | `src/styles.css` + every `features/*/*.css` + `src/app/app.css` | Low — audit/sweep, no logic |

## Design Token Additions (Story 6.1 — exact tokens)

Add to `:root` in `src/styles.css` after the Spacing Scale section, before Border Width:

```css
/* ---- Mobile Aspect Ratio Tokens (Epic 6) ---- */
--safe-top: env(safe-area-inset-top, 0px);
--safe-right: env(safe-area-inset-right, 0px);
--safe-bottom: env(safe-area-inset-bottom, 0px);
--safe-left: env(safe-area-inset-left, 0px);

--touch-target-min: 48px;
--touch-target-comfortable: 56px;
--touch-spacing-min: 8px;
--touch-spacing-comfortable: 12px;

--bp-mobile-xs: 320px;
--bp-mobile-sm: 375px;
--bp-mobile-md: 393px;
--bp-mobile-lg: 430px;

--terminal-height-mobile-portrait: clamp(120px, 35dvh, 200px);
--terminal-height-mobile-landscape: clamp(100px, 25dvh, 150px);
--terminal-height-tablet: 120px;
--terminal-height-desktop: 120px;

--footer-height-mobile: 56px;
--footer-height-desktop: 48px;

/* Fluid typography (opt-in via @container/@media) */
--text-label-mono-sm-fluid: clamp(9px, 2.5vw, 10px);
--text-label-mono-fluid: clamp(11px, 2.8vw, 12px);
--text-body-sm-fluid: clamp(11px, 2.6vw, 12px);
--text-body-md-fluid: clamp(13px, 3vw, 14px);
--text-title-sm-fluid: clamp(16px, 3.5vw, 18px);
--text-headline-md-fluid: clamp(20px, 4vw, 24px);
--text-display-lg-fluid: clamp(28px, 5vw, 32px);

/* Fluid spacing */
--space-gutter-fluid: clamp(12px, 4vw, 24px);
--space-lg-fluid: clamp(16px, 4vw, 24px);
--space-xl-fluid: clamp(24px, 5vw, 32px);
```

## Key Implementation Notes

### Bottom Sheets (Stories 6.2, 6.4, 6.5)
- Use CSS `:target` + anchor positioning. Markup: `<a href="#sheet-detail">` opens `#sheet-detail:target { transform: translateY(0) }`.
- Backdrop: sibling `<a href="#" class="sheet-backdrop">` covers page; tap navigates away from hash → sheet closes.
- Fallback: if `:target` unsupported, sheet renders inline (acceptable — no JS).
- A11y: `role="dialog" aria-modal="true"` on sheet; focus first focusable element on open (JS `autofocus` or Angular `afterRender`).
- Reduced motion: `@media (prefers-reduced-motion: reduce) { .sheet { transition: none } }`.

### Container Queries (Story 6.2)
```css
.main-content {
  container-name: dashboard;
  container-type: inline-size;
}
@container dashboard (max-width: 480px) {
  /* component mobile styles */
}
```
- Keep viewport `@media` for shell-level breakpoints; use `@container` inside feature panels.

### Terminal Log Cap (Story 6.3)
- In `cluster-state.service.ts`, replace hardcoded `200` with responsive logic or simply lower mobile entries via CSS truncation *plus* store cap.
- Simplest: keep 200 cap but add visual truncation (height clamp) — satisfies UX without logic change.
- If true 100-cap needed: inject `isMobile: Signal<boolean>` derived from `matchMedia("(max-width: 767px)")` (subtle — prefer CSS approach to avoid store bloat).

### Topology Touch (Story 6.4)
```css
.service-topology__svg-wrap {
  touch-action: pan-x pan-y pinch-zoom;
  overflow: auto;
  max-height: 60vh;
}
.topology-node__hit {
  position: absolute; width: 56px; height: 56px; margin: -18px; border-radius: 50%;
}
```
- SVG must have `viewBox` and `preserveAspectRatio`. Verify in `service-topology.html`.
- Degraded: `stroke-width: max(3px, 0.5vw)`.

### Swagger Keyboard (Story 6.5)
- Editor: `font-size: 16px` on mobile prevents iOS zoom; or keep 12px + `maximum-scale=5` allows zoom but editor remains 12px.
- Execute: `position: sticky; bottom: calc(var(--safe-bottom) + 8px)`.
- Response modal: `max-width: 90vw; max-height: 70dvh; overflow: auto`.

### Touch Target Enlargement (Story 6.6)
```css
.touch-enlarge { position: relative; }
.touch-enlarge::before {
  content: ""; position: absolute; inset: -12px; /* 24px + 24px = 48px if button is 24px */
}
```
- Apply to icon buttons (40px → 48px) and small links.

## Testing Checklist (Run per Story)

```
□ ng build --configuration production (base-href safe)
□ ng test (Vitest) — no failures, add new specs where noted
□ Chrome DevTools device toolbar: 320, 375, 393, 430, 768, 1024 widths × portrait/landscape
□ No horizontal scroll except intentional env table pan
□ Keyboard: Tab → Tab button → sheet → panel → terminal → footer; ESC closes sheets
□ prefers-reduced-motion / forced-colors toggles in DevTools Rendering pane
□ Lighthouse mobile preset at 393×852 (Performance ≥90, A11y 100)
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Bottom sheet `:target` scroll jumps on open | Add `scroll-behavior: smooth` + `scroll-margin-top` on target; or use `dialog` element (progressive enhancement) |
| dvh unsupported on older browser | Fallback: `height: 35vh; height: 35dvh;` (cascade) — older ignores second line |
| Container queries add paint cost | Limit to `.main-content` container only; no nested containers |
| Env card vs table duplication | Use single `.env-table` hidden at <480px and `.env-cards` hidden at ≥480px — no JS |
| iOS auto-zoom on <16px inputs | Set `font-size: 16px` on mobile via `@media (max-width: 767px)` for inputs/textarea |

## Out of Scope (Explicitly Defer)

- Swipe gestures for tab switching (Phase 2)
- PWA/offline, analytics, SEO meta
- i18n, E2E Playwright (deferred per ARCHITECTURE-SPINE.md)
- Migration of `portfolio-data.json` to build-time TS (AD-3 revisit)

## Completion Signal

Epic done when all six stories pass their Done checkpoints, `epics.md` `stepsCompleted` can include Epic 6, and a single Lighthouse mobile run at 393×852 shows **Performance ≥90, Accessibility 100, Best Practices ≥90, no horizontal overflow, and all touch targets ≥48px**.
