# Recipe Nutrition — Final Deliverable

Per-serving macro tracking across all curated catalog recipes.

## Summary

| Metric | Result |
|--------|--------|
| Recipes scanned | **232** |
| Missing nutrition (after backfill) | **0** |
| Suspicious values (after fixes) | **0** |
| `npm run check` | ✅ Pass |
| `npm run build` | ✅ Pass |

Full audit: [`review/recipe-nutrition-audit-report.md`](recipe-nutrition-audit-report.md)

## 1. Data Model

**Migration:** `server/db/migrations/012_recipe_nutrition_macros.sql`

| Column | Purpose |
|--------|---------|
| `calories_per_serving` | Future filter queries |
| `protein_g_per_serving` | High Protein filter |
| `carbs_g_per_serving` | High/Low Carb filters |
| `fat_g_per_serving` | Under 30g Fat filter |
| `nutrition_source` | `calculated` \| `curated` \| `estimated` |
| `nutrition_flags_json` | Future filter + badge flags |

**Shared calculator:** `shared/nutrition/`
- Ingredient database with hall-scale quantities (lb, cups, cans, count, etc.)
- Sums matched ingredients, divides by servings
- Derives `filterFlags` and `badgeCandidates` (stored, not displayed)

## 2. Calculation Approach

- Parses ingredient quantity strings (`3.5 lb`, `2 cups`, `1–2`, embedded amounts)
- Matches against ~70 firehall ingredient profiles
- Divides batch totals by `baseServings` / `crewSize` (smoothies default to 4 servings per blender batch)
- Validates macro calorie math, negative values, and realistic ranges
- Falls back to curated LLM macros only when ingredient match rate is too low

## 3. UI

**Component:** `client/src/components/recipe-nutrition-panel.tsx`

```
Nutrition (Per Serving)
Calories: 685
Protein: 52g
Carbs: 48g
Fat: 31g
```

**Integrated on recipe pages only:**
- Golden / catalog meals (`golden-recipe-page.tsx`)
- Breakfast (`breakfast-recipe-page.tsx`)
- Smoothies (`smoothie-recipe-page.tsx`)

**Print views:** Generator `buildPrintHtml` updated to same format. Nutrition panel includes `print:` styles for browser print.

**Not shown on:** Explore cards, Classics Wheel, homepage cards.

## 4. Future Filters (schema ready, UI not built)

Stored in `nutrition.filterFlags`:
- High Protein (≥35g)
- Under 700 Calories
- Under 30g Fat
- High Carb (≥50g)
- Low Carb (≤25g)
- Meal Prep Friendly

## 5. Future Badges (fields ready, not auto-displayed)

Stored in `nutrition.badgeCandidates`:
- 💪 High Protein
- 🥗 Lighter Option
- 🏃 Performance Meal

## 6. Catalog Coverage

| Catalog | Pages | Nutrition |
|---------|-------|-----------|
| Golden 100 | 100 | ✅ |
| Performance Meals | 50 | ✅ |
| Hall Expansion | 30 | ✅ |
| Breakfast | 42 | ✅ |
| Smoothies | 10 | ✅ |

## 7. Scripts

| Command | Purpose |
|---------|---------|
| `npm run audit:recipe-nutrition` | Report-only audit (in CI check) |
| `npm run audit:recipe-nutrition:fix` | Recalculate + write JSON |
| `npm run test-recipe-nutrition` | Unit tests (in CI check) |

## Success Criteria

Every curated recipe displays accurate per-serving **Calories, Protein, Carbs, Fat** on recipe detail pages — without cluttering browse surfaces or changing the firefighter-first experience.
