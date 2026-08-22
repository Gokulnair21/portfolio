# Deferred Work

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-project-scaffold-actuator-theme-shell.md`
  summary: Add focus-visible indicator tokens/styles to the global token stylesheet before interactive elements (tab buttons) ship in Story 1.2.
  evidence: Review found the themed shell defines no `:focus-visible` styling; the theme file is where those tokens belong before dependents arrive, but this story ships zero interactive controls.
