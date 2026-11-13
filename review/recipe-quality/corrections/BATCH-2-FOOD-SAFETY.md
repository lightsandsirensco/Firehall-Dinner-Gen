# Batch 2 — Food-safety corrections (for review)

Status: **applied to the local working copy only** — not committed, deployed, or synced to any database. 91 recipes, one correction each. Each correction can be reverted individually from `scripts/recipe-quality/corrections/batches/b2-food-safety.ts` and `b7-doneness.ts`.

Reference: USDA FSIS Safe Minimum Internal Temperature Chart; FDA Food Code 3-501.16 (hot holding 140°F+). Poultry 165°F; ground beef/pork/lamb 160°F; ground poultry 165°F; whole cuts of beef/pork/lamb and fish 145°F (+3-minute rest for meat); reheated leftovers 165°F.

Doneness policy (your earlier decision): recipes default to the USDA temperature, and medium-rare is kept as a clearly labeled preference where it's traditional (steak, lamb, tri-tip, salmon).

These corrections were written from the guidance above and checked by the automated audit. None has been kitchen-tested.

| Group | Issue | Recipes |
|---|---|---|
| A | Wrong temperature (unsafe as written) | 3 |
| B | Below-USDA doneness targets (steak, lamb, salmon, pho beef) | 25 |
| C | Raw poultry with no internal-temperature check | 26 |
| D | Raw ground meat with no 160°F check, or a color-only cue | 32 |
| E | Precooked meat reheating, vague cues, missing oven temperatures | 5 |

Full before/after text for every edit is in `change-log.csv` (filter `batch` on B2 / B7).

## A. Wrong temperature (unsafe as written) (3)

| Recipe | Collection | Change |
|---|---|---|
| `chicken-alfredo-bake` | golden-100 | Chicken doneness corrected from 160°F to 165°F; seared in batches |
| `greek-chicken-pitas` | hall-expansion | Grilled chicken doneness corrected from 160°F to 165°F |
| `turkey-chili` | golden-100 | Ground turkey doneness corrected from 160°F to 165°F |

## B. Below-USDA doneness targets (steak, lamb, salmon, pho beef) (25)

| Recipe | Collection | Change |
|---|---|---|
| `cast-iron-steak-fajita-sizzlers` | bbq | Steak defaults to 145°F; medium-rare offered as a preference |
| `mixed-lamb-chop-grill-board` | bbq | Lamb defaults to 145°F; medium-rare offered as a preference |
| `reverse-seared-ribeye-crew` | bbq | Reverse sear retargeted to 130°F smoke / 145°F finish; medium-rare offered as a preference |
| `santa-maria-tri-tip-roast` | bbq | Tri-tip finishes at 145°F; medium-rare offered as a preference |
| `smoked-picanha-steak-platter` | bbq | Picanha finishes at 145°F; medium-rare offered as a preference |
| `tandoori-lamb-chop-platter` | bbq | Lamb chops default to 145°F; medium-rare offered as a preference |
| `red-lead-skillet` | breakfast | Steak strips default to 145°F |
| `flank-chimichurri` | golden-100 | Flank steak defaults to 145°F; medium-rare offered as a preference |
| `ginger-salmon-bowls` | golden-100 | Salmon defaults to 145°F; medium offered as a preference |
| `hall-taco-bar` | golden-100 | Steak defaults to 145°F |
| `ny-strip-herb-butter` | golden-100 | Strip and flank default to 145°F; medium-rare offered as a preference |
| `steak-tacos` | golden-100 | Steak defaults to 145°F; medium-rare offered as a preference |
| `teriyaki-salmon-grill` | golden-100 | Salmon defaults to 145°F; medium offered as a preference |
| `blackened-salmon-sweet-potato-bowls` | hall-expansion | Salmon defaults to 145°F; medium offered as a preference |
| `build-your-own-pho-bar` | hall-expansion | Beef slices cooked through in the broth by default; traditional rare pho offered as a preference |
| `garlic-steak-broccoli-cottage-cheese-bowls` | hall-expansion | Steak strips cooked to 145°F |
| `maple-cured-salmon-plank` | hall-expansion | Salmon defaults to 145°F; medium offered as a preference |
| `mushroom-swiss-steak-pan` | hall-expansion | Seared strips finish to 145°F in the sauce |
| `smoked-tri-tip` | hall-expansion | Tri-tip finishes at 145°F; medium-rare offered as a preference |
| `southwest-steak-bowls` | hall-expansion | Medium-rare preference carries the safety note |
| `herb-marinated-flank-steak-chimichurri-farro` | performance-meals | Flank steak defaults to 145°F; medium-rare offered as a preference |
| `lemon-salmon-orzo-skillet` | performance-meals | Salmon finishes to 145°F on the orzo |
| `maple-mustard-salmon-tray` | performance-meals | Salmon cooked to 145°F |
| `maple-soy-salmon-bowls` | performance-meals | Salmon cooked to 145°F |
| `smash-burgers` | golden-100 | Ground beef patties checked to 160°F; second-patty technique corrected |

