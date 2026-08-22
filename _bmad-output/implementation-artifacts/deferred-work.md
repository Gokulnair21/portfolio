# Deferred Work

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-scaffold-actuator-theme-shell.md`
  summary: Add focus-visible indicator tokens/styles to the global token stylesheet before interactive elements (tab buttons) ship in Story 1.2.
  evidence: Review found the themed shell defines no `:focus-visible` styling; the theme file is where those tokens belong before dependents arrive, but this story ships zero interactive controls.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-signals-store-tab-panel-navigation.md`
  summary: Implement the full ARIA tabs pattern for the dashboard tab bar — arrow-key/Home/End navigation with roving tabindex, `role="tabpanel"` containers with `aria-labelledby`/`aria-controls`, `:focus-visible` styling, and a live-region announcement of the newly shown panel.
  evidence: Review found the tab bar declares `role="tablist"`/`role="tab"` but ships no keyboard navigation, panel role linkage, or focus indicator; deferred because the architecture spine explicitly defers an i18n/a11y audit pass for the single-audience MVP.
