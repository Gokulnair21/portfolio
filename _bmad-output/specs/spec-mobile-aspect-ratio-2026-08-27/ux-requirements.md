---
name: 'Mobile Aspect Ratio Support — UX Requirements'
type: companion
purpose: ux-spec
altitude: epic
spec: spec-mobile-aspect-ratio-2026-08-27
status: draft
created: 2026-08-27
updated: 2026-08-27
---

# UX Requirements — Mobile Aspect Ratio Support

## User Personas & Context

### Primary: Recruiter on Mobile
- **Scenario:** Views portfolio on phone during commute or between meetings
- **Device:** iPhone 15 Pro (393×852) or Galaxy S24 (360×800)
- **Orientation:** Primarily portrait, occasionally landscape for topology
- **Goals:** Quickly assess technical skills, project depth, contact info
- **Pain Points:** Horizontal scroll, tiny tap targets, content clipped by notch, can't find navigation

### Secondary: Engineer Peer on Mobile
- **Scenario:** Checks out topology map and terminal simulation on phone
- **Device:** Various, including foldables
- **Orientation:** Both portrait and landscape
- **Goals:** Explore simulation, understand architecture, appreciate technical depth
- **Pain Points:** Terminal too small, topology not interactive, simulation controls hard to hit

## Journey Maps

### Journey 1: Recruiter Portrait Review
1. **Lands on Dashboard** → Sees health probes, understands "this is an Actuator dashboard"
2. **Wants to see projects** → Taps tab navigation → Bottom sheet opens with tab options
3. **Selects Topology** → Map fills screen, pinch-zooms to explore nodes
4. **Taps Payment Service** → Bottom sheet slides up with project details
5. **Swipes down** → Returns to map
6. **Selects Career Pods** → Scrolls through pods, taps Neosoft pod
7. **Reads details** → Bottom sheet with role, timeline, responsibilities
8. **Wants to contact** → Selects Swagger tab → Fills form → Executes
9. **Sees confirmation** → Modal with mock response + real email sent confirmation

### Journey 2: Engineer Landscape Exploration
1. **Rotates to landscape** → Layout reflows: header sticky, tabs horizontal scroll
2. **Topology map** → Wider, more nodes visible, pan/zoom natural
3. **Simulates outage** → Taps "Simulate Network Outage" (large touch target)
4. **Watches terminal** → Logs stream, terminal height adapted to landscape
5. **Triggers recovery** → Watches HALF-OPEN → CLOSED transition
6. **Checks Env Registry** → Horizontal scroll table or card view
7. **Returns to portrait** → Smooth reflow, no content loss

## Screen Specifications

### S1: Mobile Portrait — Dashboard Shell
```
┌─────────────────────────────────────┐
│ ▤ Safe Area Top (notch/dynamic isl) │
├─────────────────────────────────────┤
│ [≡] SpringActuator-Portfolio  [⋮]   │ ← Sticky Header (56px)
├─────────────────────────────────────┤
│                                     │
│   Health Dashboard Panel            │ ← Full-width panel
│   ┌─────────────────────────────┐   │
│   │ Liveness Probe: UP ●        │   │
│   │ Brokers: 2/2 ●              │   │
│   │ Error Rate: 0.00% ●         │   │
│   │ [Simulate Outage] [Recovery]│   │
│   └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│         [Tabs: ▤ ▤ ▤ ▤ ▤]           │ ← Tab Bar Button (opens sheet)
├─────────────────────────────────────┤
│ ▤ Safe Area Bottom (home indicator) │
│ ┌─────────────────────────────┐     │
│ │ Terminal Console (120-200px)  │     │
│ │ ████████████████████████████  │     │
│ └─────────────────────────────┘     │
│ ┌─────────────────────────────┐     │
│ │ ● UP  |  pods:3  |  env:11  │     │ ← Footer (56px)
│ └─────────────────────────────┘     │
└─────────────────────────────────────┘
```

