# Nutrition Integrity Audit — Firehall Meals

Generated: 2026-07-29T23:10:20.275Z
Mode: **audit**

## Executive summary

All nutrition values are audited as **per single serving** (total recipe macros ÷ base servings).
Crew size changes ingredient quantities on recipe pages; **nutrition does not scale with crew selector**.

| Metric | Value |
|--------|------:|
| **Total recipes audited** | 432 |
| **PASS** | 271 |
| **FAIL** | 148 |
| Withheld (estimate coming soon) | 13 |
| Recipes fixed this run | 0 |
| **Nutrition Accuracy %** (pass ÷ recipes with displayed macros) | **64.7%** |

Crew-size calculation invariant (engine): PASS

## Catalog coverage

| Catalog | Recipes | Pass | Fail | Withheld |
|---------|--------:|-----:|-----:|---------:|
| golden 100 | 104 | 49 | 55 | 0 |
| hall expansion | 115 | 59 | 56 | 0 |
| performance meals | 71 | 68 | 3 | 0 |
| breakfast | 67 | 55 | 12 | 0 |
| bbq grill | 45 | 24 | 21 | 0 |
| pizza night | 20 | 6 | 1 | 13 |
| smoothies | 10 | 10 | 0 | 0 |

## Issue counts

| Issue | Count |
|-------|------:|
| Suspicious calories | 144 |
| Suspicious protein | 83 |
| Suspicious carbs | 0 |
| Suspicious fat | 0 |
| UI shows zero macros | 0 |
| Nutrition coupled to wrong crew divisor | 20 |
| Needs recalculation | 148 |

## Recipes with suspicious calories

- `baked-ziti` — 1394 cal · 85g P · 106g C · 71g F
- `batch-lasagna` — 1400 cal · 71g P · 90g C · 84g F
- `bbq-brisket-burnt-ends` — 1109 cal · 89g P · 52g C · 64g F
- `bbq-chicken-mac-and-cheese` — 1386 cal · 83g P · 106g C · 68g F
- `bbq-chicken-pizza` — 1400 cal · 93g P · 143g C · 47g F
- `beef-dip` — 1400 cal · 96g P · 80g C · 78g F
- `beef-stroganoff` — 1362 cal · 85g P · 104g C · 70g F
- `big-chili` — 1400 cal · 79g P · 102g C · 78g F
- `breakfast-burrito-bar` — 1400 cal · 70g P · 103g C · 78g F
- `breakfast-sausage-pizza` — 1400 cal · 65g P · 94g C · 82g F
- `butter-chicken` — 1173 cal · 63g P · 103g C · 56g F
- `chicken-alfredo-bake` — 1400 cal · 90g P · 73g C · 82g F
- `chicken-caesar` — 1400 cal · 87g P · 79g C · 80g F
- `chicken-parm` — 1400 cal · 103g P · 92g C · 67g F
- `chicken-quesadillas` — 1393 cal · 85g P · 64g C · 87g F
- `chicken-tikka-masala` — 1162 cal · 65g P · 104g C · 54g F
- `chicken-tortilla-soup-for-the-hall` — 1158 cal · 72g P · 64g C · 70g F
- `chili-mac` — 1368 cal · 82g P · 100g C · 73g F
- `chorizo-breakfast-tacos` — 1159 cal · 63g P · 61g C · 75g F
- `detroit-style-pizza` — 1150 cal · 49g P · 67g C · 75g F
- `fast-philly-skillet` — 1179 cal · 89g P · 73g C · 59g F
- `french-toast-casserole` — 1158 cal · 30g P · 180g C · 38g F
- `game-day-nachos` — 1225 cal · 65g P · 105g C · 63g F
- `honey-soppressata-pizza` — 1400 cal · 59g P · 129g C · 70g F
- `jerk-chicken` — 1087 cal · 111g P · 125g C · 15g F
- `loaded-baked-potato-bar` — 1296 cal · 62g P · 60g C · 90g F
- `loaded-nacho-skillet` — 972 cal · 62g P · 77g C · 48g F
- `loaded-potato-feed` — 1337 cal · 67g P · 65g C · 90g F
- `mac-and-cheese-bake` — 1381 cal · 61g P · 127g C · 69g F
- `margherita-pizza` — 945 cal · 39g P · 80g C · 52g F
- `meat-lovers-sheet-pizza` — 1400 cal · 78g P · 75g C · 86g F
- `meatball-hoagies` — 1400 cal · 95g P · 65g C · 86g F
- `meatloaf-mashed` — 1009 cal · 72g P · 69g C · 51g F
- `memphis-dry-rub-ribs` — 1310 cal · 103g P · 18g C · 90g F
- `pancake-short-stack` — 1310 cal · 67g P · 125g C · 61g F
- `parm-hero-subs` — 1400 cal · 96g P · 84g C · 75g F
- `pepperoni-pizza-night` — 1400 cal · 67g P · 83g C · 88g F
- `philly-cheesesteak-skillet` — 1400 cal · 98g P · 71g C · 80g F
- `philly-egg-rolls` — 1400 cal · 104g P · 74g C · 78g F
- `pulled-pork` — 1400 cal · 82g P · 124g C · 61g F
- `red-beans-and-rice-for-the-hall` — 1161 cal · 45g P · 180g C · 29g F
- `sausage-egg-bake` — 1136 cal · 67g P · 39g C · 79g F
- `sausage-peppers-onions` — 992 cal · 45g P · 86g C · 51g F
- `sheet-pan-meal-prep` — 1138 cal · 86g P · 154g C · 18g F
- `sheet-pan-sausage-peppers` — 932 cal · 46g P · 31g C · 70g F
- `shepherds-pie` — 927 cal · 68g P · 63g C · 45g F
- `skillet-chicken-alfredo` — 1228 cal · 77g P · 89g C · 61g F
- `slider-bar` — 1364 cal · 68g P · 77g C · 90g F
- `smash-burgers` — 1310 cal · 63g P · 69g C · 90g F
- `spaghetti-aglio-e-olio-for-the-hall` — 942 cal · 28g P · 135g C · 34g F

