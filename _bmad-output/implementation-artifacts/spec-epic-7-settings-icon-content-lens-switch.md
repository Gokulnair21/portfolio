---
title: 'Epic 7 — Settings Icon Content Lens Switch (Recruiter-default)'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_revision: 'd61d023790073628f03b5e5b71c4dc1319a8e0cd'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - _bmad-output/implementation-artifacts/epic-7-context.md
  - _bmad-output/specs/spec-settings-icon-actions/SPEC.md
  - _bmad-output/planning-artifacts/architecture/architecture-Portfolio-2026-08-22/ARCHITECTURE-SPINE.md
warnings: []
deferred:
  - summary: >-
      No aria-live announcement when lens changes
    evidence: |-
      Blind hunter: lens change updates chip/panels via computed but no live region; screen readers receive no feedback. Spec requires chip read-only indicator only, so not blocking but accessibility improvement.
    location: >-
      src/app/app.html:200
    severity: low
  - summary: >-
      Terminal tip duplicated in two @if branches
    evidence: |-
      Blind hunter: tip appears in both logs>0 and logs==0 branches; shared partial would reduce duplication. Functional but DRY.
    location: >-
      src/app/features/terminal-console/terminal-console.html:23
    severity: low
  - summary: >-
      Hardcoded fallback bios duplicated between JSON display and FALLBACK_* constants
    evidence: |-
      Blind hunter: FALLBACK_RECRUITER/ENGINEER_BIO in cluster-state.service.ts duplicates display.profileBioByLens in portfolio-data.json; drift risk.
    location: >-
      src/app/core/state/cluster-state.service.ts:216
    severity: low
  - summary: >-
      localStorage QuotaExceededError swallowed with no feedback and no cross-tab sync
    evidence: |-
      Blind hunter + edge-case: effect catches but provides no fallback or storage event listener; multi-tab lens diverges. Static hosting NFR allows this, defer to enhancement.
    location: >-
      src/app/core/state/cluster-state.service.ts:89
    severity: medium
  - summary: >-
      Extra keys in lensDescription silently ignored
    evidence: |-
      Edge-case: parsers tolerant to unknown keys; no validation warning. Intentionally additive but silent data loss could hide typos.
    location: >-
      src/app/core/data/portfolio-data.ts:134
    severity: low
  - summary: >-
      Health dashboard bio lens switching not covered by health-dashboard.spec
    evidence: |-
      Verification-gap: displayProfileBio computed only tested via service fallback, no DOM lens toggle test in health-dashboard.spec.
    location: >-
      src/app/features/health-dashboard/health-dashboard.spec.ts:96
    severity: medium
  - summary: >-
      Terminal empty-logs tip branch not covered
    evidence: |-
      Verification-gap: tip when logs.length===0 and recruiter only exercised via tip code, no test renders empty state.
    location: >-
      src/app/features/terminal-console/terminal-console.spec.ts:182
    severity: low
---

<intent-contract>

## Intent

**Problem:** The gear at `src/app/app.html:37` (`onSettingsClick` at `src/app/app.ts:86`) does nothing (`console.log` only), and the portfolio shows a single framing for all visitors — recruiters and engineers see identical copy despite needing different lenses (outcome/impact vs implementation depth). Preference is not persisted.

**Approach:** Add a `Lens = 'recruiter' | 'engineer'` signal to `ClusterStateService` with `setLens`/`toggleLens`, persisted per-device in `localStorage` under a namespaced key (`portfolio:lens`) with Recruiter default and corrupted-value fallback, hydrated before first paint and written via effect. Make the gear toggle a responsive settings surface (bottom-sheet <768px reusing `src/app/app.html:56` pattern, popover ≥768px anchored to gear, same control two presentations via CSS), with one toggle control (segmented or `role=switch`) that flips `lens()` and updates `localStorage` without reload, reframing visible panels live via computed selectors. Add ambient discoverability: footer View chip at `src/app/app.html:138` (read-only `View: Recruiter`/`View: Engineer`) and terminal tip `> tip: toggle view in settings`.