### S2: Mobile Portrait — Tab Bottom Sheet
```
┌─────────────────────────────────────┐
│ ▤ Safe Area Top                     │
├─────────────────────────────────────┤
│ [Content dimmed, sheet slides up]   │
│ ┌─────────────────────────────┐     │
│ │ ▤ Dashboard          ●      │     │ ← Active tab highlighted
│ │ ▤ Topology                  │     │
│ │ ▤ Environment               │     │
│ │ ▤ Career Pods               │     │
│ │ ▤ Swagger UI                │     │
│ │                             │     │
│ │ [Drag handle]               │     │
│ └─────────────────────────────┘     │
└─────────────────────────────────────┘
```

### S3: Mobile Landscape — Topology Focus
```
┌─────────────────────────────────────────────────────────────┐
│ ▤ Safe │ [≡] SpringActuator-Portfolio  [Dashboard ▾] [⋮]  │ ← Header
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     TOPOLOGY MAP (pan/zoom)                    [Detail]     │
│  ┌─────────────────────────────┐   ┌───────────────────┐    │
│  │  [bff] → [onboarding]       │   │ Payment Service   │    │
│  │       ↓          ↓          │   │ ─────────────     │    │
│  │  [payment]  [deposit]       │   │ Stack: Java 17    │    │
│  │       ↓          ↓          │   │ Metrics: 100% err │    │
│  │       [core-bank-db]        │   │ [Close]           │    │
│  └─────────────────────────────┘   └───────────────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Terminal (100-150px)  │  Footer (compact)                  │
└─────────────────────────────────────────────────────────────┘
```

### S4: Mobile — Career Pod Detail Bottom Sheet
```
┌─────────────────────────────────────┐
│ ▤ Safe Area Top                     │
├─────────────────────────────────────┤
│ [Content dimmed]                    │
│ ┌─────────────────────────────┐     │
│ │ ═══════════════════════════  │     │ ← Drag handle
│ │ pod-senior-neosoft-0   ●    │     │
│ │ ──────────────────────────  │     │
│ │ Associate Team Lead         │     │
│ │ Java Backend Engineer       │     │
│ │ Jun 2021 — Present          │     │
│ │ ──────────────────────────  │     │
│ │ • Core banking platform     │     │
│ │ • Payment processing        │     │
│ │ • Team leadership           │     │
│ │                             │     │
│ │ [Swipe down to close]       │     │
│ └─────────────────────────────┘     │
└─────────────────────────────────────┘
```

### S5: Mobile — Swagger Playground
```
┌─────────────────────────────────────┐
│ ▤ Safe Area Top                     │
├─────────────────────────────────────┤
│ [Sticky Header]                     │
├─────────────────────────────────────┤
│ POST /api/v1/contact                │
│ ┌─────────────────────────────┐     │
│ │ {                           │     │ ← JSON Editor
│ │   "name": "John",           │     │    (scrollable)
│ │   "email": "john@ex.com",   │     │
│ │   "message": "Hello"        │     │
│ │ }                           │     │
│ └─────────────────────────────┘     │
│                                     │
│ ┌─────────────────────────────┐     │
│ │         [ Execute ]         │     │ ← Full-width, 56px
│ └─────────────────────────────┘     │
│                                     │
│ [Response Modal on Execute]         │
│ ┌─────────────────────────────┐     │
│ │ 200 OK                      │     │
│ │ {                           │     │
│ │   "messageId": "abc-123",   │     │
│ │   "partition": 0,           │     │
│ │   "offset": 42              │     │
│ │ }                           │     │
│ │ [Copy] [Close]              │     │
│ └─────────────────────────────┘     │
├─────────────────────────────────────┤
│ Terminal (adapted) | Footer         │
└─────────────────────────────────────┘
```

## Interaction Patterns

