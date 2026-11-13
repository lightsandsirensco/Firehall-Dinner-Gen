# Batch 1 — Claims, nutrition labels, High Protein, vegetarian (local only)

Status: prepared and tested locally. Not deployed, not published, no production database changes, Stripe untouched.

Per-recipe flag changes: `batch-1-nutrition-flag-changes.csv` (one row per recipe and flag).
Recipe-content corrections (page JSON): `CHANGE-LOG.md` / `change-log.csv`.

## One nutrition definition everywhere

A recipe's nutrition is **verified** only when all three are true:

1. An estimate is available (`nutrition.estimateAvailable === true`).
2. It was calculated from the recipe's ingredients (`nutrition.source === "calculated"`), not hand-written.
3. It passes the nutrition integrity audit (`isEligibleForNumericNutritionFilter`).

| Claim | Rule |
| --- | --- |
| High Protein | verified and at least 35 g protein per serving |
| Low Carb | verified and the calculated low-carb flag |
| Healthy | verified and the calculated lighter-option or performance-meal rule |

No tag, keyword, category or collection fallback for any of them. The rule is computed once in `scripts/nutrition-index-classify.ts` (projected into each collection's `index.json`) and read by:

- Explore badges and filters, including Pro numeric filters (`server/approved-catalog.ts`)
- Pick Tonight / generator `high_protein` tag and the new `nutrition_verified` tag (`server/meal-catalog/hydrate-golden-generate.ts`)
- Premium Nutrition Goals ranking and "fits your goal" copy (`server/generation/nutrition-goals-gate.ts`, `shared/nutrition/profile-goals.ts`, `client/src/components/recipe-card.tsx`)
- Curated-recipe nutrition category (`shared/curated-recipe/metadata/derive.ts`)

## Recipes affected

| Change | Recipes |
| --- | --- |
| High Protein removed (shown to users before) | 49 — all hall-expansion, hand-written estimates |
| High Protein still shown | 179 of 424 approved recipes, every one verified at 35 g or more |
| Healthy removed | 88 — 67 hall-expansion hand-written estimates, 5 BBQ that fail the integrity audit, 6 Classics with no nutrition (category fallback), 10 smoothies (hard-coded) |
| Low Carb removed | 32 |
| Pro numeric-filter eligibility removed | 69 (hand-written estimates) |
| Recipe content changed | 0 in this batch (content corrections are in `CHANGE-LOG.md`) |
| Recipe IDs changed | 0 |

## Site and code changes

- Taglines: "Firefighter Built · Firehouse Ready" → "Built for the Firehouse · Made for Crew Cooking" (Pick Tonight hero, home hero). "Crew-tested", "Firehouse Tested", "Shift-tested" and "tested on real shifts" were already removed; none remain.
- Image disclosure: one small line, "Recipe images are illustrative. Your results may vary.", in both site footers and the recipe-page footer. No per-image labels.
- Explore: default sort is now **Featured** (`shared/explore-featured-order.ts`): 48 individually reviewed recipes, dinners first, then everything else A–Z. A–Z is available from a Sort menu above the grid. Left out of Featured: `chorizo-breakfast-tacos` (public but not approved) and `biscuit-french-toast-sliders` (image flagged).
- Nutrition panel: "Calculated from the ingredients, per serving" for calculated nutrition; "Rough estimate per serving" for everything else; "Nutrition estimate coming soon" when withheld.
- Generator card: the Premium "High Protein pick — N g protein" line now only appears for verified nutrition (and for High Protein, only when the recipe qualifies).
- Removed High Protein fallbacks: tag/keyword match in curated metadata, category bonus in Premium goal scoring, `?? true` default on the allergen-safe fallback recipe, the 25–30 g third-party (Spoonacular) cutoffs, and the "high protein" keyword in trust-line copy.
- Breakfast index: removed the "High Protein" chip (it linked to nothing and was based on hand-assigned tags).

## Vegetarian and dietary

The library audit reports 0 vegetarian/dietary findings and 0 S1 findings. Dietary QA: 72/72 cases; dietary filter pipeline, generator dietary regression and account allergy safety all pass. The earlier vegetarian corrections are in `CHANGE-LOG.md`.

**Animal rennet (B3-dietary-02).** Parmigiano-Reggiano, Grana Padano and Pecorino Romano must be made with animal rennet, and Gruyère traditionally is. The dietary database now marks Parmesan, Pecorino, Grana Padano, Gruyère, Manchego and pesto as animal-rennet. A recipe that lists one of them only counts as vegetarian if the ingredient line names a vegetarian or microbial-rennet version, and the reason is shown as an uncertain ingredient. All other dietary flags are unaffected. This rule removed the vegetarian flag from 11 meatless recipes, so 13 cheese lines now read "use a Parmesan/Gruyère labeled vegetarian (microbial rennet)" (or "a pesto labeled vegetarian"). All 59 vegetarian recipes are again classified vegetarian, now backed by their ingredients, and no approved recipe has a Vegetarian protein label without passing the vegetarian check.

**Broth nutrition (B8-broth-nutrition-01/02).** The nutrition database had a single broth entry (meat broth). A vegetable-broth entry was added from USDA FoodData Central 171583, which has less protein and fat than chicken broth (174536). Four soups switched to vegetable broth were recalculated: pasta e fagioli went from 583 kcal and 26 g protein to 559 kcal and 23 g; pasta e ceci from 511/23 to 499/21; spicy tomato bisque from 625/16 to 610/15; tomato soup with grilled cheese croutons from 998/38 to 980/36 (still High Protein). Three Performance soups that already used vegetable broth were also overstated and were recalculated: lentil-mushroom bolognese from 616/26 to 610/25, smoky lentil kale from 304/18 to 274/15, and white bean kale from 325/19 to 301/16. No badge or filter flag changed.

**Retired recipes.** All four retired slugs resolve to a live, approved replacement. `/breakfast/…` and `/breakfast/performance/…` URLs now get the same server-side 301 redirect as `/recipes/…`. Meal history display, the "cook again" list, local-to-cloud history import, cooked-meal logging and "Not for us" dislikes all follow redirects, so old references show the replacement recipe instead of a blank entry or a rejected import. Saved recipes are stored as full snapshots and are unaffected.

## Tests run

Pass: type check; recipe-quality gate unit tests (14); recipe nutrition test and audit; Explore filter taxonomy; Explore/generator parity; generator filter accuracy (120/120); nutrition-goal scoring; dietary QA and pipelines; account allergy safety; generator personalization and simplified QA; Tonight selection and content integrity; Meal Memory; billing and entitlement expiry; Pro trial; meal-history tiers; shift plan; shopping correctness; social-proof trust; home/brand SEO; recipe trust pipeline; app nav; corrections idempotency (215/215 already applied).

Test updates:
- `test-tonight-content-integrity`: expected approved count 427 → 424 (three duplicates retired earlier; all three redirect).
- `test-nutrition-goals-premium`: reads `.slug` from the slot picker's `{ slug, why }` result (picker API changed with Meal Memory).

Final run (every script in `npm run check` plus the related tests): all pass, including `test-nutrition-goals-premium`. The metric display was showing °F for temperatures written as "160°F (71°C)" (58 audit issues); it's fixed in `shared/measurements/temperature.ts`. Known, not new: the Game Day generator category fails 25/25, the same as the committed October 11 report; `audit-generator-filter-accuracy` prints PASS but its process never exits. `test-meal-memory-free-parity` shows 22/120 picks differing from a baseline captured before the catalog corrections; Free users have no meal-memory inputs, so this is pool drift, and the baseline should be recaptured once the corrections are accepted.

## Uncertainties

- 130 hall-expansion recipes are labeled `source: "estimated"`. They now display as "Rough estimate" and carry no nutrition badges. A recalculation check found 23 whose stored values exactly match the ingredient calculation; they're mislabeled and could be relabeled "calculated" after an integrity check. The other 105 are hand-written, some far off (e.g. 720 kcal stored vs 1,320 calculated) and need full recalculation.
- The generic broth entry (15 kcal and 1.2 g protein per 100 g) is about twice USDA's chicken broth values (6 kcal and 0.64 g). It was left as is, because changing it would shift every recipe that uses broth.
- The local curated SQLite database (`data/cache.db`) is behind the manifests on 11 protein labels (e.g. `pancake-short-stack` still says vegetarian) and still marks the 4 retired duplicates as published. No user sees either: retired slugs are filtered out of every curated query, and pickers only use approved-catalog recipes. These rows sync only through the manual seed scripts; none was run.
- 22 Classics pages have calculated nutrition but no `estimateAvailable` flag, so they show numbers but earn no badges (fails closed).
- The Featured list is an editorial choice; review the order.
- The Spoonacular-based legacy Explore detail page no longer claims High Protein at all.