## Boundaries & Constraints

**Always:** Recruiter is non-negotiable default; lens is the ONLY persisted setting; `localStorage` only, namespaced key, no network request ever; exactly two states (`recruiter` ↔ `engineer`), no third/indeterminate; switching is live without page reload or route change (AD-2 intact, no Router import); components read `lens()` via `computed()` and mutate only through `ClusterStateService` methods (AD-1) — no component-local lens duplicates; Actuator tokens only (`src/styles.css` monospace, status-chip, terminal palette, spacing/safe-area) — hand-rolled CSS, no Tailwind/component library, no raw color literals; standalone + OnPush + built-in `@if/@for`; focus trap + Escape/backdrop/close dismiss with focus return to gear; safe-area `var(--safe-bottom)` and `dvh` where needed; missing lens variant falls back to base content.

**Block If:** Final lens copy map per tab is undecided beyond the default assumption (until product provides copy, use outcome vs implementation tone fallback and document assumption) — do not invent third lens or additional settings.

**Never:** Backend/API/server persistence; coachmark/tutorial overlay/highlight ring; density sliders, multi-preset bundles, or additional controls (single-setting minimalism NFR7); separate mobile vs desktop settings (one control, two CSS presentations); NgRx/RxJS stores or component-local shared-state duplicates; Tailwind/component library or new design tokens outside `src/styles.css`; timers inside components (sequencing lives in engine/store only).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| FIRST_VISIT | no `portfolio:lens` in localStorage on boot | `lens()` is `'recruiter'`; store writes `'recruiter'` to key before first paint | No crash; no network |
| RESTORE | stored `'engineer'` under key before boot | `lens()` hydrates to `'engineer'` before first render; UI paints Engineer framing on first paint | No network; immediate |
| CORRUPTED | stored value is `'"foo"'`, `''`, or unknown string | `lens()` discards value and falls back to `'recruiter'`; overwrites key with `'recruiter'` | No crash, no blank state |
| TOGGLE_PERSIST | user activates toggle while open | `lens()` flips to other value; effect writes new value to localStorage immediately; View chip + panels update live | No reload, no route change |
| MISSING_VARIANT | `public/portfolio-data.json` entry has no lens variant for current lens | computed selector returns base `description`/`highlights` etc. | Graceful fallback |
| STORAGE_UNAVAILABLE | `window`/`localStorage` throws or is undefined (SSR/hardening) | `lens()` remains `'recruiter'`; app renders without persistence | Swallow via try/catch, no crash |

</intent-contract>

## Code Map

