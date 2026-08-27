# Deferred Work

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-scaffold-actuator-theme-shell.md`
  summary: Add focus-visible indicator tokens/styles to the global token stylesheet before interactive elements (tab buttons) ship in Story 1.2.
  evidence: Review found the themed shell defines no `:focus-visible` styling; the theme file is where those tokens belong before dependents arrive, but this story ships zero interactive controls.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-signals-store-tab-panel-navigation.md`
  summary: Implement the full ARIA tabs pattern for the dashboard tab bar — arrow-key/Home/End navigation with roving tabindex, `role="tabpanel"` containers with `aria-labelledby`/`aria-controls`, `:focus-visible` styling, and a live-region announcement of the newly shown panel.
  evidence: Review found the tab bar declares `role="tablist"`/`role="tab"` but ships no keyboard navigation, panel role linkage, or focus indicator; deferred because the architecture spine explicitly defers an i18n/a11y audit pass for the single-audience MVP.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-terminal-console-log-pane.md`
  summary: Add terminal-console accessibility semantics — `role="log"` with `aria-live` announcement of new entries, keyboard-scrollable viewport, and a non-color level cue.
  evidence: Review found the new console pane conveys log levels by color alone, announces nothing to assistive tech, and its scroll viewport is not keyboard-reachable; consistent with the project-wide i18n/a11y audit pass already deferred in this file.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-simulationengine-outage-trigger.md`
  summary: Add accessibility semantics to the outage simulation controls — live-region announcement of the DEGRADED transition, a spoken reason for the disabled button, and :focus-visible styling for `.outage-button`.
  evidence: Review found the outage control announces nothing to assistive tech and its disabled state gives no reason; consistent with the project-wide i18n/a11y audit pass already deferred in this file (tabs ARIA, console log semantics, focus-visible tokens).
- source_spec: `_bmad-output/implementation-artifacts/spec-sprint-status-review-reconciliation.md`
  summary: Run or explicitly skip the Epic 1 retrospective now that all four of its stories are done.
  evidence: Review found `epic-1-retrospective: optional` left undecided after epic-1 flipped to done; the run/skip decision is human-owned.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-auto-recovery-sequence.md`
  summary: Add `:focus-visible` styling to the new recovery button (and verify parity with `.outage-button`) as part of the project-wide focus-visible pass.
  evidence: Review found the recovery button styles hover/disabled but no keyboard focus indicator, extending the focus-visible gap already deferred from stories 1-1/1-2 to a newly shipped control.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-auto-recovery-sequence.md`
  summary: Announce recovery completion to assistive tech — the HALF-OPEN banner uses `role="status"` on appearance, but its removal and the return-to-UP transition have no live-region cue.
  evidence: Review found assistive-tech users get no "recovered" announcement; consistent with the project-wide i18n/a11y audit pass already deferred in this file.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-2-completion.md`
  summary: Run or explicitly skip the Epic 2 retrospective now that all three of its stories are done.
  evidence: Review found `epic-2-retrospective: optional` left undecided after epic-2 flipped to done; the run/skip decision is human-owned, same as the epic-1 precedent.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-3-cluster-exploration-panels.md`
  summary: Run or explicitly skip the Epic 3 retrospective now that all three of its stories are done.
  evidence: Review found `epic-3-retrospective: optional` left undecided after epic-3 flipped to done; the run/skip decision is human-owned, same as the epic-1/epic-2 precedent.
- source_spec: `_bmad-output/implementation-artifacts/spec-epic-4-swagger-contact-playground-go-live.md`
  summary: Run or explicitly skip the Epic 4 retrospective now that all three of its stories are done.
  evidence: Review found `epic-4-retrospective: optional` left undecided after epic-4 flipped to done; the run/skip decision is human-owned, same as the epic-1/epic-2/epic-3 precedent.
- source_spec: `_bmad-output/implementation-artifacts/spec-redesign-ui-to-design-mockups.md`
  summary: Add ARIA live regions for dynamic status updates (liveness status, error rate, data status) — screen readers currently miss health transitions.
  evidence: Blind-hunter review found reactive status signals change without aria-live="polite" or role="status" containers.
- source_spec: `_bmad-output/implementation-artifacts/spec-redesign-ui-to-design-mockups.md`
  summary: Add loading/skeleton states with aria-busy for async panels (career pods, env registry, health dashboard, topology) — currently only static placeholders.
  evidence: Blind-hunter review found no skeleton loaders or spinners during data fetch.
- source_spec: `_bmad-output/implementation-artifacts/spec-redesign-ui-to-design-mockups.md`
  summary: Add per-panel error boundaries with retry affordance and error message display — currently only app-shell failure panel exists.
  evidence: Blind-hunter review found dataStatus === 'error' renders empty panel in feature components.
- source_spec: `_bmad-output/implementation-artifacts/spec-redesign-ui-to-design-mockups.md`
  summary: Implement RTL layout support using logical properties (margin-inline, border-inline, flex logical) — currently flex/grid uses physical directions.
  evidence: Blind-hunter review; architectural gap predating this redesign.
- source_spec: `_bmad-output/implementation-artifacts/spec-redesign-ui-to-design-mockups.md`
  summary: Add @media print stylesheet — footer, tab bar, sidebar, animations, dark backgrounds print poorly.
  evidence: Blind-hunter review; architectural gap predating this redesign.
- source_spec: `_bmad-output/implementation-artifacts/spec-redesign-ui-to-design-mockups.md`
  summary: Add will-change/contain to long-running animations for compositor performance — 7 concurrent infinite animations risk thread contention.
  evidence: Blind-hunter review; new animations added by redesign.
- source_spec: `_bmad-output/implementation-artifacts/spec-redesign-ui-to-design-mockups.md`
  summary: Add light-mode theme variant or prefers-color-scheme support — currently color-scheme: dark only despite token restructure.
  evidence: Blind-hunter review; spec explicitly forbids light mode but future theming needs hook.
- source_spec: `_bmad-output/implementation-artifacts/spec-redesign-ui-to-design-mockups.md`
  summary: Migrate responsive components to container queries instead of viewport breakpoints — currently @media (max-width: 60rem).
  evidence: Blind-hunter review; architectural improvement for nested layout flexibility.
- source_spec: `_bmad-output/implementation-artifacts/spec-redesign-ui-to-design-mockups.md`
  summary: Document design token rationale inline in styles.css — currently only references design.html line numbers.
  evidence: Blind-hunter review; maintenance burden increased.
- source_spec: `_bmad-output/implementation-artifacts/spec-redesign-ui-to-design-mockups.md`
  summary: Measure and optimize Google Fonts bundle impact — 3 families likely add 100-200KB critical path; consider subsetting/self-hosting.
  evidence: Blind-hunter review; new font loads added by redesign.
- source_spec: `_bmad-output/implementation-artifacts/spec-terminal-toggle-visibility.md`
  summary: Add @supports fallback for :has(app-service-topology) selector used in main-content topology padding variants.
  evidence: Edge-case review found :has unsupported in older browsers causes topology content to overlap footer/terminal; topology padding logic existed pre-story but new visibility variants extend the same selector.
