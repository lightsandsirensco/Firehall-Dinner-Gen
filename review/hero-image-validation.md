# Hero image validation

Generated: 2026-10-01T18:19:48.803Z

## Summary

- Published recipes audited: **408** (approved catalog: 427, explore-eligible: 382)
- Pass: **369** · Hard failures: **39**
  - File failures (missing, empty, malformed path, not an image): 0 (missing: 0)
  - Metadata failures (empty/placeholder alt, alt contradicts title): 0
  - Conflicting duplicate hero bytes: 0
  - Vision-confirmed wrong dish: 39
- Metadata warnings: **1** recipes
- Semantic warnings (title/alt wording heuristics, not failures): **0** recipes
- Semantic status — verified pass: **268**, verified fail: **39**, not verified: **101**
- Recipes requiring new images: **39**
- Vision mode: **full vision (408 recipes)**

## Hard failures

| Slug | Title | Hero | Reasons |
| --- | --- | --- | --- |
| `steak-sandwiches` | Philly-Style Cheesesteaks | `/images/golden-100/steak-sandwiches.jpg` | vision: brioche buns used instead of hoagie rolls |
| `hall-taco-bar` | Taco Bar | `/images/golden-100/hall-taco-bar.jpg` | vision: cheese present — not in recipe |
| `ny-strip-herb-butter` | NY Strip with Herb Butter | `/images/golden-100/ny-strip-herb-butter.jpg` | vision: baby potatoes not in recipe; vision: broccoli not in recipe |
| `bbq-chicken-sliders` | BBQ Chicken Sliders | `/images/golden-100/bbq-chicken-sliders.jpg` | vision: cheese on sliders — not in recipe |
| `flank-chimichurri` | Flank Steak with Chimichurri | `/images/golden-100/flank-chimichurri.jpg` | vision: roasted potatoes not in recipe; vision: greens not in recipe |
| `mac-and-cheese-bake` | Baked Mac and Cheese | `/images/golden-100/mac-and-cheese-bake.jpg` | vision: garlic bread side — not in recipe |
| `turkey-chili` | Turkey Chili | `/images/golden-100/turkey-chili.jpg` | vision: shredded cheese on top — recipe does not include cheese as a main ingredient; vision: sour cream on top — recipe does not include sour cream as a main ingredient; vision: cilantro on top — recipe does not include cilantro as a main ingredient |
| `performance-burrito-bowls` | Chicken Burrito Bowls | `/images/golden-100/performance-burrito-bowls.jpg` | vision: shredded cheese present — not in recipe; vision: tomatoes instead of pico de gallo |
| `sheet-pan-sausage-peppers` | Sausage and Peppers | `/images/golden-100/sheet-pan-sausage-peppers.jpg` | vision: melted cheese not in recipe |
| `pork-carnitas-tacos` | Pork Carnitas Tacos | `/images/golden-100/pork-carnitas-tacos.jpg` | vision: cheese not in recipe; vision: sauce not in recipe |
| `philly-egg-rolls` | Philly Cheesesteak Egg Rolls | `/images/golden-100/philly-egg-rolls.jpg` | vision: missing hoagie rolls; vision: missing marinara sauce; vision: missing yellow onion |
| `sheet-pan-meal-prep` | Chicken Meal Prep Trays | `/images/golden-100/sheet-pan-meal-prep.jpg` | vision: wrong dish format — recipe is meal-prep containers but image shows sheet pan; vision: missing sweet potatoes; vision: missing broccoli |
| `lemon-garlic-chicken-tray` | Lemon Garlic Chicken Tray | `/images/golden-100/lemon-garlic-chicken-tray.jpg` | vision: chicken drumsticks instead of bone-in chicken thighs |
| `cottage-cheese-protein-pasta` | Protein Pasta Bake | `/images/golden-100/cottage-cheese-protein-pasta.jpg` | vision: broccoli side — not in recipe; vision: not baked in a casserole dish |
| `southwest-beef-sweet-potato-skillet` | Southwest Beef & Sweet Potato Skillet | `/images/golden-100/southwest-beef-sweet-potato-skillet.jpg` | vision: cheese on top — not in recipe; vision: parsley garnish — not in recipe |
| `unstuffed-cabbage-roll-skillet` | Unstuffed Cabbage Roll Skillet | `/images/golden-100/unstuffed-cabbage-roll-skillet.jpg` | vision: melted cheese not in recipe |
| `smoked-turkey-breast` | Smoked Turkey Breast for the Crew | `/images/hall-expansion/smoked-turkey-breast.jpg` | vision: chicken wings instead of turkey breast |
| `bbq-meatball-skewers` | BBQ Meatball Skewers | `/images/hall-expansion/bbq-meatball-skewers.jpg` | vision: missing pickled red onions; vision: missing shredded cabbage mix; vision: cheese not in recipe |
| `pasta-bar-night` | Pasta Bar Night | `/images/hall-expansion/pasta-bar-night.jpg` | vision: spaghetti instead of penne pasta; vision: missing visible sauces; vision: missing garlic bread |
| `mediterranean-feast-night` | Mediterranean Feast Night | `/images/hall-expansion/mediterranean-feast-night.jpg` | vision: missing hummus; vision: missing tzatziki; vision: missing pita bread |
| `cast-iron-chicken-fajitas` | Cast Iron Chicken Fajitas | `/images/hall-expansion/cast-iron-chicken-fajitas.jpg` | vision: melted cheese not in recipe |
| `dutch-oven-pot-roast` | Dutch Oven Pot Roast | `/images/hall-expansion/dutch-oven-pot-roast.jpg` | vision: melted cheese on top — not in recipe |
| `green-chile-chicken-stew` | Green Chile Chicken Stew | `/images/hall-expansion/green-chile-chicken-stew.jpg` | vision: cheese not in recipe; vision: tomatoes not in recipe |
| `sheet-pan-meatball-marinara` | Sheet Pan Meatball Marinara Feed | `/images/hall-expansion/sheet-pan-meatball-marinara.jpg` | vision: wrong dish format — recipe is sheet pan but image shows sandwich |
| `hungarian-goulash-crew` | Hungarian Goulash for the Crew | `/images/hall-expansion/hungarian-goulash-crew.jpg` | vision: pasta instead of potatoes; vision: missing sour cream; vision: missing rye bread |
| `peri-peri-chicken-platter` | Peri Peri Chicken Platter | `/images/hall-expansion/peri-peri-chicken-platter.jpg` | vision: french fries present — not in recipe; vision: missing grilled red bell peppers; vision: missing grilled yellow onion |
| `classic-patty-melt-for-the-crew` | Classic Patty Melt for the Crew | `/images/hall-expansion/classic-patty-melt-for-the-crew.jpg` | vision: French fries present — not in the recipe |
| `greek-chicken-pitas` | Greek Chicken Pitas | `/images/hall-expansion/greek-chicken-pitas.jpg` | vision: potato wedges not in recipe; vision: broccoli not in recipe |
| `mississippi-pot-roast-crew` | Mississippi Pot Roast for the Crew | `/images/hall-expansion/mississippi-pot-roast-crew.jpg` | vision: cheese on top — not in recipe |
| `italian-beef-slow-cooker` | Italian Beef Slow Cooker Sandwiches | `/images/hall-expansion/italian-beef-slow-cooker.jpg` | vision: broccoli and mashed potatoes are not in the recipe |
| `thai-peanut-chicken-crock` | Thai Peanut Chicken Crock | `/images/hall-expansion/thai-peanut-chicken-crock.jpg` | vision: cheese on top — not in recipe |
| `burnt-ends-chili-crew` | Burnt Ends Chili for the Crew | `/images/hall-expansion/burnt-ends-chili-crew.jpg` | vision: cheese not in recipe; vision: green onions not in recipe |
| `dirty-rice-crew-skillet` | Dirty Rice Crew Skillet | `/images/hall-expansion/dirty-rice-crew-skillet.jpg` | vision: melted cheese on top — not in recipe |
| `breakfast-poutine` | Breakfast Poutine | `/images/breakfast/breakfast-poutine.jpg` | vision: bacon present — not in recipe |
| `irish-breakfast-fry-up` | Irish Breakfast Fry-Up | `/images/breakfast/irish-breakfast-fry-up.jpg` | vision: baked beans present — not in recipe |
| `maple-sausage-pinwheels` | Maple Sausage Pinwheels | `/images/breakfast/maple-sausage-pinwheels.jpg` | vision: fried eggs on top — recipe does not include visible eggs; vision: bacon present — not in recipe |
| `migas-for-the-crew` | Migas for the Crew | `/images/breakfast/migas-for-the-crew.jpg` | vision: fries on the side — not in the recipe |
| `sausage-egg-cheese-sandwiches` | Sausage Egg & Cheese Sandwiches | `/images/breakfast/sausage-egg-cheese-sandwiches.jpg` | vision: bacon strips present — not in recipe |
| `sheet-pan-eggs-sausage-crew` | Sheet-Pan Eggs & Sausage | `/images/breakfast/sheet-pan-eggs-sausage-crew.jpg` | vision: whole sausages instead of bulk or casings removed |