- `src/app/core/state/cluster-state.service.ts:1-160` -- Single signals store (AD-1). Private signals `#tab/#dataStatus/#content/#logs/#outage/#selectedNodeId/#selectedPodIndex/#terminalVisible` (38-45), readonly exposures (47-54), 11 computed selectors (56-93) with outage overlay pattern, methods `selectTab/selectNode/selectPod/hydrate/appendLog/beginOutage/markHalfOpen/clearOutage` (95-159). Zero `localStorage`/`lens`/`settingsOpen` today (grep 0 matches). Reuse: add `readonly #lens = signal<Lens>('recruiter')` + `lens = #lens.asReadonly()` alongside existing signals; `setLens(l:Lens)`/`toggleLens()` like `selectTab`; hydration `const v = localStorage.getItem(key); if(isLens(v)) #lens.set(v)` in constructor before first paint; `effect(() => localStorage.setItem(key, #lens()))` guarded by `typeof window !== 'undefined'` + try/catch like `appendLog:118 window.matchMedia`. Keep `LOG_CAP` pattern (200/100).
- `src/app/core/data/portfolio-data.ts:9-298` -- Typed contracts + strict parsers. Interfaces `ProjectEntry` (9-13), `ExperienceEntry` (15-20), `TopologyNode` (38-44), `TopologySection` (51-54), `MAX_TOPOLOGY_NODES=5` (57), `PortfolioData` (66-73); parsers `parseProjectEntry/ExperienceEntry/TopologyNode` (113-179) use `isRecord/isString/isStringArray/fail(section,detail)` (89-107). `parsePortfolioDataDetailed` (261-293) returns only 6 keys — extra keys dropped unless preserved. Additive: add optional `lensDescription?: {recruiter?:string, engineer?:string}` etc. with permissive validation returning `undefined` when absent; fallback in selectors.
- `public/portfolio-data.json:1-123` -- Runtime content (projects[3] Bank ABC/TATA AIG/EKAM 4-17, experience[1] Neosoft 19-32 with highlights[5], topology nodes[5] bff-gateway/onboarding/payment/deposit/core-bank-db 33-98 with metrics[3], envProperties[11] 104-116, health 117-122). Fields for lens reframing: `description`, `stack`, `highlights`, `metrics`. No lens variants yet.
- `src/app/app.ts:1-103` -- Shell controller. `sheetOpen = signal(false)` (32) is pattern to clone; `store = inject(ClusterStateService)` (30); `onSettingsClick(): void { console.log }` stub at 86-88 must become `settingsOpen = signal(false)` + toggle/close + focus return via `document.getElementById('settings-trigger')`. Keep `tabsEnabled` computed (38), `onTabKeydown` (40-67) roving focus, `toggleSheet/closeSheet` (69-84).
- `src/app/app.html:1-146` -- Shell template. Gear `L37 <button class="top-nav__icon-btn" aria-label="Settings" (click)="onSettingsClick()"><span>settings</span></button>` missing `aria-expanded/aria-controls/aria-haspopup/id`. Mobile sheet pattern `L56-83` `.mobile-tab-sheet__backdrop` + `div#mobile-tab-sheet.mobile-tab-sheet [class--open] role="dialog" aria-modal="true" (keydown.escape)` with drag handle 36x4 + 56px tabs. Footer `L136-144` `.footer__right` has two spans System Health/Uptime — slot at 138 for `<span class="footer__chip footer__chip--view">View: Recruiter</span>` read-only. Terminal `L146 <app-terminal-console id="terminal-console"/>`.
- `src/styles.css:7-522` -- Single token source. Safe-area `L164-168 --safe-* env(safe-area-inset-*,0px)`, touch `L170-173 --touch-target-* 48/56`, terminal/footer heights `L182-188 clamp(...dvh...)`, transitions `L217-219`, shared `.bottom-sheet` `L249-307` (backdrop fixed z90, sheet fixed bottom0 max60vh/min(60dvh) bg var(--surface-container-low) border-top translateY(100%) -> --open translateY0 padding-bottom var(--safe-bottom)). Reuse tokens only, no literals.
- `src/app/app.css:15-516` -- Shell styles. `.top-nav` `L15-29 sticky z50 padding calc(var(--space-sm)+var(--safe-top)) + safe-left/right`, `.top-nav__icon-btn L162-197 40x40 -> 48x48 mobile`, `.mobile-tab-sheet L199-290` duplicate of shared sheet (backdrop z90, sheet bottom0 max60vh bg low border-top radius lg padding calc(var(--space-md)+var(--safe-bottom)) translateY), Tabs `L251 min-height 56 gap 12`. Mobile-hidden `@min-width768 display none L285`.
- `src/app/features/terminal-console/terminal-console.ts:1-34, terminal-console.html:1-30, terminal-console.css:10-229` -- Fixed pane `bottom calc(var(--footer-height)+var(--safe-bottom)) z45 height var(--terminal-height)` (10-61), auto-scroll `afterRenderEffect(() => viewport.scrollTop=scrollHeight)` (store.logs()), output flex `gap var(--space-xs) font label-mono-sm`. Tip anchor: inject `> tip: toggle view in settings` as first line after boot logs or pinned suffix in `.terminal-console__output` matching `color var(--on-surface-variant)` monospace; suppress when `lens()==='engineer'` per assumption.
- `src/app/features/health-dashboard/health-dashboard.html:1-181` -- Stats use `livenessStatus()/brokerConnections()/errorRate()` (12,31,40), `profile-card` 46-78 hardcoded `Gokul / v1.8.0-RELEASE` bio `Architecting resilient…` (57-59) not bound to JSON. Opportunity: `healthTagline = computed(() => lens==='recruiter' ? recruiterBio : engineerBio)` with fallback literal.
- `src/app/features/topology/service-topology.ts:38-183, service-topology.html:1-181` -- `nodes = store.topologyNodes` (38), `layouts` MAP (43-50), helpers `isNodeDegraded/isLinkDegraded` via `store.outageDegradedNodeIds()` (56-63), sidebar `store.selectedNode()` + `store.selectedNodeMetrics()` (93/152). No `node.description` rendered. Opportunity: `displayDescription = n.lensDescription?.[lens()] ?? n.description`.
- `src/app/features/career-pods/career-pods.ts:36-42, career-pods.html:75-80` -- `pods computed` maps `experience -> {name: pod-experience-..., entry}`, `@for highlight of pod.entry.highlights` renders `[INFO] {{highlight}}`. Opportunity: `displayHighlights = entry.highlightsByLens?.[lens()] ?? entry.highlights`.
- `src/app/features/env-registry/env-registry.ts:31-40, env-registry.html:45-60` -- `filteredProperties computed` filters `content()?.envProperties` by `filterText`. Opportunity: lens-aware grouping without schema change.
- `src/app/core/state/cluster-state.service.spec.ts:1-468` -- Vitest template. Blocks: selectedTab (55-85), dataStatus/content (87-144), logs cap 200 (146-190), topology selection (192-244), career pod (246-269), degraded ids `['payment-service','core-bank-db']` + `100%` error overlay (271-326), outage lifecycle DEGRADED->HALF-OPEN->UP (328-431), terminalVisible (434-467). Add lens blocks following same shape: default `'recruiter'` readonly, `setLens->localStorage`, reload restores, corrupted fallback, `toggleLens` flips twice, no network, missing variant fallback.
- `src/app/core/state/tabs.ts:1-23` -- `TabId` union + `TABS` typed config (health-dashboard, service-topology, env-registry, career-pods, swagger-playground). No lens tab.
- `src/app/core/data/portfolio-data-loader.service.ts:23-49` -- `load()` fetches `GET {baseHref}/portfolio-data.json`, `parsePortfolioDataDetailed`, `hydrate`/`markLoadFailed`. Guard `pending` signal, `provideAppInitializer(loader.load)` at `src/app/app.config.ts:22-24`.
- Read-only evidence: `grep -r "localStorage|lens|Lens|settingsOpen|View: Recruiter|tip: toggle view" src` = 0 matches today; `src/app/app.html:37` gear has no `aria-expanded`; `src/app/app.css` already satisfies `--safe-bottom`/`dvh` token reuse; `ng test` covers FR1 health defaults `UP/2 / 2/0.00%`.

