# Recipe audit records (read-only)

Generated 2026-11-13 by `scripts/recipe-quality/full-audit.ts`. One record per public recipe, ordered by first-impression exposure, then by severity.

Severity: **S1** Food safety / misleading claim · **S2** Missing ingredient, wrong quantity or broken instruction · **S3** Nutrition, timing or data reliability · **S4** Presentation · **S5** Polish. Findings marked *(heuristic)* need a human to confirm.
Review statuses: draft → needs_review → technically_validated → culinary_reviewed → approved_for_publishing. Automation can reach Technically Validated at most; Culinary Reviewed and Approved for Publishing come only from the human review log. Kitchen Tested is a separate, optional badge and is not required for publishing.

## Double Smash Burgers — `smash-burgers`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 92 · exposure rank 1

Findings:
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 1 large head Iceberg Lettuce

Proposed corrections:
- Recalculate per serving from the ingredient list and base servings.
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: fail, 88% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: homepage Exposure: welcome_email Exposure: wheel Exposure: seo_landing

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Heuristic findings (marked) need a human to confirm before correcting.

## Firehall Chili — `big-chili`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 95 · exposure rank 2

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 5.3 Lb Ground Beef Chuck (80/20)
- **S5** 3 unit(s) are outside the standard list. *(heuristic)* — 2 cans (28 oz) Crushed Fire-Roasted Tomatoes; 2 cans (15 oz) Kidney Beans; 2 cans (15 oz) Pinto Beans
- **S5** 1 step(s) over 90 words — hard to follow on a phone mid-cook.

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).
- Split into shorter steps with one action each.

Evidence: Nutrition integrity: fail, 79% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: homepage Exposure: welcome_email Exposure: wheel Exposure: seo_landing

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Heuristic findings (marked) need a human to confirm before correcting.

## Chimichurri Steak Tacos — `steak-tacos`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 91 · exposure rank 3

Findings:
- **S3** No structured per-serving nutrition.
- **S5** 2 unit(s) are outside the standard list. *(heuristic)* — 2.5 cups packed Fresh Parsley (flat-Leaf); 1.5 cups packed Fresh Cilantro
- **S5** 1 step(s) over 90 words — hard to follow on a phone mid-cook.

Proposed corrections:
- Calculate from ingredients; never type in a guess.
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).
- Split into shorter steps with one action each.

Evidence: Nutrition integrity: withheld, 90% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: homepage Exposure: wheel Exposure: seo_landing Exposure: 13 wheel landings

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Heuristic findings (marked) need a human to confirm before correcting.

## BBQ Chicken Bowls — `bbq-chicken-bowls`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 4

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: homepage Exposure: seo_landing Exposure: 20 recipe views

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Beef Dip Sandwiches — `beef-dip`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 86 · exposure rank 5

Findings:
- **S3** No structured per-serving nutrition.
- **S3** Visual review: the photo may not match the recipe. — Round rolls with heavy melted cheese; the recipe uses hoagie rolls and lists provolone as optional.

Proposed corrections:
- Calculate from ingredients; never type in a guess.
- Compare the photo with the recipe and replace if needed.

Evidence: Nutrition integrity: withheld, 94% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: wheel Exposure: seo_landing Exposure: 18 recipe views Exposure: 15 wheel landings

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Chicken Parmesan — `chicken-parm`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 6

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 93% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: welcome_email Exposure: wheel Exposure: seo_landing Exposure: 9 wheel landings

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## BBQ Chicken Sliders — `bbq-chicken-sliders`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 99 · exposure rank 7

Findings:
- **S5** 2 unit(s) are outside the standard list. *(heuristic)* — 2 packs Slider Rolls (Hawaiian-style, 12-count pack); 2 bags (14 oz) Coleslaw Mix (bagged)

Proposed corrections:
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 85% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 27 recipe views Exposure: 12 generator picks

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Heuristic findings (marked) need a human to confirm before correcting.

## Chicken Caesar Salad — `chicken-caesar`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 8

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: wheel Exposure: 13 generator picks Exposure: 12 wheel landings

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Carolina-Style Pulled Pork Sandwiches — `pulled-pork`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 93 · exposure rank 9

Findings:
- **S3** No structured per-serving nutrition.

Proposed corrections:
- Calculate from ingredients; never type in a guess.

Evidence: Nutrition integrity: withheld, 88% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: wheel Exposure: seo_landing Exposure: 12 wheel landings

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Ancho-Tilapia with Charred Corn Salsa — `chili-lime-grilled-tilapia`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 99 · exposure rank 10

Findings:
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 1 can (15 oz) Black Beans

Proposed corrections:
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: explore_first_page Exposure: 10 recipe views

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Heuristic findings (marked) need a human to confirm before correcting.

## Garlic Butter Pasta — `five-ingredient-pasta`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 93 · exposure rank 11

Findings:
- **S3** Visual review: the photo may not match the recipe. — Plain buttered spaghetti in a bowl; accurate but the least appetizing image on the homepage rail.

Proposed corrections:
- Compare the photo with the recipe and replace if needed.

Evidence: Nutrition integrity: pass, 86% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: homepage

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Chorizo Breakfast Tacos — `chorizo-breakfast-tacos`
golden-100 · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 93 · exposure rank 12

Findings:
- **S3** Public, search-indexed page that the app never recommends.

Evidence: Nutrition integrity: fail, 89% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: homepage

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Beef and Broccoli — `beef-broccoli`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 13

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 21 recipe views

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Chicken Shawarma Pitas — `chicken-shawarma-pitas`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 14

Findings:
- **S4** Same ingredient listed more than once. *(heuristic)* — lemon juice; garlic

Proposed corrections:
- Combine into one line, or label each use (for example, 'for the sauce').

Evidence: Nutrition integrity: pass, 87% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 21 recipe views

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Heuristic findings (marked) need a human to confirm before correcting.

## Bagel Sandwich Line — `bagel-sandwich-line`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 15

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: explore_first_page Exposure: breakfast_collection

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Philly-Style Cheesesteaks — `steak-sandwiches`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 93 · exposure rank 16

Findings:
- **S3** Visual review: the photo may not match the recipe. — Shows round brioche-style buns stacked like burgers. The recipe allows brioche, but leads with hoagie rolls; a cheesesteak a new user doesn't recognize at a glance.

Proposed corrections:
- Compare the photo with the recipe and replace if needed.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: wheel Exposure: 11 wheel landings

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Hall Breakfast Burritos — `hall-breakfast-burritos`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 96 · exposure rank 17

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — breakfast-burrito-bar (ingredients 100% shared); turkey-sausage-burritos (ingredients 80% shared)

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: welcome_email

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Heuristic findings (marked) need a human to confirm before correcting.

## Baked Oatmeal with Mixed Berries — `baked-oatmeal-mixed-berries`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 18

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: explore_first_page Exposure: breakfast_collection

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Jerk Chicken & Rice and Peas — `jerk-chicken`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 93 · exposure rank 19

Findings:
- **S3** No structured per-serving nutrition.

Proposed corrections:
- Calculate from ingredients; never type in a guess.

Evidence: Nutrition integrity: withheld, 84% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: wheel Exposure: seo_landing Exposure: 6 wheel landings

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Cast Iron Breakfast Skillet — `cast-iron-breakfast-skillet`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 20

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: welcome_email

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Chorizo Breakfast Hash — `chorizo-breakfast-hash`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 21

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: welcome_email

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Fire Captain Omelette Bar — `fire-captain-omelette-bar`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 22

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: welcome_email

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Caprese Chicken Bake — `caprese-chicken-bake`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 23

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 16 generator picks

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## 30-Minute Pasta e Fagioli for the Hall — `30-minute-pasta-e-fagioli-for-the-hall`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 24

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 77% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: explore_first_page

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Andouille Po Boy Rolls for the Crew — `andouille-po-boy-rolls-crew`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 25

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: explore_first_page

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Peruvian-Style Sheet-Pan Chicken with Aji Verde — `peruvian-sheet-pan-chicken-aji-verde`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 26

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 14 generator picks

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Applewood Grilled Pork Shoulder Steaks — `applewood-pork-shoulder-steaks`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 27

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: explore_first_page

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## BBQ Chicken Mac and Cheese — `bbq-chicken-mac-and-cheese`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 28

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: wheel Exposure: 5 wheel landings

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Bagel and Lox Breakfast Board — `bagel-lox-breakfast-board`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 29

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: explore_first_page

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Chipotle Lime Chicken Tacos — `chipotle-lime-chicken-tacos`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 30

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 13 generator picks

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Honey Lime Chicken Tray — `honey-lime-chicken-tray`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 31

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 13 generator picks

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Peanut Chicken Rice Bowls — `peanut-chicken-rice-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93 · exposure rank 32

Findings:
- **S3** No structured per-serving nutrition.

Proposed corrections:
- Calculate from ingredients; never type in a guess.

Evidence: Nutrition integrity: withheld, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 13 generator picks

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Shawarma Bar Night — `shawarma-bar-night`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 33

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 79% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 13 generator picks

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Teriyaki Chicken Rice Bowls — `teriyaki-chicken-rice-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 34

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 93% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 13 generator picks

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Chicken Quesadillas — `chicken-quesadillas`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 35

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 10 recipe views Exposure: 1 saves

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Baked Cod Tray — `mediterranean-baked-fish-tray`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 36

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 82% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: explore_first_page

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## High-Protein Chicken Fried Rice — `high-protein-chicken-fried-rice`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 37

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 12 recipe views

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Chicken Pot Pie — `chicken-pot-pie`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 38

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 91% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 12 generator picks

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Baked Mac and Cheese — `mac-and-cheese-bake`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 90 · exposure rank 39

Findings:
- **S3** No structured per-serving nutrition.
- **S4** Same ingredient listed more than once. *(heuristic)* — butter

Proposed corrections:
- Calculate from ingredients; never type in a guess.
- Combine into one line, or label each use (for example, 'for the sauce').

Evidence: Nutrition integrity: withheld, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: explore_first_page

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Heuristic findings (marked) need a human to confirm before correcting.

## Beef Gyros — `beef-gyros-for-the-hall`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 40

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 9 recipe views Exposure: 1 saves

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Baked Mostaccioli with Sausage — `mostaccioli-sausage-bake`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 41

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: explore_first_page

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Baked Potato Bar — `loaded-baked-potato-bar`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 93 · exposure rank 42

Findings:
- **S3** No structured per-serving nutrition.

Proposed corrections:
- Calculate from ingredients; never type in a guess.

Evidence: Nutrition integrity: withheld, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: explore_first_page

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Pesto Chicken Tray — `pesto-tomato-chicken-tray`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 43

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 10 recipe views

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Baked Salmon Tray — `herb-baked-salmon-tray`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 44

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: explore_first_page

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## BBQ Breakfast Hash — `bbq-breakfast-hash`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 45

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: breakfast_collection

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Belgian Waffle Platter — `belgian-waffle-platter`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 46

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 89% of ingredients matched to nutrition data. Hero 1536×1024px. Exposure: breakfast_collection

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Berry Vanilla Protein Overnight Oats — `berry-vanilla-protein-overnight-oats`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 47

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: breakfast_collection

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Biscuit French Toast Sliders — `biscuit-french-toast-sliders`
breakfast · approved · status **needs_review** · recommendation **minor corrections** · score 82 · exposure rank 48

