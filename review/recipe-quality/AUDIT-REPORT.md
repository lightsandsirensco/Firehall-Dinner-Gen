# Recipe Quality Audit — Phases 6–10 Report (read-only)

Generated 2026-11-12. No recipe, database, production setting or deployment was changed; all 472 catalog JSON files hash-identical before and after.

Per-recipe records: `AUDIT-RECORDS.md` (readable), `audit-records.csv` (spreadsheet), `audit-records.json` (full detail).
Rerun: `npx tsx scripts/recipe-quality/baseline.ts && npx tsx scripts/audit-nutrition-integrity.ts && npx tsx scripts/audit-hero-images.ts && npx tsx scripts/recipe-quality/full-audit.ts`.

## 1. Totals

| | Recipes |
|---|---|
| Audited (every public recipe page) | 450 |
| Approved (in Explore / generator / Shift Planner) | 427 |
| Public but never recommended by the app | 23 |
| **Approved for Publishing** under the new standard | **0** (nothing has a kitchen-test record) |
| Kitchen Tested | 0 |
| Technically Validated (pass every blocking automated check) | 201 |
| Needs Review | 249 |
| Recommended: temporarily hide (redirect) | 4 |
| Recommended: major corrections | 142 |
| Recommended: minor corrections | 95 |
| Recommended: decide on unapproved public page | 22 (+1 of the 4 hides) |

**Library quality score: 76 / 100** (mean of per-recipe triage scores; exposure-weighted 76, first-impression set 77). The score is a defect count, not a taste rating: it starts at 100 and subtracts 35 / 15 / 7 / 3 / 1 per S1–S5 finding. Only 42% of recipes pass every blocking check, and 0% are kitchen-tested.

## 2. Errors by severity and category

Severity: **S1** food safety or misleading claim · **S2** missing ingredient, wrong quantity, broken instruction · **S3** nutrition, timing, data reliability · **S4** presentation · **S5** polish. "Heuristic" findings were spot-checked (≈90% real in samples) but each needs human confirmation before editing.

| Sev | Finding | Recipes | In top 50 |
|---|---|---|---|
| S1 | Labeled High Protein, nutrition not verified (several show 70–94 g protein/serving — impossible) | 73 | 8 |
| S1 | Ground meat / sausage, no 160°F (165°F poultry) or "no pink" cue | 19 | 4 |
| S1 | Raw poultry cooked quickly, no 165°F | 17 | 1 |
| S1 | High Protein badge with 17–26 g protein (lentil/bean/falafel dishes) | 4 | 0 |
| S1 | Vegetarian tag but contains bacon / prosciutto / anchovy | 4 | 0 |
| S1 | Vegetarian tag but uses chicken broth | 4 | 1 |
| S1 | Poultry cooked "to 160°F" (Chicken Alfredo Bake, Greek Chicken Pitas, Turkey Chili) | 3 | 0 |
| S1 | Vegetarian **title** contains sausage/chorizo (Veggie Egg Burritos) | 1 | 0 |
| S2 | Steps use an ingredient that isn't listed (heuristic) | 89 | 10 |
| S2 | Listed ingredient never used in the steps (heuristic) | 63 | 7 |
| S2 | Impossible whole-item counts from scaling ("3.2 rotisserie chickens", "4.8 limes") | 30 | 2 |
| S2 | Long-cooked poultry / ground meat without a temperature check | 19 | 0 |
| S2 | Oven used, no temperature | 9 | 3 |
| S2 | Too many rolls/potatoes per person (24 hoagies or 24 potatoes for 8) | 6 | 4 |
| S2 | Pork/fish with no doneness cue | 4 | 1 |
| S2 | Templated copy / exact duplicate | 4 | 0 |
| S2 | Protein portion implausible (16 oz raw chuck per person) | 3 | 0 |
| S3 | Nutrition hand-estimated, not calculated (all Hall Expansion) | 138 | 8 |
| S3 | Nutrition integrity failure (drift vs ingredients, batch/serving divisor) | 74 | 9 |
| S3 | Stated prep+cook far shorter than the steps | 8 | 0 |
| S4 | Raw decimals shown to cooks ("0.33 cup", "4.8 lb") | 203 | 16 |
| S4 | Breakfast records off the canonical schema (no equipment, mismatched headline nutrition) | 75 | 12 |
| S5 | Non-standard units, near-duplicates, long steps, weak titles | 67 | — |

By category (recipes with ≥1 finding): quantities/units 224 · nutrition 183 · ingredient↔instruction 140 · completeness 93 · food safety 82 · duplicates 28 · presentation 17.

## 3. Phase 6 — Nutrition accuracy