## Tasks & Acceptance

**Execution:**
- `src/app/core/state/cluster-state.service.ts` -- Add exported `Lens = 'recruiter' | 'engineer'`, `LENS_STORAGE_KEY = 'portfolio:lens'` (documented), `readonly #lens = signal<Lens>('recruiter')` + `readonly lens = #lens.asReadonly()`, `setLens(l: Lens)` (guard `isLens`), `toggleLens()` (flip), hydration in constructor (`try { const s = localStorage.getItem(KEY); if(isLens(s)) #lens.set(s); else { #lens.set('recruiter'); localStorage.setItem(KEY,'recruiter'); } } catch {}` guarded `typeof window !== 'undefined'`), and `effect(() => { try { localStorage.setItem(KEY, this.#lens()); } catch {} })`; add lens-aware computed selectors with fallback (e.g. `lensNodeDescription`, `lensHighlights` or expose `lens` for panels) so switching reframes without reload -- rationale: FR8/FR9 foundation, AD-1 store-owned, persistence before first paint, single persisted setting.
- `src/app/core/data/portfolio-data.ts` -- Add optional lens variant types (`LensMap {recruiter?:string, engineer?:string}` etc.) and extend `TopologyNode`/`ExperienceEntry`/`PortfolioData.display` with optional fields (`lensDescription`, `highlightsByLens`, `display.healthTaglineByLens/profileBioByLens` or equivalent additive `{recruiter,engineer}` object), update `parseTopologyNode`/`parseExperienceEntry`/`parsePortfolioDataDetailed` to validate optional variants permissively (validate shape when present, otherwise `undefined`), preserve additive JSON through `parsePortfolioDataDetailed` -- rationale: AD-11 code-owned contracts, additive schemavalidated against interfaces, fallback to base content when variant missing.
- `src/app/app.ts` -- Replace `onSettingsClick` stub (86) with `settingsOpen = signal(false)`, `onSettingsClick() { this.settingsOpen.update(v=>!v); }`, `closeSettings() { this.settingsOpen.set(false); document.getElementById('settings-trigger')?.focus(); }`, and keyboard/backdrop handlers; keep `sheetOpen` mobile nav intact; no Router import (AD-2) -- rationale: FR10 gear toggles `settingsOpen` driving visibility, focus returns to gear.
- `src/app/app.html` -- Update gear button at 37 to `id="settings-trigger" [attr.aria-expanded]="settingsOpen()" aria-haspopup="dialog" aria-controls="settings-surface"`; insert settings surface DOM reusing `mobile-tab-sheet` pattern (`settings-sheet__backdrop [class--open]="settingsOpen()" (click)="closeSettings()" aria-hidden`, `div#settings-surface.settings-sheet [class--open]="settingsOpen()" role="dialog" aria-modal="true" aria-labelledby="settings-title" tabindex="-1" (keydown.escape)="closeSettings()" [attr.inert]="!settingsOpen()?'' :null"` with drag handle + 48x48 close button); insert footer View chip at 138 `<span class="footer__chip footer__chip--view">View: {{ store.lens() === 'engineer' ? 'Engineer' : 'Recruiter' }}</span>` read-only; expose terminal tip hook via store/computed -- rationale: FR10 responsive surface, FR11 chip.
- `src/app/app.css` -- Add settings surface styles hand-rolled using tokens only: base `.settings-sheet/.settings-sheet__backdrop/.settings-sheet__drag-handle/.settings-sheet__close` cloned from `.mobile-tab-sheet`/`bottom-sheet` (fixed bottom0 max60vh/min(60dvh) bg var(--surface-container-low) border-top radius lg padding-bottom calc(var(--space-md)+var(--safe-bottom)) translateY(100%) -> --open translateY0 z95; backdrop fixed z90 rgba0.5); desktop `@media (min-width:768px)` popover: `position:absolute top:calc(100%+var(--space-sm)) right:calc(var(--space-lg)+var(--safe-right)) width:320px max-height:min(80vh,480px) border:1px solid var(--outline-variant) radius lg box-shadow opacity0 visibility hidden -> --open opacity1 visible; backdrop display:none; drag display:none`; segmented toggle active `bg var(--primary) color var(--on-primary)`; `prefers-reduced-motion` disables transitions; `forced-colors` 2px CanvasText outlines -- rationale: FR10 one control two presentations, AD-6 token compliance, 320px legibility.
- `src/app/app.html` + `src/app/app.css` (settings toggle control) -- Inside `#settings-surface` render exactly one control: segmented `role="group" aria-label="Content lens"` with two buttons `Recruiter`/`Engineer` (`[attr.aria-pressed]="store.lens()===...` active chip uses status tokens) or `role="switch" [attr.aria-checked]="store.lens()==='engineer'" aria-label="Content lens"`; clicking/Space/Enter calls `store.toggleLens()`/`setLens`; no density sliders or additional controls -- rationale: FR8 two states, NFR7 single-setting minimalism, visuals distinct via tokens.
- `src/app/features/terminal-console/terminal-console.html` + `terminal-console.ts` -- Render tip line `> tip: toggle view in settings` in `.terminal-console__output` as distinct monospace line matching terminal palette (e.g. `store.logs()` suffix or first line after boot sequence), visible when `lens()==='recruiter'` by default assumption (when `engineer` suppressed; document trigger in code comment), exact wording `> tip: toggle view in settings` lowercase with `>` prefix -- rationale: FR11 ambient discoverability, no coachmark.
- `src/app/features/health-dashboard/health-dashboard.html` + `service-topology/service-topology.html` + `career-pods/career-pods.html` (at minimum one panel plus generic plumbing) -- Wire `store.lens()` computed selectors to reframe visible copy live without reload (e.g. health tagline `bio = computed(() => lens==='recruiter' ? recruiterBio : engineerBio)`, topology `displayDescription = computed(() => node.lensDescription?.[lens()] ?? node.description)`, career `displayHighlights = computed(() => entry.highlightsByLens?.[lens()] ?? highlights)`); fallback to base when variant absent; no reload/route change, optional cross-fade respects `prefers-reduced-motion` -- rationale: FR8 reframing is presentation/copy only over same JSON, live without reload.
- `public/portfolio-data.json` -- Add additive optional lens variant fields (e.g. per `topology.nodes[].lensDescription` or `health.display`/`experience[].highlightsByLens`) with example recruiter/engineer strings (outcome/impact vs P99/stack/circuit-breaker); validate with updated parsers; no component code change required beyond store selectors -- rationale: content-driven seam AD-3/AD-11, pure data swap validation.
- `src/app/core/state/cluster-state.service.spec.ts` + `src/app/core/data/portfolio-json-contract.spec.ts` -- Add Vitest coverage: first-visit default `'recruiter'`; `setLens('engineer')` writes `portfolio:lens`; new TestBed instance restores `'engineer'` before first render; corrupted value `localStorage.setItem(key,'bogus')` falls back `'recruiter'` no crash; `toggleLens` flips `recruiter -> engineer -> recruiter`; computed variant returns correct per lens and fallback; `localStorage` effect is immediate; assert no `fetch`/`HttpClient` call (no network); contract spec lens variants optional and `help` when present still round-trips -- rationale: AD-9 Vitest gates, FR9 typed Lens union.
- `src/app/app.spec.ts` + `src/app/features/terminal-console/terminal-console.spec.ts` (or DOM specs) -- Add DOM coverage: gear has `aria-expanded`/`aria-controls` reflecting `settingsOpen`; surface has `role="dialog" aria-modal="true"` max60vh/drag/close 48x48; Escape/backdrop/close dismisses and focus returns to gear; focus trapped inside (first/last wrap) keyboard-only; footer chip text tracks `lens()` (`View: Recruiter`/`View: Engineer`) read-only not a toggle; terminal contains tip line when `recruiter`; absence of `*[class*="coachmark"]`, `*[class*="tutorial"]`, `*[class*="overlay"]` selectors is asserted; chip+tip use only tokens (no new literals) -- rationale: FR10/FR11 DOM contracts, focus-trap, no coachmark.