Findings:
- **S2** Visual review: the photo doesn't match the dish as written, or would mislead a cook. — Render includes a printed sign reading 'BISCUIT FRENCH TOAST SLIDERS' and fire-department set dressing — obviously staged/AI, undermines trust.
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Replace with a photo of this recipe as written.
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1536×1024px. Exposure: breakfast_collection

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Costco Rotisserie Chicken Remix — `costco-rotisserie-remix`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 49

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 2 saves

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed.

## Black Bean & Egg White Breakfast Burritos — `black-bean-egg-white-breakfast-burritos`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 96 · exposure rank 50

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — egg-white-black-bean-breakfast-quesadillas (ingredients 63% shared)

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: breakfast_collection

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Heuristic findings (marked) need a human to confirm before correcting.

## Meatloaf and Mashed Potatoes — `meatloaf-mashed`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 51

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: seo_landing

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Breakfast Crunchwraps — `breakfast-crunchwraps`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 52

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 75% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: breakfast_collection

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Chicken Fajitas — `sheet-pan-fajitas`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 53

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.3 Cup Olive Oil

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: seo_landing

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Breakfast Enchiladas for the Crew — `breakfast-enchiladas`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 54

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 75% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: breakfast_collection

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Baked Ziti — `baked-ziti`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 55

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 93% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: seo_landing

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Breakfast Fried Rice for the Crew — `breakfast-fried-rice-crew`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97 · exposure rank 56

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1536×1024px. Exposure: breakfast_collection

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Shepherd's Pie — `shepherds-pie`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 57

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: seo_landing

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Firehall Gyro Bowls — `firehall-gyro-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93 · exposure rank 58

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 1 saves

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Salsa Verde Crock Chicken — `salsa-verde-crock-chicken`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 59

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 1 saves

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Sausage Peppers and Onions — `sausage-peppers-onions`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 60

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 1 saves

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Sheet-Pan Lemon Chicken with Broccoli & Sweet Potatoes — `sheet-pan-lemon-chicken-broccoli-sweet-potatoes`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90 · exposure rank 61

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 2 quantity value(s) are raw decimals. — 0.33 cup lemon juice; 0.33 cup olive oil

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 1 saves

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Street Corn Chicken Bowls — `street-corn-chicken`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 62

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: 1 saves

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Pad Thai — `pad-thai`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 96 · exposure rank 63

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.3 Cup Warm Water
- **S5** 8 step(s) over 90 words — hard to follow on a phone mid-cook.

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Split into shorter steps with one action each.

Evidence: Nutrition integrity: pass, 82% of ingredients matched to nutrition data. Hero 1024×1024px. Exposure: seo_landing

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Texas Central Brisket for the Crew — `texas-central-brisket-crew`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 100 · exposure rank 64

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 89% of ingredients matched to nutrition data. Hero 1536×1024px. Exposure: seo_landing

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Italian Beef Slow Cooker Sandwiches — `italian-beef-slow-cooker`
hall-expansion · approved · status **needs_review** · recommendation **major corrections** · score 38

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — onion
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 9.6 each hoagie rolls
- **S2** Main protein works out to 16.0 oz raw per serving for 8 servings. *(heuristic)* — 8 lb chuck roast
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift, ingredient_calorie_drift
- **S4** 1 quantity value(s) are raw decimals. — 1.6 lb provolone

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Check whether the quantity is for a larger batch than the stated servings.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Epazote Esquites Street Cups — `firehall-street-elote-cups`
bbq · approved · status **needs_review** · recommendation **major corrections** · score 52

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — Fresh Epazote
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — butter
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 9.6 ears Corn On The Cob
- **S4** 3 quantity value(s) are raw decimals. — 2.6 Tbsp Tajín Seasoning; 1.6 Cups Crushed Totopos; 2.6 Tbsp Avocado Oil

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 60% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Yucatán Achiote Pollo Asado Spread — `pollo-asado-citrus-platter`
bbq · approved · status **needs_review** · recommendation **major corrections** · score 52

Findings:
- **S2** 2 listed ingredient(s) never used in the steps. *(heuristic)* — Jicama Sticks; Habanero Salsa
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — cilantro
- **S2** 2 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 9.6 pieces Chicken Leg Quarters; 19.2 pieces Hand-Pressed Corn Tortillas
- **S4** 1 quantity value(s) are raw decimals. — 1.6 Lb Jicama Sticks

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 40% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Chipotle Chicken Burrito Bowls — `chipotle-chicken-burrito-bowls`
hall-expansion · approved · status **needs_review** · recommendation **major corrections** · score 53

Findings:
- **S2** Steps use 2 ingredient(s) that aren't in the ingredient list. *(heuristic)* — lime; cumin
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 2.4 each onions
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 8 quantity value(s) are raw decimals. — 3.2 lb chicken thighs; 3.4 tbsp chipotle in adobo; 2.4 cups rice; 3.2 cups corn; 2.4 cups pico de gallo; 1.6 cups guacamole; 1.6 cups sour cream; 2.4 cups cheddar cheese

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Korean Beef Bowls — `firehall-korean-beef-bowls`
hall-expansion · approved · status **needs_review** · recommendation **major corrections** · score 53

Findings:
- **S2** Steps use 2 ingredient(s) that aren't in the ingredient list. *(heuristic)* — garlic; onion
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 1.6 each cucumbers
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 4 quantity value(s) are raw decimals. — 2.8 lb ground beef; 2.4 cups jasmine rice; 1.6 lb spinach; 1.6 cups kimchi

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 91% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Mediterranean Feast Night — `mediterranean-feast-night`
hall-expansion · approved · status **needs_review** · recommendation **major corrections** · score 53

Findings:
- **S2** Steps use 2 ingredient(s) that aren't in the ingredient list. *(heuristic)* — garlic; paprika
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 9.6 pieces pita bread
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 5 quantity value(s) are raw decimals. — 3.2 lb chicken thighs; 2.4 cups hummus; 1.6 cups tzatziki; 3.2 cups tabbouleh salad; 1.6 cups Kalamata olives

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Salsa Verde Chicken Crock — `salsa-verde-chicken-crock`
hall-expansion · approved · status **needs_review** · recommendation **major corrections** · score 53

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — sour cream
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 4.8 each limes
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 3 quantity value(s) are raw decimals. — 4.8 lb chicken thighs; 4.8 cups salsa verde; 2.4 lb corn

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Southwest Steak Bowls — `southwest-steak-bowls`
hall-expansion · approved · status **needs_review** · recommendation **major corrections** · score 53

Findings:
- **S2** Steps use 2 ingredient(s) that aren't in the ingredient list. *(heuristic)* — sour cream; cumin
- **S2** 2 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 3.2 each avocados; 4.8 each limes
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 5 quantity value(s) are raw decimals. — 2.4 cups cilantro-lime rice; 3.2 cups corn; 2.4 cups pico de gallo; 1.6 cups cheddar cheese; 1.6 cups chipotle crema

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Spanish Rice Chicken One Pot — `spanish-rice-chicken-one-pot`
hall-expansion · approved · status **needs_review** · recommendation **major corrections** · score 53

Findings:
- **S2** Steps use 3 ingredient(s) that aren't in the ingredient list. *(heuristic)* — garlic; onion; paprika
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 4.8 each bell peppers
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 3 quantity value(s) are raw decimals. — 4.8 lb boneless chicken thighs; 9.6 cups chicken broth; 2.4 lb frozen peas

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Thai Peanut Chicken Crock — `thai-peanut-chicken-crock`
hall-expansion · approved · status **needs_review** · recommendation **major corrections** · score 53

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — soy sauce
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 4.8 each lime
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 1 quantity value(s) are raw decimals. — 4.8 lb chicken thighs

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Chicken Thigh Stretch Dinner — `chicken-thigh-stretch-dinner`
hall-expansion · approved · status **needs_review** · recommendation **major corrections** · score 56

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — garlic
- **S2** 2 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 6.4 each bell peppers; 3.2 each onions
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Dirty Rice Crew Skillet — `dirty-rice-crew-skillet`
hall-expansion · approved · status **needs_review** · recommendation **major corrections** · score 60

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — onion
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 3.2 each bell peppers
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 3 quantity value(s) are raw decimals. — 2.4 lb andouille sausage; 2.4 lb ground beef; 9.6 cups chicken broth

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Korean Turkey Rice Bowls — `korean-turkey-rice-bowls`
hall-expansion · approved · status **needs_review** · recommendation **major corrections** · score 60

Findings:
- **S2** Steps use 4 ingredient(s) that aren't in the ingredient list. *(heuristic)* — garlic; sugar; soy sauce; vinegar
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 3.2 each cucumbers
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 1.6 lb carrots

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Blue Cheese Fingerling Ranch Tray — `loaded-ranch-potato-salad-crew`
bbq · approved · status **needs_review** · recommendation **major corrections** · score 60

Findings:
- **S2** 3 listed ingredient(s) never used in the steps. *(heuristic)* — Crumbled Blue Cheese; Fresh Chives; Watermelon Radish
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — onion
- **S3** Prep + cook is 65 min, but the steps add up to about 1532 min. *(heuristic)*
- **S4** 1 quantity value(s) are raw decimals. — 6.4 Lb Fingerling Potatoes

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Add the ingredient with a quantity, or correct the step.
- Re-time the recipe and correct prep/cook time.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Mediterranean Beef Bowls — `mediterranean-beef-bowls`
hall-expansion · approved · status **needs_review** · recommendation **major corrections** · score 60

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — parsley
- **S2** 2 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 1.6 each cucumbers; 4.8 each tomatoes
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 5 quantity value(s) are raw decimals. — 2.8 lb ground beef; 2.4 cups lemon rice; 1.6 cups pickled red onions; 2.4 cups hummus; 1.6 cups feta

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Slider Bar — `slider-bar`
golden-100 · approved · status **needs_review** · recommendation **major corrections** · score 63

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — BBQ Sauce
- **S2** More than 2½ rolls or potatoes (or 4 tortillas) per person for 8 servings. *(heuristic)* — 36 count Slider Buns (4.5 per person)
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Check whether the quantity was written for a larger crew; correct it or the serving count.
- Recalculate per serving from the ingredient list and base servings.

Evidence: Nutrition integrity: fail, 93% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Denver Breakfast Casserole — `denver-breakfast-casserole`
breakfast · approved · status **needs_review** · recommendation **major corrections** · score 67

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — shredded cheddar
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — butter
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Add the ingredient with a quantity, or correct the step.
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Seoul Chili Pear Beef Cubes — `gochujang-beef-skewers-crew`
bbq · approved · status **needs_review** · recommendation **major corrections** · score 67

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — Boneless Short Rib
- **S2** Steps use 3 ingredient(s) that aren't in the ingredient list. *(heuristic)* — garlic; onion; sugar
- **S4** 1 quantity value(s) are raw decimals. — 4.4 Lb Boneless Short Rib

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Add the ingredient with a quantity, or correct the step.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 60% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Pistachio Peach and Burrata Salad — `grilled-peach-burrata-salad`
bbq · approved · status **needs_review** · recommendation **major corrections** · score 67

Findings:
- **S2** 3 listed ingredient(s) never used in the steps. *(heuristic)* — Pistachios; Prosecco Reduction; Fresh Mint
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — basil
- **S4** 3 quantity value(s) are raw decimals. — 1.6 Lb Burrata Cheese; 6.4 Cups Baby Arugula; 2.6 Tbsp Peach Nectar

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Add the ingredient with a quantity, or correct the step.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 50% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Sandwich Board Night — `sandwich-board-night`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 67

Findings:
- **S2** Steps use 2 ingredient(s) that aren't in the ingredient list. *(heuristic)* — onion; vinegar
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift, ingredient_calorie_drift
- **S4** 1 quantity value(s) are raw decimals. — 1.6 lb deli-sliced roast turkey breast
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 3/4 tray each lettuce and tomato

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Coq au Vin Batch — `coq-au-vin-batch`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 68

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — butter
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup fresh parsley

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 73% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Firehall Charcuterie Board — `firehall-charcuterie-board`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 68

Findings:
- **S2** Main protein works out to 1.5 oz raw per serving for 8 servings — light for a firehall main. *(heuristic)* — 3/4 lb deli-sliced roast turkey breast
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 3 quantity value(s) are raw decimals. — 1.6 lb crackers assortment; 1.6 lb grapes; 1.6 cups cornichons

Proposed corrections:
- Check the protein amount or the serving count (typical: 5–8 oz raw per adult).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 50% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Leftover Roast Beef Bowls — `leftover-roast-beef-bowls`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 68

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — milk
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 3 quantity value(s) are raw decimals. — 6.4 cups beef gravy; 2.4 lb frozen peas; 2.4 lb carrots

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Loaded Baked Potato Soup Crock — `loaded-baked-potato-soup-crock`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 68

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — cornstarch
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift, ingredient_calorie_drift
- **S4** 5 quantity value(s) are raw decimals. — 9.6 lb russet potatoes; 11.2 cups chicken broth; 2.4 lb bacon; 2.4 lb cheddar cheese; 3.2 cups sour cream

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Mississippi Pot Roast for the Crew — `mississippi-pot-roast-crew`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 68

Findings:
- **S2** Main protein works out to 16.0 oz raw per serving for 8 servings. *(heuristic)* — 8 lb chuck roast
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 3 quantity value(s) are raw decimals. — 3.2 cups beef broth; 1.6 packets ranch seasoning; 2.4 lb carrots

Proposed corrections:
- Check whether the quantity is for a larger batch than the stated servings.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Pasta e Fagioli for the Hall — `pasta-e-fagioli-hall`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 68

Findings:
- **S2** Steps use 3 ingredient(s) that aren't in the ingredient list. *(heuristic)* — onion; parsley; parmesan
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 4 quantity value(s) are raw decimals. — 3.2 lb ground beef; 2.4 lb small pasta; 11.2 cups beef broth; 1.6 lb carrots

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Sausage Gnocchi Skillet — `sausage-gnocchi-skillet`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 68

Findings:
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 1.6 each onions
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 4 quantity value(s) are raw decimals. — 4.8 lb shelf-stable gnocchi; 9.6 cups marinara sauce; 1.6 lb spinach; 2.4 lb mozzarella

Proposed corrections:
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Smoked Sausage Platter — `smoked-sausage-platter`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 68

Findings:
- **S2** Steps use 2 ingredient(s) that aren't in the ingredient list. *(heuristic)* — broth or stock; mustard
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift, ingredient_calorie_drift
- **S4** 2 quantity value(s) are raw decimals. — 2.6 tbsp olive oil; 2.4 cups sauerkraut

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Smoker Nachos for the Crew — `smoker-nachos-crew`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 68

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — cilantro
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift, ingredient_calorie_drift
- **S4** 1 quantity value(s) are raw decimals. — 3.2 cups salsa

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## White Chicken Chili Crock — `white-chicken-chili-crock`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 68

Findings:
- **S2** Steps use 4 ingredient(s) that aren't in the ingredient list. *(heuristic)* — onion; lime; cilantro; cumin
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 3 quantity value(s) are raw decimals. — 9.6 cups chicken broth; 2.4 lb corn; 1.6 lb cream cheese

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Hall BLT Sandwich Feed — `hall-blt-sandwich-feed`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 70

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — avocado
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift, ingredient_calorie_drift
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 1 batch kosher salt and black pepper

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Moroccan Lamb Meatballs — `moroccan-meatballs`
golden-100 · approved · status **needs_review** · recommendation **major corrections** · score 70

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — Ground Lamb Or Beef
- **S2** Steps use 2 ingredient(s) that aren't in the ingredient list. *(heuristic)* — eggs; breadcrumbs

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Philly Cheesesteak Egg Rolls — `philly-egg-rolls`
golden-100 · approved · status **needs_review** · recommendation **major corrections** · score 70

Findings:
- **S2** 3 listed ingredient(s) never used in the steps. *(heuristic)* — Ground Beef; Yellow Onion; Garlic Cloves
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — eggs

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Lebanese Chicken Shish Platter — `lebanese-chicken-shish-platter`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 71

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — mayonnaise
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** Same ingredient listed more than once. *(heuristic)* — lemon juice; garlic
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup lemon juice
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 12 rounds pita bread

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Combine into one line, or label each use (for example, 'for the sauce').
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Smoked Turkey Breast for the Crew — `smoked-turkey-breast`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 74

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — broth or stock
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 3 quantity value(s) are raw decimals. — 1.6 halves bone-in turkey breast halves; 2.6 tbsp fresh thyme; 2.6 tbsp olive oil
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 1.6 halves bone-in turkey breast halves

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Mortadella Farfalle Antipasto Tray — `firehall-antipasto-pasta-salad`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 75

Findings:
- **S2** Steps use 2 ingredient(s) that aren't in the ingredient list. *(heuristic)* — garlic; onion
- **S3** Prep + cook is 50 min, but the steps add up to about 2922 min. *(heuristic)*
- **S4** 2 quantity value(s) are raw decimals. — 1.6 Lb Farfalle Pasta; 1.6 Cups Marinated Artichoke Hearts

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Re-time the recipe and correct prep/cook time.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 50% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## High-Protein Yogurt Parfaits — `high-protein-parfaits`
breakfast-performance · public, not approved · status **needs_review** · recommendation **decide unapproved page** · score 75

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — chia seeds or ground flax
- **S3** Public, search-indexed page that the app never recommends.
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Honey Chipotle Grilled Chicken Thighs — `honey-chipotle-chicken-thighs`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 75

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — mayonnaise
- **S3** Prep + cook is 45 min, but the steps add up to about 1468 min. *(heuristic)*
- **S4** 3 quantity value(s) are raw decimals. — 2.1 Tbsp Kosher Salt; 2.6 Tbsp Brown Sugar; 2.6 Tbsp Neutral Oil

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Re-time the recipe and correct prep/cook time.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Lamb Kofta Skewer Platter — `lamb-kofta-skewer-platter`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 75

Findings:
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 10.7 pieces flatbread
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 4 quantity value(s) are raw decimals. — 3.6 lb ground lamb; 1.8 tsp ground cumin; 1.8 tsp ground coriander; 2.8 tbsp lemon juice

Proposed corrections:
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 75% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Moroccan Chicken Kebab Platter — `moroccan-chicken-kebab-platter`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 75

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — onion
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 2 quantity value(s) are raw decimals. — 3.2 lb boneless chicken thighs; 2.4 cups couscous

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 75% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Salmon Rice Bowls for the Crew — `salmon-rice-bowls-crew`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 75

Findings:
- **S2** 2 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 3.2 each cucumbers; 4.8 each avocados
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 1.6 cups sesame dressing

Proposed corrections:
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Hungarian Goulash for the Crew — `hungarian-goulash-crew`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 76

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S3** Prep + cook is 150 min, but the steps add up to about 350 min. *(heuristic)*
- **S4** 4 quantity value(s) are raw decimals. — 3.2 lb beef chuck roast; 2.6 tbsp sweet paprika; 4.8 cups beef broth; 1.6 lb russet potatoes

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Re-time the recipe and correct prep/cook time.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 91% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Egg Roll in a Bowl for the Crew — `egg-roll-in-a-bowl-crew`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 78

Findings:
- **S2** Steps use 2 ingredient(s) that aren't in the ingredient list. *(heuristic)* — garlic; sugar
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## French Toast Casserole — `french-toast-casserole`
golden-100 · public, not approved · status **needs_review** · recommendation **decide unapproved page** · score 78

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — Thick-sliced brioche or Texas toast, cubed
- **S3** Public, search-indexed page that the app never recommends.

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Grilled Flank Fajita Bar — `grilled-flank-fajita-bar`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 78

Findings:
- **S2** 3 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 9.6 each bell peppers; 4.8 each onions; 6.4 each lime
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Potato Bar Feed — `loaded-potato-feed`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 78

Findings:
- **S2** More than 2½ rolls or potatoes (or 4 tortillas) per person for 8 servings. *(heuristic)* — 40 count Russet Potatoes, Scrubbed (5.0 per person)
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift, ingredient_calorie_drift

Proposed corrections:
- Check whether the quantity was written for a larger crew; correct it or the serving count.
- Recalculate per serving from the ingredient list and base servings.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Memphis Dry Rub Ribs — `memphis-dry-rub-ribs`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 78

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — butter
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Recalculate per serving from the ingredient list and base servings.

Evidence: Nutrition integrity: fail, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Pancake Short Stack — `pancake-short-stack`
golden-100 · public, not approved · status **needs_review** · recommendation **decide unapproved page** · score 78

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — butter
- **S3** Public, search-indexed page that the app never recommends.

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Maple Sausage Pinwheels — `maple-sausage-pinwheels`
breakfast · approved · status **needs_review** · recommendation **minor corrections** · score 79

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — everything bagel seasoning
- **S4** Same ingredient listed more than once. *(heuristic)* — maple syrup
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Combine into one line, or label each use (for example, 'for the sauce').
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Egg White & Black Bean Breakfast Quesadillas — `egg-white-black-bean-breakfast-quesadillas`
breakfast · approved · status **needs_review** · recommendation **minor corrections** · score 81

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — cumin
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — black-bean-egg-white-breakfast-burritos (ingredients 63% shared)

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Chicken Alfredo — `skillet-chicken-alfredo`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 81

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — Fettuccine Or Penne
- **S4** 1 quantity value(s) are raw decimals. — 0.3 Cup Fresh Parsley, Chopped
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — chicken-alfredo-bake (ingredients 50% shared)

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Turkey Lettuce Wraps — `turkey-lettuce-wrap-night`
performance-meals · approved · status **needs_review** · recommendation **minor corrections** · score 81

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — green onions
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup hoisin sauce
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — asian-chicken-lettuce-cups (ingredients 71% shared)

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Turkey Sausage Breakfast Burritos — `turkey-sausage-burritos`
breakfast · approved · status **needs_review** · recommendation **minor corrections** · score 81

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — butter
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — breakfast-burrito-bar (ingredients 80% shared); hall-breakfast-burritos (ingredients 80% shared)

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Sicilian Anchovy Broccolini Tray — `charred-broccolini-lemon-tray`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** 3 listed ingredient(s) never used in the steps. *(heuristic)* — Anchovy Fillets; Golden Raisins; Pine Nuts
- **S4** 2 quantity value(s) are raw decimals. — 3.2 Lb Broccolini; 2.6 Tbsp Lemon Juice

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 67% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Competition BBQ Chicken Thighs — `competition-bbq-chicken-thighs`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 9.6 pieces Bone-In Chicken Thighs
- **S4** 2 quantity value(s) are raw decimals. — 2.6 Tbsp Brown Sugar; 2.6 Tbsp Butter

Proposed corrections:
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 91% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Barbacoa Chicken — `crock-barbacoa-chicken`
performance-meals · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — rice
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup lime juice

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Beef Enchilada Skillet — `enchilada-beef-skillet`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 3 quantity value(s) are raw decimals. — 2.4 lb ground beef (85/15); 3.2 cups red enchilada sauce; 2.4 cups shredded cheddar cheese
- **S5** Title quality score 48/100.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Name the dish plainly and appetizingly (main protein + style).

Evidence: Nutrition integrity: fail, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Firehall Breakfast Pizza — `firehall-breakfast-pizza`
breakfast · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — sliced green onions
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Migrate to the canonical schema.

Evidence: Nutrition integrity: fail, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Teppan Shrimp and Pork Belly Mixed Grill — `firehall-hibachi-mixed-grill-crew`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — garlic
- **S4** 3 quantity value(s) are raw decimals. — 2.4 Lb Jumbo Shrimp; 2.4 Lb Pork Belly; 2.6 Tbsp Fresh Ginger

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Cooper Sharp Chopped Ribeye Hoagies — `flat-top-philly-cheesesteaks-crew`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** 2 listed ingredient(s) never used in the steps. *(heuristic)* — Kitchen Bouquet; Dried Basil
- **S4** 1 quantity value(s) are raw decimals. — 4.4 Lb Ribeye Steak

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 56% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## General Tso's-Style Baked Chicken — `general-tsos-baked-chicken`
performance-meals · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — olive oil spray
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup soy sauce

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 93% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Giardiniera Smash Sausage Hoagies — `griddle-smash-sausage-peppers`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** 3 listed ingredient(s) never used in the steps. *(heuristic)* — Giardiniera Relish; Fennel Pollen; Calabrian Chili Paste
- **S4** 2 quantity value(s) are raw decimals. — 4.4 Lb Sweet Italian Sausage; 2.6 Tbsp Beef Tallow

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 56% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Sun-Dried Tomato Pesto Panini Press — `grilled-chicken-pesto-panini-crew`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — milk
- **S4** 1 quantity value(s) are raw decimals. — 4.4 Lb Chicken Breast

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Hall Burger Bar — `hall-burger-bar`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 2 quantity value(s) are raw decimals. — 2.4 lb ground beef (80/20); 1.6 cups dill pickle chips
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 3/4 cup each ketchup and mustard

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Hickory Smoked Turkey Legs — `hickory-turkey-legs`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_calorie_drift
- **S4** 2 quantity value(s) are raw decimals. — 2.6 tbsp smoked paprika; 1.6 cups apple juice
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 8 legs whole turkey legs

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Hot Honey Grilled Sausage & Peppers — `hot-honey-grilled-sausage-peppers`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — eggs
- **S4** 1 quantity value(s) are raw decimals. — 2.6 Tbsp Neutral Oil

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## North African Urfa Lamb Merguez Logs — `lamb-merguez-skewers-crew`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 9.6 pieces Naan Bread
- **S4** 2 quantity value(s) are raw decimals. — 4.4 Lb Ground Lamb; 1.6 Cups Greek Yogurt

Proposed corrections:
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 73% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Pasta e Ceci (Pasta with Chickpeas) — `pasta-e-ceci-for-the-hall`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — Red Pepper Flakes
- **S4** 1 quantity value(s) are raw decimals. — 0.3 Cup Fresh Parsley

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 73% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Indonesian Tamarind Pork Satay Batches — `pork-satay-skewers-crew`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — heavy cream
- **S4** 1 quantity value(s) are raw decimals. — 4.4 Lb Pork Shoulder

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 50% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Lisbon Piri-Piri Linguica Spread — `portuguese-linguica-grill-platter`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 9.6 pieces Crusty Rolls
- **S4** 1 quantity value(s) are raw decimals. — 4.8 Lb Portuguese Linguica

Proposed corrections:
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 70% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Reverse-Seared Ribeye for the Crew — `reverse-seared-ribeye-crew`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — mayonnaise
- **S4** 3 quantity value(s) are raw decimals. — 2.6 Tbsp Kosher Salt; 2.6 Tbsp Neutral Oil; 6.8 Tbsp Unsalted Butter

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 89% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Santa Maria Tri-Tip Roast — `santa-maria-tri-tip-roast`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — mayonnaise
- **S4** 3 quantity value(s) are raw decimals. — 4.8 Lb Tri-Tip Roast; 3.2 Cups Pinto Beans; 1.6 Cups Pico De Gallo

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Sheet Pan Breakfast Hash — `sheet-pan-breakfast-hash`
breakfast · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — shredded cheddar
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Shrimp and Grits Breakfast — `shrimp-and-grits-breakfast`
breakfast · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — broth or stock
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Sicilian Sheet Pan Pizza — `sicilian-sheet-pizza`
pizza-night · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 82

Findings:
- **S3** No structured per-serving nutrition.
- **S3** Public, search-indexed page that the app never recommends.
- **S4** 1 quantity value(s) are raw decimals. — 0.8 cup Grated parmesan
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — pepperoni-pizza-night (ingredients 73% shared)

Proposed corrections:
- Calculate from ingredients; never type in a guess.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: withheld, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Smoked Picanha Steak Platter — `smoked-picanha-steak-platter`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** Steps use 2 ingredient(s) that aren't in the ingredient list. *(heuristic)* — lime; rice
- **S4** 2 quantity value(s) are raw decimals. — 4.8 Lb Picanha Roast; 2.6 Tbsp Coarse Kosher Salt

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 89% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Smoked Salmon Benedict — `smoked-salmon-benedit`
breakfast · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — vinegar
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Southwest Egg Bake — `southwest-egg-bake`
breakfast · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — paprika
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Binghamton White-Wine Spiedie Tray — `spiedie-chicken-platter-crew`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** 1 whole-item ingredient(s) have impossible fractional counts — a scaling leftover. — 9.6 pieces Martin's Potato Rolls
- **S4** 1 quantity value(s) are raw decimals. — 4.4 Lb Chicken Breast

Proposed corrections:
- Round to a purchasable whole number and re-check the batch (3.2 chickens → 3).
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 56% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Kashmiri Mustard-Oil Lamb Chop Feast — `tandoori-lamb-chop-platter`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** Steps use 3 ingredient(s) that aren't in the ingredient list. *(heuristic)* — garlic; lemon; cilantro
- **S4** 2 quantity value(s) are raw decimals. — 2.6 Tbsp Mustard Oil; 1.6 Cups Greek Yogurt

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Texas-Style Beef Ribs — `texas-beef-ribs`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — Garlic Powder
- **S4** 1 quantity value(s) are raw decimals. — 0.3 Cup Apple Cider Vinegar

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Wonton Noodle Soup for the Crew — `wonton-noodle-soup-crew`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 82

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 4 quantity value(s) are raw decimals. — 6.4 cups chicken broth; 1.6 inches ginger; 1.6 lb egg noodles; 1.6 lb baby bok choy
- **S5** 2 unit(s) are outside the standard list. *(heuristic)* — 48 wrappers wonton wrappers; 1.6 inches ginger

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: fail, 91% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Cheesy Beef Nacho Bake — `cheesy-beef-nacho-bake`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 3 quantity value(s) are raw decimals. — 1.6 lb ground beef (85/15); 2.6 tbsp taco seasoning; 1.6 cups salsa

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Chicken Cacciatore for the Crew — `chicken-cacciatore-crew`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 2 quantity value(s) are raw decimals. — 4.8 lb chicken leg quarters; 1.6 cups polenta

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 82% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Chicken Paprikash for the Hall — `chicken-paprikash-hall`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 5 quantity value(s) are raw decimals. — 4.4 lb bone-in chicken thighs; 2.8 tbsp sweet paprika; 1.8 tbsp tomato paste; 2.7 cups chicken broth; 3.7 tbsp butter

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 91% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Chicken Wing Bar Night — `chicken-wing-bar-night`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 1 quantity value(s) are raw decimals. — 1.6 lb baby carrots

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Cottage Pie for the Crew — `cottage-pie-for-the-crew`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 4 quantity value(s) are raw decimals. — 2.4 lb ground beef; 1.6 cups beef broth; 3.2 lb russet potatoes; 5.1 tbsp butter

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Hall Chicken Noodle Soup — `hall-chicken-noodle-soup`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 2 quantity value(s) are raw decimals. — 3.2 lb bone-in chicken thighs; 6.4 cups chicken broth

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 70% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Hall Sloppy Joe Feed — `hall-sloppy-joe-feed`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 4 quantity value(s) are raw decimals. — 1.6 cups ketchup; 2.6 tbsp Worcestershire sauce; 2.6 tbsp apple cider vinegar; 1.6 cups dill pickle chips

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Jalapeño Popper Dip — `jalapeno-popper-dip`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 2 quantity value(s) are raw decimals. — 12.8 oz cream cheese; 1.6 cups sharp cheddar cheese

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Kielbasa Cabbage Potato Skillet — `kielbasa-cabbage-potato-skillet`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 2 quantity value(s) are raw decimals. — 2.4 lb smoked kielbasa; 2.4 lb Yukon Gold potatoes

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Korean Bulgogi Grill Night — `korean-bulgogi-grill-night`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 3 quantity value(s) are raw decimals. — 3.2 lb ribeye steak; 2.6 tbsp brown sugar; 1.6 cups kimchi

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 82% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Loaded Nacho Bar Night — `loaded-nacho-bar-night`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 7 quantity value(s) are raw decimals. — 1.6 lb ground beef (85/15); 2.6 tbsp taco seasoning; 1.6 lb tortilla chips; 2.4 cups queso dip; 1.6 cups shredded cheddar; 1.6 cups pico de gallo; 1.6 cups guacamole

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Loaded Potato Skins — `loaded-potato-skins`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift, ingredient_calorie_drift
- **S4** 2 quantity value(s) are raw decimals. — 1.6 lb bacon; 1.6 cups sour cream

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Mediterranean Chicken Farro Bowls — `mediterranean-chicken-farro-bowls`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 4 quantity value(s) are raw decimals. — 2.8 lb chicken breast; 2.4 cups farro; 1.6 cups cherry tomatoes; 1.6 cups hummus

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Mesquite Smoked Chuck Roast — `mesquite-chuck-roast`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_calorie_drift
- **S4** 3 quantity value(s) are raw decimals. — 4.8 lb boneless beef chuck roast; 2.6 tbsp kosher salt; 1.6 cups beef broth

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Molasses Bourbon Pork Ribs — `molasses-bourbon-pork-ribs`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift, ingredient_calorie_drift
- **S4** 2 quantity value(s) are raw decimals. — 3.2 racks St. Louis pork ribs; 2.6 tbsp kosher salt

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Nashville Hot Chicken Pizza — `nashville-hot-chicken-pizza`
pizza-night · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 83

Findings:
- **S3** No structured per-serving nutrition.
- **S3** Public, search-indexed page that the app never recommends.
- **S4** 1 quantity value(s) are raw decimals. — 0.3 cup Pickle brine

Proposed corrections:
- Calculate from ingredients; never type in a guess.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: withheld, 85% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Paprika Roasted Chicken Quarters — `paprika-roasted-chicken-quarters`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 1 quantity value(s) are raw decimals. — 4.8 lb chicken leg quarters

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Peri Peri Chicken Platter — `peri-peri-chicken-platter`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S4** 1 quantity value(s) are raw decimals. — 4.8 lb chicken leg quarters

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 82% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Pork Belly Burnt Ends — `pork-belly-burnt-ends`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_calorie_drift
- **S4** 4 quantity value(s) are raw decimals. — 4.8 lb skinless pork belly; 2.6 tbsp kosher salt; 2.6 tbsp brown sugar; 3.4 tbsp unsalted butter

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Rigatoni with Meat Sauce — `rigatoni-meat-sauce-batch`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 3 quantity value(s) are raw decimals. — 1.6 lb rigatoni pasta; 1.6 lb ground beef (80/20); 2.6 tbsp tomato paste

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Sheet Pan Meatball Marinara Feed — `sheet-pan-meatball-marinara`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_calorie_drift
- **S4** 5 quantity value(s) are raw decimals. — 3.2 lb ground beef (80/20); 1.6 cups breadcrumbs; 6.4 cups marinara sauce; 1.6 lb spaghetti; 1.6 cups shredded mozzarella

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Smoked Corned Beef Brisket — `smoked-corned-beef`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift, ingredient_calorie_drift
- **S4** 2 quantity value(s) are raw decimals. — 9.6 oz guinness or dark beer; 3.2 lb baby potatoes

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Smoked Meatloaf with Glaze — `smoked-meatloaf`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 1 quantity value(s) are raw decimals. — 2.6 tbsp Worcestershire sauce

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Smoked Tri-Tip Roast — `smoked-tri-tip`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_calorie_drift
- **S4** 2 quantity value(s) are raw decimals. — 4.8 lb tri-tip roast; 2.6 tbsp olive oil

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Station Cobb Salad — `station-cobb-salad`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 1 quantity value(s) are raw decimals. — 1.6 cups cherry tomatoes

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Tourtière for the Crew — `tourtiere-for-the-crew`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 83

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** 2 quantity value(s) are raw decimals. — 1.6 lb ground pork; 3.2 sheets pie crust

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 82% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Chicken Tikka Masala — `chicken-tikka-masala`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 84

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — lemon
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — butter-chicken (ingredients 79% shared)

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: fail, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Nacho Skillet — `loaded-nacho-skillet`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 84

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — sour cream
- **S5** Title quality score 45/100.

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.
- Name the dish plainly and appetizingly (main protein + style).

Evidence: Nutrition integrity: fail, 86% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Best Tuna Melt for the Hall (Diner Style) — `best-tuna-melt-for-the-hall`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 1 batch kosher salt and black pepper

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: fail, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Classic Patty Melt for the Crew — `classic-patty-melt-for-the-crew`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 1 batch kosher salt and black pepper

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: fail, 89% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Tuscan Chicken — `creamy-tuscan-chicken`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — rice

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Crispy Chicken Cutlets Marinara — `crispy-chicken-cutlets`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — basil

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Chicken Enchilada Casserole — `enchilada-casserole`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — onion

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Firehall Supreme Pizza — `firehall-supreme-pizza`
pizza-night · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 85

Findings:
- **S3** No structured per-serving nutrition.
- **S3** Public, search-indexed page that the app never recommends.
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — veggie-supreme-pizza (ingredients 57% shared)

Proposed corrections:
- Calculate from ingredients; never type in a guess.

Evidence: Nutrition integrity: withheld, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Garlic Butter Shrimp — `garlic-butter-shrimp`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — rice

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: pass, 86% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Herb Roasted Chicken Thighs — `herb-roasted-thighs`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** 2 listed ingredient(s) never used in the steps. *(heuristic)* — Fresh Thyme; Fresh Rosemary

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.

Evidence: Nutrition integrity: pass, 67% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Jalapeño Cheddar Smoked Sausages — `jalapeno-cheddar-smoked-sausages`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — eggs

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: pass, 89% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Beef Rice Bowls — `korean-beef-rice-bowls`
performance-meals · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — green onions

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Pecan Bourbon Whole Trout Board — `maple-bourbon-grilled-trout`
bbq · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — milk

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: pass, 73% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Meat Lover's Pizza — `meat-lovers-sheet-pizza`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** 1 listed ingredient(s) never used in the steps. *(heuristic)* — Dried Oregano

Proposed corrections:
- Add each ingredient to the step where it goes in, or remove it from the list.

Evidence: Nutrition integrity: withheld, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Mediterranean Chickpea Bowls — `mediterranean-chickpea`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — cumin

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Chicken Burrito Bowls — `performance-burrito-bowls`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** Steps use 2 ingredient(s) that aren't in the ingredient list. *(heuristic)* — cumin; chili powder

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Quinoa Stuffed Peppers — `stuffed-peppers`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** Steps use 2 ingredient(s) that aren't in the ingredient list. *(heuristic)* — garlic; onion

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Turkey Chili — `turkey-chili`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — sour cream

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Turkey Taco Skillet — `turkey-taco-skillet`
performance-meals · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — tortillas

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## White Bean and Kale Soup — `white-bean-kale-soup`
performance-meals · approved · status **needs_review** · recommendation **minor corrections** · score 85

Findings:
- **S2** Steps use 1 ingredient(s) that aren't in the ingredient list. *(heuristic)* — heavy cream

Proposed corrections:
- Add the ingredient with a quantity, or correct the step.

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Buffalo Chicken Sweet Potato Bowls — `buffalo-chicken-sweet-potato-bowls`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 86

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.

Evidence: Nutrition integrity: fail, 93% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Bun Bo Hue Noodle Soup — `bun-bo-hue-noodle-soup`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 86

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.

Evidence: Nutrition integrity: fail, 67% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Burrito Bowl Bar Night — `burrito-bowl-bar-night`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 86

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift, ingredient_calorie_drift

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.

Evidence: Nutrition integrity: fail, 94% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Jalapeño Popper Pizza — `jalapeno-popper-pizza`
pizza-night · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 86

Findings:
- **S3** No structured per-serving nutrition.
- **S3** Public, search-indexed page that the app never recommends.

Proposed corrections:
- Calculate from ingredients; never type in a guess.

Evidence: Nutrition integrity: withheld, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Sausage & Peppers on Buns — `sausage-peppers-on-buns`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 86

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift, ingredient_calorie_drift

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Smoked Brisket BBQ Pizza — `smoked-brisket-bbq-pizza`
pizza-night · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 86

Findings:
- **S3** No structured per-serving nutrition.
- **S3** Public, search-indexed page that the app never recommends.

Proposed corrections:
- Calculate from ingredients; never type in a guess.

Evidence: Nutrition integrity: withheld, 78% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Spatchcock Lemon Roast Chicken — `spatchcock-lemon-roast-chicken`
hall-expansion · approved · status **needs_review** · recommendation **minor corrections** · score 86

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S3** The nutrition integrity audit found a calculation problem. — ingredient_protein_drift, ingredient_calorie_drift

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Recalculate per serving from the ingredient list and base servings.

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Taco Pizza — `taco-pizza`
pizza-night · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 86

Findings:
- **S3** No structured per-serving nutrition.
- **S3** Public, search-indexed page that the app never recommends.

Proposed corrections:
- Calculate from ingredients; never type in a guess.

Evidence: Nutrition integrity: withheld, 82% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Classic Poutine Feed for the Crew — `classic-poutine-feed-crew`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 89

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 5 quantity value(s) are raw decimals. — 6.4 lb russet potatoes; 1.6 gal vegetable oil; 3.2 cups beef broth; 3.4 tbsp beef drippings or butter; 1.6 lb cheese curds
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 1.6 gal vegetable oil

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Firehall Donair Platter — `firehall-donair-platter`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 89

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 4 quantity value(s) are raw decimals. — 4.4 lb ground beef; 1.8 tbsp garlic powder; 1.8 tbsp onion powder; 10.7 rounds pita bread
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 10.7 rounds pita bread

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Firehall Taco Bowls — `firehall-taco-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 89

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 10 quantity value(s) are raw decimals. — 2.8 lb ground beef; 3.4 tbsp taco seasoning; 2.4 cups long-grain rice; 2.4 cups corn; 4.8 cups shredded lettuce; 2.4 cups pico de gallo; 2.4 cups cheddar cheese; 1.6 cups sour cream; 1.6 cups guacamole; 2.4 cups tortilla strips
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — turkey-taco-bowls (ingredients 79% shared)

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Maple-Cured Salmon Plank — `maple-cured-salmon-plank`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 89

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup maple syrup
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 4 planks cedar grilling planks

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 82% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Miso Ramen Bar — `miso-ramen-bar`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 89

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 4 quantity value(s) are raw decimals. — 2.7 lb chicken thighs; 7.1 cups chicken broth; 1.8 tbsp red miso paste; 2.7 cups bean sprouts
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 1 3/4 inches ginger

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 75% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Montreal Smoked Meat Platter — `montreal-smoked-meat-platter`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 89

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 4 quantity value(s) are raw decimals. — 4.8 lb beef brisket flat; 2.6 tbsp coriander seeds; 1.6 cups beef broth; 3.2 cups coleslaw
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 16 spears dill pickle spears

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 64% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Paneer Tikka Masala Bowls — `paneer-tikka-masala-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 89

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup heavy cream
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — red-lentil-paneer-dal (ingredients 79% shared)

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Tonkotsu Ramen for the Crew — `tonkotsu-ramen-crew`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 89

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 6 quantity value(s) are raw decimals. — 3.2 lb pork neck bones; 1.6 lb chicken backs; 2.4 inches ginger; 1.6 lb pork belly; 1.6 lb ramen noodles; 1.6 cups corn kernels
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 2.4 inches ginger

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 67% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Turkey Taco Bowls — `turkey-taco-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 89

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 9 quantity value(s) are raw decimals. — 2.8 lb ground turkey; 3.4 tbsp taco seasoning; 2.4 cups long-grain rice; 2.4 cups corn; 4.8 cups shredded lettuce; 2.4 cups pico de gallo; 2.4 cups cheddar cheese; 1.6 cups sour cream; 2.4 cups tortilla strips
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — firehall-taco-bowls (ingredients 79% shared)

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Apple Cinnamon Baked Oatmeal — `apple-cinnamon-baked-oatmeal`
breakfast-performance · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 90