## C. Raw poultry with no internal-temperature check (26)

| Recipe | Collection | Change |
|---|---|---|
| `high-protein-chicken-fried-rice` | performance-meals | Chicken cooked in batches to 165°F |
| `asian-chicken-lettuce-cups` | performance-meals | Ground chicken cooked to 165°F |
| `beef-barley-soup` | golden-100 | Made a real beef barley soup: beef chuck and beef broth (not 'chicken or beef'), seasoning added, realistic simmer time |
| `chicken-dumpling-soup` | golden-100 | Thighs simmered to at least 165°F at the bone |
| `coq-au-vin-batch` | hall-expansion | Braised chicken checked at 165°F |
| `firehall-charcuterie-board` | hall-expansion | Turkey identified as ready-to-eat deli turkey; 2-hour room-temperature limit added |
| `firehouse-breakfast-protein-bowls` | breakfast | Raw chicken sausage cooked to 165°F |
| `general-tsos-baked-chicken` | performance-meals | Baked chicken checked at 165°F |
| `hall-breakfast-wraps` | breakfast | Turkey sausage cooked to 165°F |
| `high-protein-breakfast-burrito-bowls` | breakfast | Ground turkey cooked to 165°F |
| `jambalaya` | golden-100 | Chicken checked at 165°F after the simmer |
| `kung-pao-chicken-rice-bowls` | performance-meals | Braised chicken checked at 165°F |
| `miso-ramen-bar` | hall-expansion | Poached chicken checked at 165°F |
| `sandwich-board-night` | hall-expansion | Turkey identified as deli turkey; 2-hour room-temperature limit added |
| `southwest-egg-bake` | breakfast | Sausage browned before baking (it went in raw); bake time and 160°F center added |
| `spanish-chicken-chorizo-rice` | performance-meals | Chicken checked at 165°F at the bone |
| `trinidadian-curry-chicken-potatoes` | performance-meals | Chicken checked at 165°F at the bone |
| `turkey-lettuce-wrap-night` | performance-meals | Ground turkey cooked to 165°F |
| `turkey-sausage-burritos` | breakfast | Ground turkey cooked to 165°F |
| `turkey-sausage-egg-muffins` | performance-meals | Ground turkey cooked to 165°F |
| `turkey-sausage-spinach-feta-egg-white-scramble` | breakfast | Ground turkey cooked to 165°F |
| `turkey-shepherds-sweet-potato` | performance-meals | Ground turkey cooked to 165°F |
| `turkey-sweet-potato-chili` | performance-meals | Ground turkey cooked to 165°F |
| `turkey-taco-skillet` | performance-meals | Ground turkey cooked to 165°F |
| `turkey-zoodle-bolognese` | performance-meals | Ground turkey cooked to 165°F |
| `vietnamese-caramel-braised-chicken-bowls` | performance-meals | Braised chicken checked at 165°F |

## D. Raw ground meat with no 160°F check, or a color-only cue (32)