**Acceptance Criteria:**
- Given `ClusterStateService` is provided with empty `localStorage`, when the store initializes, then `lens()` is `'recruiter'`, `localStorage.getItem('portfolio:lens')` is `'recruiter'`, and no network request is issued; Given a prior `'engineer'` was persisted, when the app boots in a fresh TestBed, then the first paint `lens()` is `'engineer'` before any component renders; Given a corrupted value `'bogus'` stored, when the app boots, then `lens()` is `'recruiter'` without crash and the key is overwritten with `'recruiter'`.
- Given the settings surface is closed, when the visitor clicks the gear at `src/app/app.html:37`, then `settingsOpen` flips, the surface becomes visible, gear has `aria-expanded="true"` and `aria-controls="settings-surface"`; When the visitor presses `Escape`, clicks the backdrop, or clicks the 48x48 close button, then the surface dismisses and focus returns to `id="settings-trigger"`; When `Tab` is pressed repeatedly while open, then focus wraps first↔last inside the surface and does not escape to main/terminal.
- Given the viewport is <768px and gear is clicked, when the surface opens, then it renders as a bottom-sheet max60vh with backdrop, drag handle, `role="dialog" aria-modal="true"`; Given the viewport is ≥768px and gear is clicked, when the surface opens, then it renders as a popover absolute right-aligned to `.top-nav__actions` (same DOM source switched via media query), not a full-screen sheet; And styling uses only tokens from `src/styles.css` and respects `var(--safe-bottom)`/`dvh` and `prefers-reduced-motion: reduce` disables slide.
- Given the surface is open showing the current lens, when the visitor activates the toggle (click or Space/Enter), then `store.setLens`/`toggleLens` is called, `lens()` flips to the other value, `localStorage` updates per the key, and the active indicator updates immediately; And exactly two states exist with no third state, and no density sliders or additional controls exist in the surface.
- Given any feature panel is visible (health-dashboard, service-topology, env-registry, career-pods, swagger-playground) and `lens()` changes, when observed, then visible copy reframing updates live without page reload or route change via computed selectors, using the same `public/portfolio-data.json` data (not separate sets), falling back to base content when variant missing, and animations if any respect `prefers-reduced-motion`.
- Given the footer renders at `src/app/app.html:138`, when `lens()` is `'recruiter'`, then a read-only chip `<span class="footer__chip footer__chip--view">View: Recruiter</span>` is present in `.footer`; When `lens()` flips to `'engineer'`, then the chip text becomes `View: Engineer` instantly, styled as status-chip with Actuator tokens, and clicking the chip does not toggle lens; Given the terminal boots, when lens is `'recruiter'`, then the line `> tip: toggle view in settings` is present in `.terminal-console__output` with monospace terminal palette; And no coachmark/tutorial/highlight-ring exists anywhere in the DOM.
- Given Chrome DevTools at 320, 375, 393, 768, 1024 widths, when any panel loads and lens is toggled and page reloaded, then no horizontal scroll occurs, chip and tip remain legible at 320px, `localStorage` namespaced key holds last lens, and `ng test` (Vitest) covering lens default/restore/corrupted/toggle/computed-fallback/no-network plus DOM trap/chip/tip/coachmark-absence passes, and `ng build` succeeds.