## Recipes requiring new images

_Missing or invalid hero file, bytes that conflict with another recipe, or a vision-confirmed wrong dish._

| Slug | Title | Hero | Reasons |
| --- | --- | --- | --- |
| `steak-sandwiches` | Philly-Style Cheesesteaks | `/images/golden-100/steak-sandwiches.jpg` | vision: brioche buns used instead of hoagie rolls |
| `hall-taco-bar` | Taco Bar | `/images/golden-100/hall-taco-bar.jpg` | vision: cheese present — not in recipe |
| `ny-strip-herb-butter` | NY Strip with Herb Butter | `/images/golden-100/ny-strip-herb-butter.jpg` | vision: baby potatoes not in recipe; vision: broccoli not in recipe |
| `bbq-chicken-sliders` | BBQ Chicken Sliders | `/images/golden-100/bbq-chicken-sliders.jpg` | vision: cheese on sliders — not in recipe |
| `flank-chimichurri` | Flank Steak with Chimichurri | `/images/golden-100/flank-chimichurri.jpg` | vision: roasted potatoes not in recipe; vision: greens not in recipe |
| `mac-and-cheese-bake` | Baked Mac and Cheese | `/images/golden-100/mac-and-cheese-bake.jpg` | vision: garlic bread side — not in recipe |
| `turkey-chili` | Turkey Chili | `/images/golden-100/turkey-chili.jpg` | vision: shredded cheese on top — recipe does not include cheese as a main ingredient; vision: sour cream on top — recipe does not include sour cream as a main ingredient; vision: cilantro on top — recipe does not include cilantro as a main ingredient |
| `performance-burrito-bowls` | Chicken Burrito Bowls | `/images/golden-100/performance-burrito-bowls.jpg` | vision: shredded cheese present — not in recipe; vision: tomatoes instead of pico de gallo |
| `sheet-pan-sausage-peppers` | Sausage and Peppers | `/images/golden-100/sheet-pan-sausage-peppers.jpg` | vision: melted cheese not in recipe |
| `pork-carnitas-tacos` | Pork Carnitas Tacos | `/images/golden-100/pork-carnitas-tacos.jpg` | vision: cheese not in recipe; vision: sauce not in recipe |
| `philly-egg-rolls` | Philly Cheesesteak Egg Rolls | `/images/golden-100/philly-egg-rolls.jpg` | vision: missing hoagie rolls; vision: missing marinara sauce; vision: missing yellow onion |
| `sheet-pan-meal-prep` | Chicken Meal Prep Trays | `/images/golden-100/sheet-pan-meal-prep.jpg` | vision: wrong dish format — recipe is meal-prep containers but image shows sheet pan; vision: missing sweet potatoes; vision: missing broccoli |
| `lemon-garlic-chicken-tray` | Lemon Garlic Chicken Tray | `/images/golden-100/lemon-garlic-chicken-tray.jpg` | vision: chicken drumsticks instead of bone-in chicken thighs |
| `cottage-cheese-protein-pasta` | Protein Pasta Bake | `/images/golden-100/cottage-cheese-protein-pasta.jpg` | vision: broccoli side — not in recipe; vision: not baked in a casserole dish |
| `southwest-beef-sweet-potato-skillet` | Southwest Beef & Sweet Potato Skillet | `/images/golden-100/southwest-beef-sweet-potato-skillet.jpg` | vision: cheese on top — not in recipe; vision: parsley garnish — not in recipe |
| `unstuffed-cabbage-roll-skillet` | Unstuffed Cabbage Roll Skillet | `/images/golden-100/unstuffed-cabbage-roll-skillet.jpg` | vision: melted cheese not in recipe |
| `smoked-turkey-breast` | Smoked Turkey Breast for the Crew | `/images/hall-expansion/smoked-turkey-breast.jpg` | vision: chicken wings instead of turkey breast |
| `bbq-meatball-skewers` | BBQ Meatball Skewers | `/images/hall-expansion/bbq-meatball-skewers.jpg` | vision: missing pickled red onions; vision: missing shredded cabbage mix; vision: cheese not in recipe |
| `pasta-bar-night` | Pasta Bar Night | `/images/hall-expansion/pasta-bar-night.jpg` | vision: spaghetti instead of penne pasta; vision: missing visible sauces; vision: missing garlic bread |
| `mediterranean-feast-night` | Mediterranean Feast Night | `/images/hall-expansion/mediterranean-feast-night.jpg` | vision: missing hummus; vision: missing tzatziki; vision: missing pita bread |
| `cast-iron-chicken-fajitas` | Cast Iron Chicken Fajitas | `/images/hall-expansion/cast-iron-chicken-fajitas.jpg` | vision: melted cheese not in recipe |
| `dutch-oven-pot-roast` | Dutch Oven Pot Roast | `/images/hall-expansion/dutch-oven-pot-roast.jpg` | vision: melted cheese on top — not in recipe |
| `green-chile-chicken-stew` | Green Chile Chicken Stew | `/images/hall-expansion/green-chile-chicken-stew.jpg` | vision: cheese not in recipe; vision: tomatoes not in recipe |
| `sheet-pan-meatball-marinara` | Sheet Pan Meatball Marinara Feed | `/images/hall-expansion/sheet-pan-meatball-marinara.jpg` | vision: wrong dish format — recipe is sheet pan but image shows sandwich |
| `hungarian-goulash-crew` | Hungarian Goulash for the Crew | `/images/hall-expansion/hungarian-goulash-crew.jpg` | vision: pasta instead of potatoes; vision: missing sour cream; vision: missing rye bread |
| `peri-peri-chicken-platter` | Peri Peri Chicken Platter | `/images/hall-expansion/peri-peri-chicken-platter.jpg` | vision: french fries present — not in recipe; vision: missing grilled red bell peppers; vision: missing grilled yellow onion |
| `classic-patty-melt-for-the-crew` | Classic Patty Melt for the Crew | `/images/hall-expansion/classic-patty-melt-for-the-crew.jpg` | vision: French fries present — not in the recipe |
| `greek-chicken-pitas` | Greek Chicken Pitas | `/images/hall-expansion/greek-chicken-pitas.jpg` | vision: potato wedges not in recipe; vision: broccoli not in recipe |
| `mississippi-pot-roast-crew` | Mississippi Pot Roast for the Crew | `/images/hall-expansion/mississippi-pot-roast-crew.jpg` | vision: cheese on top — not in recipe |
| `italian-beef-slow-cooker` | Italian Beef Slow Cooker Sandwiches | `/images/hall-expansion/italian-beef-slow-cooker.jpg` | vision: broccoli and mashed potatoes are not in the recipe |
| `thai-peanut-chicken-crock` | Thai Peanut Chicken Crock | `/images/hall-expansion/thai-peanut-chicken-crock.jpg` | vision: cheese on top — not in recipe |
| `burnt-ends-chili-crew` | Burnt Ends Chili for the Crew | `/images/hall-expansion/burnt-ends-chili-crew.jpg` | vision: cheese not in recipe; vision: green onions not in recipe |
| `dirty-rice-crew-skillet` | Dirty Rice Crew Skillet | `/images/hall-expansion/dirty-rice-crew-skillet.jpg` | vision: melted cheese on top — not in recipe |
| `breakfast-poutine` | Breakfast Poutine | `/images/breakfast/breakfast-poutine.jpg` | vision: bacon present — not in recipe |
| `irish-breakfast-fry-up` | Irish Breakfast Fry-Up | `/images/breakfast/irish-breakfast-fry-up.jpg` | vision: baked beans present — not in recipe |
| `maple-sausage-pinwheels` | Maple Sausage Pinwheels | `/images/breakfast/maple-sausage-pinwheels.jpg` | vision: fried eggs on top — recipe does not include visible eggs; vision: bacon present — not in recipe |
| `migas-for-the-crew` | Migas for the Crew | `/images/breakfast/migas-for-the-crew.jpg` | vision: fries on the side — not in the recipe |
| `sausage-egg-cheese-sandwiches` | Sausage Egg & Cheese Sandwiches | `/images/breakfast/sausage-egg-cheese-sandwiches.jpg` | vision: bacon strips present — not in recipe |
| `sheet-pan-eggs-sausage-crew` | Sheet-Pan Eggs & Sausage | `/images/breakfast/sheet-pan-eggs-sausage-crew.jpg` | vision: whole sausages instead of bulk or casings removed |

