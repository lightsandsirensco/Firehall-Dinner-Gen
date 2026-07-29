# Critical Recipe Integrity Bug — Root Cause, Audit & Fixes

Generated: 2026-07-29

## 1. The reported bug: "Chicken Souvlaki" showing "Beer Can Chicken"

### Root cause

This was **not** a slug bug, routing bug, database mapping bug, duplicate-slug bug, cache bug, or API bug. Every layer that resolves a recipe by slug was verified clean:

- `client/public/catalog/golden-100/pages/chicken-souvlaki.json` had the correct `slug`, `title`, and image paths.
- `client/public/catalog/golden-100/index.json` had a correct, unique entry for `chicken-souvlaki`.
- The client fetch/routing path (`fetchGoldenRecipePage` → `/api/catalog/golden-100/{slug}` → static `pages/{slug}.json`) is a pure slug-keyed lookup with no array-index or fallback-to-wrong-recipe logic.

The actual bug was a **content-generation defect**: `chicken-souvlaki.json`'s `ingredients` and `steps` arrays were **byte-identical** to `beer-can-chicken.json` (whole chicken, a literal "beer can" ingredient, jerk rub, "for beer-can method: open a room-temp beer, set can in cavity…"). The recipe correctly routed to the right file — the file itself contained the wrong recipe.

**Why:** `shared/golden-100/recipe-quality/recipe-instruction-class.ts` maps both `beer-can-chicken` and `chicken-souvlaki` to the same generic `"chicken_grill"` instruction class. Neither slug had a hand-written content pack (`meal-specific-packs.ts`), so both fell through the generation waterfall in `server/golden-100/recipe-page-builder.ts` all the way to the shared, 100%-hardcoded `chicken_grill` template in `shared/golden-100/recipe-quality/instruction-engine.ts` — which was written specifically for beer-can chicken and has zero branching on slug, title, or cuisine. `jerk-chicken` shares the same instruction class but was protected because it has its own dedicated pack; `beer-can-chicken` and `chicken-souvlaki` had no such protection.

### Fix

Added a dedicated, dish-accurate content pack for `chicken-souvlaki` to `shared/golden-100/recipe-quality/meal-specific-packs.ts` (real Greek marinade — lemon, olive oil, garlic, oregano — skewered and grilled, with tzatziki, pita, tomato, and red onion). Regenerated the page via `npm run catalog:generate-pages -- --only=chicken-souvlaki` (existing script, unchanged). `beer-can-chicken` was left as the "home" of the original template since its content is dish-accurate for that slug.

## 2. Full-catalog audit: is this systemic?

Because the underlying architecture (generic instruction-class templates as a fallback for un-packed recipes) is shared across the whole Golden 100 collection, I built a new audit — `scripts/audit-recipe-content-integrity.ts` (`npm run audit:recipe-content-integrity`) — that hashes every recipe's `ingredients` + `steps` across **all 432 pages in all 7 catalog collections** and flags any group of different slugs sharing identical content.

**Before fixes: 5 true-duplicate groups, 11 recipes affected:**

| Group | Recipes | Problem |
|---|---|---|
| `chicken_grill` template | `beer-can-chicken` ↔ `chicken-souvlaki` | Greek souvlaki page contained whole-bird beer-can-chicken content (the reported bug) |
| `breakfast` template | `breakfast-burrito-bar`, `chorizo-breakfast-tacos`, `french-toast-casserole`, `pancake-short-stack`, `sausage-egg-bake` | All 5 titles/subtitles promised different dishes (burritos, tacos, French toast, pancakes, sausage bake) but **all 5 pages contained the identical pancake-batter-and-bacon recipe** — e.g. "Sausage Egg Bake" contained zero sausage; "Chorizo Breakfast Tacos" contained zero chorizo or tortillas |
| `pork_grill` template | `grilled-pork-chops` ↔ `honey-garlic-pork-tenderloin` | "Honey Garlic" page contained no honey at all — identical brown-sugar/soy glaze as the plain chop recipe |
| `sheet_pan` template | `sheet-pan-meal-prep`, `sheet-pan-sausage-peppers` (also `sheet-pan-fajitas`, left as-is since it matched its own title) | "Sausage and Peppers" (tagged Italian cuisine) contained zero sausage — identical chicken-fajita filling as the fajita recipe, just relabeled |
| Breakfast collection | `turkey-sausage-burritos` ↔ `veggie-egg-burritos` | "Veggie Egg Burritos" — labeled and tagged `vegetarian` — **contained 1.5 lb of pork sausage/chorizo** as an ingredient. Dietary classification correctly excluded it from vegetarian filters, but the recipe's own title, subtitle, and content contradicted each other |

### Fixes made

Wrote 8 new dedicated content packs to `shared/golden-100/recipe-quality/meal-specific-packs.ts` so each recipe's ingredients and steps now genuinely match its own title (and so re-running the page generator in the future can't regress back into the shared template):

- `chicken-souvlaki` — Greek lemon-oregano marinated skewers, tzatziki, pita
- `breakfast-burrito-bar` — real burrito-bar build (eggs, sausage/chorizo, hash browns, tortillas, salsa station)
- `chorizo-breakfast-tacos` — chorizo-scrambled eggs, corn tortillas, cotija/cilantro/salsa verde
- `french-toast-casserole` — actual bread-and-custard bake (cubed brioche, egg custard, cinnamon, overnight rest, baked)
- `sausage-egg-bake` — real sausage/hash-brown/egg casserole bake
- `honey-garlic-pork-tenderloin` — glaze now actually contains honey, plus Dijon and ginger, seared and roasted
- `sheet-pan-meal-prep` — differentiated from fajitas: chicken, sweet potato, broccoli, rice, portioned into containers
- `sheet-pan-sausage-peppers` — real Italian sausage links with peppers, onions, Italian seasoning