## Spec Change Log

## Review Triage Log

### 2026-08-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8: (high 0, medium 5, low 3)
- defer: 7: (high 0, medium 2, low 5)
- reject: 10
- addressed_findings:
  - `[medium]` `[patch]` Desktop popover click-outside dismiss missing (backdrop display:none) — added HostListener document:click closing when clicking outside #settings-surface and #settings-trigger
  - `[medium]` `[patch]` Escape only on surface element, not document — added HostListener document:keydown Escape closing settings from anywhere
  - `[medium]` `[patch]` Focus trap only wraps when active is first/last, fails when focus outside surface — added contains check to focus first when outside
  - `[low]` `[patch]` Double-click race willOpen vs update not atomic — changed onSettingsClick to set(willOpen) atomically
  - `[low]` `[patch]` LensStringMap empty string passes isString and renders blank — parsers now trim and discard empty strings
  - `[low]` `[patch]` LensStringArrayMap empty array passes — parsers now trim/filter empty strings and discard empty arrays
  - `[medium]` `[patch]` displayProfileBio/displayHealthTagline returned empty string variant instead of fallback — added trim check to fallback to FALLBACK_* when variant empty
  - `[medium]` `[patch]` getNodeDisplayDescription returned empty string variant instead of base — added trim check fallback to description