_…and 94 more._

## Recipes with suspicious protein

- `baked-ziti` — 1394 cal · 85g P · 106g C · 71g F
- `bbq-brisket-burnt-ends` — 1109 cal · 89g P · 52g C · 64g F
- `bbq-chicken-mac-and-cheese` — 1386 cal · 83g P · 106g C · 68g F
- `beef-dip` — 1400 cal · 96g P · 80g C · 78g F
- `beef-stroganoff` — 1362 cal · 85g P · 104g C · 70g F
- `beer-can-chicken` — 501 cal · 88g P · 0g C · 14g F
- `breakfast-burrito-bar` — 1400 cal · 70g P · 103g C · 78g F
- `chicken-dumpling-soup` — 670 cal · 66g P · 55g C · 20g F
- `chicken-parm` — 1400 cal · 103g P · 92g C · 67g F
- `chicken-tortilla-soup-for-the-hall` — 1158 cal · 72g P · 64g C · 70g F
- `four-step-chicken-piccata` — 667 cal · 77g P · 36g C · 23g F
- `grilled-corn-cotija` — 292 cal · 11g P · 27g C · 18g F
- `jerk-chicken` — 1087 cal · 111g P · 125g C · 15g F
- `meatloaf-mashed` — 1009 cal · 72g P · 69g C · 51g F
- `mediterranean-chickpea` — 662 cal · 29g P · 71g C · 32g F
- `memphis-dry-rub-ribs` — 1310 cal · 103g P · 18g C · 90g F
- `pancake-short-stack` — 1310 cal · 67g P · 125g C · 61g F
- `parm-hero-subs` — 1400 cal · 96g P · 84g C · 75g F
- `pasta-e-ceci-for-the-hall` — 511 cal · 23g P · 65g C · 20g F
- `philly-cheesesteak-skillet` — 1400 cal · 98g P · 71g C · 80g F
- `philly-egg-rolls` — 1400 cal · 104g P · 74g C · 78g F
- `shepherds-pie` — 927 cal · 68g P · 63g C · 45g F
- `smoked-wings-white-sauce` — 779 cal · 87g P · 3g C · 44g F
- `spicy-tomato-bisque-grilled-brie-toast` — 625 cal · 16g P · 74g C · 31g F
- `steak-sandwiches` — 1380 cal · 103g P · 39g C · 90g F
- `texas-beef-ribs` — 859 cal · 89g P · 1g C · 58g F
- `bbq-pulled-pork-bowls` — 1303 cal · 100g P · 99g C · 54g F
- `chicken-wing-bar-night` — 907 cal · 107g P · 33g C · 37g F
- `coq-au-vin-batch` — 1123 cal · 112g P · 49g C · 52g F
- `hickory-turkey-legs` — 947 cal · 103g P · 27g C · 44g F
- `italian-beef-slow-cooker` — 1400 cal · 114g P · 65g C · 78g F
- `mississippi-pot-roast-crew` — 1400 cal · 117g P · 85g C · 70g F
- `molasses-bourbon-pork-ribs` — 1348 cal · 102g P · 28g C · 90g F
- `salsa-verde-chicken-crock` — 1249 cal · 116g P · 146g C · 23g F
- `smoked-corned-beef` — 1400 cal · 109g P · 66g C · 80g F
- `spatchcock-lemon-roast-chicken` — 718 cal · 120g P · 5g C · 21g F
- `thai-peanut-chicken-crock` — 1006 cal · 100g P · 87g C · 28g F
- `white-chicken-chili-crock` — 1106 cal · 102g P · 79g C · 43g F
- `baked-falafel-hall-bowls` — 644 cal · 17g P · 89g C · 26g F
- `caprese-chicken-bake` — 795 cal · 93g P · 7g C · 42g F
- `hummus-chicken-platter` — 716 cal · 85g P · 32g C · 27g F
- `lentil-mushroom-bolognese` — 616 cal · 26g P · 112g C · 8g F
- `moroccan-chicken-chickpea-tray` — 628 cal · 81g P · 33g C · 18g F
- `smoky-lentil-kale-soup` — 304 cal · 18g P · 43g C · 8g F
- `veggie-egg-casserole-tray` — 386 cal · 27g P · 12g C · 26g F
- `white-bean-kale-soup` — 325 cal · 19g P · 40g C · 11g F
- `apple-cinnamon-baked-oatmeal` — 292 cal · 11g P · 42g C · 10g F
- `belgian-waffle-platter` — 723 cal · 13g P · 133g C · 18g F
- `big-pot-savory-oats` — 305 cal · 14g P · 35g C · 12g F
- `chicken-and-waffles-crew` — 1071 cal · 82g P · 80g C · 45g F