### IP-1: Tab Navigation (Mobile)
- **Trigger:** Tap tab bar button (☰) in header OR swipe up from bottom edge
- **Pattern:** Bottom sheet slides up (300ms ease-out)
- **Selection:** Tap tab → sheet dismisses → panel switches
- **Dismiss:** Tap backdrop, swipe down, or tap tab
- **Keyboard:** Focus first tab on open; ESC to dismiss; arrow keys navigate

### IP-2: Detail Panels (Mobile)
- **Trigger:** Tap node/pod/action
- **Pattern:** Bottom sheet slides up (60vh max, drag handle)
- **Content:** Same as desktop side panel
- **Dismiss:** Swipe down, tap backdrop, tap close button
- **Keyboard:** Focus first interactive element; ESC to dismiss

### IP-3: Topology Pan/Zoom
- **Pan:** One-finger drag on SVG background
- **Zoom:** Pinch gesture (two fingers)
- **Reset:** Double-tap background OR reset button (mobile only)
- **Node Tap:** Single tap on node hit-area → opens detail sheet
- **Keyboard:** Arrow keys pan; +/- zoom; Enter on focused node opens detail

### IP-4: Terminal Console
- **Scroll:** Native touch scroll within terminal area
- **Auto-scroll:** New entries scroll into view (preserved)
- **Height:** Adapts to orientation via CSS tokens
- **Mobile Entry Limit:** 100 entries (performance)

### IP-5: Form Interaction (Swagger)
- **JSON Editor:** Tap to focus; keyboard appears; viewport adjusts via dvh
- **Execute:** Sticky above keyboard OR full-width at bottom
- **Response:** Modal centered, scrollable, dismissible
- **Copy:** Tap copy button → toast confirmation

## Visual Design Tokens (Mobile Extensions)

### Color (Inherited — no changes)
All status colors, surface ladder, text colors from existing tokens.

### Typography (Mobile Fluid Extensions)
```css
/* Added to styles.css */
--text-label-mono-sm-fluid: clamp(9px, 2.5vw, 10px);
--text-label-mono-fluid: clamp(11px, 2.8vw, 12px);
--text-body-sm-fluid: clamp(11px, 2.6vw, 12px);
--text-body-md-fluid: clamp(13px, 3vw, 14px);
--text-title-sm-fluid: clamp(16px, 3.5vw, 18px);
--text-headline-md-fluid: clamp(20px, 4vw, 24px);
--text-display-lg-fluid: clamp(28px, 5vw, 32px);
```

### Spacing (Mobile Fluid Extensions)
```css
--space-gutter-fluid: clamp(12px, 4vw, 24px);
--space-lg-fluid: clamp(16px, 4vw, 24px);
--space-xl-fluid: clamp(24px, 5vw, 32px);
--space-margin-mobile: 16px; /* Existing — keep */
```

### Touch & Layout (New Tokens)
```css
--touch-target-min: 48px;
--touch-target-comfortable: 56px;
--touch-spacing-min: 8px;
--touch-spacing-comfortable: 12px;

--terminal-height-mobile-portrait: clamp(120px, 35dvh, 200px);
--terminal-height-mobile-landscape: clamp(100px, 25dvh, 150px);
--terminal-height-tablet: 120px;

--footer-height-mobile: 56px;
--footer-height-desktop: 48px;

--safe-top: env(safe-area-inset-top, 0px);
--safe-bottom: env(safe-area-inset-bottom, 0px);
--safe-left: env(safe-area-inset-left, 0px);
--safe-right: env(safe-area-inset-right, 0px);

--bp-mobile-xs: 320px;
--bp-mobile-sm: 375px;
--bp-mobile-md: 393px;
--bp-mobile-lg: 430px;
```

### Container Query Definition
```css
/* In app.css */
.main-content {
  container-name: dashboard;
  container-type: inline-size;
}
```

## Accessibility Requirements

### A11y-1: Touch Target Compliance
- All interactive elements: ≥ 48×48dp (CSS px)
- Adjacent targets: ≥ 8dp spacing
- Verified via Chrome DevTools "Show touch targets" + axe-core