## Design Notes

Settings surface reuses the mobile-tab-sheet seam: backdrop `fixed inset0 rgba(0,0,0,0.5) z90 -> --open opacity1` and sheet `fixed bottom0 max60vh bg var(--surface-container-low) border-top radius lg translateY(100%) -> --open translateY0 z95 padding-bottom calc(var(--space-md)+var(--safe-bottom))`. Desktop popover is CSS-only switch (`@media min-width:768px position:absolute right width 320`), not a second component. Segmented control active state uses `bg var(--primary) color var(--on-primary)` (status-chip). Focus trap can be `cdkTrapFocus` or manual first/last sentinel wrap; `afterRenderEffect(() => surface.querySelector('button')?.focus())` on open and `settings-trigger` focus on close. Lens variants are additive tolerant fields (`lensDescription?: {recruiter?,engineer?}`) so shipped JSON without variants still round-trips.

## Verification

**Commands:**
- `npm run test -- --run` -- expected: all Vitest specs green including new lens default/restore/corrupted/toggle/computed-fallback/no-network, DOM chip/tip/trap/coachmark-absence
- `npm run build` -- expected: success with no new JS bundle beyond lens/effect, no Router import, no raw color literals outside tokens, strict TS clean
- `npm run lint` -- expected: clean

**Manual checks (if no CLI):**
- 320/375/393/768 widths: no horizontal scroll, 320 notch respects `var(--safe-bottom)`, terminal height `clamp(120px,35dvh,200px)` portrait / `clamp(100px,25dvh,150px)` landscape
- Keyboard-only: gear -> Enter opens surface -> Tab traps -> Escape closes and focus returns -> Space toggles lens -> footer chip live updates -> reload persists via `Application -> Local Storage -> portfolio:lens`

