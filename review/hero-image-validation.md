# Hero image validation

Generated: 2026-10-01T17:40:51.954Z

## Summary

- Published recipes audited: **408** (approved catalog: 427, explore-eligible: 382)
- Pass: **363** · Hard failures: **45**
  - File failures (missing, empty, malformed path, not an image): 0 (missing: 0)
  - Metadata failures (empty/placeholder alt, alt contradicts title): 0
  - Conflicting duplicate hero bytes: 0
  - Vision-confirmed wrong dish: 45
- Metadata warnings: **1** recipes
- Semantic warnings (title/alt wording heuristics, not failures): **0** recipes
- Semantic status — verified pass: **270**, verified fail: **45**, not verified: **93**
- Recipes requiring new images: **45**
- Vision mode: **full vision (408 recipes)**

## Hard failures

| Slug | Title | Hero | Reasons |
| --- | --- | --- | --- |
| `steak-sandwiches` | Philly-Style Cheesesteaks | `/images/golden-100/steak-sandwiches.jpg` | vision: brioche buns used instead of hoagie rolls |
| `hall-taco-bar` | Taco Bar | `/images/golden-100/hall-taco-bar.jpg` | vision: cheese present — not in recipe |
| `ny-strip-herb-butter` | NY Strip with Herb Butter | `/images/golden-100/ny-strip-herb-butter.jpg` | vision: baby potatoes not in recipe; vision: broccoli not in recipe |
| `bbq-chicken-sliders` | BBQ Chicken Sliders | `/images/golden-100/bbq-chicken-sliders.jpg` | vision: cheese on sliders — not in recipe |
| `flank-chimichurri` | Flank Steak with Chimichurri | `/images/golden-100/flank-chimichurri.jpg` | vision: roasted potatoes not in recipe; vision: greens not in recipe |
| `turkey-chili` | Turkey Chili | `/images/golden-100/turkey-chili.jpg` | vision: shredded cheese on top — not listed in the recipe; vision: sour cream on top — not listed in the recipe; vision: cilantro on top — not listed in the recipe |
| `pasta-e-ceci-for-the-hall` | Pasta e Ceci (Pasta with Chickpeas) | `/images/golden-100/pasta-e-ceci-for-the-hall.jpg` | vision: served in a baking dish — recipe serves in shallow bowls |
| `performance-burrito-bowls` | Chicken Burrito Bowls | `/images/golden-100/performance-burrito-bowls.jpg` | vision: shredded cheese present — not in recipe; vision: tomatoes instead of pico de gallo |
| `sheet-pan-sausage-peppers` | Sausage and Peppers | `/images/golden-100/sheet-pan-sausage-peppers.jpg` | vision: melted cheese not in recipe |
| `pork-carnitas-tacos` | Pork Carnitas Tacos | `/images/golden-100/pork-carnitas-tacos.jpg` | vision: cheese on tacos — not in recipe |
| `chili-mac` | Chili Mac Skillet | `/images/golden-100/chili-mac.jpg` | vision: served in a bowl — recipe is a skillet |
| `sheet-pan-parmesan-dijon-chicken-thigh-dinner` | Sheet Pan Parmesan-Dijon Chicken Thigh Dinner | `/images/golden-100/sheet-pan-parmesan-dijon-chicken-thigh-dinner.jpg` | vision: broccoli not in recipe; vision: carrots not in recipe; vision: missing green beans |
| `enchilada-casserole` | Chicken Enchilada Casserole | `/images/golden-100/enchilada-casserole.jpg` | vision: wrong dish format — recipe is casserole but image shows individually rolled items |
| `philly-egg-rolls` | Philly Cheesesteak Egg Rolls | `/images/golden-100/philly-egg-rolls.jpg` | vision: missing hoagie rolls; vision: missing marinara sauce; vision: missing yellow onion |
| `sheet-pan-meal-prep` | Chicken Meal Prep Trays | `/images/golden-100/sheet-pan-meal-prep.jpg` | vision: wrong dish format — recipe is meal-prep containers but image shows sheet pan; vision: missing sweet potatoes; vision: missing broccoli |
| `lemon-garlic-chicken-tray` | Lemon Garlic Chicken Tray | `/images/golden-100/lemon-garlic-chicken-tray.jpg` | vision: chicken drumsticks instead of bone-in chicken thighs |
| `cottage-cheese-protein-pasta` | Protein Pasta Bake | `/images/golden-100/cottage-cheese-protein-pasta.jpg` | vision: broccoli side — not in recipe; vision: plated format — expected casserole |
| `turkey-taco-skillet` | Turkey Taco Skillet | `/images/golden-100/turkey-taco-skillet.jpg` | vision: wrong dish format — recipe is skillet but image shows taco |
| `pesto-tomato-chicken-tray` | Pesto Chicken Tray | `/images/golden-100/pesto-tomato-chicken-tray.jpg` | vision: chicken breasts instead of bone-in chicken thighs; vision: missing zucchini; vision: missing cherry tomatoes |
| `southwest-beef-sweet-potato-skillet` | Southwest Beef & Sweet Potato Skillet | `/images/golden-100/southwest-beef-sweet-potato-skillet.jpg` | vision: cheese on top — not in recipe; vision: parsley garnish — not in recipe |
| `unstuffed-cabbage-roll-skillet` | Unstuffed Cabbage Roll Skillet | `/images/golden-100/unstuffed-cabbage-roll-skillet.jpg` | vision: melted cheese not in recipe |
| `smoked-turkey-breast` | Smoked Turkey Breast for the Crew | `/images/hall-expansion/smoked-turkey-breast.jpg` | vision: chicken wings instead of turkey breast |
| `bbq-meatball-skewers` | BBQ Meatball Skewers | `/images/hall-expansion/bbq-meatball-skewers.jpg` | vision: missing pickled red onions; vision: missing shredded cabbage mix; vision: cheese not in recipe |
| `pasta-bar-night` | Pasta Bar Night | `/images/hall-expansion/pasta-bar-night.jpg` | vision: spaghetti instead of penne pasta |
| `mediterranean-feast-night` | Mediterranean Feast Night | `/images/hall-expansion/mediterranean-feast-night.jpg` | vision: sauced chicken instead of plain chicken thighs; vision: missing hummus; vision: missing tzatziki |
| `cast-iron-chicken-fajitas` | Cast Iron Chicken Fajitas | `/images/hall-expansion/cast-iron-chicken-fajitas.jpg` | vision: melted cheese not in recipe |
| `dutch-oven-pot-roast` | Dutch Oven Pot Roast | `/images/hall-expansion/dutch-oven-pot-roast.jpg` | vision: melted cheese on top — not in recipe |
| `green-chile-chicken-stew` | Green Chile Chicken Stew | `/images/hall-expansion/green-chile-chicken-stew.jpg` | vision: cheese not in recipe; vision: tomatoes not in recipe |
| `sheet-pan-meatball-marinara` | Sheet Pan Meatball Marinara Feed | `/images/hall-expansion/sheet-pan-meatball-marinara.jpg` | vision: wrong dish format — recipe is sheet pan but image shows sandwich; vision: spaghetti not visible |
| `hungarian-goulash-crew` | Hungarian Goulash for the Crew | `/images/hall-expansion/hungarian-goulash-crew.jpg` | vision: pasta instead of potatoes; vision: missing rye bread; vision: missing sour cream |
| `peri-peri-chicken-platter` | Peri Peri Chicken Platter | `/images/hall-expansion/peri-peri-chicken-platter.jpg` | vision: french fries present — not in recipe; vision: missing grilled vegetables |
| `classic-patty-melt-for-the-crew` | Classic Patty Melt for the Crew | `/images/hall-expansion/classic-patty-melt-for-the-crew.jpg` | vision: French fries present — not in recipe |
| `greek-chicken-pitas` | Greek Chicken Pitas | `/images/hall-expansion/greek-chicken-pitas.jpg` | vision: potato wedges not in recipe; vision: broccoli not in recipe |
| `mississippi-pot-roast-crew` | Mississippi Pot Roast for the Crew | `/images/hall-expansion/mississippi-pot-roast-crew.jpg` | vision: cheese on top — not in the recipe |
| `italian-beef-slow-cooker` | Italian Beef Slow Cooker Sandwiches | `/images/hall-expansion/italian-beef-slow-cooker.jpg` | vision: broccoli and mashed potatoes not in recipe |
| `thai-peanut-chicken-crock` | Thai Peanut Chicken Crock | `/images/hall-expansion/thai-peanut-chicken-crock.jpg` | vision: cheese on top — not in recipe |
| `burnt-ends-chili-crew` | Burnt Ends Chili for the Crew | `/images/hall-expansion/burnt-ends-chili-crew.jpg` | vision: cheese not in recipe; vision: green onions not in recipe |
| `pasta-e-fagioli-hall` | Pasta e Fagioli for the Hall | `/images/hall-expansion/pasta-e-fagioli-hall.jpg` | vision: grated cheese on top — not in recipe |
| `dirty-rice-crew-skillet` | Dirty Rice Crew Skillet | `/images/hall-expansion/dirty-rice-crew-skillet.jpg` | vision: melted cheese not in recipe |
| `breakfast-poutine` | Breakfast Poutine | `/images/breakfast/breakfast-poutine.jpg` | vision: bacon strips present — not in recipe |
| `breakfast-sliders` | Breakfast Sliders | `/images/breakfast/breakfast-sliders.jpg` | vision: missing visible eggs |
| `irish-breakfast-fry-up` | Irish Breakfast Fry-Up | `/images/breakfast/irish-breakfast-fry-up.jpg` | vision: baked beans present — not in recipe |
| `maple-sausage-pinwheels` | Maple Sausage Pinwheels | `/images/breakfast/maple-sausage-pinwheels.jpg` | vision: fried eggs on top — recipe does not include visible eggs; vision: bacon present — not in recipe |
| `sausage-egg-cheese-sandwiches` | Sausage Egg & Cheese Sandwiches | `/images/breakfast/sausage-egg-cheese-sandwiches.jpg` | vision: bacon strips present — not in recipe; vision: missing visible eggs |
| `turkey-sausage-burritos` | Turkey Sausage Breakfast Burritos | `/images/breakfast/turkey-sausage-burritos.jpg` | vision: wrong dish format — recipe is wrapped burrito/wrap but image shows soup; vision: wrong dish — soup instead of burritos |