_…and 33 more._

## Recipes with suspicious carbs

_None._

## Recipes with suspicious fat

_None._

## Recipes showing zero values in UI

_None._

## Recipes where nutrition may track crew size (wrong divisor)

- `batch-lasagna` — 1400 cal · 71g P · 90g C · 84g F
- `breakfast-sausage-pizza` — 1400 cal · 65g P · 94g C · 82g F
- `chicken-alfredo-bake` — 1400 cal · 90g P · 73g C · 82g F
- `loaded-baked-potato-bar` — 1296 cal · 62g P · 60g C · 90g F
- `meat-lovers-sheet-pizza` — 1400 cal · 78g P · 75g C · 86g F
- `meatball-hoagies` — 1400 cal · 95g P · 65g C · 86g F
- `memphis-dry-rub-ribs` — 1310 cal · 103g P · 18g C · 90g F
- `parm-hero-subs` — 1400 cal · 96g P · 84g C · 75g F
- `steak-tacos` — 1400 cal · 67g P · 93g C · 87g F
- `classic-patty-melt-for-the-crew` — 1277 cal · 77g P · 42g C · 90g F
- `italian-beef-slow-cooker` — 1400 cal · 114g P · 65g C · 78g F
- `loaded-baked-potato-soup-crock` — 1371 cal · 69g P · 69g C · 90g F
- `sausage-gnocchi-skillet` — 1188 cal · 69g P · 27g C · 90g F
- `spatchcock-lemon-roast-chicken` — 718 cal · 120g P · 5g C · 21g F
- `baked-oatmeal-mixed-berries` — 575 cal · 18g P · 95g C · 16g F
- `irish-breakfast-fry-up` — 1100 cal · 66g P · 26g C · 82g F
- `lumberjack-breakfast-platter` — 1100 cal · 49g P · 87g C · 62g F
- `shakshuka-for-the-hall` — 420 cal · 25g P · 46g C · 17g F
- `firehall-hibachi-mixed-grill-crew` — 1400 cal · 48g P · 127g C · 76g F
- `grilled-reuben-sandwiches-crew` — 1241 cal · 75g P · 29g C · 90g F