Findings:
- **S3** Public, search-indexed page that the app never recommends.
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## BBQ Meatball Skewers — `bbq-meatball-skewers`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 2 quantity value(s) are raw decimals. — 2.4 lb ground beef (85/15); 6.4 cups shredded cabbage mix

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Big-Pot Savory Oats — `big-pot-savory-oats`
breakfast-performance · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 90

Findings:
- **S3** Public, search-indexed page that the app never recommends.
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Cajun Chicken and Rice Skillet — `cajun-chicken-rice-skillet`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 3 quantity value(s) are raw decimals. — 3.2 lb bone-in chicken thighs; 2.4 cups long-grain white rice; 2.6 tbsp Cajun seasoning

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Cajun Lime Shrimp & Black Bean Bowls — `cajun-lime-shrimp-black-bean-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup lime juice

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Cast Iron Chicken Fajitas — `cast-iron-chicken-fajitas`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 3.2 lb chicken breast

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Cheesy Chicken Broccoli Rice — `cheesy-chicken-broccoli-rice`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 6 quantity value(s) are raw decimals. — 2.4 lb boneless chicken breast; 2.4 cups long-grain white rice; 1.6 lb broccoli florets; 4.4 cups chicken broth; 1.6 cups sharp cheddar cheese; 2.6 tbsp unsalted butter

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Chickpea Pasta Primavera with White Beans — `chickpea-pasta-primavera-white-beans`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup olive oil

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Creamy Chicken Penne Alfredo — `creamy-chicken-penne-alfredo`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 6 quantity value(s) are raw decimals. — 1.6 lb penne pasta; 2.4 lb chicken breast; 3.2 cups heavy cream; 5.1 tbsp unsalted butter; 1.6 cups grated Parmesan; 2.6 tbsp olive oil

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Dutch Oven Pot Roast — `dutch-oven-pot-roast`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 4 quantity value(s) are raw decimals. — 2.4 lb Yukon Gold potatoes; 3.2 cups beef broth; 2.6 tbsp tomato paste; 2.6 tbsp all-purpose flour

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Fajita Bar Night — `fajita-bar-night`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 6 quantity value(s) are raw decimals. — 3.2 lb chicken breast; 2.6 tbsp fajita seasoning; 2.6 tbsp lime juice; 2.6 tbsp olive oil; 1.6 cups shredded cheddar; 1.6 cups guacamole

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Firehouse Chicken & Black Bean Bowls — `firehouse-chicken-black-bean-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** Same ingredient listed more than once. *(heuristic)* — lime juice

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Combine into one line, or label each use (for example, 'for the sauce').

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Firehouse Dense Bean Salad — `firehouse-dense-bean-salad`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 2 quantity value(s) are raw decimals. — 0.33 cup olive oil; 0.33 cup lemon juice

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 93% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Game Day Pizza Sliders — `game-day-pizza-sliders`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 3 quantity value(s) are raw decimals. — 6.4 oz pepperoni slices; 1.6 cups pizza sauce; 1.6 cups marinara sauce

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Ginger Soy Chicken Rice Bowls — `ginger-soy-chicken-rice-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 6 quantity value(s) are raw decimals. — 3.2 lb boneless chicken thighs; 2.4 cups jasmine rice; 1.6 lb broccoli florets; 2.6 tbsp fresh ginger; 2.6 tbsp honey; 2.6 tbsp sesame seeds

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Greek Yogurt & White Bean Power Bowls — `greek-yogurt-white-bean-power-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup lemon juice

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Green Chile Chicken Stew — `green-chile-chicken-stew`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 3 quantity value(s) are raw decimals. — 3.2 lb bone-in chicken thighs; 1.6 lb tomatillos; 4.8 cups chicken broth

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 70% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Honey Mustard Baked Chicken Thighs — `honey-mustard-oven-chicken-thighs`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 2.6 tbsp olive oil

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Honey Mustard Turkey Meatball Bowls — `honey-mustard-turkey-meatball-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup dijon mustard

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Irish Breakfast Fry-Up — `irish-breakfast-fry-up`
breakfast · approved · status **needs_review** · recommendation **minor corrections** · score 90

Findings:
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Recalculate per serving from the ingredient list and base servings.
- Migrate to the canonical schema.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Lumberjack Breakfast Platter — `lumberjack-breakfast-platter`
breakfast · approved · status **needs_review** · recommendation **minor corrections** · score 90

Findings:
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Recalculate per serving from the ingredient list and base servings.
- Migrate to the canonical schema.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Malaysian Laksa Soup — `malaysian-laksa-soup`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 5 quantity value(s) are raw decimals. — 2.6 tbsp vegetable oil; 3.2 cups chicken broth; 1.6 lb chicken breast; 1.6 lb large shrimp; 2.4 cups bean sprouts

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 67% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Mediterranean Beef Kofta Bowls — `mediterranean-beef-kofta-bowls`
performance-meals · approved · status **needs_review** · recommendation **minor corrections** · score 90

Findings:
- **S3** Prep + cook is 47 min, but the steps add up to about 86 min. *(heuristic)*
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup lemon juice

Proposed corrections:
- Re-time the recipe and correct prep/cook time.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 75% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Mushroom Swiss Steak Pan — `mushroom-swiss-steak-pan`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 4 quantity value(s) are raw decimals. — 2.4 lb sirloin steak; 1.6 lb wide egg noodles; 2.4 cups beef broth; 3.4 tbsp unsalted butter

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Overnight French Toast Bake — `overnight-french-toast-bake`
breakfast · approved · status **needs_review** · recommendation **minor corrections** · score 90

Findings:
- **S3** Prep + cook is 65 min, but the steps add up to about 796 min. *(heuristic)*
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Re-time the recipe and correct prep/cook time.
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Pasta Bar Night — `pasta-bar-night`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 6 quantity value(s) are raw decimals. — 1.6 lb penne pasta; 3.2 cups marinara sauce; 1.6 cups heavy cream; 3.4 tbsp unsalted butter; 1.6 cups basil pesto; 1.6 cups mozzarella cheese

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Pellet Smoked Chicken Quarters — `pellet-smoked-chicken-quarters`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 2.6 tbsp brown sugar

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Pepper Steak with Onions — `pepper-steak-onions`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 4 quantity value(s) are raw decimals. — 2.8 lb round steak; 2.4 cups long-grain white rice; 1.6 cups beef broth; 2.6 tbsp cornstarch

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Pesto Chicken Pizza — `pesto-chicken-pizza`
pizza-night · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 90

Findings:
- **S3** Public, search-indexed page that the app never recommends.
- **S4** 1 quantity value(s) are raw decimals. — 0.3 cup Balsamic glaze

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 78% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Philly Cheesesteak Sliders — `philly-cheesesteak-sliders`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 3 quantity value(s) are raw decimals. — 2.4 lb ribeye steak; 2.6 tbsp olive oil; 1.6 cups beef broth

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Pretzel Bite Platter with Beer Cheese — `pretzel-bite-platter`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 4 quantity value(s) are raw decimals. — 3.2 lb soft pretzel bites; 6.4 oz cream cheese; 9.6 oz lager beer; 3.4 tbsp unsalted butter

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Protein French Toast — `protein-french-toast`
breakfast-performance · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 90

Findings:
- **S3** Public, search-indexed page that the app never recommends.
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Rice Bowl Bar Night — `rice-bowl-bar-night`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 4 quantity value(s) are raw decimals. — 2.4 cups jasmine rice; 3.2 lb chicken thighs; 1.6 lb broccoli florets; 1.6 cups edamame

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Sesame Ginger Tofu Bowls — `sesame-ginger-tofu-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup soy sauce

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Smoked Queso Fundido — `smoked-queso-fundido`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 3 quantity value(s) are raw decimals. — 1.6 lb Mexican chorizo; 6.4 oz cream cheese; 1.6 lb tortilla chips

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Soft Pretzel Hot Dogs — `soft-pretzel-dogs`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 4 quantity value(s) are raw decimals. — 1.6 lb pretzel dough; 2.6 tbsp coarse salt; 1.6 cups sauerkraut; 1.6 cups cheddar cheese sauce

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Southwest Black Bean & Corn Bowls — `southwest-black-bean-corn-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup lime juice

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 91% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Tempeh Peanut Buddha Bowls — `tempeh-peanut-buddha-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** Same ingredient listed more than once. *(heuristic)* — soy sauce

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Combine into one line, or label each use (for example, 'for the sauce').

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Warm Spinach Chicken Salad — `warm-spinach-chicken-salad`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup red wine vinegar

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Weeknight BBQ Ribs for the Crew — `weeknight-bbq-ribs-crew`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 90

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S4** 2 quantity value(s) are raw decimals. — 3.2 cups barbecue sauce; 1.6 cups apple juice

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Breakfast Burrito Bar — `breakfast-burrito-bar`
golden-100 · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 92

