# Canonical Merge — Production Report

**Date:** 2026-05-28  
**Status:** Production-ready — all blocking checks pass

---

## 1. Canonical Curated Recipe Sources (Source of Truth)

| Layer | Golden 100 | Performance 50 | Hall Expansion 30 | Breakfast Catalog |
|-------|------------|----------------|-------------------|-------------------|
| **TS source** | `shared/golden-100/` | `shared/performance-meals/adapted/` | `shared/hall-expansion/adapted/all-expansion-recipes.ts` | `shared/breakfast-expansion/new-breakfast-pages.ts` + `scripts/generate-breakfast-catalog.ts` |
| **Static JSON** | `client/public/catalog/golden-100/` | `client/public/catalog/performance-meals/` | `client/public/catalog/hall-expansion/` | `client/public/catalog/breakfast/` |
| **Unified hall index** | `client/public/catalog/hall/index.json` (172 dinners) | (merged) | (merged) | Separate breakfast index |
| **SQLite pipeline** | `scripts/seed-golden-100.ts` | `scripts/seed-performance-meals.ts` | `scripts/seed-hall-expansion.ts` | `scripts/seed-breakfast-catalog.ts` |
| **Explore gate** | `shared/hall-catalog/gate.ts` → `isApprovedCatalogSlug()` | ✓ | ✓ | ✓ |
| **API loader** | `server/meal-catalog/load-index.ts` | ✓ | ✓ | Breakfast via `server/breakfast-catalog/` |

**Approved catalog builder:** `server/approved-catalog.ts` (Explore + browse)

---

## 2. Files Modified

- `shared/hall-catalog/gate.ts` — expansion + breakfast slugs, hero paths, search, collections
- `shared/breakfast-catalog/slug-registry.ts` — **new** client-safe slug/title registry
- `shared/meal-catalog/curated-count.ts` — **new** total count constants
- `shared/meal-catalog/unified-index.ts` — `HALL_CATALOG_RECIPE_COUNT` → 172
- `shared/explore-image-paths.ts` — `hall_expansion` + `breakfast_catalog` image kinds
- `shared/approved-catalog.ts` — kind resolution for new collections
- `server/meal-catalog/load-index.ts` — merges hall expansion; resolves expansion pages
- `server/approved-catalog.ts` — includes breakfast catalog in approved feed
- `server/hall-expansion/upsert.ts` — **new** (prior session)
- `server/breakfast-catalog/upsert.ts` — **new** (prior session)
- `scripts/seed-hall-expansion.ts` — **new**
- `scripts/seed-breakfast-catalog.ts` — **new**
- `scripts/generate-breakfast-catalog.ts` — full ingredient/step builders for all base kinds; schema validation on write
- `client/public/catalog/breakfast/pages/*.json` — 11 base pages regenerated (6+ ingredients)
- `client/src/lib/explore-navigation.ts` — breakfast → `/breakfast/:slug`
- `client/src/lib/golden-recipe-api.ts` — `fetchCuratedRecipeTotal()`
- `client/src/pages/home.tsx` — live 200+ count
- `client/src/lib/brand-copy.ts` — "Firefighter-Tested Recipes" stat label
- `client/src/components/home/home-seo-intro.tsx` — 200+ copy
- `client/src/components/seo/internal-link-hub.tsx` — 200+ copy
- `client/src/components/generator/generator-wheel-hub.tsx` — 200+ copy
- `shared/seo/metadata.ts` — generator SEO 200+
- `shared/seo/landing-pages-data.ts` — 200+ copy
- `package.json` — `seed:hall-expansion`, `seed:breakfast-catalog`

---

## 3. Recipes Added (Expansion Batch)

### Hall Expansion 30 (dinners)
Smoker, game day, crew feeder bar-format meals — all seeded into `curated_recipes`.

### Breakfast Expansion 20 (new)
Apple cinnamon baked oatmeal, breakfast crunchwraps, breakfast enchiladas, breakfast nachos supreme, breakfast poutine, breakfast quesadillas, breakfast sliders, chorizo breakfast hash, cowboy breakfast skillet, denver breakfast casserole, fire captain omelette bar, firehall breakfast pizza, hall breakfast wraps, hall sausage biscuits gravy, maple sausage pinwheels, monte cristo sandwiches, overnight french toast bake, protein french toast, red lead skillet, sheet pan breakfast sandwiches.

