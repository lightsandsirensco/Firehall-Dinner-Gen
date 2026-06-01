# Sprint 1 Trust Blockers — Implementation Report

**Completed:** 2026-06-01  
**Scope:** Sprint 1 only — no new recipes, no homepage redesign, no Explore layout changes.

---

## Validation results

| Command | Result |
| --- | --- |
| `npm run catalog:verify` | **PASS** (100/100 Golden pages) |
| `npm run audit:firehall-meals-production` | **228 recipes** · detail 228/228 · duplicate heroes **0** |
| `npm run audit:title-dish-identity` | **228/228 pass** |
| `npm run audit:approved-duplicate-heroes` | **0 duplicate groups** (approved catalog) |
| `tsx scripts/test-soup-instruction-routing.ts` | **OK** |

---

## 1. Soup routing bug — FIXED

**Files:** `shared/golden-100/recipe-quality/recipe-instruction-class.ts`

- Slug map: `beef-barley-soup` → `soup`, `chicken-dumpling-soup` → `soup`
- Title inference: soup/stew/barley/dumpling → `soup`; chili only when title explicitly says chili (not “honey chili” flavor names)

**Regression test:** `scripts/test-soup-instruction-routing.ts` (in `npm run check`)

---

## 2. Beef Barley Soup — REWRITTEN

**File:** `client/public/catalog/golden-100/pages/beef-barley-soup.json`

| Before | After |
| --- | --- |
| Ground beef chili template | Beef chuck + **pearl barley** + mirepoix |
| Kidney beans, chili powder | Beef broth, tomato paste, bay/thyme |
| “Bloom spices”, “chili splatters” | Simmer until barley tender, hold at 180°F |

---

## 3. Chicken Dumpling Soup — REWRITTEN

**File:** `client/public/catalog/golden-100/pages/chicken-dumpling-soup.json`

| Before | After |
| --- | --- |
| Same chili template as beef-barley | Bone-in chicken thighs + drop dumplings |
| Ground beef, beans | Flour, baking powder, milk dumpling batter |
| No dumplings | Steamed dumpling doneness cues (15–18 min covered) |

---

## 4. Nutrition zero guard — FIXED

**File:** `client/src/components/recipe-nutrition-panel.tsx`

- Shows **“Nutrition estimate coming soon.”** when all macros invalid
- Hides individual rows with `0` / `null` / `undefined`
- Never renders fake zero macros

---

## 5. Catalog save — FIXED

**Files:**
- `client/src/pages/golden-recipe-page.tsx` — Save recipe button + saved state
- `client/src/lib/catalog-recipe-save.ts` — catalog → `ClientRecipeResponse`
- `client/src/lib/saved-meals.ts` — `catalog:{slug}` IDs, `isCatalogMealSaved()`

---

## 6. Explore detail blank page — FIXED

**File:** `client/src/pages/explore-recipe-detail-page.tsx`

- Fallback UI instead of `return null`
- **Back to Explore** + **Browse Recipes** (`/recipes`)
- Dev-only `console.warn` diagnostic

---

## 7. Duplicate hero groups (approved) — PASS

**New audit:** `scripts/audit-approved-duplicate-heroes.ts`  
**Report:** `review/approved-duplicate-heroes-audit.json`

Approved catalog: **0 duplicate hero byte groups**. Full corpus duplicates outside approved scope are listed in `review/image-trust-report.json` (not Sprint 1 blockers).

---

## 8. Title ↔ dish identity gate — ADDED

**Files:**
- `shared/meal-format-contract.ts` — `titleMatchesDishIdentity()`
- `shared/recipe-quality/curated-recipe-quality-audit.ts` — wired into quality audit
- `scripts/audit-title-dish-identity.ts` — standalone audit
- **Report:** `review/title-dish-identity-audit.json`
- **npm:** `audit:title-dish-identity` (included in `npm run check`)

---

## Files changed (Sprint 1)

| Area | Files |
| --- | --- |
| Soup routing | `recipe-instruction-class.ts` |
| Soup content | `beef-barley-soup.json`, `chicken-dumpling-soup.json` |
| Nutrition UI | `recipe-nutrition-panel.tsx` |
| Save | `golden-recipe-page.tsx`, `catalog-recipe-save.ts`, `saved-meals.ts` |
| Explore | `explore-recipe-detail-page.tsx` |
| Identity audit | `meal-format-contract.ts`, `curated-recipe-quality-audit.ts`, `master-recipe-audit.ts` |
| Tests/audits | `test-soup-instruction-routing.ts`, `audit-title-dish-identity.ts`, `audit-approved-duplicate-heroes.ts` |
| Config | `package.json` |

---

## Remaining (outside Sprint 1)

- Full corpus image accuracy (203/761 in `review/image-accuracy-audit.json`) — non-approved recipes
- Vision QA failures on image regen queue (23 recipes)
- Homepage simplification, search analytics, Hall Vote tracking
- 166 suspicious nutrition macro divergences (not zero display)
- Favorites localStorage-only persistence warning
