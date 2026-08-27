---
name: 'Mobile Aspect Ratio Support — Capabilities Detail'
type: companion
purpose: capability-breakdown
altitude: epic
spec: spec-mobile-aspect-ratio-2026-08-27
status: draft
created: 2026-08-27
updated: 2026-08-27
---

# Capabilities Detail — Mobile Aspect Ratio Support

## CAP-1: Viewport & Safe-Area Foundation

### Detailed Requirements

#### 1.1 Viewport Meta Tag Enhancement
- Update `index.html` viewport meta to include `viewport-fit=cover`
- Add `user-scalable=yes` to allow pinch-zoom (accessibility)
- Consider `maximum-scale=5` for usability

#### 1.2 CSS Environment Variables for Safe Areas
```css
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-right: env(safe-area-inset-right, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-inset-left: env(safe-area-inset-left, 0px);
}
```

#### 1.3 Root Element Padding
- Apply safe-area insets to `:host` / `body` padding
- Ensure fixed-position elements (footer, terminal) respect safe areas

### Acceptance Criteria
- [ ] No horizontal scroll on any mobile device in DevTools device toolbar
- [ ] Content not clipped by notch/dynamic island on iPhone 15 Pro simulation
- [ ] Footer and terminal console positioned above home indicator on iOS
- [ ] Android gesture navigation bar area respected

---

## CAP-2: Orientation-Aware Layout System

### Detailed Requirements

#### 2.1 Breakpoint Token Extensions
Add orientation-aware breakpoints to design tokens:
```css
:root {
  /* Mobile portrait breakpoints */
  --bp-mobile-xs: 320px;   /* iPhone SE, small Android */
  --bp-mobile-sm: 375px;   /* iPhone 12/13/14/15 base */
  --bp-mobile-md: 393px;   /* iPhone 15 Pro, large phones */
  --bp-mobile-lg: 430px;   /* Large phones, small foldables */
  
  /* Tablet breakpoints */
  --bp-tablet-portrait: 768px;
  --bp-tablet-landscape: 1024px;
  
  /* Orientation media queries as tokens (for container queries) */
  --mq-portrait: '(orientation: portrait)';
  --mq-landscape: '(orientation: landscape)';
}
```

#### 2.2 Container Query Strategy
- Use `@container` queries on main content area for component-level responsiveness
- Define container-name on `.main-content` 
- Components query their container for available width

#### 2.3 Layout Modes per Orientation

**Portrait Mobile (< 768px):**
- Single-column stack: Header → Tab Navigation (bottom sheet) → Panel Content → Terminal → Footer
- Tab navigation: Bottom sheet activated by tab bar button or swipe-up gesture
- Panels: Full-width, vertical stacking
- Topology: Full-width with pan/zoom

**Landscape Mobile (< 768px height):**
- Header remains sticky top
- Tab navigation: Horizontal scroll or bottom sheet
- Panels: Side-by-side where space allows (topology + detail)
- Terminal: Reduced height (120px min, 30vh max)
- Footer: Compact height

**Tablet Portrait (768px - 1023px):**
- Current desktop-like layout works
- Tab navigation: Horizontal tabs visible
- Terminal: 120px fixed height

**Tablet Landscape (≥ 1024px):**
- Current desktop layout

### Acceptance Criteria
- [ ] Layout adapts smoothly at each breakpoint without content overlap
- [ ] Orientation change triggers smooth reflow (no jank)
- [ ] No content becomes inaccessible in either orientation
- [ ] Tab navigation discoverable and usable in all orientations

---

## CAP-3: Touch-Optimized Interaction Targets

### Detailed Requirements

#### 3.1 Minimum Touch Target Tokens
```css
:root {
  --touch-target-min: 48px;      /* 48×48dp minimum */
  --touch-target-comfortable: 56px; /* Preferred size */
  --touch-spacing-min: 8px;      /* Minimum gap between targets */
  --touch-spacing-comfortable: 12px;
}
```

#### 3.2 Component-Specific Adaptations

**Top Navigation Tabs:**
- Mobile: Hidden by default, accessible via bottom sheet
- Bottom sheet: Full-width tab buttons, 56px height, 12px spacing
- Alternative: Horizontal scroll with gradient fade indicators