### A11y-2: Keyboard Navigation
- Tab order: Header → Tab button → Panel content → Terminal → Footer
- Bottom sheets: Focus trap; ESC closes; Tab cycles within sheet
- Topology: Arrow keys pan; Enter activates node; Escape closes detail

### A11y-3: Screen Reader
- Bottom sheets: `role="dialog"` `aria-modal="true"` `aria-labelledby`
- Tab panel: `role="tablist"` `aria-orientation="vertical"` on mobile
- Topology: SVG `role="img"` with `aria-label` describing current state
- Terminal: `role="log"` `aria-live="polite"` for new entries

### A11y-4: Reduced Motion
- `@media (prefers-reduced-motion: reduce)` disables:
  - Bottom sheet slide animation
  - Terminal auto-scroll animation
  - Topology pan/zoom transitions
  - Tab switch transitions

### A11y-5: Forced Colors (High Contrast)
- `@media (forced-colors: active)` ensures:
  - Touch target borders visible (CanvasText)
  - Focus outlines 2px solid CanvasText
  - SVG strokes use `currentColor` or system colors
  - Status indicators not color-only

### A11y-6: Zoom & Scaling
- `user-scalable=yes` in viewport meta
- Text reflows at 200% zoom (WCAG 1.4.4)
- No horizontal scroll at 400% zoom (320px equivalent)

## Responsive Breakpoint Behavior Table

| Viewport Width | Orientation | Layout Mode | Tabs | Terminal | Topology | Pods/Env | Swagger |
|----------------|-------------|-------------|------|----------|----------|----------|---------|
| < 320px | Portrait | Ultra-narrow | Sheet | 120px | Pan/zoom | Cards | Stacked |
| 320-374px | Portrait | Mobile XS | Sheet | 120-160px | Pan/zoom | Cards | Stacked |
| 375-392px | Portrait | Mobile SM | Sheet | 140-180px | Pan/zoom | Cards | Stacked |
| 393-429px | Portrait | Mobile MD | Sheet | 160-200px | Pan/zoom | Cards | Stacked |
| 430-767px | Portrait | Mobile LG | Sheet | 180-200px | Pan/zoom | Cards | Stacked |
| < 500px | Landscape | Mobile LS | Scroll/Sheet | 100-120px | Side panel | Cards | Stacked |
| 500-767px | Landscape | Mobile LL | Scroll/Sheet | 120-150px | Side panel | Table/Scroll | Stacked |
| 768-1023px | Portrait | Tablet | Horizontal | 120px | Side panel | Table | Side-by-side |
| 768-1023px | Landscape | Tablet | Horizontal | 120px | Side panel | Table | Side-by-side |
| ≥ 1024px | Any | Desktop | Horizontal | 120px | Side panel | Table | Side-by-side |

## Success Metrics (UX)

1. **Task Completion Rate:** ≥ 95% for "Find contact info and send message" on mobile
2. **Time to First Interaction:** < 2s (Lighthouse FCP + TTI)
3. **Touch Error Rate:** < 2% (mis-taps on adjacent targets)
4. **Orientation Switch CLS:** < 0.1
5. **Lighthouse Mobile Accessibility:** 100
6. **User Testing:** 5/5 recruiters complete full journey without assistance

## Open Questions

1. **Tab Navigation Default:** Bottom sheet vs. horizontal scroll with gradient fade? (Need user testing)
2. **Topology Detail:** Bottom sheet vs. inline expand? (Bottom sheet chosen for consistency)
3. **Env Registry:** Card layout vs. horizontal scroll table? (Cards for < 480px, table for ≥ 480px)
4. **Terminal Height Landscape:** 25dvh vs 30dvh? (Start with 25dvh, test)
5. **Gesture Support:** Swipe for tabs? (Nice-to-have, Phase 2+)