Findings:
- **S3** Public, search-indexed page that the app never recommends.
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — hall-breakfast-burritos (ingredients 100% shared); turkey-sausage-burritos (ingredients 80% shared)

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Build-Your-Own Pho Bar — `build-your-own-pho-bar`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 92

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S5** 3 unit(s) are outside the standard list. *(heuristic)* — 1 1/4 gallons beef broth; 3 inches fresh ginger; 1/2 cup each hoisin and sriracha

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 71% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Chicken Alfredo Bake — `chicken-alfredo-bake`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 92

Findings:
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — skillet-chicken-alfredo (ingredients 50% shared)

Proposed corrections:
- Recalculate per serving from the ingredient list and base servings.

Evidence: Nutrition integrity: fail, 91% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Chocolate Banana Recovery Smoothie — `chocolate-banana-recovery`
smoothies · approved · status **technically_validated** · recommendation **technically validated** · score 92

Findings:
- **S3** Base servings not set.
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 4 medium bananas worth frozen banana slices

Proposed corrections:
- Add the missing field.
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 86% of ingredients matched to nutrition data. Hero 1536×1536px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Firehouse Diner Burger Bowls — `firehouse-diner-burger-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 92

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 3 hearts romaine lettuce

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## French Onion Soup for the Hall — `french-onion-soup-for-the-hall`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 92

Findings:
- **S3** Prep + cook is 125 min, but the steps add up to about 359 min. *(heuristic)*
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 1 batch Kosher Salt

Proposed corrections:
- Re-time the recipe and correct prep/cook time.
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 73% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Red Lentil & Paneer Dal — `red-lentil-paneer-dal`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 92

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — paneer-tikka-masala-bowls (ingredients 79% shared)

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list. Heuristic findings (marked) need a human to confirm before correcting.

## Veggie Supreme Pizza — `veggie-supreme-pizza`
pizza-night · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 92

Findings:
- **S3** Public, search-indexed page that the app never recommends.
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — firehall-supreme-pizza (ingredients 57% shared)

Evidence: Nutrition integrity: fail, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Batch Lasagna — `batch-lasagna`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 93

Findings:
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled

Proposed corrections:
- Recalculate per serving from the ingredient list and base servings.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## BBQ Pulled Pork Bowls — `bbq-pulled-pork-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Black Bean & Cottage Cheese Enchilada Bake — `black-bean-cottage-cheese-enchilada-bake`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Blackened Salmon Sweet Potato Bowls — `blackened-salmon-sweet-potato-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 91% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Blueberry Almond Smoothie — `blueberry-almond`
smoothies · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Base servings not set.

Proposed corrections:
- Add the missing field.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1536px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Buffalo Chicken Pizza — `buffalo-chicken-pizza`
pizza-night · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 93

Findings:
- **S3** Public, search-indexed page that the app never recommends.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Buffalo Chicken Wraps — `buffalo-chicken-wraps`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Burnt Ends Chili for the Crew — `burnt-ends-chili-crew`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Cajun Shrimp Rice Bowls — `cajun-shrimp-rice-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Chicken Tortilla Soup for the Hall — `chicken-tortilla-soup-for-the-hall`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 93

