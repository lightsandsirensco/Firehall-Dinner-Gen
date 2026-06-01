# Nutrition & Ingredient Integrity Audit

Generated: 2026-06-01T01:59:01.808Z

## Executive summary

| Metric | Count |
| --- | ---: |
| Recipes scanned | 356 |
| Nutrition OK | 355 |
| Nutrition issues | 1 |
| Title-as-ingredient | 0 |
| Bundle / composition issues | 1 |
| Crew scaling issues | 0 |

## Phase 1 — Nutrition data

| Recipe | Calories | Protein | Carbs | Fat | Servings | Status |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| lumberjack-breakfast-platter | 1100 | 72g | 140g | 90g | 8 | **suspicious** |

## Phase 2–3 — Bundles & composition

- **rigatoni-meat-sauce-batch** (Rigatoni with Meat Sauce): Bundle title promises "Meat Sauce" but side ingredients appear missing

## Phase 4–6 — UI & serving validation

- Zero macros are never rendered as numeric values on recipe pages.
- Nutrition panel shows **Nutrition information unavailable** when data is missing.
- Crew picker scales **ingredients** only; per-serving nutrition stays fixed (by design).

## Phase 7 — Fixes applied

- RecipeNutritionPanel hides zero/null macros; shows 'Nutrition information unavailable'
- ingredientNameMatchesRecipeTitle guard in validate.ts + shopping-list.ts
- findIngredientProfile uses word-boundary matching (prevents title substring false matches)
- Expanded nutrition DB: pearl barley, beef stew meat, pork ribs, ground lamb, baking powder
- buildMealPlate uses protein ingredient name (not display title) for main plate line
- beef-barley-soup + chicken-dumpling-soup ingredient rewrites
- shepherds-pie Greek salad side ingredients added

## Recommended follow-up

1. Run `npm run audit:recipe-nutrition:fix` to recalculate stored macros from ingredients.
2. Re-run `npm run audit:nutrition-integrity` until title-as-ingredient = 0 and nutrition issues = 0.
