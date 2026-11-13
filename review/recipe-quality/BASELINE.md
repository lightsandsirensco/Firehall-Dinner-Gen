# Recipe Quality — Phase 1 Baseline (read-only)

Generated 2026-11-12 by `scripts/recipe-quality/baseline.ts` (full per-recipe data in `baseline.json`).
No recipe, database, or production change was made.

Recipes live as JSON records under `client/public/catalog/<collection>/` (the curated SQLite store is a secondary index). There is no recipe table in Postgres.

## Inventory

| Surface | Recipes |
|---|---|
| Records on disk (unique slugs) | 454 |
| Retired by consolidation (301 redirects) | 4 |
| Public, indexed recipe pages (sitemap) | 450 |
| Approved catalog | 427 |
| Explore (approved and image-verified) | 427 |
| Generator default pool (listed) | 366 |
| Generator, actually servable | 347 (19 listed slugs are always rejected: 16 retired duplicates and 3 unapproved breakfast dishes) |
| Shift Planner (generator plus Explore breakfasts) | 417 servable |

By collection: Golden 100 (104), Performance Meals (66), Hall Expansion (138), BBQ (45), Breakfast (70), Breakfast Performance (5), Pizza Night (12 own plus 8 shared with Golden 100), Smoothies (10).

**23 public, indexed pages are not in the approved catalog** and so never appear in Explore or the generator:
- 12 Pizza Night recipes (6 with no nutrition).
- 5 Breakfast Performance recipes.
- 4 Golden 100 breakfast dishes.
- 2 Performance breakfast dishes.

Searchers can land on these pages, but the app never recommends them.

## Findings (automated, then spot-checked against the records)

| Issue | Recipes | Confidence |
|---|---|---|
| Decimal quantities shown raw to users ("0.3 Cup Olive Oil", "0.33 cup hoisin") | 103 (150 lines) | Confirmed: the recipe page renders the stored string unchanged |
| Nutrition estimated or unavailable, not calculated | 144 (all 138 Hall Expansion, 6 Pizza Night) | Confirmed from records |
| Not eligible for numeric nutrition filters | 121 | Confirmed |
| Breakfast records don't match the canonical schema (no equipment, top-level nutrition disagrees with the nutrition block) | 75 (all breakfast) | Confirmed |
| Ingredient listed but never used in the steps | 59 | About half are real (for example, garlic in Caprese Chicken Bake, thyme and rosemary in Herb-Roasted Thighs). Needs per-recipe review |
| Meat or poultry with no internal temperature in the steps | 41 | Heuristic. Some are soups or stews where a temperature isn't essential |
| Vague doneness ("until done", "cook through") | 13 | Heuristic |
| Oven used but no temperature given | 10 | Heuristic |
| Smoothie nutrition stored only as marketing text | 10 | Confirmed |
| Duplicate ingredient lines | 6 | Heuristic |
| Calorie outliers (side dishes under 250 kcal sold as a meal) | 3 | Confirmed |
| Images | 0 problems | The existing image audit passes all 427; no shared heroes |

## Duplicates and templated content (confirmed)

- **Exact title duplicate:** `firehall-greek-chicken-bowls` and `greek-chicken-bowls`.
- **Word-for-word templated recipes** (same ingredients and steps, different title):
  - **Veggie Egg Burritos** is the Hall Breakfast Burritos recipe and **contains 1½ lb breakfast sausage or chorizo**. This is a vegetarian-claim safety problem.
  - **Protein Pancake Tray** is Buttermilk Pancakes with a "for protein tray version" line.
  - **Breakfast Sandwich Trays** is Sausage, Egg & Cheese Sandwiches.
  - Quantities weren't scaled: 14 eggs serve 8 in one and 10 in the other.
- **Near-duplicates for editorial review:** Butter Chicken vs Chicken Tikka Masala; Firehall Taco Bowls vs Turkey Taco Bowls; Hall Taco Bar vs Pork Carnitas Tacos; Chicken Alfredo Bake vs Skillet Chicken Alfredo; Asian Chicken Lettuce Cups vs Turkey Lettuce Wrap Night; the 4 breakfast burrito variants.

## Recipes with no automated flags

37 of 450. A clean automated result does not mean a recipe is good. Taste, texture and timing can only be confirmed by cooking.

## Recommended order for Phases 2–5 (batches of 10, drafts kept separate from production)

1. Safety first: fix Veggie Egg Burritos and the templated breakfast records, and add missing internal temperatures.
2. Quantities: convert raw decimals to kitchen fractions in the data itself, without changing amounts.
3. Ingredient/step mismatches (59 recipes).
4. Calculate nutrition for Hall Expansion, Pizza Night and smoothies.
5. Decide on the 23 unapproved public pages: approve, merge or redirect.
6. Scaling and shopping-list tests at 4, 6, 8 and 10 servings, then whole shift plans.