Findings:
- **S3** Prep + cook is 80 min, but the steps add up to about 217 min. *(heuristic)*

Proposed corrections:
- Re-time the recipe and correct prep/cook time.

Evidence: Nutrition integrity: fail, 86% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Citrus Ginger Smoothie — `citrus-ginger`
smoothies · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Base servings not set.

Proposed corrections:
- Add the missing field.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1536px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Cottage Cheese & Spinach Stuffed Shells — `cottage-cheese-spinach-stuffed-shells`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Firehouse Lentil Chili — `firehouse-lentil-chili`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Firehouse Sweet Potato & Beef Protein Bowls — `firehouse-sweet-potato-beef-protein-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Firehouse Turkey & White Bean Soup — `firehouse-turkey-white-bean-soup`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 82% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Four-Cheese White Pizza — `four-cheese-white-pizza`
pizza-night · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 93

Findings:
- **S3** Public, search-indexed page that the app never recommends.

Evidence: Nutrition integrity: fail, 91% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Garlic Steak & Broccoli Bowls with Herbed Cottage Cheese — `garlic-steak-broccoli-cottage-cheese-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Greek Chicken Pitas — `greek-chicken-pitas`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Green Pineapple Smoothie — `green-pineapple`
smoothies · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Base servings not set.