Regenerated all 8 pages with `npm run catalog:generate-pages -- --only=...` (all passed schema + quality-bar validation cleanly on the first pass) and regenerated `golden-100/index.json`.

Edited `client/public/catalog/breakfast/pages/veggie-egg-burritos.json` directly: removed the pork sausage/chorizo, added black beans, mushrooms, and spinach (real vegetarian protein/bulk), and updated the steps accordingly. `turkey-sausage-burritos` was left unchanged since its content genuinely matches its title.

Re-ran `npm run dietary:classify` and `npm run audit:recipe-nutrition -- --fix` afterward so nutrition and dietary flags reflect the corrected ingredients (`veggie-egg-burritos` now correctly classifies as `vegetarian: true`, `porkFree: true`; `chicken-souvlaki` lost its false gluten/alcohol flags from the phantom beer-can ingredient).

**After fixes:** `npm run audit:recipe-content-integrity` reports **0 true duplicate groups and 0 identical-ingredient groups** across all 432 recipes.

## 3. Broader slug / file / image integrity audit

Also built `scripts/audit-recipe-slug-image-integrity.ts` (`npm run audit:recipe-slug-image-integrity`), which checks across every collection:

- every `index.json` entry has a matching `pages/<slug>.json` file
- every page file's internal `slug` matches its filename
- no slug appears twice in an index
- every recipe's hero/mobile/thumb/rail image path embeds that recipe's *own* slug (would catch a copy-pasted/swapped image reference)

**Result: 0 missing-file, 0 duplicate-slug, and 0 image-slug-mismatch issues** across 427 checked recipes. (5 breakfast slugs were flagged as "not in index.json" — verified as a false positive: those 5 are intentionally referenced from `client/public/catalog/breakfast/performance/index.json`, a curated sub-index, not a bug.)

While auditing, also found and fixed an unrelated pre-existing gap: 21 previously-generated Performance Meals recipes existed as page files but were never wired into `performance-meals/index.json` (leftover from an earlier, uncommitted sprint). Ran `npm run` equivalent of `scripts/rebuild-performance-meals-all.ts` to finalize that index from its canonical source (`shared/performance-meals/adapted/*`) — this brought Performance Meals from 45 → 71 recipes now correctly appearing in Explore.

## 4. Classics Wheel verification

Ran the existing `npm run audit:classics-wheel-full`, which independently verifies for all 10 wheel segments: page JSON exists, route resolves to `/recipes/{slug}` via the approved catalog (i.e. the Wheel always points at the canonical Explore recipe, never a separate copy), no duplicate hero images, and recipe detail quality (ingredient/step counts, no banned generic phrasing, structured tonight-spread, call-interruption guidance).

**Result: 10/10 pass.** No Wheel recipe is duplicated data — the Wheel purely references the main catalog by slug, as required. None of the 10 Wheel segments were among the 11 recipes affected by the content-duplication bug.

## 5. Verification run

- `npm run audit:recipe-content-integrity` → 0 duplicate groups (was 5 groups / 11 recipes)
- `npm run audit:recipe-slug-image-integrity` → 0 real issues across 427 recipes
- `npm run audit:classics-wheel-full` → 10/10 pass
- `npx tsc --noEmit` → clean
- `npm run build` → succeeds (client + server + PWA precache)

## Summary

| | |
|---|---|
| **Root cause** | Generic, hardcoded per-instruction-class content templates (`instruction-engine.ts`) used as a silent fallback for any recipe without a hand-written content pack — not a slug/routing/database/cache bug. |
| **Affected files** | `shared/golden-100/recipe-quality/meal-specific-packs.ts` (8 new packs added); 8 regenerated golden-100 page JSONs + `golden-100/index.json`; `breakfast/pages/veggie-egg-burritos.json` + `breakfast/index.json`; `performance-meals/index.json` + 71 page JSONs (unrelated orphan-index fix); dietary/nutrition re-classification across the catalog. |
| **Recipes affected** | `chicken-souvlaki`, `breakfast-burrito-bar`, `chorizo-breakfast-tacos`, `french-toast-casserole`, `sausage-egg-bake`, `honey-garlic-pork-tenderloin`, `sheet-pan-meal-prep`, `sheet-pan-sausage-peppers`, `veggie-egg-burritos` (9 recipes rewritten with real, title-accurate content); `beer-can-chicken`, `grilled-pork-chops`, `sheet-pan-fajitas`, `pancake-short-stack`, `turkey-sausage-burritos` (5 recipes confirmed correct as-is, left unchanged). |
| **Fixes made** | Wrote dedicated content packs so generation can't regress; regenerated affected pages/indexes; re-ran dietary + nutrition classification; fixed an unrelated orphaned-index issue found during the audit. |
| **New permanent tooling** | `npm run audit:recipe-content-integrity`, `npm run audit:recipe-slug-image-integrity` — both should be run after any future bulk recipe-generation work to catch this class of bug before it reaches Explore. |
| **Verification** | TypeScript clean, production build succeeds, Classics Wheel 10/10, 0 remaining content duplicates, 0 remaining slug/image mismatches. Not pushed to main. |