## Recipes requiring new images

_Missing or invalid hero file, bytes that conflict with another recipe, or a vision-confirmed wrong dish._

| Slug | Title | Hero | Reasons |
| --- | --- | --- | --- |
| `steak-sandwiches` | Philly-Style Cheesesteaks | `/images/golden-100/steak-sandwiches.jpg` | vision: brioche buns used instead of hoagie rolls |
| `hall-taco-bar` | Taco Bar | `/images/golden-100/hall-taco-bar.jpg` | vision: cheese present — not in recipe |
| `ny-strip-herb-butter` | NY Strip with Herb Butter | `/images/golden-100/ny-strip-herb-butter.jpg` | vision: baby potatoes not in recipe; vision: broccoli not in recipe |
| `bbq-chicken-sliders` | BBQ Chicken Sliders | `/images/golden-100/bbq-chicken-sliders.jpg` | vision: cheese on sliders — not in recipe |
| `flank-chimichurri` | Flank Steak with Chimichurri | `/images/golden-100/flank-chimichurri.jpg` | vision: roasted potatoes not in recipe; vision: greens not in recipe |
| `turkey-chili` | Turkey Chili | `/images/golden-100/turkey-chili.jpg` | vision: shredded cheese on top — not listed in the recipe; vision: sour cream on top — not listed in the recipe; vision: cilantro on top — not listed in the recipe |
| `pasta-e-ceci-for-the-hall` | Pasta e Ceci (Pasta with Chickpeas) | `/images/golden-100/pasta-e-ceci-for-the-hall.jpg` | vision: served in a baking dish — recipe serves in shallow bowls |
| `performance-burrito-bowls` | Chicken Burrito Bowls | `/images/golden-100/performance-burrito-bowls.jpg` | vision: shredded cheese present — not in recipe; vision: tomatoes instead of pico de gallo |
| `sheet-pan-sausage-peppers` | Sausage and Peppers | `/images/golden-100/sheet-pan-sausage-peppers.jpg` | vision: melted cheese not in recipe |
| `pork-carnitas-tacos` | Pork Carnitas Tacos | `/images/golden-100/pork-carnitas-tacos.jpg` | vision: cheese on tacos — not in recipe |
| `chili-mac` | Chili Mac Skillet | `/images/golden-100/chili-mac.jpg` | vision: served in a bowl — recipe is a skillet |
| `sheet-pan-parmesan-dijon-chicken-thigh-dinner` | Sheet Pan Parmesan-Dijon Chicken Thigh Dinner | `/images/golden-100/sheet-pan-parmesan-dijon-chicken-thigh-dinner.jpg` | vision: broccoli not in recipe; vision: carrots not in recipe; vision: missing green beans |
| `enchilada-casserole` | Chicken Enchilada Casserole | `/images/golden-100/enchilada-casserole.jpg` | vision: wrong dish format — recipe is casserole but image shows individually rolled items |
| `philly-egg-rolls` | Philly Cheesesteak Egg Rolls | `/images/golden-100/philly-egg-rolls.jpg` | vision: missing hoagie rolls; vision: missing marinara sauce; vision: missing yellow onion |
| `sheet-pan-meal-prep` | Chicken Meal Prep Trays | `/images/golden-100/sheet-pan-meal-prep.jpg` | vision: wrong dish format — recipe is meal-prep containers but image shows sheet pan; vision: missing sweet potatoes; vision: missing broccoli |
| `lemon-garlic-chicken-tray` | Lemon Garlic Chicken Tray | `/images/golden-100/lemon-garlic-chicken-tray.jpg` | vision: chicken drumsticks instead of bone-in chicken thighs |
| `cottage-cheese-protein-pasta` | Protein Pasta Bake | `/images/golden-100/cottage-cheese-protein-pasta.jpg` | vision: broccoli side — not in recipe; vision: plated format — expected casserole |
| `turkey-taco-skillet` | Turkey Taco Skillet | `/images/golden-100/turkey-taco-skillet.jpg` | vision: wrong dish format — recipe is skillet but image shows taco |
| `pesto-tomato-chicken-tray` | Pesto Chicken Tray | `/images/golden-100/pesto-tomato-chicken-tray.jpg` | vision: chicken breasts instead of bone-in chicken thighs; vision: missing zucchini; vision: missing cherry tomatoes |
| `southwest-beef-sweet-potato-skillet` | Southwest Beef & Sweet Potato Skillet | `/images/golden-100/southwest-beef-sweet-potato-skillet.jpg` | vision: cheese on top — not in recipe; vision: parsley garnish — not in recipe |
| `unstuffed-cabbage-roll-skillet` | Unstuffed Cabbage Roll Skillet | `/images/golden-100/unstuffed-cabbage-roll-skillet.jpg` | vision: melted cheese not in recipe |
| `smoked-turkey-breast` | Smoked Turkey Breast for the Crew | `/images/hall-expansion/smoked-turkey-breast.jpg` | vision: chicken wings instead of turkey breast |
| `bbq-meatball-skewers` | BBQ Meatball Skewers | `/images/hall-expansion/bbq-meatball-skewers.jpg` | vision: missing pickled red onions; vision: missing shredded cabbage mix; vision: cheese not in recipe |
| `pasta-bar-night` | Pasta Bar Night | `/images/hall-expansion/pasta-bar-night.jpg` | vision: spaghetti instead of penne pasta |
| `mediterranean-feast-night` | Mediterranean Feast Night | `/images/hall-expansion/mediterranean-feast-night.jpg` | vision: sauced chicken instead of plain chicken thighs; vision: missing hummus; vision: missing tzatziki |
| `cast-iron-chicken-fajitas` | Cast Iron Chicken Fajitas | `/images/hall-expansion/cast-iron-chicken-fajitas.jpg` | vision: melted cheese not in recipe |
| `dutch-oven-pot-roast` | Dutch Oven Pot Roast | `/images/hall-expansion/dutch-oven-pot-roast.jpg` | vision: melted cheese on top — not in recipe |
| `green-chile-chicken-stew` | Green Chile Chicken Stew | `/images/hall-expansion/green-chile-chicken-stew.jpg` | vision: cheese not in recipe; vision: tomatoes not in recipe |
| `sheet-pan-meatball-marinara` | Sheet Pan Meatball Marinara Feed | `/images/hall-expansion/sheet-pan-meatball-marinara.jpg` | vision: wrong dish format — recipe is sheet pan but image shows sandwich; vision: spaghetti not visible |
| `hungarian-goulash-crew` | Hungarian Goulash for the Crew | `/images/hall-expansion/hungarian-goulash-crew.jpg` | vision: pasta instead of potatoes; vision: missing rye bread; vision: missing sour cream |
| `peri-peri-chicken-platter` | Peri Peri Chicken Platter | `/images/hall-expansion/peri-peri-chicken-platter.jpg` | vision: french fries present — not in recipe; vision: missing grilled vegetables |
| `classic-patty-melt-for-the-crew` | Classic Patty Melt for the Crew | `/images/hall-expansion/classic-patty-melt-for-the-crew.jpg` | vision: French fries present — not in recipe |
| `greek-chicken-pitas` | Greek Chicken Pitas | `/images/hall-expansion/greek-chicken-pitas.jpg` | vision: potato wedges not in recipe; vision: broccoli not in recipe |
| `mississippi-pot-roast-crew` | Mississippi Pot Roast for the Crew | `/images/hall-expansion/mississippi-pot-roast-crew.jpg` | vision: cheese on top — not in the recipe |
| `italian-beef-slow-cooker` | Italian Beef Slow Cooker Sandwiches | `/images/hall-expansion/italian-beef-slow-cooker.jpg` | vision: broccoli and mashed potatoes not in recipe |
| `thai-peanut-chicken-crock` | Thai Peanut Chicken Crock | `/images/hall-expansion/thai-peanut-chicken-crock.jpg` | vision: cheese on top — not in recipe |
| `burnt-ends-chili-crew` | Burnt Ends Chili for the Crew | `/images/hall-expansion/burnt-ends-chili-crew.jpg` | vision: cheese not in recipe; vision: green onions not in recipe |
| `pasta-e-fagioli-hall` | Pasta e Fagioli for the Hall | `/images/hall-expansion/pasta-e-fagioli-hall.jpg` | vision: grated cheese on top — not in recipe |
| `dirty-rice-crew-skillet` | Dirty Rice Crew Skillet | `/images/hall-expansion/dirty-rice-crew-skillet.jpg` | vision: melted cheese not in recipe |
| `breakfast-poutine` | Breakfast Poutine | `/images/breakfast/breakfast-poutine.jpg` | vision: bacon strips present — not in recipe |
| `breakfast-sliders` | Breakfast Sliders | `/images/breakfast/breakfast-sliders.jpg` | vision: missing visible eggs |
| `irish-breakfast-fry-up` | Irish Breakfast Fry-Up | `/images/breakfast/irish-breakfast-fry-up.jpg` | vision: baked beans present — not in recipe |
| `maple-sausage-pinwheels` | Maple Sausage Pinwheels | `/images/breakfast/maple-sausage-pinwheels.jpg` | vision: fried eggs on top — recipe does not include visible eggs; vision: bacon present — not in recipe |
| `sausage-egg-cheese-sandwiches` | Sausage Egg & Cheese Sandwiches | `/images/breakfast/sausage-egg-cheese-sandwiches.jpg` | vision: bacon strips present — not in recipe; vision: missing visible eggs |
| `turkey-sausage-burritos` | Turkey Sausage Breakfast Burritos | `/images/breakfast/turkey-sausage-burritos.jpg` | vision: wrong dish format — recipe is wrapped burrito/wrap but image shows soup; vision: wrong dish — soup instead of burritos |