- **No recipe has laboratory-verified nutrition.** 296 are calculated from their ingredient list against the in-app ingredient database; 138 (all Hall Expansion) are hand estimates; 6 Pizza Night have none; 10 smoothies are calculated.
- **The UI does not distinguish them.** Every recipe shows "Estimated per serving" with the same disclaimer, so a calculated value and a guess look identical.
- **Macro math:** calories reconcile with 4P + 4C + 9F within 15% for every recipe that has numbers. The real errors are upstream: 74 recipes fail the integrity audit (values drift from the ingredient list, or a batch total was divided by the wrong crew size). 12 show ≥70 g protein per serving (Beef Dip 94 g, Chicken Alfredo Bake 90 g).
- **High Protein is not consistently backed by verified values:**
  - Pro "High Protein" filter: matches 301 of 427 recipes (70%); 73 of those use nutrition that fails the app's own verification rule (`numericFilterEligible`). When nutrition is missing it falls back to tags/category.
  - Visible "High Protein" badges come from category membership, not numbers: 4 smoothies (1–8 g protein) and 4 legume dishes (17–26 g) carry the badge.
  - Dinner wheel "Protein" slice uses category/tag, not numbers. Cook-mode analytics use a different threshold (25 g vs 35 g).
- Meal Memory's goal-fit note already fails closed (verified only) — no change needed there.

## 4. Phase 7 — Images and presentation

- All 450 recipes have a hero, thumbnail and mobile file; the existing audit maps every hero to the right recipe. 389 heroes are 1024×1024 squares, the rest 1536 px.
- **Every hero is an AI render** from the title-locked prompt pipeline, not a photo of the recipe cooked as written. The app does not disclose this. They cannot satisfy "image matches the actual finished dish" until real photos are taken during kitchen testing.
- **Visual review of the top 50** (contact sheets in `visual/`): 46 consistent with title and ingredients. Flagged: Biscuit French Toast Sliders (printed sign with the dish name baked into the image — replace), Philly-Style Cheesesteaks and Beef Dip (round burger-style buns; recipes lead with hoagies), Garlic Butter Pasta (accurate but the least appetizing image on the homepage rail).
- Presentation: prep/cook/serves present on all non-smoothie recipes; 8 understate time vs their own steps; 203 show raw decimals; 5 have steps over 90 words; smoothies have no serving count.
- Not yet reviewed visually: the remaining 400 images (recommend doing it alongside kitchen testing, not before).

## 5. Phase 8 — Quality gate (built, report-only)

`scripts/recipe-quality/gate-checks.ts` — pure checks: required fields, ingredient↔instruction consistency, quantity/unit validation (incl. impossible fractional counts), serving/scaling (protein oz per person, rolls per person), nutrition (macro math, source, integrity, claim support), food safety (USDA 165/160/145°F, ground meat, undercooked burgers, thawing, room-temp marinating, hot holding, oven temperature, vague doneness, vegetarian claims), images, presentation/timing. Duplicates and templated copies come from `baseline.ts`.

`scripts/recipe-quality/review-status.ts` — statuses **Draft → Needs Review → Technically Validated → Kitchen Tested → Approved for Publishing**. Automation can raise a recipe to Technically Validated at most. Kitchen Tested and Approved come only from `review-log.json`, which requires a named person, a date and notes; a recipe that later fails a blocking check drops back to Needs Review regardless of the log.

Tests: `npx tsx scripts/recipe-quality/test-gate-checks.ts` — 12 passing, including "automation can never reach kitchen_tested".

