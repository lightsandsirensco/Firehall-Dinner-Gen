# Tonight content-integrity audit

Generated: 2026-10-03T22:43:33.518Z

- Tonight-eligible recipes: **353** (default dinner pool 350)
- Served by Tonight after eligibility gate: **342**; excluded: **11**
- Recipes with any issue: **65** (served: 54); blocking among served: **0**
- Recipes needing a new image: **33**

| Issue | Recipes |
| --- | --- |
| E_title_image_mismatch | 33 |
| G_ingredient_instruction_mismatch | 30 |
| N_hidden_from_explore | 6 |

## Flagged recipes

| Slug | Title | Tonight | Hero | Issues | Proposed fix |
| --- | --- | --- | --- | --- | --- |
| `steak-sandwiches` | Philly-Style Cheesesteaks | served | `/images/golden-100/steak-sandwiches.jpg` | E_title_image_mismatch: vision: brioche buns used instead of hoagie rolls | flag for new photography (vision: image does not match recipe) |
| `hall-taco-bar` | Taco Bar | served | `/images/golden-100/hall-taco-bar.jpg` | E_title_image_mismatch: vision: cheese present — not in recipe | flag for new photography (vision: image does not match recipe) |
| `beer-can-chicken` | Beer Can Chicken | served | `/images/golden-100/beer-can-chicken.jpg` | G_ingredient_instruction_mismatch: 3/6 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `ny-strip-herb-butter` | NY Strip with Herb Butter | served | `/images/golden-100/ny-strip-herb-butter.jpg` | E_title_image_mismatch: vision: baby potatoes not in recipe; vision: broccoli not in recipe | flag for new photography (vision: image does not match recipe) |
| `bbq-chicken-sliders` | BBQ Chicken Sliders | served | `/images/golden-100/bbq-chicken-sliders.jpg` | E_title_image_mismatch: vision: cheese on sliders — not in recipe | flag for new photography (vision: image does not match recipe) |
| `grilled-pork-chops` | Grilled Pork Chops | served | `/images/golden-100/grilled-pork-chops.jpg` | G_ingredient_instruction_mismatch: 3/5 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `flank-chimichurri` | Flank Steak with Chimichurri | served | `/images/golden-100/flank-chimichurri.jpg` | E_title_image_mismatch: vision: roasted potatoes not in recipe; vision: greens not in recipe | flag for new photography (vision: image does not match recipe) |
| `teriyaki-salmon-grill` | Teriyaki Salmon | served | `/images/golden-100/teriyaki-salmon-grill.jpg` | G_ingredient_instruction_mismatch: 3/5 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `mac-and-cheese-bake` | Baked Mac and Cheese | served | `/images/golden-100/mac-and-cheese-bake.jpg` | E_title_image_mismatch: vision: garlic bread side — not in recipe | flag for new photography (vision: image does not match recipe) |
| `turkey-chili` | Turkey Chili | served | `/images/golden-100/turkey-chili.jpg` | E_title_image_mismatch: vision: shredded cheese on top — recipe does not include cheese as a main ingredient; vision: sour cream on top — recipe does not include sour cream as a main ingredient; vision: cilantro on top — recipe does not include cilantro as a main ingredient<br>G_ingredient_instruction_mismatch: steps call for sour cream, jalapeno, bread — not in ingredients | flag for new photography (vision: image does not match recipe); align ingredient list with steps |
| `performance-burrito-bowls` | Chicken Burrito Bowls | served | `/images/golden-100/performance-burrito-bowls.jpg` | E_title_image_mismatch: vision: shredded cheese present — not in recipe; vision: tomatoes instead of pico de gallo | flag for new photography (vision: image does not match recipe) |
| `herb-roasted-thighs` | Herb Roasted Chicken Thighs | served | `/images/golden-100/herb-roasted-thighs.jpg` | G_ingredient_instruction_mismatch: 5/6 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `garlic-butter-shrimp` | Garlic Butter Shrimp | served | `/images/golden-100/garlic-butter-shrimp.jpg` | G_ingredient_instruction_mismatch: steps call for rice, bread, pasta — not in ingredients | align ingredient list with steps |
| `sheet-pan-sausage-peppers` | Sausage and Peppers | served | `/images/golden-100/sheet-pan-sausage-peppers.jpg` | E_title_image_mismatch: vision: melted cheese not in recipe | flag for new photography (vision: image does not match recipe) |
| `pork-carnitas-tacos` | Pork Carnitas Tacos | served | `/images/golden-100/pork-carnitas-tacos.jpg` | E_title_image_mismatch: vision: cheese not in recipe; vision: sauce not in recipe | flag for new photography (vision: image does not match recipe) |
| `breakfast-burrito-bar` | Breakfast Burrito Bar | excluded (not_explore_eligible) | `/images/golden-100/breakfast-burrito-bar.jpg` | N_hidden_from_explore: not in Explore catalog | apply Explore's eligibility gate to Tonight |
| `pancake-short-stack` | Pancake Short Stack | excluded (not_explore_eligible) | `/images/golden-100/pancake-short-stack.jpg` | G_ingredient_instruction_mismatch: 2/5 ingredients never referenced in steps<br>N_hidden_from_explore: not in Explore catalog | rewrite steps to use the listed ingredients; apply Explore's eligibility gate to Tonight |
| `french-toast-casserole` | French Toast Casserole | excluded (not_explore_eligible) | `/images/golden-100/french-toast-casserole.jpg` | N_hidden_from_explore: not in Explore catalog | apply Explore's eligibility gate to Tonight |
| `chorizo-breakfast-tacos` | Chorizo Breakfast Tacos | excluded (not_explore_eligible) | `/images/golden-100/chorizo-breakfast-tacos.jpg` | N_hidden_from_explore: not in Explore catalog | apply Explore's eligibility gate to Tonight |
| `philly-egg-rolls` | Philly Cheesesteak Egg Rolls | served | `/images/golden-100/philly-egg-rolls.jpg` | E_title_image_mismatch: vision: missing hoagie rolls; vision: missing marinara sauce; vision: missing yellow onion; vision: missing garlic cloves; vision: missing visible eggs<br>G_ingredient_instruction_mismatch: 3/6 ingredients never referenced in steps | flag for new photography (vision: image does not match recipe); rewrite steps to use the listed ingredients |
| `sheet-pan-meal-prep` | Chicken Meal Prep Trays | excluded (image_hold) | `/images/golden-100/sheet-pan-meal-prep.jpg` | E_title_image_mismatch: vision: wrong dish format — recipe is meal-prep containers but image shows sheet pan; vision: missing sweet potatoes; vision: missing broccoli; vision: missing long-grain rice; vision: extra bell peppers; vision: extra onions; vision: extra lime | flag for new photography (vision: image does not match recipe) |
| `lemon-garlic-chicken-tray` | Lemon Garlic Chicken Tray | served | `/images/golden-100/lemon-garlic-chicken-tray.jpg` | E_title_image_mismatch: vision: chicken drumsticks instead of bone-in chicken thighs | flag for new photography (vision: image does not match recipe) |
| `turkey-sausage-egg-muffins` | Turkey Sausage Egg Muffins | excluded (not_explore_eligible) | `/images/golden-100/turkey-sausage-egg-muffins.jpg` | N_hidden_from_explore: not in Explore catalog | apply Explore's eligibility gate to Tonight |
| `cottage-cheese-protein-pasta` | Protein Pasta Bake | served | `/images/golden-100/cottage-cheese-protein-pasta.jpg` | E_title_image_mismatch: vision: broccoli side — not in recipe; vision: not baked in a casserole dish | flag for new photography (vision: image does not match recipe) |
| `veggie-egg-casserole-tray` | Veggie Egg Casserole | excluded (not_explore_eligible) | `/images/golden-100/veggie-egg-casserole-tray.jpg` | N_hidden_from_explore: not in Explore catalog | apply Explore's eligibility gate to Tonight |
| `southwest-beef-sweet-potato-skillet` | Southwest Beef & Sweet Potato Skillet | served | `/images/golden-100/southwest-beef-sweet-potato-skillet.jpg` | E_title_image_mismatch: vision: cheese on top — not in recipe; vision: parsley garnish — not in recipe | flag for new photography (vision: image does not match recipe) |
| `unstuffed-cabbage-roll-skillet` | Unstuffed Cabbage Roll Skillet | served | `/images/golden-100/unstuffed-cabbage-roll-skillet.jpg` | E_title_image_mismatch: vision: melted cheese not in recipe | flag for new photography (vision: image does not match recipe) |
| `smoked-turkey-breast` | Smoked Turkey Breast for the Crew | excluded (image_hold) | `/images/hall-expansion/smoked-turkey-breast.jpg` | E_title_image_mismatch: vision: chicken wings instead of turkey breast | flag for new photography (vision: image does not match recipe) |
| `smoked-corned-beef` | Smoked Corned Beef Brisket | served | `/images/hall-expansion/smoked-corned-beef.jpg` | G_ingredient_instruction_mismatch: 4/10 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `bbq-meatball-skewers` | BBQ Meatball Skewers | served | `/images/hall-expansion/bbq-meatball-skewers.jpg` | E_title_image_mismatch: vision: missing pickled red onions; vision: missing shredded cabbage mix; vision: cheese not in recipe | flag for new photography (vision: image does not match recipe) |
| `shawarma-bar-night` | Shawarma Bar Night | served | `/images/hall-expansion/shawarma-bar-night.jpg` | G_ingredient_instruction_mismatch: steps call for parsley, tomato, onion, bread — not in ingredients | align ingredient list with steps |
| `hall-burger-bar` | Hall Burger Bar | served | `/images/hall-expansion/hall-burger-bar.jpg` | G_ingredient_instruction_mismatch: 5/10 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `pasta-bar-night` | Pasta Bar Night | served | `/images/hall-expansion/pasta-bar-night.jpg` | E_title_image_mismatch: vision: spaghetti instead of penne pasta; vision: missing visible sauces; vision: missing garlic bread | flag for new photography (vision: image does not match recipe) |
| `mediterranean-feast-night` | Mediterranean Feast Night | excluded (image_hold) | `/images/hall-expansion/mediterranean-feast-night.jpg` | E_title_image_mismatch: vision: missing hummus; vision: missing tzatziki; vision: missing pita bread; vision: missing feta cheese; vision: extra cauliflower; vision: extra rice; vision: sauce not in recipe | flag for new photography (vision: image does not match recipe) |
| `build-your-own-pho-bar` | Build-Your-Own Pho Bar | served | `/images/hall-expansion/build-your-own-pho-bar.jpg` | G_ingredient_instruction_mismatch: steps call for cilantro, lime, fish sauce — not in ingredients | align ingredient list with steps |
| `cast-iron-chicken-fajitas` | Cast Iron Chicken Fajitas | served | `/images/hall-expansion/cast-iron-chicken-fajitas.jpg` | E_title_image_mismatch: vision: melted cheese not in recipe | flag for new photography (vision: image does not match recipe) |
| `dutch-oven-pot-roast` | Dutch Oven Pot Roast | served | `/images/hall-expansion/dutch-oven-pot-roast.jpg` | E_title_image_mismatch: vision: melted cheese on top — not in recipe | flag for new photography (vision: image does not match recipe) |
| `green-chile-chicken-stew` | Green Chile Chicken Stew | served | `/images/hall-expansion/green-chile-chicken-stew.jpg` | E_title_image_mismatch: vision: cheese not in recipe; vision: tomatoes not in recipe | flag for new photography (vision: image does not match recipe) |
| `sheet-pan-meatball-marinara` | Sheet Pan Meatball Marinara Feed | excluded (image_hold) | `/images/hall-expansion/sheet-pan-meatball-marinara.jpg` | E_title_image_mismatch: vision: wrong dish format — recipe is sheet pan but image shows sandwich | flag for new photography (vision: image does not match recipe) |
| `hungarian-goulash-crew` | Hungarian Goulash for the Crew | excluded (image_hold) | `/images/hall-expansion/hungarian-goulash-crew.jpg` | E_title_image_mismatch: vision: pasta instead of potatoes; vision: missing sour cream; vision: missing rye bread | flag for new photography (vision: image does not match recipe) |
| `peri-peri-chicken-platter` | Peri Peri Chicken Platter | served | `/images/hall-expansion/peri-peri-chicken-platter.jpg` | E_title_image_mismatch: vision: french fries present — not in recipe; vision: missing grilled red bell peppers; vision: missing grilled yellow onion; vision: missing fresh cilantro | flag for new photography (vision: image does not match recipe) |
| `lebanese-chicken-shish-platter` | Lebanese Chicken Shish Platter | served | `/images/hall-expansion/lebanese-chicken-shish-platter.jpg` | G_ingredient_instruction_mismatch: steps call for mayo, cucumber, tomato, mint — not in ingredients | align ingredient list with steps |
| `classic-patty-melt-for-the-crew` | Classic Patty Melt for the Crew | served | `/images/hall-expansion/classic-patty-melt-for-the-crew.jpg` | E_title_image_mismatch: vision: French fries present — not in the recipe | flag for new photography (vision: image does not match recipe) |
| `greek-chicken-pitas` | Greek Chicken Pitas | served | `/images/hall-expansion/greek-chicken-pitas.jpg` | E_title_image_mismatch: vision: potato wedges not in recipe; vision: broccoli not in recipe | flag for new photography (vision: image does not match recipe) |
| `firehall-korean-beef-bowls` | Korean Beef Bowls | served | `/images/hall-expansion/firehall-korean-beef-bowls.jpg` | G_ingredient_instruction_mismatch: steps call for garlic, green onion, onion — not in ingredients | align ingredient list with steps |
| `bbq-pulled-pork-bowls` | BBQ Pulled Pork Bowls | served | `/images/hall-expansion/bbq-pulled-pork-bowls.jpg` | G_ingredient_instruction_mismatch: steps call for garlic, vinegar, paprika — not in ingredients | align ingredient list with steps |
| `mediterranean-beef-bowls` | Mediterranean Beef Bowls | served | `/images/hall-expansion/mediterranean-beef-bowls.jpg` | G_ingredient_instruction_mismatch: steps call for garlic, parsley, paprika — not in ingredients | align ingredient list with steps |
| `firehall-gyro-bowls` | Firehall Gyro Bowls | served | `/images/hall-expansion/firehall-gyro-bowls.jpg` | G_ingredient_instruction_mismatch: steps call for garlic, parsley, lemon, cumin, oregano — not in ingredients | align ingredient list with steps |
| `salmon-rice-bowls-crew` | Salmon Rice Bowls for the Crew | served | `/images/hall-expansion/salmon-rice-bowls-crew.jpg` | G_ingredient_instruction_mismatch: steps call for honey, ginger, vinegar — not in ingredients | align ingredient list with steps |
| `korean-turkey-rice-bowls` | Korean Turkey Rice Bowls | served | `/images/hall-expansion/korean-turkey-rice-bowls.jpg` | G_ingredient_instruction_mismatch: steps call for garlic, soy sauce, brown sugar, vinegar — not in ingredients | align ingredient list with steps |
| `mississippi-pot-roast-crew` | Mississippi Pot Roast for the Crew | served | `/images/hall-expansion/mississippi-pot-roast-crew.jpg` | E_title_image_mismatch: vision: cheese on top — not in recipe | flag for new photography (vision: image does not match recipe) |
| `white-chicken-chili-crock` | White Chicken Chili Crock | served | `/images/hall-expansion/white-chicken-chili-crock.jpg` | G_ingredient_instruction_mismatch: steps call for cilantro, lime, onion, cumin — not in ingredients | align ingredient list with steps |
| `italian-beef-slow-cooker` | Italian Beef Slow Cooker Sandwiches | served | `/images/hall-expansion/italian-beef-slow-cooker.jpg` | E_title_image_mismatch: vision: broccoli and mashed potatoes are not in the recipe<br>G_ingredient_instruction_mismatch: steps call for garlic, onion, bell pepper — not in ingredients | flag for new photography (vision: image does not match recipe); align ingredient list with steps |
| `thai-peanut-chicken-crock` | Thai Peanut Chicken Crock | served | `/images/hall-expansion/thai-peanut-chicken-crock.jpg` | E_title_image_mismatch: vision: cheese on top — not in recipe | flag for new photography (vision: image does not match recipe) |
| `burnt-ends-chili-crew` | Burnt Ends Chili for the Crew | served | `/images/hall-expansion/burnt-ends-chili-crew.jpg` | E_title_image_mismatch: vision: cheese not in recipe; vision: green onions not in recipe | flag for new photography (vision: image does not match recipe) |
| `smoker-nachos-crew` | Smoker Nachos for the Crew | served | `/images/hall-expansion/smoker-nachos-crew.jpg` | G_ingredient_instruction_mismatch: steps call for cilantro, bbq sauce, onion — not in ingredients | align ingredient list with steps |
| `pasta-e-fagioli-hall` | Pasta e Fagioli for the Hall | served | `/images/hall-expansion/pasta-e-fagioli-hall.jpg` | G_ingredient_instruction_mismatch: steps call for parsley, parmesan, onion — not in ingredients | align ingredient list with steps |
| `dirty-rice-crew-skillet` | Dirty Rice Crew Skillet | served | `/images/hall-expansion/dirty-rice-crew-skillet.jpg` | E_title_image_mismatch: vision: melted cheese on top — not in recipe | flag for new photography (vision: image does not match recipe) |
| `spanish-rice-chicken-one-pot` | Spanish Rice Chicken One Pot | served | `/images/hall-expansion/spanish-rice-chicken-one-pot.jpg` | G_ingredient_instruction_mismatch: steps call for garlic, onion, paprika — not in ingredients | align ingredient list with steps |
| `gochujang-beef-skewers-crew` | Seoul Chili Pear Beef Cubes | served | `/images/smoker-catalog/gochujang-beef-skewers-crew.jpg` | G_ingredient_instruction_mismatch: 4/10 ingredients never referenced in steps<br>G_ingredient_instruction_mismatch: steps call for garlic, soy sauce, green onion, peanuts, onion — not in ingredients | rewrite steps to use the listed ingredients; align ingredient list with steps |
| `tandoori-lamb-chop-platter` | Kashmiri Mustard-Oil Lamb Chop Feast | served | `/images/smoker-catalog/tandoori-lamb-chop-platter.jpg` | G_ingredient_instruction_mismatch: 5/10 ingredients never referenced in steps<br>G_ingredient_instruction_mismatch: steps call for garlic, cilantro, lemon — not in ingredients | rewrite steps to use the listed ingredients; align ingredient list with steps |
| `griddle-smash-sausage-peppers` | Giardiniera Smash Sausage Hoagies | served | `/images/smoker-catalog/griddle-smash-sausage-peppers.jpg` | G_ingredient_instruction_mismatch: 4/9 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `firehall-street-elote-cups` | Epazote Esquites Street Cups | served | `/images/smoker-catalog/firehall-street-elote-cups.jpg` | G_ingredient_instruction_mismatch: 5/10 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `loaded-ranch-potato-salad-crew` | Blue Cheese Fingerling Ranch Tray | served | `/images/smoker-catalog/loaded-ranch-potato-salad-crew.jpg` | G_ingredient_instruction_mismatch: 5/10 ingredients never referenced in steps<br>G_ingredient_instruction_mismatch: steps call for green onion, cheddar, onion, bacon, paprika — not in ingredients | rewrite steps to use the listed ingredients; align ingredient list with steps |
| `firehall-antipasto-pasta-salad` | Mortadella Farfalle Antipasto Tray | served | `/images/smoker-catalog/firehall-antipasto-pasta-salad.jpg` | G_ingredient_instruction_mismatch: 7/10 ingredients never referenced in steps<br>G_ingredient_instruction_mismatch: steps call for garlic, vinegar, onion — not in ingredients | rewrite steps to use the listed ingredients; align ingredient list with steps |