Proposed corrections:
- Add the missing field.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1536px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Hawaiian Pizza — `hawaiian-pizza`
pizza-night · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 93

Findings:
- **S3** Public, search-indexed page that the app never recommends.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## High-Protein Chicken & Quinoa Meal-Prep Bowls — `high-protein-chicken-quinoa-meal-prep-bowls`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Lemon-Herb Cod with Roasted Vegetables — `lemon-herb-cod-roasted-vegetables`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Loaded Firehouse Sweet Potatoes — `loaded-firehouse-sweet-potatoes`
hall-expansion · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Nutrition source is "estimated", not calculated from the ingredient list.

Proposed corrections:
- Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Nutrition is an estimate, not calculated from the ingredient list.

## Mixed Berry Protein Smoothie — `mixed-berry-protein`
smoothies · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Base servings not set.

Proposed corrections:
- Add the missing field.

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1536×1536px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Mocha Protein Smoothie — `mocha-protein`
smoothies · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Base servings not set.

Proposed corrections:
- Add the missing field.

Evidence: Nutrition integrity: pass, 71% of ingredients matched to nutrition data. Hero 1536×1536px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Parm Hero Subs — `parm-hero-subs`
golden-100 · approved · status **needs_review** · recommendation **minor corrections** · score 93

