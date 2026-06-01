# Dynamic Crew Scaling — Implementation Report

Generated: 2026-05-31

## Summary

All **376 catalog recipes** now store ingredients at **canonical base 8 firefighters**. The UI scales dynamically to **2, 4, 6, 8 (default), or 10** — no duplicate recipe files.

| Metric | Result |
| --- | ---: |
| Recipes audited | 376 |
| Successfully scaled | 376 |
| Failures | 0 |
| Normalized to base 8 | 171 |
| Edge-case formatting notes | 3 |

## Commands

| Command | Purpose |
| --- | --- |
| `npm run audit:crew-scaling` | Verify all recipes scale across crew options |
| `npm run normalize:canonical-servings` | Re-normalize JSON to base 8 (after bulk imports) |

Reports: `review/crew-scaling-audit.md`, `review/canonical-servings-normalize.md`

## Architecture

### Storage (single canonical size)

- `shared/recipe/crew-scaling-config.ts` — `CANONICAL_BASE_SERVINGS = 8`, `CREW_SIZE_OPTIONS = [2,4,6,8,10]`
- All catalog JSON: `baseServings: 8`, `crewSize: 8`, quantities written for 8 people
- `scripts/normalize-canonical-servings.ts` rescales 171 recipes that were stored at 6/9/10/12

### Dynamic scaling

- `shared/golden-100/recipe-quality/crew-scale.ts`
  - Linear scale for weight/volume (lb, oz, cup, etc.)
  - Sub-linear scale for spices (tsp, tbsp, cloves)
  - Count rounding: whole numbers down to nearest ¼ (e.g. 1 onion @ 8 → ½ @ 4, ¼ @ 2)
  - Portion clamps via `clampGoldenIngredientsForCrew`
- Cook times unchanged unless crew > 25% above base (8→10 stays same; larger jumps get modest bump)

### UI

| Page | Crew picker | Scaled ingredients | Shopping list |
| --- | --- | --- | --- |
| `/recipes/:slug` (Golden) | Prominent banner | Yes | Yes |
| `/breakfast/:slug` | Prominent banner | Yes | Yes |
| `/performance-fuel/:slug` | Prominent banner | Yes | Yes |
| Smoothies | Prominent banner | Yes | Yes |

Shared pieces:

- `client/src/components/crew-size-picker.tsx`
- `client/src/hooks/use-crew-scaling.ts`
- `client/src/lib/shopping-list.ts` → `buildShoppingListFromCatalogIngredients()`

Shopping lists rebuild from **scaled** ingredients when crew size changes.

## Verified scaling examples (base 8)

| Crew | Example | Result |
| ---: | --- | --- |
| 4 | 2 cups milk | 1 cup |
| 2 | 4 lb beef | 1 lb |
| 4 | 1 onion | 1/2 onion |

## Edge cases (3 — acceptable)

Spice powders with quantity `1` and no unit match onion heuristic in audit:

- `memphis-dry-rub-ribs` — onion powder scales to 3/8 tsp-equivalent at crew 2
- `blackened-cod-taco-night` — onion powder
- `cajun-chicken-rice-bowl` — onion powder

These are sub-linear spice scaling, not literal onions. No recipe changes required.

## Page builders updated

Future regens from source packs always emit base 8:

- `server/hall-expansion/page-builder.ts`
- `server/performance-meals/page-builder.ts`