## Auto Run Result

Status: done

Summary: Implemented Epic 7 Settings Icon Content Lens Switch (Recruiter-default) — Lens signal with localStorage persistence (portfolio:lens, recruiter default, corrupted fallback, effect before first paint), responsive settings surface (bottom-sheet <768 reusing mobile-tab-sheet pattern, popover ≥768 anchored to gear, same control two presentations via CSS), segmented toggle (Recruiter ↔ Engineer, exactly two states, aria-pressed), live computed reframing in health-dashboard (bio), service-topology (node lensDescription), career-pods (highlightsByLens) with fallback to base, footer View chip read-only and terminal tip `> tip: toggle view in settings` (recruiter only, suppressed for engineer), additive JSON variant schema with tolerant parsers.

Files changed:
- `public/portfolio-data.json` — additive lensDescription/highlightsByLens/display variants
- `src/app/core/data/portfolio-data.ts` — Lens types and tolerant parsers (trim empty handling)
- `src/app/core/state/cluster-state.service.ts` — Lens signal, hydrate/effect, setLens/toggleLens, computed selectors with trim fallback, helpers
- `src/app/app.ts` — settingsOpen signal, onSettingsClick/closeSettings, onSettingsKeydown with HostListener document Escape/click outside, focus trap fix
- `src/app/app.html` — gear aria-expanded/controls/haspopup, #settings-surface dialog with backdrop, segmented control, footer chip View: Recruiter/Engineer
- `src/app/app.css` — settings-sheet bottom-sheet/popover tokens-only styles, footer chip, reduced-motion/forced-colors
- `src/app/features/health-dashboard/health-dashboard.ts/.html` — bio computed via store.displayProfileBio
- `src/app/features/topology/service-topology.html` — lensDescription via selectedNodeDisplayDescription
- `src/app/features/career-pods/career-pods.ts/.html` — getDisplayHighlights via store lens
- `src/app/features/terminal-console/terminal-console.html/.css` — tip line conditional on recruiter
- Tests: `cluster-state.service.spec.ts`, `portfolio-json-contract.spec.ts`, `career-pods.spec.ts`, `app.spec.ts`, `terminal-console.spec.ts` — lens persistence, chip, trap, tip, contract

Review findings breakdown: patches applied 8 (medium 5, low 3), items deferred 7 (medium 2, low 5), items rejected 10.

Follow-up review recommendation: true (patched medium*3 + low = 18 >=5, no high but medium count high). Patched counts: high 0, medium 5, low 3, score 18.

Verification performed: `npm test -- --watch=false` 12 files 229 passed, `npm run build` success 321kB main 71.7kB transfer, manual keyboard/viewport checks per spec.

Residual risks: localStorage unavailable fallback keeps recruiter default via try/catch (jsdom warning expected); desktop popover right:0 inside relative .top-nav__actions vs spec right calc(safe-right) — visually aligned to actions; env-registry lens grouping not wired (spec says at minimum health/topology/career required, deferred); no cross-tab storage sync (deferred).

Blocking condition: none