Findings:
- **S3** The nutrition integrity audit found a calculation problem. — crew_size_coupled

Proposed corrections:
- Recalculate per serving from the ingredient list and base servings.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Peanut Butter Banana Recovery Shake — `peanut-butter-banana-recovery`
smoothies · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Base servings not set.

Proposed corrections:
- Add the missing field.

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1536×1536px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Philly Cheesesteak Pizza — `philly-cheesesteak-pizza`
pizza-night · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 93

Findings:
- **S3** Public, search-indexed page that the app never recommends.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Strawberry Oatmeal Breakfast Smoothie — `strawberry-oat-breakfast`
smoothies · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Base servings not set.

Proposed corrections:
- Add the missing field.

Evidence: Nutrition integrity: pass, 86% of ingredients matched to nutrition data. Hero 1536×1536px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Strawberry Spinach Smoothie — `strawberry-spinach`
smoothies · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Base servings not set.

Proposed corrections:
- Add the missing field.

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1536×1536px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Tropical Mango Greek Yogurt Smoothie — `tropical-mango-greek`
smoothies · approved · status **technically_validated** · recommendation **technically validated** · score 93

Findings:
- **S3** Base servings not set.

Proposed corrections:
- Add the missing field.

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1536×1536px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Turkey Sausage Egg Muffins — `turkey-sausage-egg-muffins`
performance-meals · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 93

Findings:
- **S3** Public, search-indexed page that the app never recommends.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Veggie Egg Casserole — `veggie-egg-casserole-tray`
performance-meals · public, not approved · status **technically_validated** · recommendation **decide unapproved page** · score 93

Findings:
- **S3** Public, search-indexed page that the app never recommends.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Chicken and Dumplings — `chicken-dumpling-soup`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 94

Findings:
- **S4** Same ingredient listed more than once. *(heuristic)* — butter; all purpose flour
- **S4** 2 quantity value(s) are raw decimals. — 0.3 Cup All-Purpose Flour; 0.8 Cup Whole Milk

Proposed corrections:
- Combine into one line, or label each use (for example, 'for the sauce').
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 82% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Hummus Chicken Platter — `hummus-chicken-platter`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 96

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup lemon juice
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 12 rounds whole-wheat pita

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Sheet Pan Parmesan-Dijon Chicken Thigh Dinner — `sheet-pan-parmesan-dijon-chicken-thigh-dinner`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 96

Findings:
- **S4** 2 quantity value(s) are raw decimals. — 0.8 Cup Grated Parmesan Cheese; 0.3 Cup Dijon Mustard
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 1 batch Kosher Salt And Black Pepper

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 89% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## BBQ Burnt Ends — `bbq-brisket-burnt-ends`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.3 Cup Honey

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Breakfast Nachos Supreme — `breakfast-nachos-supreme`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Breakfast Poutine — `breakfast-poutine`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Breakfast Quesadillas — `breakfast-quesadillas`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Breakfast Sliders — `breakfast-sliders`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Breakfast Stromboli Roll — `breakfast-stromboli-roll`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Brisket-Style Beef Sandwiches — `brisket-style-beef-sandwiches-au-jus`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 3 quantity value(s) are raw decimals. — 2.1 Tbsp Kosher Salt; 2.1 Tbsp Black Pepper; 4.8 Cups Beef Broth

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Buffalo Chicken Dip — `buffalo-chicken-dip`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.8 Cup Frank's Hot Sauce

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Buttermilk Pancakes for the Crew — `buttermilk-pancakes`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Black Iron Remoulade Cod Plates — `cajun-grilled-cod-crew`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 2 quantity value(s) are raw decimals. — 2.6 Tbsp Creole Mustard; 2.6 Tbsp Sweet Pickle Relish

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Heirloom Tomato Bocconcini Sirloin Stacks — `caprese-steak-skewers-crew`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 2 quantity value(s) are raw decimals. — 4.4 Lb Sirloin Steak; 1.6 Lb Heirloom Cherry Tomatoes

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Cast Iron Skirt Steak Sizzlers — `cast-iron-steak-fajita-sizzlers`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 4.4 Lb Skirt Steak

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Chicken and Waffles for the Crew — `chicken-and-waffles-crew`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Chilaquiles Verde Bake — `chilaquiles-verde-bake`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 63% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Club Sandwich Breakfast Bake — `club-sandwich-breakfast-bake`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Corned Beef Hash Breakfast — `corned-beef-hash-breakfast`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Cottage Cheese Veggie Egg Bake — `cottage-cheese-veggie-egg-bake`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 86% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Country Fried Steak and Eggs Breakfast — `country-fried-steak-eggs`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: fail, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Crew French Toast Bake — `crew-french-toast-bake`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 86% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Eggs Benedict Hall Style — `eggs-benedict-hall-style`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Farmer's Breakfast Casserole — `farmers-breakfast-casserole`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Firehall Burnt Ends Platter — `firehall-burnt-ends-platter`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 5 quantity value(s) are raw decimals. — 4.8 Lb Brisket Point; 2.6 Tbsp Kosher Salt; 2.6 Tbsp Coarse Black Pepper; 2.6 Tbsp Brown Sugar; 2.6 Tbsp Unsalted Butter

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 92% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Firehouse Breakfast Protein Bowls — `firehouse-breakfast-protein-bowls`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Flank Steak with Chimichurri — `flank-chimichurri`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.3 Cup Red Wine Vinegar

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Four-Step Chicken Piccata — `four-step-chicken-piccata`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 3 quantity value(s) are raw decimals. — 0.8 Cup Dry White Wine; 0.3 Cup Fresh Lemon Juice; 0.3 Cup Fresh Parsley

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 70% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Greek Beef Meatballs (Keftedes) with Lemon Orzo & Tzatziki — `greek-beef-keftedes-lemon-orzo-tzatziki`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup fresh mint

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 86% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Grilled Reuben Sandwiches for the Crew — `grilled-reuben-sandwiches-crew`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 2 quantity value(s) are raw decimals. — 2.4 Cups Sauerkraut; 1.6 Cups Pickles

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 50% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Shrimp and Quinoa Bowls — `grilled-shrimp-quinoa-bowls`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup extra-virgin olive oil

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Hall Breakfast Wraps — `hall-breakfast-wraps`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Hall Sausage Biscuits & Gravy — `hall-sausage-biscuits-gravy`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Hash Brown Breakfast Casserole — `hash-brown-breakfast-casserole`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Herb-Marinated Flank Steak with Chimichurri Farro — `herb-marinated-flank-steak-chimichurri-farro`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup red wine vinegar

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 77% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Hickory Smoked Chicken Breast — `hickory-smoked-chicken-breast`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 4 quantity value(s) are raw decimals. — 4.8 Lb Boneless Skinless Chicken Breasts; 2.6 Tbsp Brown Sugar; 6.4 Cups Water; 5.1 Tbsp Unsalted Butter

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## High-Protein Breakfast Burrito Bowls — `high-protein-breakfast-burrito-bowls`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Honey Garlic Chicken Bowls — `honey-garlic-chicken-rice-bowls`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup honey

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Honey Garlic Pork Tenderloin — `honey-garlic-pork-tenderloin`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.3 cup Soy sauce

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Huevos Rancheros for the Crew — `huevos-rancheros-crew`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Johnnycakes with Maple Syrup — `johnnycakes-with-syrup`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Kung Pao Chicken & Rice Bowls — `kung-pao-chicken-rice-bowls`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup soy sauce

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 86% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Lemon Chicken Orzo Soup — `lemon-chicken-orzo-soup`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 2 quantity value(s) are raw decimals. — 0.33 cup lemon juice; 0.33 cup fresh dill

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Lemon Garlic Shrimp Pasta — `lemon-garlic-shrimp-pasta`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup extra-virgin olive oil

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 70% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Margherita Pizza — `margherita-pizza`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.3 Cup Extra-Virgin Olive Oil

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: withheld, 82% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Menemen for the Crew — `menemen-for-the-crew`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Migas for the Crew — `migas-for-the-crew`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Scallion Crisp Mongolian Flank Tray — `mongolian-beef-flat-top-crew`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 4.4 Lb Flank Steak

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Monte Cristo Sandwiches — `monte-cristo-sandwiches`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Moroccan Chicken and Chickpeas — `moroccan-chicken-chickpea-tray`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup olive oil

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Chicken and Rice — `one-pot-chicken-rice`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.3 Cup Fresh Parsley, Chopped

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 77% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Overnight Oat Bar for the Crew — `overnight-oat-bar-crew`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 88% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Overnight Sausage Strata — `overnight-sausage-strata`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Peanut Butter Protein Overnight Oats — `peanut-butter-protein-overnight-oats`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Pressed Cuban Sandwiches for the Crew — `pressed-cuban-sandwiches-crew`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 2 quantity value(s) are raw decimals. — 1.6 Lb Deli Ham; 2.4 Cups Dill Pickle Chips

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Quick Egg Tacos — `quick-egg-tacos`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Sausage Egg & Cheese Sandwiches — `sausage-egg-cheese-sandwiches`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Savory Cottage Cheese Breakfast Bowls — `savory-cottage-cheese-breakfast-bowls`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Scrapple and Eggs Skillet — `scrapple-and-eggs-skillet`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Shakshuka for the Hall — `shakshuka-for-the-hall`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 85% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Shawarma Chicken Bowls — `shawarma-chicken-rice-bowls`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 2 quantity value(s) are raw decimals. — 0.33 cup lemon juice; 0.33 cup olive oil

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Sheet Pan Breakfast Sandwiches — `sheet-pan-breakfast-sandwiches`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Sheet-Pan Chimichurri Chicken with Charred Vegetables — `sheet-pan-chimichurri-chicken-charred-vegetables`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup red wine vinegar

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Sheet-Pan Eggs & Sausage — `sheet-pan-eggs-sausage-crew`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Sheet Pan Full English — `sheet-pan-full-english`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: fail, 88% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Chicken Meal Prep Trays — `sheet-pan-meal-prep`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.3 cup Olive oil

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Sausage and Peppers — `sheet-pan-sausage-peppers`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.3 cup Olive oil

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Smoked BBQ Chicken Wings Tray — `smoked-bbq-chicken-wings-tray`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 2 quantity value(s) are raw decimals. — 3.4 Tbsp Butter; 1.6 Cups Celery Sticks

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Smoked Chicken Quarters with White Sauce — `smoked-chicken-quarters-white-sauce`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 2 quantity value(s) are raw decimals. — 2.6 Tbsp Kosher Salt; 2.6 Tbsp Lemon Juice

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 82% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Smoked Mac and Cheese for the Crew — `smoked-mac-and-cheese-crew`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 4 quantity value(s) are raw decimals. — 1.6 Lb Elbow Macaroni; 5.1 Tbsp Unsalted Butter; 3.2 Cups Whole Milk; 2.4 Cups Sharp Cheddar

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Smoked Potato Salad Tray — `smoked-potato-salad-tray`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 2 quantity value(s) are raw decimals. — 4.8 Lb Yukon Gold Potatoes; 2.6 Tbsp Apple Cider Vinegar

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Smoked Wings with White Sauce — `smoked-wings-white-sauce`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 2 quantity value(s) are raw decimals. — 0.3 Cup Apple Cider Vinegar; 0.3 Tsp Cayenne Pepper

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Spicy Tomato Bisque with Grilled Brie Toast — `spicy-tomato-bisque-grilled-brie-toast`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.3 Tsp Cayenne Pepper

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 91% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Tabbouleh Chicken Bowls — `tabbouleh-chicken-bowls`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup extra-virgin olive oil

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 82% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Tater Tot Breakfast Casserole — `tater-tot-breakfast-casserole`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Thai Basil Chicken — `thai-basil-chicken`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.3 Cup Soy Sauce

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 86% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Thai Basil Ground Beef Skillet — `thai-basil-ground-beef-skillet`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup fish sauce

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 85% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Tomato Soup with Grilled Cheese Croutons — `tomato-soup-grilled-cheese-croutons`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.3 Cup Olive Oil

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Trinidadian-Style Curry Chicken with Potatoes — `trinidadian-curry-chicken-potatoes`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup Caribbean-style curry powder

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Turkey Bacon & White Bean Breakfast Hash — `turkey-bacon-white-bean-breakfast-hash`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Turkey Sausage Egg White Breakfast Sandwiches — `turkey-sausage-egg-white-sandwiches`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Turkey Sausage, Spinach & Feta Egg White Scramble — `turkey-sausage-spinach-feta-egg-white-scramble`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Turkey Sausage & Sweet Potato Breakfast Skillet — `turkey-sausage-sweet-potato-skillet`
breakfast · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** Record doesn't match the canonical recipe schema (e.g. no equipment list). — schema_invalid:category|cuisine|calories|protein

