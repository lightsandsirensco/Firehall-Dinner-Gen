# Nutrition & Ingredient Integrity Audit

Generated: 2026-09-24T23:45:26.124Z

## Executive summary

| Metric | Count |
| --- | ---: |
| Recipes scanned | 412 |
| Nutrition OK | 409 |
| Nutrition issues | 3 |
| Title-as-ingredient | 0 |
| Bundle / composition issues | 3 |
| Crew scaling issues | 0 |

## Phase 1 — Nutrition data

| Recipe | Calories | Protein | Carbs | Fat | Servings | Status |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| charred-broccolini-lemon-tray | 148 | 5g | 14g | 9g | 8 | **suspicious** |
| firehall-street-elote-cups | 227 | 7g | 26g | 13g | 8 | **suspicious** |
| grilled-peach-burrata-salad | 105 | 7g | 4g | 7g | 8 | **suspicious** |

## Phase 2–3 — Bundles & composition

- **beef-birria-with-consomme** (Beef Birria with Consommé for Dipping): Bundle title promises "Consommé for Dipping" but side ingredients appear missing
- **greek-spiced-beef-burger-bowls-tzatziki-slaw** (Greek-Spiced Beef Burger Bowls with Tzatziki Slaw): Bundle title promises "Tzatziki Slaw" but side ingredients appear missing
- **rigatoni-meat-sauce-batch** (Rigatoni with Meat Sauce): Bundle title promises "Meat Sauce" but side ingredients appear missing

## Phase 4–6 — UI & serving validation

- Zero macros are never rendered as numeric values on recipe pages.
- Nutrition panel shows **Nutrition estimate coming soon** when data is missing or unreliable.
- Crew picker scales **ingredients** only; per-serving nutrition stays fixed (by design).

## Phase 7 — Fixes applied

- RecipeNutritionPanel hides zero/null macros; shows 'Nutrition estimate coming soon'
- ingredientNameMatchesRecipeTitle guard in validate.ts + shopping-list.ts
- findIngredientProfile uses word-boundary matching (prevents title substring false matches)
- Expanded nutrition DB: pearl barley, beef stew meat, pork ribs, ground lamb, baking powder
- buildMealPlate uses protein ingredient name (not display title) for main plate line
- beef-barley-soup + chicken-dumpling-soup ingredient rewrites
- shepherds-pie Greek salad side ingredients added

## Recommended follow-up

1. Run `npm run audit:recipe-nutrition:fix` to recalculate stored macros from ingredients.
2. Re-run `npm run audit:nutrition-integrity` until title-as-ingredient = 0 and nutrition issues = 0.
