# Nutrition Integrity Audit — Firehall Meals

Generated: 2026-06-02T14:34:24.474Z
Mode: **audit**

## Executive summary

All nutrition values are audited as **per single serving** (total recipe macros ÷ base servings).
Crew size changes ingredient quantities on recipe pages; **nutrition does not scale with crew selector**.

| Metric | Value |
|--------|------:|
| **Total recipes audited** | 377 |
| **PASS** | 245 |
| **FAIL** | 0 |
| Withheld (estimate coming soon) | 132 |
| Recipes fixed this run | 0 |
| **Nutrition Accuracy %** (pass ÷ recipes with displayed macros) | **100%** |

Crew-size calculation invariant (engine): PASS

## Catalog coverage

| Catalog | Recipes | Pass | Fail | Withheld |
|---------|--------:|-----:|-----:|---------:|
| golden 100 | 101 | 55 | 0 | 46 |
| hall expansion | 74 | 54 | 0 | 20 |
| performance meals | 50 | 46 | 0 | 4 |
| breakfast | 67 | 54 | 0 | 13 |
| bbq grill | 55 | 29 | 0 | 26 |
| pizza night | 20 | 7 | 0 | 13 |
| smoothies | 10 | 0 | 0 | 10 |

## Issue counts

| Issue | Count |
|-------|------:|
| Suspicious calories | 0 |
| Suspicious protein | 32 |
| Suspicious carbs | 0 |
| Suspicious fat | 0 |
| UI shows zero macros | 0 |
| Nutrition coupled to wrong crew divisor | 0 |
| Needs recalculation | 0 |

## Recipes with suspicious calories

_None._

## Recipes with suspicious protein

- `beer-can-chicken` — 501 cal · 88g P · 0g C · 14g F
- `chicken-souvlaki` — 501 cal · 88g P · 0g C · 14g F
- `smoked-brisket` — 873 cal · 90g P · 3g C · 58g F
- `texas-beef-ribs` — 860 cal · 89g P · 1g C · 58g F
- `baked-falafel-hall-bowls` — 394 cal · 6g P · 61g C · 14g F
- `caprese-chicken-bake` — 789 cal · 93g P · 7g C · 42g F
- `italian-sausage-veg-sheet-pan` — 634 cal · 23g P · 16g C · 53g F
- `lentil-mushroom-bolognese` — 584 cal · 25g P · 105g C · 8g F
- `smoky-lentil-kale-soup` — 272 cal · 16g P · 36g C · 8g F
- `veggie-egg-casserole-tray` — 386 cal · 27g P · 12g C · 26g F
- `white-bean-kale-soup` — 309 cal · 18g P · 37g C · 11g F
- `apple-cinnamon-baked-oatmeal` — 287 cal · 12g P · 49g C · 6g F
- `belgian-waffle-platter` — 723 cal · 13g P · 133g C · 18g F
- `big-pot-savory-oats` — 504 cal · 14g P · 41g C · 32g F
- `breakfast-poutine` — 324 cal · 11g P · 4g C · 30g F
- `chilaquiles-verde-bake` — 307 cal · 13g P · 40g C · 11g F
- `corned-beef-hash-breakfast` — 311 cal · 11g P · 40g C · 12g F
- `german-potato-breakfast-skillet` — 307 cal · 11g P · 39g C · 12g F
- `high-protein-parfaits` — 838 cal · 72g P · 48g C · 40g F
- `johnnycakes-with-syrup` — 446 cal · 3g P · 74g C · 18g F
- `protein-pancake-tray` — 300 cal · 9g P · 49g C · 7g F
- `scrapple-and-eggs-skillet` — 382 cal · 9g P · 24g C · 28g F
- `hickory-smoked-chicken-breast` — 533 cal · 85g P · 5g C · 17g F
- `hot-honey-grilled-sausage-peppers` — 354 cal · 10g P · 20g C · 26g F
- `jalapeno-cheddar-smoked-sausages` — 337 cal · 13g P · 5g C · 29g F
- `loaded-ranch-potato-salad-crew` — 344 cal · 8g P · 63g C · 7g F
- `reverse-seared-ribeye-crew` — 376 cal · 22g P · 7g C · 29g F
- `smoked-baked-beans-crew` — 261 cal · 14g P · 15g C · 16g F
- `smoked-potato-salad-tray` — 456 cal · 9g P · 50g C · 25g F
- `spiedie-chicken-platter-crew` — 750 cal · 81g P · 35g C · 30g F
- `buffalo-chicken-pizza` — 845 cal · 79g P · 29g C · 44g F
- `pesto-chicken-pizza` — 788 cal · 80g P · 28g C · 38g F

## Recipes with suspicious carbs

_None._

## Recipes with suspicious fat

_None._

## Recipes showing zero values in UI

_None._

## Recipes where nutrition may track crew size (wrong divisor)

_None._

## Recipes needing recalculation

_None._

## UI surfaces checked

| Surface | Rule |
|---------|------|
| Recipe pages | `RecipeNutritionPanel` — per serving from page JSON |
| Explore cards | Macros from catalog page JSON (not crew-scaled) |
| Classics wheel | Golden 100 page nutrition |
| Generator | Dynamic meals — excluded from static JSON audit |

## FAIL details (sample)

_No failures._

## Validation rules applied

1. Per-serving only (not batch/tray/crew totals)
2. Meat meals: protein ≥ 10g; starch meals: carbs ≥ 5g when rice/pasta/bread present
3. Macro calories within ~50–150% of label calories
4. Ingredient-sum cross-check (±45–85% drift flagged)
5. Protein targets: Performance 35–60g · Breakfast 20–45g · BBQ 30–55g · Comfort 25–45g · Smoothies 20–45g
6. Crew sizes 2–12: ingredient scaling changes; per-serving nutrition must not

## Commands

```bash
npm run audit:nutrition-integrity
npm run audit:nutrition-integrity -- --fix
npm run audit:nutrition-per-serving -- --fix
```