**Buttons (All Types):**
- Primary/Secondary: Min 48px height, full-width on mobile
- Icon buttons: 48×48px touch area (icon 24px centered)
- Swagger "Execute": Full-width, 56px height on mobile

**Form Controls:**
- Inputs: 48px height, 16px font-size (prevents iOS zoom)
- Selects: 48px height
- Textarea: Min 120px height on mobile

**Topology Nodes:**
- Tap target: 56×56px invisible circle around node
- Visual node: Current size maintained
- Degraded state: Ensure contrast on touch

**Career Pods:**
- Pod cards: Full-width, min 48px height
- Expand/collapse: 48×48px touch area

**Env Registry:**
- Search input: 48px height, full-width
- Table rows: Min 48px height on mobile
- Card layout alternative: Each property as card

#### 3.3 Gesture Support
- Swipe left/right on content area for tab switching (optional enhancement)
- Pull-to-refresh not needed (static content)
- Pinch-to-zoom on topology map (native SVG)

### Acceptance Criteria
- [ ] All interactive elements pass 48×48px minimum on mobile Chrome DevTools
- [ ] 8px minimum spacing between adjacent touch targets
- [ ] Tab navigation accessible within one tap from any screen
- [ ] No accidental adjacent target activation during testing

---

## CAP-4: Adaptive Terminal Console & Footer

### Detailed Requirements

#### 4.1 Terminal Console Responsive Height
```css
:root {
  --terminal-height-mobile-portrait: clamp(120px, 35vh, 200px);
  --terminal-height-mobile-landscape: clamp(100px, 25vh, 150px);
  --terminal-height-tablet: 120px;
  --terminal-height-desktop: 120px;
}
```

#### 4.2 Footer Responsive Height
```css
:root {
  --footer-height-mobile: 56px;  /* Taller for touch */
  --footer-height-desktop: 48px;
}
```

#### 4.3 Dynamic Viewport Units
- Use `dvh` (dynamic viewport height) for terminal and footer positioning
- Fallback to `vh` with JavaScript polyfill for older browsers (not needed for modern targets)
- Main content `padding-bottom` calculates from terminal + footer heights

#### 4.4 Terminal Content Adaptation
- Log entries: Reduce font-size on mobile (10px → 9px)
- Horizontal scroll for long log lines (monospace)
- Auto-scroll behavior preserved
- Max 100 entries on mobile (vs 200 desktop) for performance

#### 4.5 Footer Content Adaptation
- Status items: Stack vertically on mobile < 480px
- Icon-only mode for very narrow viewports
- Touch-friendly status tap targets

### Acceptance Criteria
- [ ] Terminal height adapts to orientation without content overlap
- [ ] Footer always visible and accessible
- [ ] Main content padding-bottom accounts for both terminal + footer
- [ ] No content hidden behind terminal or footer in any orientation
- [ ] Terminal logs readable (no horizontal overflow of timestamps)

---

## CAP-5: Content Scaling & Typography Responsiveness

### Detailed Requirements

#### 5.1 Fluid Typography Tokens
Extend existing typography scale with `clamp()` values:
```css
:root {
  /* Fluid scaling: min, preferred (vw-based), max */
  --text-label-mono-sm-fluid: clamp(9px, 2.5vw, 10px);
  --text-label-mono-fluid: clamp(11px, 2.8vw, 12px);
  --text-body-sm-fluid: clamp(11px, 2.6vw, 12px);
  --text-body-md-fluid: clamp(13px, 3vw, 14px);
  --text-title-sm-fluid: clamp(16px, 3.5vw, 18px);
  --text-headline-md-fluid: clamp(20px, 4vw, 24px);
  --text-display-lg-fluid: clamp(28px, 5vw, 32px);
}
```

#### 5.2 Fluid Spacing Tokens
```css
:root {
  --space-gutter-fluid: clamp(12px, 4vw, 24px);
  --space-lg-fluid: clamp(16px, 4vw, 24px);
  --space-xl-fluid: clamp(24px, 5vw, 32px);
}
```

#### 5.3 Component Application
- Apply fluid tokens via `@media` or container queries
- Monospace content (logs, code, JSON): Preserve readability at minimum sizes
- SVG text in topology: Use `textLength` and `lengthAdjust` for scaling