## Recipes needing a new image

- `steak-sandwiches` — Philly-Style Cheesesteaks (`/images/golden-100/steak-sandwiches.jpg`)
- `hall-taco-bar` — Taco Bar (`/images/golden-100/hall-taco-bar.jpg`)
- `ny-strip-herb-butter` — NY Strip with Herb Butter (`/images/golden-100/ny-strip-herb-butter.jpg`)
- `bbq-chicken-sliders` — BBQ Chicken Sliders (`/images/golden-100/bbq-chicken-sliders.jpg`)
- `flank-chimichurri` — Flank Steak with Chimichurri (`/images/golden-100/flank-chimichurri.jpg`)
- `mac-and-cheese-bake` — Baked Mac and Cheese (`/images/golden-100/mac-and-cheese-bake.jpg`)
- `turkey-chili` — Turkey Chili (`/images/golden-100/turkey-chili.jpg`)
- `performance-burrito-bowls` — Chicken Burrito Bowls (`/images/golden-100/performance-burrito-bowls.jpg`)
- `sheet-pan-sausage-peppers` — Sausage and Peppers (`/images/golden-100/sheet-pan-sausage-peppers.jpg`)
- `pork-carnitas-tacos` — Pork Carnitas Tacos (`/images/golden-100/pork-carnitas-tacos.jpg`)
- `philly-egg-rolls` — Philly Cheesesteak Egg Rolls (`/images/golden-100/philly-egg-rolls.jpg`)
- `sheet-pan-meal-prep` — Chicken Meal Prep Trays (`/images/golden-100/sheet-pan-meal-prep.jpg`)
- `lemon-garlic-chicken-tray` — Lemon Garlic Chicken Tray (`/images/golden-100/lemon-garlic-chicken-tray.jpg`)
- `cottage-cheese-protein-pasta` — Protein Pasta Bake (`/images/golden-100/cottage-cheese-protein-pasta.jpg`)
- `southwest-beef-sweet-potato-skillet` — Southwest Beef & Sweet Potato Skillet (`/images/golden-100/southwest-beef-sweet-potato-skillet.jpg`)
- `unstuffed-cabbage-roll-skillet` — Unstuffed Cabbage Roll Skillet (`/images/golden-100/unstuffed-cabbage-roll-skillet.jpg`)
- `smoked-turkey-breast` — Smoked Turkey Breast for the Crew (`/images/hall-expansion/smoked-turkey-breast.jpg`)
- `bbq-meatball-skewers` — BBQ Meatball Skewers (`/images/hall-expansion/bbq-meatball-skewers.jpg`)
- `pasta-bar-night` — Pasta Bar Night (`/images/hall-expansion/pasta-bar-night.jpg`)
- `mediterranean-feast-night` — Mediterranean Feast Night (`/images/hall-expansion/mediterranean-feast-night.jpg`)
- `cast-iron-chicken-fajitas` — Cast Iron Chicken Fajitas (`/images/hall-expansion/cast-iron-chicken-fajitas.jpg`)
- `dutch-oven-pot-roast` — Dutch Oven Pot Roast (`/images/hall-expansion/dutch-oven-pot-roast.jpg`)
- `green-chile-chicken-stew` — Green Chile Chicken Stew (`/images/hall-expansion/green-chile-chicken-stew.jpg`)
- `sheet-pan-meatball-marinara` — Sheet Pan Meatball Marinara Feed (`/images/hall-expansion/sheet-pan-meatball-marinara.jpg`)
- `hungarian-goulash-crew` — Hungarian Goulash for the Crew (`/images/hall-expansion/hungarian-goulash-crew.jpg`)
- `peri-peri-chicken-platter` — Peri Peri Chicken Platter (`/images/hall-expansion/peri-peri-chicken-platter.jpg`)
- `classic-patty-melt-for-the-crew` — Classic Patty Melt for the Crew (`/images/hall-expansion/classic-patty-melt-for-the-crew.jpg`)
- `greek-chicken-pitas` — Greek Chicken Pitas (`/images/hall-expansion/greek-chicken-pitas.jpg`)
- `mississippi-pot-roast-crew` — Mississippi Pot Roast for the Crew (`/images/hall-expansion/mississippi-pot-roast-crew.jpg`)
- `italian-beef-slow-cooker` — Italian Beef Slow Cooker Sandwiches (`/images/hall-expansion/italian-beef-slow-cooker.jpg`)
- `thai-peanut-chicken-crock` — Thai Peanut Chicken Crock (`/images/hall-expansion/thai-peanut-chicken-crock.jpg`)
- `burnt-ends-chili-crew` — Burnt Ends Chili for the Crew (`/images/hall-expansion/burnt-ends-chili-crew.jpg`)
- `dirty-rice-crew-skillet` — Dirty Rice Crew Skillet (`/images/hall-expansion/dirty-rice-crew-skillet.jpg`)
