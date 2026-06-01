# Sprint 3 — Library Integrity Report

**Date:** 2026-05-29  
**Scope:** Trust audit items #9, #13–17, #22–25

## Completed (this sprint)

| # | Item | Status |
|---|------|--------|
| **13** | Wheel CTA → `/recipes/:slug` | Done (Sprint 2) |
| **15** | Suspicious nutrition entries | Mostly done — 355/356 OK, 1 suspicious (`lumberjack-breakfast-platter`) |
| **16** | Recipes index fetch error + retry | **Done** — `recipes-index.tsx` shows error + Try again |
| **17** | Favorites device-only banner + export | **Done** — banner + JSON export in `favorites.tsx` / `saved-meals.ts` |
| **22** | Deprecate `/explore/recipe/:id` | **Done** — redirects to `/recipes/:slug` when catalog slug is known |
| **25** | Cook-mode sticky step nav | **Done** — sticky step pills on `golden-recipe-page.tsx` |

### Code changes

- **`recipes-index.tsx`** — `isError` / `refetch` UI with retry button
- **`favorites.tsx`** — “Saved on this device only” banner + Export JSON
- **`saved-meals.ts`** — `exportSavedMealsJson()`, `downloadSavedMealsExport()`
- **`explore-navigation.ts`** — `resolveExploreLegacyRedirect()`
- **`explore.tsx`**, **`explore-recipe-detail-page.tsx`** — client redirect to canonical catalog routes
- **`explore-detail-types.ts`**, **`explore-recipe-detail.ts`**, **`hall-package-explore-detail.ts`** — `_catalogSlug` on API payload
- **`golden-recipe-page.tsx`** — `RecipeCookStepNav` sticky step navigator
- **`chicken-dumpling-soup.json`** — step title fix for template-language gate
- **`beef-barley-soup.json`** — added 4th instruction step for catalog validation

## Validation

| Check | Result |
|-------|--------|
| `npm run check` | **PASS** |
| `npm run audit:nutrition-integrity` | **PASS** (1 macro divergence remaining) |
| `npm run audit:catalog-duplicates` | Report only — 32 exact dupes, 278 significant pairs |
| `npm run catalog:verify` | **PASS** (fixed `beef-barley-soup` step count) |
| `npm run dev` | **Running** on port 5000 |

## Remaining (data / ongoing)

| # | Item | Notes |
|---|------|-------|
| **9** | 28 duplicate recipe pairs | `review/duplicate-report.json` — merge/differentiate pass needed |
| **14** | Vision QA image queue (~23) | `review/image-accuracy-regen-queue.txt` |
| **23** | Image governance (57 failures) | `review/curated-image-governance-report.json` |
| **24** | Master audit Phase 3 (94 ingredient fixes) | `review/master-recipe-audit.json` |

## Manual QA checklist

- [ ] `/recipes` — disconnect network, confirm error + retry
- [ ] `/favorites` — save a meal, confirm banner + export downloads JSON
- [ ] `/explore/recipe/:id?slug=<approved-slug>` — redirects to `/recipes/:slug`
- [ ] `/recipes/<slug>` — scroll steps section, confirm sticky step nav appears and jumps
