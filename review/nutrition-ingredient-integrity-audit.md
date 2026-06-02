# Nutrition & Ingredient Integrity Audit

Generated: 2026-06-02T13:09:40.311Z

## Executive summary

| Metric | Count |
| --- | ---: |
| Recipes scanned | 356 |
| Nutrition OK | 318 |
| Nutrition issues | 25 |
| Title-as-ingredient | 0 |
| Bundle / composition issues | 1 |
| Crew scaling issues | 0 |

## Phase 1 — Nutrition data

| Recipe | Calories | Protein | Carbs | Fat | Servings | Status |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| grilled-corn-cotija | 208 | 4g | 26g | 12g | 8 | **suspicious** |
| mediterranean-chickpea | 248 | 10g | 33g | 9g | 8 | **suspicious** |
| memphis-dry-rub-ribs | 232 | 15g | 15g | 13g | 8 | **suspicious** |
| moroccan-meatballs | 0 | 0g | 0g | 0g | 8 | **hidden** |
| smoked-wings-white-sauce | 204 | 1g | 4g | 21g | 8 | **suspicious** |
| asian-chicken-lettuce-cups | 80 | 2g | 5g | 4g | 8 | **suspicious** |
| bun-bo-hue-noodle-soup | 0 | 0g | 0g | 0g | 8 | **hidden** |
| chicken-wing-bar-night | 216 | 3g | 33g | 9g | 8 | **suspicious** |
| firehall-charcuterie-board | 0 | 0g | 0g | 0g | 8 | **hidden** |
| hickory-turkey-legs | 175 | 3g | 27g | 8g | 8 | **suspicious** |
| kielbasa-cabbage-potato-skillet | 119 | 3g | 25g | 0g | 8 | **suspicious** |
| molasses-bourbon-pork-ribs | 185 | 8g | 23g | 7g | 8 | **suspicious** |
| pork-belly-burnt-ends | 155 | 1g | 28g | 5g | 8 | **suspicious** |
| smoked-turkey-breast | 101 | 4g | 8g | 6g | 8 | **suspicious** |
| soft-pretzel-dogs | 118 | 7g | 2g | 9g | 8 | **suspicious** |
| spatchcock-lemon-roast-chicken | 123 | 1g | 7g | 11g | 8 | **suspicious** |
| tonkotsu-ramen-crew | 0 | 0g | 0g | 0g | 8 | **hidden** |
| tourtiere-for-the-crew | 153 | 13g | 9g | 8g | 8 | **suspicious** |
| bagel-lox-breakfast-board | 0 | 0g | 0g | 0g | 8 | **hidden** |
| biscuit-french-toast-sliders | 227 | 5g | 35g | 8g | 8 | **suspicious** |
| crew-french-toast-bake | 211 | 13g | 17g | 11g | 8 | **suspicious** |
| hall-sausage-biscuits-gravy | 208 | 4g | 8g | 18g | 8 | **suspicious** |
| lumberjack-breakfast-platter | 1100 | 72g | 140g | 90g | 8 | **suspicious** |
| maple-sausage-pinwheels | 236 | 3g | 46g | 6g | 8 | **suspicious** |
| overnight-french-toast-bake | 131 | 8g | 12g | 6g | 8 | **suspicious** |
| charred-broccolini-lemon-tray | 125 | 4g | 13g | 8g | 8 | **suspicious** |
| firehall-antipasto-pasta-salad | 0 | 0g | 0g | 0g | 8 | **hidden** |
| firehall-street-elote-cups | 185 | 4g | 26g | 10g | 8 | **suspicious** |
| flat-top-philly-cheesesteaks-crew | 0 | 0g | 0g | 0g | 8 | **hidden** |
| gochujang-beef-skewers-crew | 0 | 0g | 0g | 0g | 8 | **hidden** |
| griddle-smash-sausage-peppers | 0 | 0g | 0g | 0g | 8 | **hidden** |
| grilled-peach-burrata-salad | 0 | 0g | 0g | 0g | 8 | **hidden** |
| mixed-lamb-chop-grill-board | 0 | 0g | 0g | 0g | 8 | **hidden** |
| pork-satay-skewers-crew | 0 | 0g | 0g | 0g | 8 | **hidden** |
| smoked-bbq-chicken-wings-tray | 118 | 1g | 18g | 5g | 8 | **suspicious** |
| smoked-picanha-steak-platter | 138 | 2g | 10g | 10g | 8 | **suspicious** |
| tandoori-lamb-chop-platter | 80 | 5g | 6g | 3g | 8 | **suspicious** |
| yakiniku-grill-platter-crew | 0 | 0g | 0g | 0g | 8 | **hidden** |

## Phase 2–3 — Bundles & composition

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
