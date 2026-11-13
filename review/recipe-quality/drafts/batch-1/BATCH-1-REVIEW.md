# Batch 1 — Claims, duplicates, and vegetarian labels (DRAFT, not applied)

Status: awaiting approval. No live file has been changed. All 21 target files show no changes in `git status`.

Batch 1 resolves **86 of the 125 S1 findings** in the audit. The 39 S1 findings that remain are all cooking-temperature issues, scheduled for Batches 2–3.

| Patch | Files | Resolves |
|---|---|---|
| `high-protein-claims.patch` | `server/approved-catalog.ts` | 73 `high_protein_claim_unverified` + 4 `high_protein_claim_below_threshold` |
| `retire-duplicates.patch` | redirects + 3 static indexes | 1 `vegetarian_title_contains_meat`, the exact duplicate title, and 3 templated copies |
| `vegetarian-labels.patch` | 5 source files, 8 recipe pages, 3 indexes | 4 `vegetarian_tag_contains_meat` + 4 `vegetarian_claim_meat_broth` |

Each patch passes `git apply --check` against the current working copy. No recipe ID changes, and nothing is deleted.

## 1. High Protein claims — `high-protein-claims.patch`

**Rule:** A recipe can be labeled or filtered as High Protein only if its nutrition passed the integrity audit (`numericFilterEligible`) and it has at least 35 g of protein per serving. There is no fallback to editorial tags, category, or the performance list, and smoothies are never labeled High Protein, because their macros aren't verified.

| | Before | After |
|---|---|---|
| Recipes matching the Pro "High Protein" filter | 301 | 228 |
| Recipes showing a High Protein badge | 68 | 60 |
| Lowest protein among recipes that keep the label | — | 35 g |

The full list of 77 affected recipes, with the reason for each, is in `high-protein-removed.csv`:
- **69 failed the nutrition integrity audit.** Their stored values are unreliable; for example, beef dip shows 94 g of protein, chicken alfredo bake 90 g, and a loaded baked potato bar 62 g.
- **4 smoothies:** chocolate-banana-recovery (6 g), citrus-ginger (1 g), mixed-berry-protein (8 g), peanut-butter-banana-recovery (8 g).
- **4 performance meals** showed the badge with 17–26 g of protein: baked-falafel-hall-bowls, lentil-mushroom-bolognese, smoky-lentil-kale-soup, white-bean-kale-soup.

Nothing else changes. Healthy and Low Carb keep their current rules, and smoothies keep the "Protein blend" descriptor, which describes the drink type rather than making a nutrition claim. A recipe gets its label back automatically once its nutrition is recalculated in Batch 6 and passes the audit.

## 2. Retire duplicates — `retire-duplicates.patch`

| Retired slug | Redirects to | Why |
|---|---|---|
| `veggie-egg-burritos` | `hall-breakfast-burritos` | Word-for-word copy, and the "Veggie" recipe contains 1½ lb of sausage/chorizo |
| `protein-pancake-tray` | `buttermilk-pancakes` | Copy of Buttermilk Pancakes plus one line |
| `breakfast-sandwich-trays` | `sausage-egg-cheese-sandwiches` | Copy of Sausage, Egg & Cheese Sandwiches |
| `firehall-greek-chicken-bowls` | `greek-chicken-bowls` | Same title as Greek Chicken Bowls, with a weaker record |

The patch adds four entries to `PHASE5_CONSOLIDATIONS` and removes those four entries from the breakfast, breakfast-performance, and Hall Expansion static indexes. The indexes go from 74 to 72, 5 to 4, and 138 to 137 recipes.

**Simulated in memory (no files edited):** each retired slug resolves to its target, the target is live and approved, and the retired slug no longer appears in the approved catalog or the retired-slug filter used by search, picks, and the sitemap.

**User references:** the production export contains no references to any of the four slugs. That export doesn't include the saved-recipe and meal-history tables, but any saved or historical reference resolves through `resolveCatalogSlug` to the replacement recipe, which is the mechanism existing Phase 5 consolidations already use. The old page JSON files stay on disk; deleting them is optional and not part of this batch.

## 3. Vegetarian labels — `vegetarian-labels.patch`

**Recipes that contain meat or fish (relabeled; the recipe itself is unchanged):**

| Recipe | Contains | Protein label: before → after |
|---|---|---|
| `smoked-baked-beans-crew` | bacon | vegetarian → pork |
| `grilled-peach-burrata-salad` | prosciutto | vegetarian → pork |
| `pancake-short-stack` | bacon | vegetarian → pork |
| `charred-broccolini-lemon-tray` (title: "Sicilian Anchovy Broccolini Tray") | anchovy fillets | vegetarian → seafood |

For these four, the `protein:vegetarian` tag becomes the new protein category, and "vegetarian" is removed from their search terms.

**Meatless dishes made with chicken broth (switched to vegetable broth, and they stay vegetarian):**

| Recipe | Change |
|---|---|
| `30-minute-pasta-e-fagioli-for-the-hall` | Low-sodium chicken broth → low-sodium vegetable broth |
| `pasta-e-ceci-for-the-hall` | Low-sodium chicken broth → low-sodium vegetable broth |
| `spicy-tomato-bisque-grilled-brie-toast` | Chicken broth → vegetable broth |
| `tomato-soup-grilled-cheese-croutons` | Chicken broth → vegetable broth |

Quantities, steps, and timing stay the same. The diet flags were recalculated with the app's own `classifyRecipeDietary`, and all four now come out as vegetarian (not vegan). *(Superseded: nutrition was recalculated with a USDA vegetable-broth entry — see `corrections/BATCH-1-CLAIMS-NUTRITION.md`.)*

**Why the broth was swapped rather than the label changed:** these four are classic meatless dishes, and vegetable broth is the standard cook's choice for them. Swapping keeps all four among the library's few true vegetarian options. Relabeling them as chicken would mislabel them in the other direction.

The diet-based Vegetarian filter was already correct before this patch, because it's computed from ingredients. What was wrong was the visible protein-category label and tag.

## How to apply (after approval)

```powershell
git apply review/recipe-quality/drafts/batch-1/high-protein-claims.patch
git apply review/recipe-quality/drafts/batch-1/retire-duplicates.patch
git apply review/recipe-quality/drafts/batch-1/vegetarian-labels.patch
npm run check
npx tsx scripts/recipe-quality/full-audit.ts
```

Expected result: the S1 count drops from 125 to 39. If the curated recipe database was seeded from the Golden 100 source, re-seed `pancake-short-stack` and the four soups so the database matches the page files. Deploying stays a separate decision.

## Remaining uncertainties

- Traditional Parmesan uses animal rennet. The app follows the common convention of treating it as vegetarian; strict vegetarians may disagree.
- None of the 77 recipes that lose High Protein is confirmed to be low in protein. Many likely are high-protein; their stored numbers just can't be trusted yet. Batch 6 recalculates them.
- I didn't run `npm run check` against the patched code, because that would have meant changing live files. The patches were checked with `git apply --check` and in-memory simulations.