## Semantic status not verified

- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing corn kernels; missing coleslaw mix; extra green onions; extra sesame seeds
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: format may not match — recipe is skillet, image looks like nachos (loaded tortilla chips); diced tomatoes present — not in recipe; missing black beans — listed in recipe; missing pickled jalapeños — listed in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: beer can missing
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: broccoli and rice not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: Greek salad on the side — not in the recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: gravy not in recipe; parsley not in recipe
- 1 recipe(s): vision inconclusive (PASS) — needs human review: format may not match — recipe is bowl, image looks like hot plated entrée
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: hoagie rolls missing
- 1 recipe(s): vision inconclusive (CRITICAL) — needs human review: format may not match — recipe is casserole, image looks like bowl
- 1 recipe(s): vision inconclusive (PASS) — needs human review: format may not match — recipe is pasta, image looks like casserole
- 3 recipe(s): vision inconclusive (MAJOR) — needs human review: broccoli not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: sour cream and chives on top — not in recipe; bread does not appear to have brie cheese
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: broccoli not in recipe; carrots not in recipe; zucchini not in recipe; rice not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: tzatziki sauce missing
- 5 recipe(s): vision inconclusive (PASS) — needs human review: format may not match — recipe is sheet pan, image looks like hot plated entrée
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: lettuce and tomato not in recipe; missing mayonnaise and mustard
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: cucumber not in recipe; carrot not in recipe; missing sesame seeds
- 1 recipe(s): vision inconclusive (CRITICAL) — needs human review: format may not match — recipe is pasta, image looks like casserole
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: broccoli not in recipe; carrots not in recipe; rice not in recipe
- 4 recipe(s): vision inconclusive (PASS) — needs human review: format may not match — recipe is skillet, image looks like hot plated entrée
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing steamed rice
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: format may not match — recipe is skillet, image looks like hot plated entrée; missing hoagie rolls
- 2 recipe(s): vision inconclusive (CRITICAL) — needs human review: format may not match — recipe is skillet, image looks like bowl
- 1 recipe(s): vision inconclusive (CRITICAL) — needs human review: format may not match — recipe is sheet pan, image looks like hot plated entrée; broccoli and carrots not in recipe; missing green beans
- 1 recipe(s): vision inconclusive (PASS) — needs human review: format may not match — recipe is pasta, image looks like soup
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: Missing shredded cheddar-mozzarella blend
- 1 recipe(s): vision inconclusive (CRITICAL) — needs human review: format may not match — recipe is casserole, image looks like hot plated entrée
- 1 recipe(s): vision inconclusive (CRITICAL) — needs human review: format may not match — recipe is casserole, image looks like pasta
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: Missing cotija cheese; Missing lime wedges; Presence of green garnish not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: spaghetti not in recipe; green beans not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing broccoli
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing cherry tomatoes; missing red onion
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: side salad visible — not in recipe; pita bread visible — not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: rice present — not in recipe; pita missing — recipe includes pita
- 2 recipe(s): vision inconclusive (MAJOR) — needs human review: rice not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: format may not match — recipe is casserole, image looks like hot plated entrée; rice not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: zucchini missing; bone-in chicken thighs expected but not visible
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: side salad present — not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: rice not in recipe; tomatoes not in recipe; missing slaw; missing lime crema
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: flatbread present — not in recipe; missing feta cheese; missing fresh parsley
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: broccoli not in recipe; mushrooms not in recipe; missing spinach; missing feta cheese
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing tomato-cucumber salad
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing black beans
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: green onions not in recipe; sesame seeds not in recipe; missing cherry tomatoes; missing extra crumbled feta
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing pickled vegetables; missing fresh cilantro and mint; missing Thai or serrano chili; sesame seeds not in recipe; green onions not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing black-eyed peas; missing shredded lettuce; missing diced tomato
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing red onion; missing rice
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing visible scrambled egg
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing baby spinach; missing kalamata olives; missing feta cheese
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing corn on the cob
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing grilled crusty bread; missing chimichurri
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing cabbage; missing potatoes; missing rye bread; missing swiss cheese
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing baked beans; missing cornbread
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing tortilla chips; missing baguette
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing spicy brown mustard; missing sauerkraut; missing cheddar cheese sauce
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing gouda cheese; missing cornichons; missing fig jam
- 1 recipe(s): vision inconclusive (CRITICAL) — needs human review: format may not match — recipe is casserole, image looks like nachos (loaded tortilla chips)
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing broccoli florets; missing carrots; missing edamame; missing pickled ginger; missing sesame seeds; missing sriracha mayo; missing soy sauce
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing provolone cheese; missing swiss cheese; missing mayonnaise; missing mustard assortment; missing lettuce and tomato
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: green onions not in recipe; missing black beans; missing corn salsa; missing shredded lettuce
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: soft potato rolls missing
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: steaks not sliced or fanned as per serving step
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing yellow onion; missing carrots
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: format may not match — recipe is skillet, image looks like hot plated entrée; broccoli not in recipe
- 1 recipe(s): vision inconclusive (CRITICAL) — needs human review: format may not match — recipe is skillet, image looks like hot plated entrée
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing bacon; missing mushrooms; missing hard-boiled eggs; presence of red peppers not in recipe; presence of onions not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing broccoli florets; green onions not listed in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: Missing cucumber; Missing cherry tomatoes; Missing kalamata olives; Missing hummus; Missing feta cheese
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: lettuce garnish not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing asparagus; missing yogurt sauce
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: side of peas not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: wrong dish format — recipe is soup but image shows hot plated entrée (format from meal tag, not title — review); missing red bell pepper; missing yellow onion; missing fresh parsley
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: black olives not in recipe; missing polenta
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: potatoes missing — recipe serves over potatoes
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: nori present — not in recipe; missing chicken thighs; missing soft-boiled eggs; missing bean sprouts
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: tofu puffs not in recipe; lime wedge instead of lime juice
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: salad present — recipe specifies tabbouleh
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: side dish of rice and salad not in recipe
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: rice present — not in recipe; missing avocados; missing blue cheese; missing ranch dressing
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing romaine; missing feta; missing tzatziki
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing kimchi; missing eggs; missing sesame seeds
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing hummus; missing feta; missing tzatziki
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: rice present — not in recipe
- 1 recipe(s): vision inconclusive (PASS) — needs human review: wrong dish format — recipe is soup but image shows hot plated entrée (format from meal tag, not title — review)
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing visible egg squares
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: Missing visible eggs
- 1 recipe(s): vision inconclusive (CRITICAL) — needs human review: format may not match — recipe is sheet pan, image looks like hot plated entrée; Missing yellow onion; Missing shredded cheddar
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing white bread
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing italian sausage; missing bacon; missing grated parmesan
- 1 recipe(s): vision inconclusive (MAJOR) — needs human review: missing coleslaw

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