## Semantic status not verified

- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing corn kernels; missing coleslaw mix; green onions not in recipe; sesame seeds not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: format may not match — recipe is skillet, image looks like hot plated entrée; diced tomatoes not in recipe; missing black beans; missing pickled jalapeños
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: beer can missing
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: broccoli not in recipe; rice not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: format may not match — recipe is pasta, image looks like casserole; garlic bread side not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: Greek salad on the side — not in the recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: gravy not in recipe; parsley not in recipe
- 1 recipe(s): vision inconclusive (PASS) — needs human review: format may not match — recipe is bowl, image looks like hot plated entrée
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: hoagie rolls missing
- 2 recipe(s): vision inconclusive (CRITICAL) — needs human review: format may not match — recipe is casserole, image looks like pasta
- 3 recipe(s): vision inconclusive (MAJOR) — needs human review: broccoli not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: sour cream and chives on top — not in recipe; missing brie cheese on toast
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: broccoli not in recipe; carrots not in recipe; zucchini not in recipe; rice not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: format may not match — recipe is sheet pan, image looks like hot plated entrée; chicken strips instead of boneless chicken thighs
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: lettuce and tomato not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: cucumber not in recipe; carrot not in recipe; missing sesame seeds
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: broccoli not in recipe; carrots not in recipe; rice not in recipe
- 4 recipe(s): vision inconclusive (PASS) — needs human review: format may not match — recipe is skillet, image looks like hot plated entrée
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: format may not match — recipe is skillet, image looks like hot plated entrée; missing hoagie rolls
- 1 recipe(s): vision inconclusive (PASS) — needs human review: format may not match — recipe is pasta, image looks like soup
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing shredded cheddar-mozzarella blend
- 2 recipe(s): vision inconclusive (CRITICAL) — needs human review: format may not match — recipe is casserole, image looks like hot plated entrée
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing cotija cheese; missing lime wedges; unlisted green garnish
- 1 recipe(s): vision inconclusive (PASS) — needs human review: wrong dish format — recipe is bowl but image shows sheet pan (format from meal tag, not title — review)
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing peas and carrots; missing lemon wedges
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: spaghetti not in recipe; green beans not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: broccoli crowns missing
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing cherry tomatoes; missing red onion
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: side salad visible — not in recipe; pita bread visible — not in recipe
- 4 recipe(s): vision inconclusive (PASS) — needs human review: format may not match — recipe is sheet pan, image looks like hot plated entrée
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: rice present — not in recipe; pita missing — recipe includes pita
- 2 recipe(s): vision inconclusive (MAJOR) — needs human review: rice not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: format may not match — recipe is casserole, image looks like hot plated entrée; rice not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: side salad present — not in recipe; bread present — not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: rice not in recipe; tomatoes not in recipe; missing slaw; missing lime crema
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: flatbread not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: broccoli not in recipe; mushrooms not in recipe; missing spinach; missing feta cheese
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing tomato-cucumber salad
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: green onions not in recipe; sesame seeds not in recipe; missing cherry tomatoes; missing extra crumbled feta
- 1 recipe(s): vision inconclusive (PASS) — needs human review: format may not match — recipe is skillet, image looks like bowl
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing pickled vegetables; missing fresh cilantro and mint; missing Thai or serrano chili; sesame seeds not in recipe; green onions not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing black-eyed peas; missing shredded lettuce; missing diced tomato
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing visible scrambled egg
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing baby spinach; missing kalamata olives; missing feta cheese
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: corn on the cob missing
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing chimichurri; missing grilled crusty bread
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing cabbage-potato packets; missing rye bread; missing swiss cheese
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing baked beans; missing cornbread
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing tortilla chips; missing baguette
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing spicy brown mustard; missing sauerkraut; missing cheddar cheese sauce
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing gouda cheese; missing cornichons; missing fig jam
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing broccoli florets; missing carrots; missing edamame; missing pickled ginger; missing sesame seeds; missing sriracha mayo; missing soy sauce
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: green onions not in recipe; missing black beans; missing corn salsa; missing shredded lettuce
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: soft potato rolls missing
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: steaks not sliced and fanned as per serving step
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing visible onions; missing visible carrots
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: format may not match — recipe is skillet, image looks like hot plated entrée; broccoli not in recipe
- 1 recipe(s): vision inconclusive (CRITICAL) — needs human review: format may not match — recipe is skillet, image looks like hot plated entrée
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing bacon; missing mushrooms; missing hard-boiled eggs; red peppers not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing broccoli florets; green onions not listed in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: Missing cucumber; Missing cherry tomatoes; Missing kalamata olives; Missing hummus; Missing feta cheese
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: lettuce garnish not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing asparagus; missing Greek yogurt sauce
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: side of peas not in recipe
- 2 recipe(s): vision inconclusive (PASS) — needs human review: wrong dish format — recipe is soup but image shows hot plated entrée (format from meal tag, not title — review)
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: black olives not in recipe; missing polenta
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: yukon gold potatoes missing
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: nori present — not in recipe; missing chicken thighs; missing soft-boiled eggs; missing bean sprouts
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: tofu puffs not in recipe; lime wedge instead of lime juice
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: salad not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: side dish of rice and salad not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: rice present — not in recipe; missing avocados; missing blue cheese; missing ranch dressing
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing romaine; missing feta; missing tzatziki
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing kimchi; missing eggs; missing sesame seeds
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: rice present — not listed in the recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing visible egg squares
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: side of tortilla strips dominates
- 1 recipe(s): vision inconclusive (CRITICAL) — needs human review: format may not match — recipe is sheet pan, image looks like hot plated entrée
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: whole sausages instead of bulk sausage
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: coleslaw missing
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing spinach; missing ricotta dollops

## Semantic warnings (wording heuristics)

_Title/alt/path wording suggests a possible mismatch. These never fail the audit; confirm visually or run `--vision`._

_None._

## Metadata warnings

- `mixed-berry-protein`: no heroImageAlt configured — alt falls back to the recipe title

## Validation commands

```bash
npm run test:hero-image-validation
npm run audit:hero-images
npx tsx scripts/audit-hero-images.ts --vision
```

