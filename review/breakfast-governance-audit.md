# Breakfast Collection Governance Audit

Generated: 2026-05-31T18:34:23.178Z

## Summary

| Metric | Value |
| --- | --- |
| Total recipes audited | 67 |
| Primary collection (post-split) | 62 |
| Tier 1 — Firehall Classics | 54 (81%) |
| Tier 2 — Healthier Hall | 8 (12%) |
| Tier 3 — Performance | 5 (7%) |

## Recipes to Keep (62)

- `hall-breakfast-burritos`
- `chorizo-breakfast-burritos`
- `turkey-sausage-burritos`
- `bacon-hash-burritos`
- `veggie-egg-burritos`
- `cast-iron-breakfast-skillet`
- `bacon-egg-hash-skillet`
- `ham-pepper-skillet`
- `steakhouse-hash-skillet`
- `turkey-sausage-egg-bake`
- `ham-cheddar-egg-bake`
- `southwest-egg-bake`
- `sheet-pan-breakfast-hash`
- `quick-egg-tacos`
- `breakfast-sandwich-trays`
- `sausage-egg-cheese-sandwiches`
- `bbq-breakfast-hash`
- `crew-french-toast-bake`
- `buttermilk-pancakes`
- `red-lead-skillet`
- `firehall-breakfast-pizza`
- `breakfast-enchiladas`
- `breakfast-crunchwraps`
- `denver-breakfast-casserole`
- `breakfast-sliders`
- `breakfast-quesadillas`
- `breakfast-poutine`
- `monte-cristo-sandwiches`
- `cowboy-breakfast-skillet`
- `hall-breakfast-wraps`
- `sheet-pan-breakfast-sandwiches`
- `chorizo-breakfast-hash`
- `hall-sausage-biscuits-gravy`
- `overnight-french-toast-bake`
- `fire-captain-omelette-bar`
- `breakfast-nachos-supreme`
- `maple-sausage-pinwheels`
- `huevos-rancheros-crew`
- `eggs-benedict-hall-style`
- `corned-beef-hash-breakfast`
- `chicken-and-waffles-crew`
- `chilaquiles-verde-bake`
- `shrimp-and-grits-breakfast`
- `country-fried-steak-eggs`
- `green-chile-breakfast-burritos`
- `migas-for-the-crew`
- `breakfast-fried-rice-crew`
- `belgian-waffle-platter`
- `farmers-breakfast-casserole`
- `tater-tot-breakfast-casserole`
- `smoked-salmon-benedit`
- `bagel-lox-breakfast-board`
- `irish-breakfast-fry-up`
- `sheet-pan-full-english`
- `german-potato-breakfast-skillet`
- `breakfast-stromboli-roll`
- `scrapple-and-eggs-skillet`
- `club-sandwich-breakfast-bake`
- `johnnycakes-with-syrup`
- `overnight-sausage-strata`
- `biscuit-french-toast-sliders`
- `lumberjack-breakfast-platter`

## Recipes to Rewrite (0)



## Recipes to Move to Performance Breakfasts (5)

- `protein-pancake-tray`
- `big-pot-savory-oats`
- `high-protein-parfaits`
- `protein-french-toast`
- `apple-cinnamon-baked-oatmeal`

## Recipes to Delete (0)

_None — all catalog recipes retained._

## Low Authenticity (< 7/10)

- `protein-pancake-tray` — 6/10 (performance)
- `big-pot-savory-oats` — 5/10 (performance)
- `high-protein-parfaits` — 5/10 (performance)
- `protein-french-toast` — 6/10 (performance)
- `apple-cinnamon-baked-oatmeal` — 6/10 (performance)

## Missing Firehall Breakfasts We Should Add

- **Full Firehall Breakfast** — Classic bacon, eggs, potatoes, and toast plate — the baseline crew vote winner missing as its own recipe.
- **Bacon & Eggs for the Crew** — Simple griddle breakfast every hall runs; deserves a dedicated batch-scaled page beyond skillets.
- **Peameal Breakfast Sandwiches** — Canadian firehall staple — peameal on a kaiser with egg and cheese belongs in the classics tier.
- **Western Omelette Bake** — Ham, peppers, and cheddar casserole format crews know from overnight shifts.
- **Eggs Benedict Casserole** — Hall-style benedict in a 9x13 — easier than poaching for ten after a night run.
- **Overnight Oats for the Line** — Crew-batch overnight oats distinct from performance savory oats — fridge-ready shift fuel.
- **Greek Yogurt Protein Bowls** — Tier-2 healthier option with topping bar — realistic post-workout hall breakfast.

## Image Corrections Required

- `protein-pancake-tray` — Use crew-sized batch presentation — avoid single-bowl fitness styling.
- `big-pot-savory-oats` — Use crew-sized batch presentation — avoid single-bowl fitness styling.
- `high-protein-parfaits` — Use crew-sized batch presentation — avoid single-bowl fitness styling.
- `protein-french-toast` — Use crew-sized batch presentation — avoid single-bowl fitness styling.
- `apple-cinnamon-baked-oatmeal` — Use crew-sized batch presentation — avoid single-bowl fitness styling.