**Not yet enforced.** Wiring the gate into the catalog build (so a recipe with S1/S2 findings can't enter the approved catalog) changes what production serves and needs your approval.

## 6. Phase 9 — First impression (top 50)

Ranking uses only real data: the hard-coded homepage rail (6), welcome-email links, Explore's first page, the wheel's 10 classics, the breakfast collection, SEO landing pages, plus production analytics since June 27 (views, generator picks, wheel landings, saves). Generator and Shift Planner draw almost uniformly from ~120 chicken dinners, so they're represented by real pick counts, not guesses. `popularityWeight` is not used.

Structural findings:
- **Explore is sorted A–Z**, so every new visitor's first recipe is "30-Minute Pasta e Fagioli" — which has a vegetarian tag and chicken broth.
- **The homepage features Chorizo Breakfast Tacos, which is not an approved recipe** (and has no sausage temperature or oven temperature).
- The welcome emails link Hall Breakfast Burritos and Cast-Iron Breakfast Skillet — both need sausage temperatures and missing-ingredient fixes.

Top 50 status: 23 technically validated, 12 minor fixes, 14 major fixes, 1 unapproved; 27 have at least one S1/S2 finding, 6 have an S1 food-safety finding. Strongest (score ≥ 95, no S1/S2; 21 recipes) include Firehall Chili, BBQ Chicken Bowls, Chicken Parmesan, BBQ Chicken Sliders, Chicken Caesar, Jerk Chicken, Chorizo Breakfast Hash, Fire Captain Omelette Bar, Chicken Quesadillas, Chicken Pot Pie and Herb-Baked Salmon Tray — the natural first kitchen-test batch. Weakest: Peanut Chicken Rice Bowls (18), Steak Tacos (26 — homepage), Cast-Iron Breakfast Skillet (32 — welcome email), Chicken Shawarma Pitas (33), Shawarma Bar Night (33), Costco Rotisserie Remix (33), Beef Dip (36), Hall Breakfast Burritos (39 — welcome email).

## 7. Recipes to temporarily hide (301-redirect, keeps saves/history)

| Recipe | Reason | Redirect to |
|---|---|---|
| `veggie-egg-burritos` | "Veggie" title, contains 1½ lb sausage/chorizo; copy of Hall Breakfast Burritos | `hall-breakfast-burritos` |
| `protein-pancake-tray` | Copy of Buttermilk Pancakes with one added line | `buttermilk-pancakes` |
| `breakfast-sandwich-trays` | Copy of Sausage, Egg & Cheese Sandwiches | `sausage-egg-cheese-sandwiches` |
| `firehall-greek-chicken-bowls` | Exact duplicate of Greek Chicken Bowls (weaker record) | `greek-chicken-bowls` |

Safety items that are one-line fixes (160°F poultry, missing temperatures, wrong vegetarian tags) are scheduled for immediate correction instead of hiding. If you prefer, the 6 top-50 recipes with S1 food-safety findings (Pasta e Fagioli, Cast-Iron Breakfast Skillet, Chorizo Breakfast Tacos, Hall Breakfast Burritos, High-Protein Chicken Fried Rice, Mostaccioli Sausage Bake) could be pulled from the homepage, wheel and welcome emails until corrected.

## 8. The 22 unapproved public pages — recommendations

- **Approve after review** (no S1/S2 findings): 10 Pizza Night (`four-cheese-white-pizza`, `hawaiian-pizza`, `philly-cheesesteak-pizza`, `veggie-supreme-pizza`, `buffalo-chicken-pizza`, `pesto-chicken-pizza`, plus `smoked-brisket-bbq-pizza`, `firehall-supreme-pizza`, `nashville-hot-chicken-pizza`, `sicilian-sheet-pizza`, which need nutrition calculated first), 3 Breakfast Performance (`apple-cinnamon-baked-oatmeal`, `big-pot-savory-oats`, `protein-french-toast`), `veggie-egg-casserole-tray`.
- **Fix, then approve:** `chorizo-breakfast-tacos` (on the homepage — fix first or swap it off the rail), `taco-pizza`, `turkey-sausage-egg-muffins` (temperatures), `jalapeno-popper-pizza` (unused ingredient, no nutrition), `high-protein-parfaits`, `french-toast-casserole` (unused ingredients).
- **Redirect:** `breakfast-burrito-bar` → `hall-breakfast-burritos` (near-duplicate, weaker).

## 9. Correction plan (batches of 10, drafts first, your approval before anything touches production)

1. **Claims and labels (mostly code, not recipe data — clears the claim findings on 85 recipes).** High Protein filter and badges only from verified per-serving protein ≥ 35 g (`numericFilterEligible`); no tag/category fallback; one 35 g threshold everywhere. Nutrition label shows "Calculated from ingredients" vs "Rough estimate" honestly. Remove the 8 wrong vegetarian tags (or switch to vegetable broth).
2. **First-impression safety (3 batches).** Temperatures and missing ingredients for the 27 top-50 recipes with S1/S2 findings, starting with the homepage rail, welcome-email recipes and wheel classics. Redirect the 4 hides.
3. **Remaining food safety (4 batches).** 3 recipes at 160°F → 165°F; 17 poultry + 19 ground-meat without temperatures; 19 long-cook S2s; 9 oven temperatures; 4 pork/fish.
4. **Quantities (mechanical, 1 scripted pass + review).** 30 impossible counts, 6 per-person excesses, 3 protein portions, then 203 decimals → kitchen fractions without changing amounts.
5. **Ingredient ↔ step mismatches (15 batches).** 89 + 63 heuristic findings, each confirmed by a person.
6. **Nutrition.** Recalculate the 138 Hall Expansion estimates and 74 integrity failures from ingredient lists; nothing typed in by hand.
7. **Unapproved pages** per section 8.
8. **Images.** Decide on AI-image disclosure; replace Biscuit French Toast Sliders; real photos captured during kitchen tests replace renders for tested recipes.
9. **Enforce the gate.** Catalog build rejects new recipes with S1/S2 findings; Explore default order: kitchen-tested and technically validated recipes first (quality status, not popularity).

## 10. Decisions needed

- "Crew-tested firehouse classic", "Firehouse-tested for crew nights" (Explore cards) and the "Tested in the Firehouse" tagline imply kitchen testing, but no recipe has a test record. Either document real tests or soften the copy.
- Whether to disclose that recipe images are illustrative AI renders.
- Explore default sort (A–Z today).
- Approval to begin batch 1.

Companion documents: `RECIPE-WRITING-GUIDE.md`, `KITCHEN-TESTING-PLAN.md`.