## Recipes needing recalculation

- `baked-ziti` — 1394 cal · 85g P · 106g C · 71g F
- `batch-lasagna` — 1400 cal · 71g P · 90g C · 84g F
- `bbq-brisket-burnt-ends` — 1109 cal · 89g P · 52g C · 64g F
- `bbq-chicken-mac-and-cheese` — 1386 cal · 83g P · 106g C · 68g F
- `bbq-chicken-pizza` — 1400 cal · 93g P · 143g C · 47g F
- `beef-dip` — 1400 cal · 96g P · 80g C · 78g F
- `beef-stroganoff` — 1362 cal · 85g P · 104g C · 70g F
- `big-chili` — 1400 cal · 79g P · 102g C · 78g F
- `breakfast-burrito-bar` — 1400 cal · 70g P · 103g C · 78g F
- `breakfast-sausage-pizza` — 1400 cal · 65g P · 94g C · 82g F
- `butter-chicken` — 1173 cal · 63g P · 103g C · 56g F
- `chicken-alfredo-bake` — 1400 cal · 90g P · 73g C · 82g F
- `chicken-caesar` — 1400 cal · 87g P · 79g C · 80g F
- `chicken-parm` — 1400 cal · 103g P · 92g C · 67g F
- `chicken-quesadillas` — 1393 cal · 85g P · 64g C · 87g F
- `chicken-tikka-masala` — 1162 cal · 65g P · 104g C · 54g F
- `chicken-tortilla-soup-for-the-hall` — 1158 cal · 72g P · 64g C · 70g F
- `chili-mac` — 1368 cal · 82g P · 100g C · 73g F
- `chorizo-breakfast-tacos` — 1159 cal · 63g P · 61g C · 75g F
- `detroit-style-pizza` — 1150 cal · 49g P · 67g C · 75g F
- `fast-philly-skillet` — 1179 cal · 89g P · 73g C · 59g F
- `french-toast-casserole` — 1158 cal · 30g P · 180g C · 38g F
- `game-day-nachos` — 1225 cal · 65g P · 105g C · 63g F
- `honey-soppressata-pizza` — 1400 cal · 59g P · 129g C · 70g F
- `jerk-chicken` — 1087 cal · 111g P · 125g C · 15g F
- `loaded-baked-potato-bar` — 1296 cal · 62g P · 60g C · 90g F
- `loaded-nacho-skillet` — 972 cal · 62g P · 77g C · 48g F
- `loaded-potato-feed` — 1337 cal · 67g P · 65g C · 90g F
- `mac-and-cheese-bake` — 1381 cal · 61g P · 127g C · 69g F
- `margherita-pizza` — 945 cal · 39g P · 80g C · 52g F
- `meat-lovers-sheet-pizza` — 1400 cal · 78g P · 75g C · 86g F
- `meatball-hoagies` — 1400 cal · 95g P · 65g C · 86g F
- `meatloaf-mashed` — 1009 cal · 72g P · 69g C · 51g F
- `memphis-dry-rub-ribs` — 1310 cal · 103g P · 18g C · 90g F
- `pancake-short-stack` — 1310 cal · 67g P · 125g C · 61g F
- `parm-hero-subs` — 1400 cal · 96g P · 84g C · 75g F
- `pepperoni-pizza-night` — 1400 cal · 67g P · 83g C · 88g F
- `philly-cheesesteak-skillet` — 1400 cal · 98g P · 71g C · 80g F
- `philly-egg-rolls` — 1400 cal · 104g P · 74g C · 78g F
- `pulled-pork` — 1400 cal · 82g P · 124g C · 61g F
- `red-beans-and-rice-for-the-hall` — 1161 cal · 45g P · 180g C · 29g F
- `sausage-egg-bake` — 1136 cal · 67g P · 39g C · 79g F
- `sausage-peppers-onions` — 992 cal · 45g P · 86g C · 51g F
- `sheet-pan-meal-prep` — 1138 cal · 86g P · 154g C · 18g F
- `sheet-pan-sausage-peppers` — 932 cal · 46g P · 31g C · 70g F
- `shepherds-pie` — 927 cal · 68g P · 63g C · 45g F
- `skillet-chicken-alfredo` — 1228 cal · 77g P · 89g C · 61g F
- `slider-bar` — 1364 cal · 68g P · 77g C · 90g F
- `smash-burgers` — 1310 cal · 63g P · 69g C · 90g F
- `spaghetti-aglio-e-olio-for-the-hall` — 942 cal · 28g P · 135g C · 34g F