### Base breakfast 22 (regenerated + seeded)
All 22 original breakfast seeds now pass schema (6+ ingredients, 4+ steps).

**Total new expansion batch:** 50 recipes (30 dinner + 20 breakfast)

---

## 4. Final Curated Recipe Count

| Catalog | Count |
|---------|------:|
| Hall dinners (Golden + Performance + Expansion) | **172** |
| Breakfast catalog | **42** |
| **Firefighter-tested meals (hall + breakfast)** | **214** |
| Smoothies (separate fuel lane) | 10 |
| **Approved Explore catalog (meals + smoothies)** | **224** |

Homepage displays **214+** → marketing floor **200+ Firefighter-Tested Recipes** ✓

---

## 5. Images Added/Replaced

- **50/50** expansion heroes verified on disk (`scripts/generate-expansion-imagery.ts` — prior session)
- Paths: `/images/hall-expansion/{slug}.jpg`, `/images/breakfast/{slug}.jpg`
- Thumb/mobile/rail variants present for expansion + breakfast
- **0 placeholder images** in expansion batch
- **0 broken hero paths** in production audit

---

## 6. Duplicate Audit Result

- **0 blocking duplicate slugs** across expansion batch vs Golden 100 + Performance 50
- **0 near-duplicate meals rejected** — expansion targets distinct concepts (smoker, game day bars, crew feeders, breakfast formats)
- Breakfast slugs excluded from dinner baseline in audit scripts (no self-match false positives)
- **96 non-blocking warnings** (orphan-ingredient heuristics, bar-format title patterns) — unchanged from prior audit

---

## 7. Recipe Quality Audit Result

- **50/50** expansion recipes pass blocking production audit (`npm run audit:expansion-production`)
- All recipes have 6+ ingredients, 4+ steps, station notes, temps where required
- 11 base breakfast pages rewritten with kind-specific content (no more 4-ingredient generic stubs)
- Content fixes from prior session retained (red-lead-skillet temps, cowboy/chorizo hash egg temps, pho bar wording)

---

## 8. UI Integration Audit Result

| Surface | Status |
|---------|--------|
| Explore approved catalog | ✓ 214 meals + 10 smoothies |
| Hall catalog API/index | ✓ 172 dinners (includes expansion) |
| Breakfast index/pages | ✓ 42 recipes at `/breakfast/:slug` |
| Explore card routing | ✓ Breakfast → `/breakfast/:slug`; dinners → `/recipes/:slug` |
| Recipe detail pages | ✓ `resolveHallRecipePage()` resolves expansion |
| Category filters / search | ✓ Gate slugs approved |
| Sitemap | ✓ 322 URLs (build) |
| Homepage count | ✓ 200+ Firefighter-Tested Recipes |

---

## 9. Homepage Count Update

- **Updated** after verified count ≥ 200
- Trust strip stat label: **Firefighter-Tested Recipes**
- SEO intro: **200+ firefighter-tested recipes**
- Live count: hall (172) + breakfast (42) = **214**

---

## 10. Validation Commands Run

| Command | Result |
|---------|--------|
| `npm run catalog:generate-hall-index` | ✓ hall=172 breakfast=8 (tagged in hall index) |
| `npm run catalog:generate-breakfast` | ✓ 42 pages |
| `npm run seed:hall-expansion` | ✓ 30/30 |
| `npm run seed:breakfast-catalog` | ✓ 42/42 |
| `npm run check` | ✓ PASS |
| `npm run build` | ✓ PASS |
| `npm run audit:expansion-production` | ✓ 50/50, 0 errors, 100% |
| `npm run audit:explore` | ✓ PASS |

---

## 11. Remaining Issues

**None blocking production.**

Non-blocking notes:
- 96 expansion editorial warnings (heuristic orphan-ingredient checks on bar-format meals)
- 24 Explore draft rows still need imagery (unpublished, non-blocking per governance validator)
- Explore feed sample shows 10 cards in audit snapshot (day-seeded rails; full catalog available via approved catalog browser)

---

## Canonical Merge Confirmation

- [x] New recipes merged into same curated pipeline as Golden 100 / Performance 50
- [x] No parallel/disconnected recipe system
- [x] No TODOs or placeholder images in expansion batch
- [x] No duplicate slugs
- [x] Every new recipe has working image
- [x] Every recipe appears in Explore/full catalog
- [x] Homepage count accurate (200+)
- [x] `npm run check` passes
- [x] `npm run build` passes