#### 5.4 Code/JSON Content Handling
- Swagger JSON editor: Horizontal scroll container, font-size 12px min
- Terminal logs: `white-space: pre-wrap` with `overflow-x: auto`
- Env registry values: `word-break: break-all` for long values

### Acceptance Criteria
- [ ] No horizontal scroll from text content at 320px width
- [ ] Monospace content readable at minimum viewport widths
- [ ] Fluid scaling smooth between breakpoints (no jumps)
- [ ] Lighthouse performance score maintained

---

## CAP-6: Topology Map Mobile Adaptation

### Detailed Requirements

#### 6.1 SVG Viewport & ViewBox
- Ensure SVG has proper `viewBox` for scaling
- Add `preserveAspectRatio="xMidYMid meet"`
- Container: `width: 100%; height: auto; max-height: 60vh` (mobile)

#### 6.2 Touch Interaction Layer
```css
/* Invisible touch targets around nodes */
.topology-node-hit-area {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  /* Centered on node visual */
}
```

#### 6.3 Pan/Zoom Implementation
- Native touch pan/zoom via `touch-action: pan-x pan-y pinch-zoom` on SVG container
- Or: CSS `transform: scale()` with wheel/touch handlers (prefer native)
- Reset zoom button on mobile

#### 6.4 Mobile Detail Panel
- Bottom sheet (slide-up panel) instead of side panel
- Height: 60vh max, drag handle to dismiss
- Swipe down to dismiss
- Contains: Description, Tech Stack, Metrics (same content)

#### 6.5 Degraded State Visibility
- Red link stroke: Ensure 3px minimum on mobile
- Node border: 3px minimum for degraded state
- Color contrast: Verify against WCAG AA on mobile brightness

### Acceptance Criteria
- [ ] Topology fits width without horizontal scroll at 320px
- [ ] Pinch-to-zoom and pan work natively on touch devices
- [ ] Node tap opens detail panel as bottom sheet
- [ ] Degraded (red) links and nodes clearly visible
- [ ] Detail panel dismissible via swipe or backdrop tap

---

## CAP-7: Career Pods & Env Registry Mobile UX

### Detailed Requirements

#### 7.1 Career Pods Mobile Layout
- Pod list: Vertical stack, full-width cards
- Each card: 48px min height, expandable
- Active pod: Visual indicator (pulse dot) maintained
- Replica detail: Bottom sheet (not side panel)
- Pod status badge: Touch-friendly size

#### 7.2 Env Registry Mobile Layout
**Option A: Horizontal Scroll Table**
- Table with `overflow-x: auto`
- Sticky first column (property key)
- Header row sticky
- Touch scroll with momentum

**Option B: Card Layout (Preferred for Mobile)**
- Each property as card: Key (label-mono) + Value (body-sm)
- Search filters card list in real-time
- Cards stack vertically
- Better for narrow viewports

#### 7.3 Search/Filter Accessibility
- Search input: Sticky top, 48px height
- Clear button: 48×48px touch target
- Results count: Visible

### Acceptance Criteria
- [ ] Career pods fully navigable via touch
- [ ] Env registry search works without horizontal scroll
- [ ] Property values readable without zoom
- [ ] Replica/detail views accessible and dismissible

---

## CAP-8: Swagger Playground Mobile Form

### Detailed Requirements

#### 8.1 Request Editor
- JSON textarea: Full-width, min 200px height on mobile
- Font-size: 12px (prevents iOS zoom)
- Horizontal scroll for long lines
- Line numbers optional on mobile

#### 8.2 Execute Button
- Full-width, 56px height
- Fixed bottom or sticky above keyboard
- Loading state: Disabled with spinner

#### 8.3 Response Display
- Mock response headers: Scrollable modal or bottom sheet
- Kafka receipt JSON: Syntax highlighted, horizontal scroll
- Copy button: 48×48px touch target

#### 8.4 Keyboard Handling
- `inputmode="text"` on textarea
- No autocorrect/autocapitalize on JSON editor
- Viewport resize handled via `dvh` units

### Acceptance Criteria
- [ ] Form usable at 320px width
- [ ] Keyboard doesn't obscure Execute button
- [ ] Response readable and copyable
- [ ] Terminal logs update visible after execution