| Recipe | Collection | Change |
|---|---|---|
| `chorizo-breakfast-tacos` | golden-100 | Chorizo cooked to 160°F; tortilla oven temperature stated |
| `hall-breakfast-burritos` | breakfast | Sausage/chorizo cooked to 160°F |
| `cast-iron-breakfast-skillet` | breakfast | Raw sausage cooked to 160°F (ham only needs browning) |
| `mostaccioli-sausage-bake` | hall-expansion | Sausage cooked to 160°F; garlic added at the end so it doesn't burn |
| `breakfast-crunchwraps` | breakfast | Sausage cooked to 160°F |
| `breakfast-enchiladas` | breakfast | Chorizo cooked to 160°F |
| `baked-ziti` | golden-100 | Ground beef browned to 160°F |
| `shepherds-pie` | golden-100 | Ground lamb or beef browned to 160°F |
| `sausage-peppers-onions` | golden-100 | Sausage links cooked through to 160°F before slicing |
| `batch-lasagna` | golden-100 | Beef and sausage browned to 160°F |
| `breakfast-burrito-bar` | golden-100 | Sausage cooked to 160°F; tortilla oven temperature stated |
| `breakfast-poutine` | breakfast | Sausage cooked to 160°F before making gravy |
| `breakfast-sausage-pizza` | golden-100 | Sausage cooked to 160°F |
| `breakfast-sliders` | breakfast | Sausage patties cooked to 160°F; bake time stated |
| `chili-mac` | golden-100 | Ground beef browned to 160°F |
| `cottage-pie-for-the-crew` | hall-expansion | Ground beef browned to 160°F |
| `cuban-beef-picadillo-bowls` | performance-meals | 160°F added to the 'no pink' cue |
| `enchilada-beef-skillet` | hall-expansion | Ground beef browned to 160°F; oven-safe skillet called out |
| `firehall-breakfast-pizza` | breakfast | Sausage cooked to 160°F; final bake time stated |
| `hall-sausage-biscuits-gravy` | breakfast | Sausage cooked to 160°F before the roux |
| `hall-sloppy-joe-feed` | hall-expansion | Ground beef browned to 160°F |
| `korean-beef-rice-bowls` | performance-meals | Ground beef browned to 160°F |
| `loaded-nacho-skillet` | golden-100 | 160°F added to the 'no pink' cue |
| `one-pot-beef-orzo-skillet-spinach-feta` | performance-meals | 160°F added to the 'no pink' cue |
| `rigatoni-meat-sauce-batch` | hall-expansion | Beef and pork browned to 160°F |
| `sheet-pan-breakfast-hash` | breakfast | Sausage roasted to 160°F; egg bake time stated |
| `southwest-beef-sweet-potato-skillet` | performance-meals | 160°F added to the 'no pink' cue |
| `stuffed-peppers` | golden-100 | Ground beef browned to 160°F |
| `taco-pizza` | pizza-night | Ground beef browned to 160°F |
| `thai-basil-ground-beef-skillet` | performance-meals | 160°F added to the 'no pink' cue |
| `tourtiere-for-the-crew` | hall-expansion | Pork and beef browned to 160°F |
| `unstuffed-cabbage-roll-skillet` | performance-meals | 160°F added to the 'no pink' cue |

## E. Precooked meat reheating, vague cues, missing oven temperatures (5)

| Recipe | Collection | Change |
|---|---|---|
| `buffalo-chicken-pizza` | pizza-night | Precooked chicken reheated until steaming (165°F) |
| `bun-bo-hue-noodle-soup` | hall-expansion | Braise doneness cue added; raw beef sliced paper-thin and cooked by rolling-boil broth |
| `enchilada-casserole` | golden-100 | Cooked chicken reheated until steaming (165°F) |
| `monte-cristo-sandwiches` | breakfast | Griddle until the filling is steaming hot |
| `pesto-chicken-pizza` | pizza-night | Cooked chicken reheated until steaming (165°F) |