Proposed corrections:
- Migrate to the canonical schema.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Vietnamese Caramel-Braised Chicken Bowls — `vietnamese-caramel-braised-chicken-bowls`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 2 quantity value(s) are raw decimals. — 0.33 cup granulated sugar; 0.33 cup fish sauce

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 81% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Tokyo Tare Ribeye Yakiniku Board — `yakiniku-grill-platter-crew`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 4.4 Lb Ribeye Steak

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: fail, 64% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Yogurt Marinated Chicken — `yogurt-marinated-grill-chicken`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup lemon juice

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 82% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Za'atar Chicken Thighs — `zaatar-roasted-chicken-thighs`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 97

Findings:
- **S4** 1 quantity value(s) are raw decimals. — 0.33 cup za'atar spice blend

Proposed corrections:
- Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup).

Evidence: Nutrition integrity: pass, 89% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Quick Philly Skillet — `fast-philly-skillet`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 98

Findings:
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 1 batch Kosher Salt And Black Pepper
- **S5** Title quality score 48/100.

Proposed corrections:
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).
- Name the dish plainly and appetizingly (main protein + style).

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Game Day Nachos — `game-day-nachos`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 98

Findings:
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 2 cans (15 oz) Black Beans (drained and rinsed)
- **S5** 1 step(s) over 90 words — hard to follow on a phone mid-cook.

Proposed corrections:
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).
- Split into shorter steps with one action each.

Evidence: Nutrition integrity: fail, 78% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Chicken Lettuce Cups — `asian-chicken-lettuce-cups`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 99

Findings:
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — turkey-lettuce-wrap-night (ingredients 71% shared)

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Butter Chicken — `butter-chicken`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 99

Findings:
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — chicken-tikka-masala (ingredients 79% shared)

Evidence: Nutrition integrity: fail, 93% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Chicken Enchilada Skillet — `chicken-enchilada-skillet-light`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 99

Findings:
- **S5** Title quality score 48/100.

Proposed corrections:
- Name the dish plainly and appetizingly (main protein + style).

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Taco Bar — `hall-taco-bar`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 99

Findings:
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — pork-carnitas-tacos (ingredients 71% shared)

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Lemon Herb Salmon — `lemon-herb-salmon`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 99

Findings:
- **S5** 1 step(s) over 90 words — hard to follow on a phone mid-cook.

Proposed corrections:
- Split into shorter steps with one action each.

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Meatball Hoagies — `meatball-hoagies`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 99

Findings:
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 2 jars (24 oz) Marinara Sauce

Proposed corrections:
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Pepperoni Pizza — `pepperoni-pizza-night`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 99

Findings:
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — sicilian-sheet-pizza (ingredients 73% shared)

Evidence: Nutrition integrity: withheld, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Pork Carnitas Tacos — `pork-carnitas-tacos`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 99

Findings:
- **S5** Very similar to another recipe — an editor should decide whether both earn a place. *(heuristic)* — hall-taco-bar (ingredients 71% shared)

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Spaghetti Aglio e Olio for the Hall — `spaghetti-aglio-e-olio-for-the-hall`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 99

Findings:
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 1 batch Kosher Salt

Proposed corrections:
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: fail, 86% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Unstuffed Cabbage Roll Skillet — `unstuffed-cabbage-roll-skillet`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 99

Findings:
- **S5** 1 unit(s) are outside the standard list. *(heuristic)* — 1 large head green cabbage

Proposed corrections:
- Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).

Evidence: Nutrition integrity: pass, 93% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe. Heuristic findings (marked) need a human to confirm before correcting.

## Falafel Bowls — `baked-falafel-hall-bowls`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Baked Turkey Meatball Marinara — `baked-turkey-meatball-marinara`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 85% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## BBQ Chicken Pizza — `bbq-chicken-pizza`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Beef Barley Soup — `beef-barley-soup`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 82% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Beef Birria with Consommé for Dipping — `beef-birria-with-consomme`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 75% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Beef Stroganoff — `beef-stroganoff`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 93% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Beer Can Chicken — `beer-can-chicken`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Blackened Cod Tacos — `blackened-cod-taco-night`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Chicken Thighs with Sweet Potato and Spinach — `boneless-chicken-thighs-sweet-potato-spinach`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Breakfast Sausage Gravy Pizza — `breakfast-sausage-pizza`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: withheld, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Bulgogi Bowls — `bulgogi-bowls`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 89% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Cajun Chicken & Dirty Rice Bowls with Remoulade — `cajun-chicken-dirty-rice-bowls`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 91% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Cajun Chicken and Rice — `cajun-chicken-rice-bowl`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 94% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Cedar Plank Salmon — `cedar-plank-salmon`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 91% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Chicken Marsala (Lightened) — `chicken-marsala-lightened`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 79% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Chicken Souvlaki — `chicken-souvlaki`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Chili Mac Skillet — `chili-mac`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Protein Pasta Bake — `cottage-cheese-protein-pasta`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 91% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Fish Tacos — `crispy-fish-taco-night`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Cuban-Style Beef Picadillo Bowls — `cuban-beef-picadillo-bowls`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 81% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Detroit-Style Pepperoni Pizza — `detroit-style-pizza`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: withheld, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Filipino-Style Chicken Adobo — `filipino-chicken-adobo`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 82% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Ginger Salmon Rice Bowls — `ginger-salmon-bowls`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Greek Chicken Bowls — `greek-chicken-bowls`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Lemon Chicken and Potatoes — `greek-lemon-chicken-potatoes`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 90% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Greek-Spiced Beef Burger Bowls with Tzatziki Slaw — `greek-spiced-beef-burger-bowls-tzatziki-slaw`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 93% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Caper-Butter Cod Foil Packets — `grilled-cod-lemon-packets`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 58% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Street Corn with Cotija — `grilled-corn-cotija`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Grilled Pork Chops — `grilled-pork-chops`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Hot Honey Soppressata Pizza — `honey-soppressata-pizza`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: withheld, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Palm Sugar Lime Shrimp Skewers — `honey-sriracha-shrimp-skewers`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 64% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Jambalaya — `jambalaya`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Lemon Garlic Chicken Tray — `lemon-garlic-chicken-tray`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Lemon Salmon Orzo — `lemon-salmon-orzo-skillet`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 91% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Lentil Bolognese — `lentil-mushroom-bolognese`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Maple Mustard Salmon Tray — `maple-mustard-salmon-tray`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 91% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Maple Soy Salmon Bowls — `maple-soy-salmon-bowls`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Mediterranean Chicken & White Bean Skillet — `mediterranean-chicken-white-bean-skillet`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Za'atar Loin and Shoulder Lamb Board — `mixed-lamb-chop-grill-board`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 58% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## NY Strip with Herb Butter — `ny-strip-herb-butter`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## One-Pot Beef & Orzo Skillet with Spinach and Feta — `one-pot-beef-orzo-skillet-spinach-feta`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Philly Cheesesteak Skillet — `philly-cheesesteak-skillet`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Red Beans and Rice for the Hall — `red-beans-and-rice-for-the-hall`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 86% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Sausage Egg Bake — `sausage-egg-bake`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: fail, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Smoked Baked Beans for the Crew — `smoked-baked-beans-crew`
bbq · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1536×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Lentil and Kale Soup — `smoky-lentil-kale-soup`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Southwest Beef & Sweet Potato Skillet — `southwest-beef-sweet-potato-skillet`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Chicken and Chorizo Rice — `spanish-chicken-chorizo-rice`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Teriyaki Chicken Donburi — `teriyaki-donburi`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Teriyaki Salmon — `teriyaki-salmon-grill`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 80% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Black Bean Turkey Burgers — `turkey-burgers`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Turkey Meatballs with Zucchini Noodles — `turkey-meatball-zoodles`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 91% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Turkey Shepherd's Pie — `turkey-shepherds-sweet-potato`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Turkey Sweet Potato Chili — `turkey-sweet-potato-chili`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 100% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## Turkey Zoodle Bolognese — `turkey-zoodle-bolognese`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 92% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## White Bean Chicken Chili — `white-bean-chicken-chili`
performance-meals · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: pass, 83% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.

## White Garlic Chicken Pizza — `white-garlic-chicken-pizza`
golden-100 · approved · status **technically_validated** · recommendation **technically validated** · score 100

Findings: none from automated checks.

Evidence: Nutrition integrity: withheld, 93% of ingredients matched to nutrition data. Hero 1024×1024px.

Uncertainties: Not kitchen-tested: taste, texture, timing and yield are unconfirmed. Hero image has not been visually checked against the recipe.