_…and 98 more._

## UI surfaces checked

| Surface | Rule |
|---------|------|
| Recipe pages | `RecipeNutritionPanel` — per serving from page JSON |
| Explore cards | Macros from catalog page JSON (not crew-scaled) |
| Classics wheel | Golden 100 page nutrition |
| Generator | Dynamic meals — excluded from static JSON audit |

## FAIL details (sample)

### baked-ziti (golden_100)
- **Baked Ziti** · 8 base servings
- Stored: 1394 cal · 85g P · 106g C · 71g F
- Recommended: 1394 cal · 85g P · 106g C · 71g F
- Calories over 900 per serving (1394) — verify crew portions
- Protein 85g outside Comfort Food target (25–45g)

### batch-lasagna (golden_100)
- **Batch Lasagna** · 8 base servings
- Stored: 1400 cal · 71g P · 90g C · 84g F
- Recommended: 1400 cal · 71g P · 90g C · 84g F
- Calories over 900 per serving (1400) — verify crew portions
- Stored macros match batch÷10 crew better than batch÷8 base servings

### bbq-brisket-burnt-ends (golden_100)
- **BBQ Burnt Ends** · 8 base servings
- Stored: 1109 cal · 89g P · 52g C · 64g F
- Recommended: 1109 cal · 89g P · 52g C · 64g F
- Calories over 900 per serving (1109) — verify crew portions
- Protein 89g outside BBQ & Grill target (30–55g)

### bbq-chicken-mac-and-cheese (golden_100)
- **BBQ Chicken Mac and Cheese** · 8 base servings
- Stored: 1386 cal · 83g P · 106g C · 68g F
- Recommended: 820 cal · 54g P · 62g C · 30g F
- Calories over 900 per serving (1386) — verify crew portions
- Protein 83g outside Comfort Food target (25–45g)

### bbq-chicken-pizza (golden_100)
- **BBQ Chicken Pizza** · 8 base servings
- Stored: 1400 cal · 93g P · 143g C · 47g F
- Recommended: 1400 cal · 93g P · 143g C · 47g F
- Calories over 900 per serving (1400) — verify crew portions

### beef-dip (golden_100)
- **Beef Dip Sandwiches** · 8 base servings
- Stored: 1400 cal · 96g P · 80g C · 78g F
- Recommended: 1400 cal · 96g P · 80g C · 78g F
- Calories over 900 per serving (1400) — verify crew portions
- Protein over 95g per serving (96g) — verify portion
- Stored protein 96g vs ingredient estimate 267g
- Stored 1400 cal vs ingredient estimate 3906 cal

### beef-stroganoff (golden_100)
- **Beef Stroganoff** · 8 base servings
- Stored: 1362 cal · 85g P · 104g C · 70g F
- Recommended: 1362 cal · 85g P · 104g C · 70g F
- Calories over 900 per serving (1362) — verify crew portions
- Protein 85g outside Comfort Food target (25–45g)

### big-chili (golden_100)
- **Firehall Chili** · 8 base servings
- Stored: 1400 cal · 79g P · 102g C · 78g F
- Recommended: 1400 cal · 79g P · 102g C · 78g F
- Calories over 900 per serving (1400) — verify crew portions

### breakfast-burrito-bar (golden_100)
- **Breakfast Burrito Bar** · 8 base servings
- Stored: 1400 cal · 70g P · 103g C · 78g F
- Recommended: 1400 cal · 70g P · 103g C · 78g F
- Calories over 900 per serving (1400) — verify crew portions
- Protein 70g outside Breakfast target (20–45g)

### breakfast-sausage-pizza (golden_100)
- **Breakfast Sausage Gravy Pizza** · 8 base servings
- Stored: 1400 cal · 65g P · 94g C · 82g F
- Recommended: 1400 cal · 65g P · 94g C · 82g F
- Calories over 900 per serving (1400) — verify crew portions
- Stored macros match batch÷10 crew better than batch÷8 base servings

