# Firehall Meals Production Audit Summary

Generated: 2026-06-01T02:29:12.158Z

## Totals

| Metric | Value |
|--------|------:|
| Approved recipes audited | 315 |
| Image coverage (hero on disk) | 312/315 (99%) |
| Image style pass | 312/315 (99%) |
| Image accuracy (accurate) | 315/315 (100%) |
| Duplicate hero groups | 0 |
| Recipe detail pass | 313/315 (99.4%) |
| Category/filter pass | 315/315 |
| Explore eligible | 312/315 |
| Route pass | 312/315 |
| Public label pass | 315/315 |

## Sub-audit runs

- firehallPhotoStandard: PASS (376 audited, 0 failed, 0 duplicate heroes)
- imageAccuracy (approved inline): PASS (315/315 accurate)
- imageAccuracy (full corpus 761): 203 failures, 23 duplicate heroes — run `audit:firehall-photo-intensive`
- exploreMapping: PASS (312/315 eligible, 0 conflicts)
- imageGovernance: 58 failures across 566 curated rows (non-blocking for Explore)
- catalogDuplicates: report written (15 exact + 29 near-duplicate recipe pairs)
- approvedRoutes: PASS (312/315)

## Safe fixes applied

- relinked images: bagel-lox-breakfast-board
- relinked images: mac-and-cheese-bake
- relinked images: baked-turkey-meatball-marinara
- relinked images: baked-ziti
- relinked images: bbq-breakfast-hash
- relinked images: bbq-brisket-burnt-ends
- relinked images: bbq-chicken-bowls
- relinked images: bbq-chicken-sliders
- relinked images: beef-barley-soup
- relinked images: beef-stroganoff
- relinked images: belgian-waffle-platter
- relinked images: biscuit-french-toast-sliders
- relinked images: beef-dip
- relinked images: boneless-chicken-thighs-sweet-potato-spinach
- relinked images: breakfast-crunchwraps
- relinked images: breakfast-enchiladas
- relinked images: breakfast-fried-rice-crew
- relinked images: breakfast-nachos-supreme
- relinked images: breakfast-poutine
- relinked images: breakfast-quesadillas
- relinked images: breakfast-sandwich-trays
- relinked images: breakfast-sliders
- relinked images: breakfast-stromboli-roll
- relinked images: buffalo-chicken-dip
- relinked images: buttermilk-pancakes
- relinked images: jambalaya
- relinked images: cast-iron-breakfast-skillet
- relinked images: chicken-dumpling-soup
- relinked images: chicken-and-waffles-crew
- relinked images: enchilada-casserole
- relinked images: chicken-parm
- relinked images: chicken-tikka-masala
- relinked images: chilaquiles-verde-bake
- relinked images: chili-mac
- relinked images: chorizo-breakfast-hash
- relinked images: meatloaf-mashed
- relinked images: club-sandwich-breakfast-bake
- relinked images: corned-beef-hash-breakfast
- relinked images: cottage-cheese-protein-pasta
- relinked images: country-fried-steak-eggs
- relinked images: crew-french-toast-bake
- relinked images: crispy-chicken-cutlets
- relinked images: crock-barbacoa-chicken
- relinked images: denver-breakfast-casserole
- relinked images: smash-burgers
- relinked images: eggs-benedict-hall-style
- relinked images: farmers-breakfast-casserole
- relinked images: fire-captain-omelette-bar
- relinked images: firehall-breakfast-pizza
- relinked images: meatball-hoagies
- relinked images: five-ingredient-pasta
- relinked images: greek-chicken-bowls
- relinked images: greek-lemon-chicken-potatoes
- relinked images: chicken-souvlaki
- relinked images: flank-chimichurri
- relinked images: ny-strip-herb-butter
- relinked images: grilled-corn-cotija
- relinked images: hall-breakfast-burritos
- relinked images: hall-breakfast-wraps
- relinked images: chicken-caesar
- relinked images: hall-sausage-biscuits-gravy
- relinked images: big-chili
- relinked images: herb-baked-salmon-tray
- relinked images: turkey-chili
- relinked images: honey-lime-chicken-tray
- relinked images: huevos-rancheros-crew
- relinked images: irish-breakfast-fry-up
- relinked images: jerk-chicken
- relinked images: johnnycakes-with-syrup
- relinked images: game-day-nachos
- relinked images: loaded-nacho-skillet
- relinked images: lumberjack-breakfast-platter
- relinked images: maple-sausage-pinwheels
- relinked images: mediterranean-baked-fish-tray
- relinked images: migas-for-the-crew
- relinked images: monte-cristo-sandwiches
- relinked images: one-pot-chicken-rice
- relinked images: overnight-french-toast-bake
- relinked images: overnight-sausage-strata
- relinked images: beef-broccoli
- relinked images: quick-egg-tacos
- relinked images: sausage-egg-cheese-sandwiches
- relinked images: sausage-egg-bake
- relinked images: sausage-peppers-onions
- relinked images: scrapple-and-eggs-skillet
- relinked images: sheet-pan-breakfast-hash
- relinked images: sheet-pan-breakfast-sandwiches
- relinked images: sheet-pan-full-english
- relinked images: shepherds-pie
- relinked images: shrimp-and-grits-breakfast
- relinked images: smoked-salmon-benedit
- relinked images: smoked-wings-white-sauce
- relinked images: smoky-lentil-kale-soup
- relinked images: southwest-egg-bake
- relinked images: spanish-chicken-chorizo-rice
- relinked images: steak-sandwiches
- relinked images: strawberry-spinach
- relinked images: tater-tot-breakfast-casserole
- relinked images: turkey-meatball-zoodles
- relinked images: turkey-sausage-burritos
- relinked images: turkey-shepherds-sweet-potato
- relinked images: turkey-sweet-potato-chili
- relinked images: veggie-egg-burritos
- relinked images: white-bean-kale-soup

## Success criteria

| Criterion | Status |
|-----------|--------|
| 100% approved recipes have images | **FAIL** (312/315) |
| 0 duplicate hero images | **PASS** |
| 0 broken Explore cards | **FAIL** |
| 0 wrong slug-image mappings | **PASS** |
| 0 forbidden public labels | **PASS** (315/315) |
| 0 recipe pages with vague steps | **FAIL** (313/315) |
| 0 obvious image/title mismatches | **PASS** (315/315) |
| Firehall kitchen aesthetic (metadata) | **FAIL** (312/315) |

## Recommended next fixes

1. Batch rewrite 225 failing recipe pages (instruction depth, banned step titles, missing tonightSpread on breakfast cards)
2. Address 58 image-governance failures + 23 duplicate heroes in full 761-recipe corpus
3. Review 15 exact + 29 near-duplicate recipe pairs in review/duplicate-report.json

## Remaining manual review

- Image style: `cajun-grilled-cod-crew`
- Image style: `grilled-cod-lemon-packets`
- Image style: `garlic-butter-shrimp-skewers`
- Recipe detail: `fast-philly-skillet`
- Recipe detail: `philly-cheesesteak-skillet`
- No duplicate heroes
