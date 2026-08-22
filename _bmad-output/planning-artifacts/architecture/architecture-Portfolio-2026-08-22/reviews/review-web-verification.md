# Web Verification Review — ARCHITECTURE-SPINE.md

**Reviewer:** Currency verification pass (web-searched, review-only)
**Date:** 2026-08-22
**Scope:** Verify every named technology / committed decision in the architecture spine against current (Aug 2026) reality.
**Verdict: PASS with minor notes.** All committed technologies are current and fit as of August 2026. No blocking findings.

---

## Findings by Technology

### 1. Angular ^22.1 — ✅ CURRENT
- Angular 22.0.0 released 2026-06-03; active branch latest patch **22.1.2** (released 2026-08-13). The spine's `^22.1` constraint correctly resolves to it.
- Active support through ~2027-06 per versionlog.com lifecycle table. Angular 22 is the current active major; 21 and 20 in LTS.
- Note: 22.2 is in pre-release (`22.2.0-next.2`). Not a concern for a caret range.

### 2. TypeScript "6.x" — ✅ CURRENT, ⚠️ MINOR IMPRECISION
- Angular v22 requires **TypeScript >=6.0.0 <6.1.0** (per angular.dev/reference/versions). TS 7.0 has shipped (mid-2026) but is explicitly *unsupported* by Angular 22 (GitHub issue angular/angular#69704, closed not-planned).
- Spine's stack entry "TypeScript | 6.x" overstates the allowed window: only 6.0.x works. Recommend tightening to `~6.0` or documenting the peer range to avoid an accidental `npm i typescript@latest` breaking `ng build`. Non-blocking (a caret on 6.0 would also drift into 6.1+).

### 3. Vitest via `ng test` (AD-9) — ✅ CURRENT
- Vitest is the **default** test runner for `ng test` in Angular 21+ and remains so in v22 CLI docs (`runner` option default = `vitest`; Karma deprecated). The claim "unit tests run via `ng test` (Vitest)" matches official docs exactly.
- Implementation note (not a spine defect): new projects need `jsdom` or `happy-dom` installed as a DOM emulation dependency; the builder is `@angular/build:unit-test`.

### 4. @angular/build (esbuild) builder — ✅ CURRENT
- Webpack-based builders (`@angular-devkit/build-angular`, `@ngtools/webpack`) are deprecated in v22; the esbuild-based application builder is the standard path. Spine's choice is the correct, forward-compatible one.

### 5. Standalone / signals-first / OnPush / built-in control flow defaults (AD-8) — ✅ CURRENT
- Angular 22 promotes these idioms to defaults/stable: OnPush default for new components, zoneless change detection default since v21, strict templates on by default, Signal Forms stable in v22. AD-8's baseline is aligned with, not behind, current idiom.
- Note (optional): AD-8 doesn't mention zoneless explicitly; since v22 apps are zoneless by default, the spine's silence is fine, but stating "zoneless" would future-proof the invariant.

### 6. GitHub Actions Pages deployment (AD-7) — ✅ CURRENT & RECOMMENDED
- Custom GitHub Actions workflows are the officially recommended publishing source for Pages (GA since March 2024; GitHub's own starter workflows use `actions/configure-pages`, `actions/upload-pages-artifact@v4`, `actions/deploy-pages@v4`). Branch-based deployment is the legacy option. AD-7's pattern (build → upload artifact → deploy) is exactly the documented flow.
- Minor implementation note: pin action versions (`actions/checkout@v6` era; runners now default to Node 24) when writing deploy.yml.

### 7. EmailJS free tier (AD-4) — ✅ EXISTS
- Verified live pricing page + Aug 2026 trackers: Free tier still exists — **200 monthly requests**, 2 email templates, 50KB payload cap, limited contacts history, no credit card required. Adequate for a portfolio contact form.
- Risk note: free tier requires requests from an allowed origin/domain configuration; ensure the EmailJS adapter documents the public-key/service/template config rather than hardcoding IDs (consistent with AD-4 port isolation).

### 8. Other named tech
| Item | Status |
| --- | --- |
| Node.js >= 22 | ✅ Angular 22 supports Node `^22.22.3`, `^24`, `^26`. `>= 22` is valid but could be tightened; note GH Actions runners now default Node 24. |
| Hand-authored SVG topology (AD-5) | ✅ No currency risk; no library dependency. |
| CSS custom properties / no Tailwind (AD-6) | ✅ Framework-agnostic; no verification needed. |
| Playwright deferred E2E | ✅ Current and maintained. |
| HttpClient JSON fetch (AD-3) | ✅ Note: Angular 22 HttpClient defaults to fetch backend; no impact on the decision. |

---

## Assertions made without full verification
None material. Everything asserted in the spine was independently corroborated. Two soft spots:
1. **TS "6.x"** — technically true but misleadingly broad (see Finding 2).
2. **Node ">= 22"** — open-ended lower bound is fine today, but Angular's supported matrix will move; the spine has no revisit condition pinned to Node versions.

## Recommended edits (non-blocking)
1. Stack table: change `TypeScript | 6.x` → `TypeScript | ~6.0 (Angular 22 peer: >=6.0 <6.1)`; add note that TS 7 is unsupported on Angular 22.
2. Stack table: tighten `Node.js | >= 22` → `^22.22.3 || ^24 || ^26` (Angular 22 supported matrix).
3. AD-8: optionally add "zoneless change detection" to the idiom baseline (default since v21/v22).
4. AD-9: add one line noting the required DOM-emulation dev dependency (`jsdom`/`happy-dom`) for Vitest under `ng test`.