### butter-chicken (golden_100)
- **Butter Chicken** · 8 base servings
- Stored: 1173 cal · 63g P · 103g C · 56g F
- Recommended: 1173 cal · 63g P · 103g C · 56g F
- Calories over 900 per serving (1173) — verify crew portions

### chicken-alfredo-bake (golden_100)
- **Chicken Alfredo Bake** · 8 base servings
- Stored: 1400 cal · 90g P · 73g C · 82g F
- Recommended: 1400 cal · 90g P · 73g C · 82g F
- Calories over 900 per serving (1400) — verify crew portions
- Stored macros match batch÷10 crew better than batch÷8 base servings

### chicken-caesar (golden_100)
- **Chicken Caesar Salad** · 8 base servings
- Stored: 1400 cal · 87g P · 79g C · 80g F
- Recommended: 1400 cal · 87g P · 79g C · 80g F
- Calories over 900 per serving (1400) — verify crew portions

### chicken-parm (golden_100)
- **Chicken Parmesan** · 8 base servings
- Stored: 1400 cal · 103g P · 92g C · 67g F
- Recommended: 1400 cal · 103g P · 92g C · 67g F
- Calories over 900 per serving (1400) — verify crew portions
- Protein over 95g per serving (103g) — verify portion

### chicken-quesadillas (golden_100)
- **Chicken Quesadillas** · 8 base servings
- Stored: 1393 cal · 85g P · 64g C · 87g F
- Recommended: 1393 cal · 85g P · 64g C · 87g F
- Calories over 900 per serving (1393) — verify crew portions

### chicken-tikka-masala (golden_100)
- **Chicken Tikka Masala** · 8 base servings
- Stored: 1162 cal · 65g P · 104g C · 54g F
- Recommended: 1162 cal · 65g P · 104g C · 54g F
- Calories over 900 per serving (1162) — verify crew portions

### chicken-tortilla-soup-for-the-hall (golden_100)
- **Chicken Tortilla Soup for the Hall** · 8 base servings
- Stored: 1158 cal · 72g P · 64g C · 70g F
- Recommended: 1158 cal · 72g P · 64g C · 70g F
- Calories over 900 per serving (1158) — verify crew portions
- Protein 72g outside Comfort Food target (25–45g)

### chili-mac (golden_100)
- **Chili Mac Skillet** · 8 base servings
- Stored: 1368 cal · 82g P · 100g C · 73g F
- Recommended: 1368 cal · 82g P · 100g C · 73g F
- Calories over 900 per serving (1368) — verify crew portions

### chorizo-breakfast-tacos (golden_100)
- **Chorizo Breakfast Tacos** · 8 base servings
- Stored: 1159 cal · 63g P · 61g C · 75g F
- Recommended: 1159 cal · 63g P · 61g C · 75g F
- Calories over 900 per serving (1159) — verify crew portions
- Protein 63g outside Breakfast target (20–45g)

### detroit-style-pizza (golden_100)
- **Detroit-Style Pepperoni Pizza** · 8 base servings
- Stored: 1150 cal · 49g P · 67g C · 75g F
- Recommended: 1150 cal · 49g P · 67g C · 75g F
- Calories over 900 per serving (1150) — verify crew portions

### fast-philly-skillet (golden_100)
- **Quick Philly Skillet** · 8 base servings
- Stored: 1179 cal · 89g P · 73g C · 59g F
- Recommended: 1179 cal · 89g P · 73g C · 59g F
- Calories over 900 per serving (1179) — verify crew portions

### french-toast-casserole (golden_100)
- **French Toast Casserole** · 8 base servings
- Stored: 1158 cal · 30g P · 180g C · 38g F
- Recommended: 1158 cal · 30g P · 180g C · 38g F
- Calories over 900 per serving (1158) — verify crew portions

### game-day-nachos (golden_100)
- **Game Day Nachos** · 8 base servings
- Stored: 1225 cal · 65g P · 105g C · 63g F
- Recommended: 1225 cal · 65g P · 105g C · 63g F
- Calories over 900 per serving (1225) — verify crew portions