## Updated Breakfast Collection Structure

- **Primary hall breakfasts:** `/breakfast` — 62 recipes (classics + healthier hall)
- **Performance breakfasts:** `/breakfast/performance` — 5 recipes (training / macro-focused)
- Recipe pages remain at `/catalog/breakfast/pages/{slug}.json`
- Performance routes: `/breakfast/performance/{slug}`

## Per-Recipe Scores

| Slug | Tier | Decision | Auth | Crew | Batch | Beginner | Visual | Image | Culture |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hall-breakfast-burritos | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| chorizo-breakfast-burritos | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| turkey-sausage-burritos | healthier_hall | KEEP | 8 | 9 | 9 | 9 | 8 | 7 | 8 |
| bacon-hash-burritos | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| veggie-egg-burritos | healthier_hall | KEEP | 8 | 9 | 9 | 9 | 8 | 7 | 8 |
| cast-iron-breakfast-skillet | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| bacon-egg-hash-skillet | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| ham-pepper-skillet | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| steakhouse-hash-skillet | firehall_classic | KEEP | 9 | 9 | 9 | 7 | 8 | 7 | 9 |
| turkey-sausage-egg-bake | healthier_hall | KEEP | 8 | 9 | 9 | 9 | 8 | 7 | 8 |
| ham-cheddar-egg-bake | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| southwest-egg-bake | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| sheet-pan-breakfast-hash | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| quick-egg-tacos | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| breakfast-sandwich-trays | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| sausage-egg-cheese-sandwiches | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| bbq-breakfast-hash | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| protein-pancake-tray | performance | MOVE_PERFORMANCE | 6 | 7 | 9 | 9 | 8 | 7 | 6 |
| crew-french-toast-bake | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| buttermilk-pancakes | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| big-pot-savory-oats | performance | MOVE_PERFORMANCE | 5 | 7 | 9 | 9 | 8 | 7 | 5 |
| high-protein-parfaits | performance | MOVE_PERFORMANCE | 5 | 7 | 7 | 9 | 8 | 7 | 5 |
| red-lead-skillet | firehall_classic | KEEP | 10 | 9 | 9 | 9 | 8 | 7 | 10 |
| firehall-breakfast-pizza | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| breakfast-enchiladas | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| breakfast-crunchwraps | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| denver-breakfast-casserole | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| breakfast-sliders | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| breakfast-quesadillas | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| protein-french-toast | performance | MOVE_PERFORMANCE | 6 | 7 | 9 | 9 | 8 | 7 | 6 |
| breakfast-poutine | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 10 |
| monte-cristo-sandwiches | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| apple-cinnamon-baked-oatmeal | performance | MOVE_PERFORMANCE | 6 | 7 | 9 | 9 | 8 | 7 | 6 |
| cowboy-breakfast-skillet | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| hall-breakfast-wraps | healthier_hall | KEEP | 8 | 9 | 9 | 9 | 8 | 7 | 8 |
| sheet-pan-breakfast-sandwiches | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| chorizo-breakfast-hash | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| hall-sausage-biscuits-gravy | firehall_classic | KEEP | 10 | 9 | 9 | 9 | 8 | 7 | 10 |
| overnight-french-toast-bake | healthier_hall | KEEP | 8 | 9 | 9 | 9 | 8 | 7 | 8 |
| fire-captain-omelette-bar | healthier_hall | KEEP | 8 | 9 | 9 | 9 | 8 | 7 | 8 |
| breakfast-nachos-supreme | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| maple-sausage-pinwheels | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| huevos-rancheros-crew | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| eggs-benedict-hall-style | firehall_classic | KEEP | 9 | 9 | 9 | 7 | 8 | 7 | 9 |
| corned-beef-hash-breakfast | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| chicken-and-waffles-crew | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| chilaquiles-verde-bake | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| shrimp-and-grits-breakfast | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| country-fried-steak-eggs | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| green-chile-breakfast-burritos | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| migas-for-the-crew | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| breakfast-fried-rice-crew | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| belgian-waffle-platter | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| farmers-breakfast-casserole | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| tater-tot-breakfast-casserole | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| smoked-salmon-benedit | healthier_hall | KEEP | 8 | 9 | 9 | 9 | 8 | 7 | 8 |
| bagel-lox-breakfast-board | healthier_hall | KEEP | 8 | 9 | 7 | 9 | 8 | 7 | 8 |
| irish-breakfast-fry-up | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| sheet-pan-full-english | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| german-potato-breakfast-skillet | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| breakfast-stromboli-roll | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| scrapple-and-eggs-skillet | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 10 |
| club-sandwich-breakfast-bake | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| johnnycakes-with-syrup | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| overnight-sausage-strata | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| biscuit-french-toast-sliders | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
| lumberjack-breakfast-platter | firehall_classic | KEEP | 9 | 9 | 9 | 9 | 8 | 7 | 9 |