### honey-soppressata-pizza (golden_100)
- **Hot Honey Soppressata Pizza** · 8 base servings
- Stored: 1400 cal · 59g P · 129g C · 70g F
- Recommended: 1400 cal · 59g P · 129g C · 70g F
- Calories over 900 per serving (1400) — verify crew portions

### jerk-chicken (golden_100)
- **Jerk Chicken & Rice and Peas** · 8 base servings
- Stored: 1087 cal · 111g P · 125g C · 15g F
- Recommended: 1087 cal · 111g P · 125g C · 15g F
- Calories over 900 per serving (1087) — verify crew portions
- Protein over 95g per serving (111g) — verify portion

### loaded-baked-potato-bar (golden_100)
- **Baked Potato Bar** · 8 base servings
- Stored: 1296 cal · 62g P · 60g C · 90g F
- Recommended: 1296 cal · 62g P · 60g C · 90g F
- Calories over 900 per serving (1296) — verify crew portions
- Stored macros match batch÷12 crew better than batch÷8 base servings
- Protein 62g outside Comfort Food target (25–45g)

### loaded-nacho-skillet (golden_100)
- **Nacho Skillet** · 8 base servings
- Stored: 972 cal · 62g P · 77g C · 48g F
- Recommended: 972 cal · 62g P · 77g C · 48g F
- Calories over 900 per serving (972) — verify crew portions

### loaded-potato-feed (golden_100)
- **Potato Bar Feed** · 8 base servings
- Stored: 1337 cal · 67g P · 65g C · 90g F
- Recommended: 1337 cal · 67g P · 65g C · 90g F
- Calories over 900 per serving (1337) — verify crew portions
- Stored protein 67g vs ingredient estimate 157g
- Stored 1337 cal vs ingredient estimate 3149 cal

### mac-and-cheese-bake (golden_100)
- **Baked Mac and Cheese** · 8 base servings
- Stored: 1381 cal · 61g P · 127g C · 69g F
- Recommended: 1381 cal · 61g P · 127g C · 69g F
- Calories over 900 per serving (1381) — verify crew portions
- Protein 61g outside Comfort Food target (25–45g)

### margherita-pizza (golden_100)
- **Margherita Pizza** · 8 base servings
- Stored: 945 cal · 39g P · 80g C · 52g F
- Recommended: 945 cal · 39g P · 80g C · 52g F
- Calories over 900 per serving (945) — verify crew portions

### meat-lovers-sheet-pizza (golden_100)
- **Meat Lover's Pizza** · 8 base servings
- Stored: 1400 cal · 78g P · 75g C · 86g F
- Recommended: 1400 cal · 78g P · 75g C · 86g F
- Calories over 900 per serving (1400) — verify crew portions
- Stored macros match batch÷12 crew better than batch÷8 base servings

### meatball-hoagies (golden_100)
- **Meatball Hoagies** · 8 base servings
- Stored: 1400 cal · 95g P · 65g C · 86g F
- Recommended: 1400 cal · 95g P · 65g C · 86g F
- Calories over 900 per serving (1400) — verify crew portions
- Stored macros match batch÷10 crew better than batch÷8 base servings

### meatloaf-mashed (golden_100)
- **Meatloaf and Mashed Potatoes** · 8 base servings
- Stored: 1009 cal · 72g P · 69g C · 51g F
- Recommended: 1009 cal · 72g P · 69g C · 51g F
- Calories over 900 per serving (1009) — verify crew portions
- Protein 72g outside Comfort Food target (25–45g)

### memphis-dry-rub-ribs (golden_100)
- **Memphis Dry Rub Ribs** · 8 base servings
- Stored: 1310 cal · 103g P · 18g C · 90g F
- Recommended: 1310 cal · 103g P · 18g C · 90g F
- Calories over 900 per serving (1310) — verify crew portions
- Protein over 95g per serving (103g) — verify portion
- Stored macros match batch÷12 crew better than batch÷8 base servings
- Protein 103g outside BBQ & Grill target (30–55g)

### pancake-short-stack (golden_100)
- **Pancake Short Stack** · 8 base servings
- Stored: 1310 cal · 67g P · 125g C · 61g F
- Recommended: 1310 cal · 67g P · 125g C · 61g F
- Calories over 900 per serving (1310) — verify crew portions
- Protein 67g outside Breakfast target (20–45g)

_…and 113 more in JSON._

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
