# Recipe image catalog audit

Generated 2026-09-29T01:34:50.717Z — QA qa3+std1.0, model gpt-4o

Audited **462** live recipes: PASS 81 · P0 3 · P1 203 · P2 134 · P3 41

Priority: P0 materially wrong food · P1 major mismatch or poor image · P2 consistency review · P3 minor cleanup.

## P0 / P1 / P2

| Priority | Recipe | Accuracy | Consistency | Top issues |
| --- | --- | --- | --- | --- |
| P0 | `performance-meals/beef-birria-with-consomme` | CRITICAL | REVIEW | accuracy: cheese on beef — not in recipe; accuracy: rice and vegetables — not in recipe; accuracy: missing corn tortillas |
| P0 | `breakfast/maple-sausage-pinwheels` | CRITICAL | REVIEW | accuracy: fried eggs on top — recipe does not include visible eggs; accuracy: bacon present — not in recipe; consistency: people in the background |
| P0 | `hall-expansion/smoked-turkey-breast` | CRITICAL | REPLACE | accuracy: chicken wings instead of turkey breast; consistency: wrong dish format; consistency: food is not turkey breast |
| P1 | `hall-expansion/applewood-pork-shoulder-steaks` | MAJOR | REVIEW | accuracy: steaks not sliced and fanned as per serving instructions; consistency: person visible in background; consistency: people or hands in frame |
| P1 | `breakfast/bagel-sandwich-line` | CRITICAL | PASS | accuracy: missing visible egg squares; technical: alt text does not match the visible food |
| P1 | `performance-meals/baked-turkey-meatball-marinara` | MAJOR | REVIEW | accuracy: spaghetti not in recipe; accuracy: green beans not in recipe; consistency: people in background |
| P1 | `golden-100/bbq-chicken-bowls` | MAJOR | REVIEW | accuracy: missing coleslaw; accuracy: missing corn; consistency: people in the background |
| P1 | `golden-100/bbq-chicken-sliders` | MAJOR | REVIEW | accuracy: cheese on sliders — not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/bbq-meatball-skewers` | MAJOR | PASS | accuracy: missing pickled red onions; accuracy: missing shredded cabbage mix; accuracy: cheese not in recipe |
| P1 | `golden-100/beef-barley-soup` | MAJOR | REVIEW | accuracy: croutons on top — not in the recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `golden-100/beef-broccoli` | MAJOR | REVIEW | accuracy: missing steamed rice; consistency: people in the background; consistency: people or hands in frame |
| P1 | `golden-100/beer-can-chicken` | MAJOR | PASS | accuracy: beer can not visible |
| P1 | `breakfast/belgian-waffle-platter` | PASS | REPLACE | consistency: people in the background; consistency: text or logo visible; consistency: people or hands in frame |
| P1 | `breakfast/berry-vanilla-protein-overnight-oats` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/breakfast/berry-vanilla-protein-overnight-oats.jpg); technical: thumbnail missing (/images/thumbs/breakfast/berry-vanilla-protein-overnight-oats.jpg); technical: mobile variant missing (/images/mobile/breakfast/berry-vanilla-protein-overnight-oats.jpg) |
| P1 | `breakfast/biscuit-french-toast-sliders` | PASS | REPLACE | consistency: text or logo present; consistency: background includes fire department theme; consistency: text or logo in frame |
| P1 | `hall-expansion/black-bean-cottage-cheese-enchilada-bake` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/black-bean-cottage-cheese-enchilada-bake.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/black-bean-cottage-cheese-enchilada-bake.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/black-bean-cottage-cheese-enchilada-bake.jpg) |
| P1 | `breakfast/black-bean-egg-white-breakfast-burritos` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/breakfast/black-bean-egg-white-breakfast-burritos.jpg); technical: thumbnail missing (/images/thumbs/breakfast/black-bean-egg-white-breakfast-burritos.jpg); technical: mobile variant missing (/images/mobile/breakfast/black-bean-egg-white-breakfast-burritos.jpg) |
| P1 | `hall-expansion/blackened-salmon-sweet-potato-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/blackened-salmon-sweet-potato-bowls.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/blackened-salmon-sweet-potato-bowls.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/blackened-salmon-sweet-potato-bowls.jpg) |
| P1 | `breakfast/breakfast-poutine` | MAJOR | PASS | technical: hero WebP missing; accuracy: bacon present — not in recipe; technical: alt text does not match the visible food |
| P1 | `golden-100/breakfast-sausage-pizza` | MAJOR | PASS | accuracy: missing shredded cheddar-mozzarella blend |
| P1 | `breakfast/breakfast-stromboli-roll` | MAJOR | REPLACE | accuracy: roasted red pepper missing; consistency: text or logo visible; consistency: kitchen setting |
| P1 | `bbq/brisket-style-beef-sandwiches-au-jus` | PASS | REPLACE | consistency: text or logo in background; consistency: text or logo in frame |
| P1 | `hall-expansion/buffalo-chicken-sweet-potato-bowls` | MAJOR | REVIEW | accuracy: rice present — not in recipe; accuracy: missing avocados; accuracy: missing blue cheese |
| P1 | `hall-expansion/burnt-ends-chili-crew` | MAJOR | REVIEW | accuracy: cheese on top — not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/burrito-bowl-bar-night` | MAJOR | REVIEW | accuracy: green onions not in recipe; accuracy: missing black beans; accuracy: missing corn salsa |
| P1 | `performance-meals/cajun-chicken-dirty-rice-bowls` | MAJOR | REVIEW | accuracy: missing shredded lettuce; accuracy: missing diced tomato; accuracy: chicken not sliced |
| P1 | `hall-expansion/cajun-lime-shrimp-black-bean-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/cajun-lime-shrimp-black-bean-bowls.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/cajun-lime-shrimp-black-bean-bowls.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/cajun-lime-shrimp-black-bean-bowls.jpg) |
| P1 | `performance-meals/caprese-chicken-bake` | MAJOR | REVIEW | accuracy: rice as a side dish not in the recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/cast-iron-chicken-fajitas` | MAJOR | REVIEW | accuracy: melted cheese not in recipe; consistency: people in background; consistency: people or hands in frame |
| P1 | `bbq/cast-iron-steak-fajita-sizzlers` | MAJOR | REVIEW | accuracy: missing corn tortillas; accuracy: missing queso fresco; accuracy: missing pickled red onions |
| P1 | `bbq/charred-broccolini-lemon-tray` | MAJOR | REVIEW | accuracy: missing golden raisins; accuracy: missing red pepper flakes; consistency: people in the background |
| P1 | `hall-expansion/chicken-cacciatore-crew` | MAJOR | PASS | accuracy: black olives not in recipe |
| P1 | `golden-100/chicken-dumpling-soup` | MAJOR | REVIEW | accuracy: bone-in, skin-on chicken thighs not visible; consistency: people or hands visible; consistency: people or hands in frame |
| P1 | `hall-expansion/chicken-paprikash-hall` | MAJOR | PASS | accuracy: missing visible red bell pepper; accuracy: missing visible yellow onion; accuracy: missing visible fresh parsley |
| P1 | `hall-expansion/chicken-shawarma-pitas` | MAJOR | REVIEW | accuracy: side dish of rice and salad not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/chickpea-pasta-primavera-white-beans` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/chickpea-pasta-primavera-white-beans.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/chickpea-pasta-primavera-white-beans.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/chickpea-pasta-primavera-white-beans.jpg) |
| P1 | `breakfast/chilaquiles-verde-bake` | PASS | REPLACE | consistency: brightness outlier (+3.6σ vs catalog); consistency: text or logo on mug; consistency: text or logo in frame |
| P1 | `performance-meals/chipotle-lime-chicken-tacos` | MAJOR | REVIEW | accuracy: rice not in recipe; accuracy: missing slaw; accuracy: missing lime crema |
| P1 | `hall-expansion/classic-patty-melt-for-the-crew` | MAJOR | REVIEW | accuracy: French fries present — not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `bbq/competition-bbq-chicken-thighs` | PASS | REPLACE | consistency: text/logos present; consistency: BBQ branding props; consistency: text or logo in frame |
| P1 | `hall-expansion/coq-au-vin-batch` | MAJOR | PASS | accuracy: potatoes missing — recipe serves chicken over potatoes |
| P1 | `performance-meals/cottage-cheese-protein-pasta` | MAJOR | REVIEW | accuracy: broccoli side not in recipe; consistency: people in background; consistency: people or hands in frame |
| P1 | `hall-expansion/cottage-cheese-spinach-stuffed-shells` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/cottage-cheese-spinach-stuffed-shells.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/cottage-cheese-spinach-stuffed-shells.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/cottage-cheese-spinach-stuffed-shells.jpg) |
| P1 | `breakfast/cottage-cheese-veggie-egg-bake` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/breakfast/cottage-cheese-veggie-egg-bake.jpg); technical: thumbnail missing (/images/thumbs/breakfast/cottage-cheese-veggie-egg-bake.jpg); technical: mobile variant missing (/images/mobile/breakfast/cottage-cheese-veggie-egg-bake.jpg) |
| P1 | `hall-expansion/cottage-pie-for-the-crew` | MAJOR | REVIEW | consistency: colour temperature outlier (+3.0σ vs catalog); accuracy: side of peas not in recipe; consistency: side of peas not in recipe |
| P1 | `performance-meals/cuban-beef-picadillo-bowls` | MAJOR | REVIEW | accuracy: black beans missing; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/dirty-rice-crew-skillet` | MAJOR | REVIEW | accuracy: melted cheese on top — not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/dutch-oven-pot-roast` | MAJOR | REVIEW | accuracy: melted cheese on top — not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/egg-roll-in-a-bowl-crew` | MAJOR | REVIEW | accuracy: missing visible eggs; consistency: people in the background; consistency: people or hands in frame |
| P1 | `breakfast/egg-white-black-bean-breakfast-quesadillas` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/breakfast/egg-white-black-bean-breakfast-quesadillas.jpg); technical: thumbnail missing (/images/thumbs/breakfast/egg-white-black-bean-breakfast-quesadillas.jpg); technical: mobile variant missing (/images/mobile/breakfast/egg-white-black-bean-breakfast-quesadillas.jpg) |
| P1 | `golden-100/enchilada-casserole` | CRITICAL | REVIEW | recipe-data: title says "chicken" but the ingredient list has none; accuracy: rolled enchiladas instead of casserole; accuracy: missing ground beef |
| P1 | `hall-expansion/fajita-bar-night` | MAJOR | REVIEW | accuracy: missing sour cream; accuracy: missing guacamole; consistency: people in the background |
| P1 | `breakfast/farmers-breakfast-casserole` | PASS | REPLACE | consistency: text or logo on mug; consistency: text or logo in frame |
| P1 | `golden-100/fast-philly-skillet` | CRITICAL | PASS | accuracy: missing hoagie rolls |
| P1 | `performance-meals/filipino-chicken-adobo` | MAJOR | REVIEW | accuracy: broccoli not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `bbq/firehall-antipasto-pasta-salad` | MAJOR | REVIEW | accuracy: grilled eggplant present — not listed in the recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `breakfast/firehall-breakfast-pizza` | MAJOR | REVIEW | technical: hero WebP missing; accuracy: missing sheet-pan format; accuracy: missing visible country gravy |
| P1 | `bbq/firehall-burnt-ends-platter` | MAJOR | REPLACE | consistency: colour temperature outlier (-2.6σ vs catalog); accuracy: missing dill pickle chips; accuracy: missing white bread |
| P1 | `hall-expansion/firehall-donair-platter` | MAJOR | REVIEW | accuracy: lettuce garnish not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/firehall-greek-chicken-bowls` | MAJOR | REVIEW | accuracy: missing romaine; accuracy: missing feta; accuracy: missing tzatziki |
| P1 | `bbq/firehall-hibachi-mixed-grill-crew` | MAJOR | REVIEW | accuracy: missing fried rice; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/firehall-korean-beef-bowls` | MAJOR | REVIEW | accuracy: missing kimchi; accuracy: missing fried eggs; consistency: people in the background |
| P1 | `hall-expansion/firehall-taco-bowls` | MAJOR | REVIEW | accuracy: missing pico de gallo; accuracy: missing sour cream; accuracy: missing guacamole |
| P1 | `breakfast/firehouse-breakfast-protein-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/breakfast/firehouse-breakfast-protein-bowls.jpg); technical: thumbnail missing (/images/thumbs/breakfast/firehouse-breakfast-protein-bowls.jpg); technical: mobile variant missing (/images/mobile/breakfast/firehouse-breakfast-protein-bowls.jpg) |
| P1 | `hall-expansion/firehouse-chicken-black-bean-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/firehouse-chicken-black-bean-bowls.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/firehouse-chicken-black-bean-bowls.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/firehouse-chicken-black-bean-bowls.jpg) |
| P1 | `hall-expansion/firehouse-dense-bean-salad` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/firehouse-dense-bean-salad.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/firehouse-dense-bean-salad.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/firehouse-dense-bean-salad.jpg) |
| P1 | `hall-expansion/firehouse-diner-burger-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/firehouse-diner-burger-bowls.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/firehouse-diner-burger-bowls.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/firehouse-diner-burger-bowls.jpg) |
| P1 | `hall-expansion/firehouse-lentil-chili` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/firehouse-lentil-chili.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/firehouse-lentil-chili.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/firehouse-lentil-chili.jpg) |
| P1 | `hall-expansion/firehouse-sweet-potato-beef-protein-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/firehouse-sweet-potato-beef-protein-bowls.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/firehouse-sweet-potato-beef-protein-bowls.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/firehouse-sweet-potato-beef-protein-bowls.jpg) |
| P1 | `hall-expansion/firehouse-turkey-white-bean-soup` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/firehouse-turkey-white-bean-soup.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/firehouse-turkey-white-bean-soup.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/firehouse-turkey-white-bean-soup.jpg) |
| P1 | `golden-100/flank-chimichurri` | MAJOR | REVIEW | accuracy: roasted potatoes not in recipe; accuracy: greens not in recipe; consistency: people in background |
| P1 | `golden-100/four-step-chicken-piccata` | MAJOR | REVIEW | accuracy: broccoli not in recipe; consistency: people in background; consistency: people or hands in frame |
| P1 | `hall-expansion/garlic-steak-broccoli-cottage-cheese-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/garlic-steak-broccoli-cottage-cheese-bowls.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/garlic-steak-broccoli-cottage-cheese-bowls.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/garlic-steak-broccoli-cottage-cheese-bowls.jpg) |
| P1 | `golden-100/ginger-salmon-bowls` | MAJOR | PASS | accuracy: cucumber not in recipe; accuracy: carrot not in recipe; accuracy: missing sesame seeds |
| P1 | `hall-expansion/ginger-soy-chicken-rice-bowls` | MAJOR | REVIEW | accuracy: missing broccoli florets; consistency: people in the background; consistency: people or hands in frame |
| P1 | `bbq/gochujang-beef-skewers-crew` | MAJOR | REVIEW | accuracy: missing daikon radish; accuracy: missing shiitake mushrooms; accuracy: missing crushed roasted soybeans |
| P1 | `golden-100/greek-chicken-bowls` | MAJOR | REVIEW | accuracy: tzatziki sauce missing; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/greek-chicken-pitas` | MAJOR | REVIEW | accuracy: potato wedges not in recipe; accuracy: broccoli not in recipe; consistency: people in background |
| P1 | `performance-meals/greek-spiced-beef-burger-bowls-tzatziki-slaw` | MAJOR | REVIEW | accuracy: green onions not in recipe; accuracy: sesame seeds not in recipe; accuracy: missing cherry tomatoes |
| P1 | `hall-expansion/greek-yogurt-white-bean-power-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/greek-yogurt-white-bean-power-bowls.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/greek-yogurt-white-bean-power-bowls.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/greek-yogurt-white-bean-power-bowls.jpg) |
| P1 | `breakfast/green-chile-breakfast-burritos` | PASS | REPLACE | consistency: text or logo visible in the background; consistency: text or logo in frame |
| P1 | `hall-expansion/green-chile-chicken-stew` | MAJOR | REVIEW | accuracy: cheese on top — not in recipe; accuracy: tomatoes on top — not in recipe; consistency: people in the background |
| P1 | `bbq/grilled-peach-burrata-salad` | MAJOR | REVIEW | accuracy: missing prosciutto di parma; accuracy: missing fresh mint; consistency: people in the background |
| P1 | `performance-meals/grilled-shrimp-quinoa-bowls` | MAJOR | REVIEW | accuracy: flatbread not in recipe; consistency: people in background; consistency: people or hands in frame |
| P1 | `golden-100/hall-taco-bar` | MAJOR | PASS | accuracy: cheese present — not in recipe |
| P1 | `golden-100/herb-roasted-thighs` | MAJOR | REVIEW | accuracy: broccoli and carrots not in recipe; accuracy: rice not in recipe; consistency: off-standard angle for this dish type |
| P1 | `bbq/hickory-smoked-chicken-breast` | PASS | REPLACE | consistency: text/logos present; consistency: background includes BBQ theme setting; consistency: text or logo in frame |
| P1 | `hall-expansion/hickory-turkey-legs` | MAJOR | PASS | accuracy: corn on the cob missing |
| P1 | `breakfast/high-protein-breakfast-burrito-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/breakfast/high-protein-breakfast-burrito-bowls.jpg); technical: thumbnail missing (/images/thumbs/breakfast/high-protein-breakfast-burrito-bowls.jpg); technical: mobile variant missing (/images/mobile/breakfast/high-protein-breakfast-burrito-bowls.jpg) |
| P1 | `performance-meals/high-protein-chicken-fried-rice` | MAJOR | REVIEW | accuracy: missing visible scrambled egg; accuracy: missing visible scallions; consistency: people in the background |
| P1 | `hall-expansion/high-protein-chicken-quinoa-meal-prep-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/high-protein-chicken-quinoa-meal-prep-bowls.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/high-protein-chicken-quinoa-meal-prep-bowls.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/high-protein-chicken-quinoa-meal-prep-bowls.jpg) |
| P1 | `bbq/honey-chipotle-chicken-thighs` | PASS | REPLACE | consistency: text/logo visible in background; consistency: dark lighting; consistency: text or logo in frame |
| P1 | `performance-meals/honey-garlic-chicken-rice-bowls` | MAJOR | REVIEW | accuracy: missing broccoli; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/honey-mustard-turkey-meatball-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/honey-mustard-turkey-meatball-bowls.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/honey-mustard-turkey-meatball-bowls.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/honey-mustard-turkey-meatball-bowls.jpg) |
| P1 | `golden-100/honey-soppressata-pizza` | MAJOR | PASS | accuracy: missing hot honey drizzle; accuracy: missing red pepper flakes; accuracy: missing grated parmesan |
| P1 | `pizza-night/honey-soppressata-pizza` | MAJOR | PASS | accuracy: missing hot honey drizzle; accuracy: missing red pepper flakes; accuracy: missing grated parmesan |
| P1 | `bbq/hot-honey-grilled-sausage-peppers` | PASS | REPLACE | consistency: text/logo on bottle; consistency: background includes BBQ equipment; consistency: text or logo in frame |
| P1 | `performance-meals/hummus-chicken-platter` | MAJOR | REVIEW | accuracy: rice present — not in recipe; accuracy: pita missing; consistency: people in background |
| P1 | `hall-expansion/hungarian-goulash-crew` | CRITICAL | REVIEW | accuracy: noodles instead of potatoes; accuracy: missing sour cream; accuracy: missing rye bread |
| P1 | `breakfast/irish-breakfast-fry-up` | MAJOR | REVIEW | accuracy: baked beans present — not in recipe; consistency: people visible; consistency: eye-level angle instead of 45-degree |
| P1 | `hall-expansion/italian-beef-slow-cooker` | MAJOR | REVIEW | accuracy: broccoli and mashed potatoes not in recipe; consistency: people in background; consistency: people or hands in frame |
| P1 | `bbq/jalapeno-cheddar-smoked-sausages` | MAJOR | REPLACE | accuracy: missing bell peppers; accuracy: missing yellow onions; accuracy: missing sub rolls |
| P1 | `hall-expansion/jalapeno-popper-dip` | MAJOR | PASS | accuracy: missing tortilla chips; accuracy: missing baguette |
| P1 | `hall-expansion/korean-bulgogi-grill-night` | MAJOR | REVIEW | accuracy: rice present — not in recipe; accuracy: garlic visible — not in recipe; consistency: people or hands visible |
| P1 | `bbq/lamb-merguez-skewers-crew` | MAJOR | REVIEW | accuracy: naan bread missing; accuracy: pomegranate seeds missing; consistency: people in the background |
| P1 | `performance-meals/lean-turkey-bean-chili` | MAJOR | REVIEW | accuracy: cheese on top — not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/lebanese-chicken-shish-platter` | MAJOR | PASS | consistency: brightness outlier (+3.9σ vs catalog); accuracy: salad present — not in recipe; accuracy: missing tabbouleh |
| P1 | `hall-expansion/leftover-roast-beef-bowls` | MAJOR | REVIEW | accuracy: rice instead of potatoes; consistency: people in the background; consistency: people or hands in frame |
| P1 | `performance-meals/lemon-garlic-chicken-tray` | CRITICAL | REVIEW | accuracy: chicken drumsticks instead of bone-in chicken thighs; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/lemon-herb-cod-roasted-vegetables` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/lemon-herb-cod-roasted-vegetables.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/lemon-herb-cod-roasted-vegetables.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/lemon-herb-cod-roasted-vegetables.jpg) |
| P1 | `golden-100/lemon-herb-salmon` | MAJOR | REVIEW | accuracy: vegetables not in recipe; accuracy: rice not in recipe; consistency: off-standard angle for this dish type |
| P1 | `hall-expansion/loaded-firehouse-sweet-potatoes` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/loaded-firehouse-sweet-potatoes.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/loaded-firehouse-sweet-potatoes.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/loaded-firehouse-sweet-potatoes.jpg) |
| P1 | `golden-100/loaded-nacho-skillet` | MAJOR | REVIEW | accuracy: diced tomatoes present — not in recipe; accuracy: missing black beans; consistency: people in the background |
| P1 | `golden-100/loaded-potato-feed` | CRITICAL | PASS | accuracy: mashed potatoes instead of whole russet potatoes; technical: alt text does not match the visible food |
| P1 | `golden-100/mac-and-cheese-bake` | MAJOR | REVIEW | accuracy: garlic bread side not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/malaysian-laksa-soup` | MAJOR | REVIEW | consistency: colour temperature outlier (+2.5σ vs catalog); accuracy: tofu puffs not in recipe; accuracy: missing visible chicken |
| P1 | `hall-expansion/maple-cured-salmon-plank` | MAJOR | PASS | accuracy: missing asparagus; accuracy: missing Greek yogurt sauce |
| P1 | `golden-100/meatloaf-mashed` | MAJOR | REVIEW | accuracy: gravy not listed in recipe; accuracy: parsley garnish not listed in recipe; consistency: people in the background |
| P1 | `performance-meals/mediterranean-baked-fish-tray` | MAJOR | REVIEW | accuracy: side salad visible — not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/mediterranean-beef-bowls` | MAJOR | REVIEW | accuracy: missing hummus; accuracy: missing feta; accuracy: missing tzatziki |
| P1 | `performance-meals/mediterranean-beef-kofta-bowls` | MAJOR | REVIEW | accuracy: missing tomato-cucumber salad; consistency: people in the background; consistency: people or hands in frame |
| P1 | `hall-expansion/mediterranean-chicken-farro-bowls` | CRITICAL | REVIEW | accuracy: missing cucumber; accuracy: missing cherry tomatoes; accuracy: missing kalamata olives |
| P1 | `performance-meals/mediterranean-chicken-white-bean-skillet` | MAJOR | REVIEW | accuracy: missing feta cheese; accuracy: missing kalamata olives; accuracy: missing spinach |
| P1 | `hall-expansion/mediterranean-feast-night` | CRITICAL | REVIEW | accuracy: cauliflower not in recipe; accuracy: rice not in recipe; accuracy: missing hummus |
| P1 | `hall-expansion/mesquite-chuck-roast` | MAJOR | REVIEW | accuracy: missing soft potato rolls; accuracy: missing pickles; accuracy: missing extra pepper |
| P1 | `hall-expansion/miso-ramen-bar` | MAJOR | REVIEW | accuracy: missing chicken thighs; accuracy: missing soft-boiled eggs; accuracy: nori not in recipe |
| P1 | `hall-expansion/mississippi-pot-roast-crew` | MAJOR | REVIEW | accuracy: cheese on top — not in recipe; consistency: people in background; consistency: people or hands in frame |
| P1 | `hall-expansion/mushroom-swiss-steak-pan` | MAJOR | REVIEW | accuracy: Swiss cheese on top — not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `golden-100/ny-strip-herb-butter` | MAJOR | REVIEW | accuracy: baby potatoes not in recipe; accuracy: broccoli not in recipe; consistency: people in the background |
| P1 | `golden-100/one-pot-chicken-rice` | MAJOR | REVIEW | accuracy: missing peas and carrots; accuracy: missing lemon wedges; consistency: people in the background |
| P1 | `breakfast/overnight-sausage-strata` | PASS | REPLACE | consistency: text or logo visible; consistency: background includes fire truck; consistency: text or logo in frame |
| P1 | `hall-expansion/paneer-tikka-masala-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/paneer-tikka-masala-bowls.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/paneer-tikka-masala-bowls.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/paneer-tikka-masala-bowls.jpg) |
| P1 | `hall-expansion/pasta-bar-night` | CRITICAL | REVIEW | accuracy: spaghetti instead of penne; accuracy: missing visible sauces; accuracy: missing garlic bread |
| P1 | `hall-expansion/pasta-e-fagioli-hall` | MAJOR | REVIEW | accuracy: grated cheese on top — not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `breakfast/peanut-butter-protein-overnight-oats` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/breakfast/peanut-butter-protein-overnight-oats.jpg); technical: thumbnail missing (/images/thumbs/breakfast/peanut-butter-protein-overnight-oats.jpg); technical: mobile variant missing (/images/mobile/breakfast/peanut-butter-protein-overnight-oats.jpg) |
| P1 | `hall-expansion/pellet-smoked-chicken-quarters` | MAJOR | REVIEW | accuracy: missing baked beans; accuracy: missing cornbread; consistency: people in the background |
| P1 | `hall-expansion/pepper-steak-onions` | MAJOR | REVIEW | accuracy: broccoli side — not in recipe; consistency: people in background; consistency: people or hands in frame |
| P1 | `golden-100/performance-burrito-bowls` | MAJOR | PASS | accuracy: shredded cheese present — not in recipe; accuracy: missing corn; accuracy: missing pico de gallo |
| P1 | `hall-expansion/peri-peri-chicken-platter` | MAJOR | PASS | consistency: colour temperature outlier (+4.6σ vs catalog); accuracy: french fries present — not in recipe; accuracy: missing grilled red bell peppers |
| P1 | `performance-meals/peruvian-sheet-pan-chicken-aji-verde` | MAJOR | REVIEW | accuracy: broccoli not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `performance-meals/pesto-tomato-chicken-tray` | MAJOR | REVIEW | accuracy: zucchini missing; accuracy: bone-in chicken thighs expected but boneless shown; consistency: people in the background |
| P1 | `golden-100/philly-cheesesteak-skillet` | MAJOR | PASS | accuracy: missing hoagie rolls |
| P1 | `golden-100/philly-egg-rolls` | CRITICAL | REPLACE | accuracy: egg rolls instead of hoagie rolls; accuracy: missing visible eggs; consistency: wrong dish format |
| P1 | `bbq/pollo-asado-citrus-platter` | MAJOR | REVIEW | accuracy: missing habanero salsa; accuracy: missing corn tortillas; consistency: people in the background |
| P1 | `golden-100/pork-carnitas-tacos` | CRITICAL | REVIEW | recipe-data: title says "pork" but the ingredient list has none; accuracy: cheese on tacos — not in recipe; accuracy: sauce on tacos — not in recipe |
| P1 | `bbq/pork-satay-skewers-crew` | MAJOR | REVIEW | accuracy: missing peanut sauce; accuracy: missing jasmine rice; consistency: people in the background |
| P1 | `breakfast/red-lead-skillet` | MAJOR | PASS | accuracy: missing red onion; accuracy: missing shredded pepper jack |
| P1 | `hall-expansion/red-lentil-paneer-dal` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/red-lentil-paneer-dal.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/red-lentil-paneer-dal.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/red-lentil-paneer-dal.jpg) |
| P1 | `bbq/reverse-seared-ribeye-crew` | PASS | REPLACE | consistency: text or logo visible in background; consistency: text or logo in frame |
| P1 | `hall-expansion/rice-bowl-bar-night` | MAJOR | REVIEW | accuracy: missing broccoli florets; accuracy: missing carrots; accuracy: missing edamame |
| P1 | `performance-meals/salsa-verde-crock-chicken` | MAJOR | PASS | accuracy: rice not in recipe |
| P1 | `hall-expansion/sandwich-board-night` | MAJOR | PASS | accuracy: missing provolone cheese; accuracy: missing Swiss cheese; accuracy: missing mayonnaise |
| P1 | `bbq/santa-maria-tri-tip-roast` | MAJOR | REVIEW | accuracy: grilled bread instead of flour tortillas; consistency: people in the background; consistency: people or hands in frame |
| P1 | `breakfast/sausage-egg-cheese-sandwiches` | MAJOR | REVIEW | accuracy: bacon strips present — not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `golden-100/sausage-peppers-onions` | MAJOR | REVIEW | accuracy: skillet presentation instead of hoagie rolls; consistency: people in the background; consistency: people or hands in frame |
| P1 | `breakfast/savory-cottage-cheese-breakfast-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/breakfast/savory-cottage-cheese-breakfast-bowls.jpg); technical: thumbnail missing (/images/thumbs/breakfast/savory-cottage-cheese-breakfast-bowls.jpg); technical: mobile variant missing (/images/mobile/breakfast/savory-cottage-cheese-breakfast-bowls.jpg) |
| P1 | `hall-expansion/sesame-ginger-tofu-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/sesame-ginger-tofu-bowls.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/sesame-ginger-tofu-bowls.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/sesame-ginger-tofu-bowls.jpg) |
| P1 | `performance-meals/shawarma-chicken-rice-bowls` | MAJOR | PASS | accuracy: missing cherry tomatoes; accuracy: missing red onion |
| P1 | `performance-meals/sheet-pan-chicken-fajitas-lite` | MAJOR | REVIEW | accuracy: shredded cheese not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `breakfast/sheet-pan-eggs-sausage-crew` | CRITICAL | REVIEW | accuracy: whole sausages instead of bulk or casings removed; consistency: people in the background; consistency: people or hands in frame |
| P1 | `breakfast/sheet-pan-full-english` | MAJOR | REVIEW | accuracy: missing white bread for toast; consistency: off-standard angle for sheet pan; consistency: kitchen setting with visible fireplace |
| P1 | `hall-expansion/sheet-pan-lemon-chicken-broccoli-sweet-potatoes` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/sheet-pan-lemon-chicken-broccoli-sweet-potatoes.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/sheet-pan-lemon-chicken-broccoli-sweet-potatoes.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/sheet-pan-lemon-chicken-broccoli-sweet-potatoes.jpg) |
| P1 | `golden-100/sheet-pan-meal-prep` | CRITICAL | REVIEW | accuracy: bell peppers not in recipe; accuracy: onions not in recipe; accuracy: lime not in recipe |
| P1 | `golden-100/sheet-pan-parmesan-dijon-chicken-thigh-dinner` | CRITICAL | REVIEW | technical: hero WebP missing; accuracy: chicken breast instead of bone-in, skin-on chicken thighs; accuracy: broccoli not in recipe |
| P1 | `golden-100/sheet-pan-sausage-peppers` | MAJOR | PASS | accuracy: melted cheese on top — not in the recipe |
| P1 | `golden-100/shepherds-pie` | MAJOR | REVIEW | accuracy: Greek salad on the side — not in the recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `bbq/smoked-baked-beans-crew` | PASS | REPLACE | consistency: colour temperature outlier (-3.1σ vs catalog); consistency: text or logo visible; consistency: dark lighting |
| P1 | `bbq/smoked-bbq-chicken-wings-tray` | PASS | REPLACE | consistency: text or logo visible; consistency: text or logo in frame |
| P1 | `pizza-night/smoked-brisket-bbq-pizza` | MAJOR | PASS | accuracy: missing coleslaw |
| P1 | `bbq/smoked-chicken-quarters-white-sauce` | PASS | REPLACE | consistency: text or logo on sauce bottle; consistency: text or logo in frame |
| P1 | `hall-expansion/smoked-corned-beef` | MAJOR | REVIEW | accuracy: missing cabbage; accuracy: missing potatoes; accuracy: missing rye bread |
| P1 | `bbq/smoked-mac-and-cheese-crew` | PASS | REPLACE | consistency: text or logo visible; consistency: background includes BBQ equipment; consistency: text or logo in frame |
| P1 | `bbq/smoked-picanha-steak-platter` | PASS | REPLACE | consistency: text or logo visible in background; consistency: text or logo in frame |
| P1 | `bbq/smoked-potato-salad-tray` | MINOR | REPLACE | accuracy: mayonnaise not clearly visible; accuracy: yellow mustard not clearly visible; accuracy: apple cider vinegar not clearly visible |
| P1 | `hall-expansion/smoked-tri-tip` | MAJOR | REVIEW | accuracy: missing chimichurri; accuracy: missing grilled crusty bread; consistency: people in the background |
| P1 | `hall-expansion/soft-pretzel-dogs` | MAJOR | PASS | accuracy: missing spicy brown mustard; accuracy: missing sauerkraut; accuracy: missing cheddar cheese sauce |
| P1 | `performance-meals/southwest-beef-sweet-potato-skillet` | MAJOR | REVIEW | accuracy: cheese topping not in recipe; accuracy: parsley garnish not in recipe; consistency: people in the background |
| P1 | `hall-expansion/southwest-black-bean-corn-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/southwest-black-bean-corn-bowls.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/southwest-black-bean-corn-bowls.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/southwest-black-bean-corn-bowls.jpg) |
| P1 | `hall-expansion/southwest-steak-bowls` | MAJOR | REVIEW | accuracy: missing bell peppers; accuracy: missing chipotle crema; accuracy: missing limes |
| P1 | `performance-meals/spanish-chicken-chorizo-rice` | MAJOR | REVIEW | accuracy: side salad present — not in recipe; consistency: people in background; consistency: side salad present — not in recipe |
| P1 | `hall-expansion/spatchcock-lemon-roast-chicken` | MAJOR | REVIEW | accuracy: missing visible carrots; accuracy: missing visible onions; consistency: people in the background |
| P1 | `golden-100/spicy-tomato-bisque-grilled-brie-toast` | CRITICAL | REVIEW | technical: hero WebP missing; accuracy: sour cream and chives on bisque — not in recipe; accuracy: missing brie cheese on toast |
| P1 | `golden-100/steak-sandwiches` | MAJOR | REVIEW | accuracy: brioche buns instead of hoagie rolls; consistency: people in the background; consistency: people or hands in frame |
| P1 | `golden-100/street-corn-chicken` | MAJOR | PASS | accuracy: missing cotija cheese; accuracy: missing lime wedges; accuracy: missing mayonnaise |
| P1 | `golden-100/stuffed-peppers` | CRITICAL | PASS | recipe-data: title says "quinoa" but the ingredient list has none; accuracy: quinoa instead of rice; technical: alt text does not match the visible food |
| P1 | `pizza-night/taco-pizza` | MAJOR | PASS | accuracy: missing sour cream; accuracy: missing pickled jalapeños; accuracy: missing refried beans |
| P1 | `hall-expansion/tempeh-peanut-buddha-bowls` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/hall-expansion/tempeh-peanut-buddha-bowls.jpg); technical: thumbnail missing (/images/thumbs/hall-expansion/tempeh-peanut-buddha-bowls.jpg); technical: mobile variant missing (/images/mobile/hall-expansion/tempeh-peanut-buddha-bowls.jpg) |
| P1 | `golden-100/teriyaki-salmon-grill` | CRITICAL | REVIEW | accuracy: broccoli and rice not in recipe; accuracy: missing cedar plank; consistency: off-standard angle for this dish type |
| P1 | `bbq/texas-central-brisket-crew` | PASS | REPLACE | consistency: colour temperature outlier (-2.7σ vs catalog); consistency: text or logo visible in the background; consistency: text or logo in frame |
| P1 | `hall-expansion/thai-peanut-chicken-crock` | MAJOR | REVIEW | accuracy: melted cheese on chicken — not in recipe; consistency: people in background; consistency: people or hands in frame |
| P1 | `breakfast/turkey-bacon-white-bean-breakfast-hash` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/breakfast/turkey-bacon-white-bean-breakfast-hash.jpg); technical: thumbnail missing (/images/thumbs/breakfast/turkey-bacon-white-bean-breakfast-hash.jpg); technical: mobile variant missing (/images/mobile/breakfast/turkey-bacon-white-bean-breakfast-hash.jpg) |
| P1 | `golden-100/turkey-burgers` | CRITICAL | REVIEW | recipe-data: title says "turkey" but the ingredient list has none; recipe-data: title says "black bean" but the ingredient list has none; accuracy: lettuce and tomato present — not in recipe |
| P1 | `golden-100/turkey-chili` | MAJOR | REVIEW | accuracy: shredded cheese on top — recipe lists it as optional topping; accuracy: sour cream on top — recipe lists it as optional topping; consistency: people in the background |
| P1 | `performance-meals/turkey-quinoa-stuffed-peppers` | MAJOR | REVIEW | accuracy: mashed potatoes and broccoli sides not in recipe; consistency: people in background; consistency: people or hands in frame |
| P1 | `breakfast/turkey-sausage-burritos` | CRITICAL | REPLACE | recipe-data: title says "turkey" but the ingredient list has none; accuracy: wrong dish format — bowl instead of burrito; accuracy: wrong main protein — beef instead of turkey sausage |
| P1 | `breakfast/turkey-sausage-egg-white-sandwiches` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/breakfast/turkey-sausage-egg-white-sandwiches.jpg); technical: thumbnail missing (/images/thumbs/breakfast/turkey-sausage-egg-white-sandwiches.jpg); technical: mobile variant missing (/images/mobile/breakfast/turkey-sausage-egg-white-sandwiches.jpg) |
| P1 | `breakfast/turkey-sausage-spinach-feta-egg-white-scramble` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/breakfast/turkey-sausage-spinach-feta-egg-white-scramble.jpg); technical: thumbnail missing (/images/thumbs/breakfast/turkey-sausage-spinach-feta-egg-white-scramble.jpg); technical: mobile variant missing (/images/mobile/breakfast/turkey-sausage-spinach-feta-egg-white-scramble.jpg) |
| P1 | `breakfast/turkey-sausage-sweet-potato-skillet` | NOT_CHECKED | NOT_CHECKED | technical: hero missing or broken path (/images/breakfast/turkey-sausage-sweet-potato-skillet.jpg); technical: thumbnail missing (/images/thumbs/breakfast/turkey-sausage-sweet-potato-skillet.jpg); technical: mobile variant missing (/images/mobile/breakfast/turkey-sausage-sweet-potato-skillet.jpg) |
| P1 | `performance-meals/turkey-shepherds-sweet-potato` | MAJOR | REVIEW | accuracy: side salad present — not in recipe; consistency: people in background; consistency: side salad present |
| P1 | `hall-expansion/turkey-taco-bowls` | MAJOR | REVIEW | accuracy: missing shredded lettuce; accuracy: missing pico de gallo; accuracy: missing sour cream |
| P1 | `performance-meals/unstuffed-cabbage-roll-skillet` | MAJOR | REVIEW | accuracy: melted cheese on top — not in recipe; consistency: people in the background; consistency: people or hands in frame |
| P1 | `performance-meals/veggie-egg-casserole-tray` | CRITICAL | REVIEW | accuracy: broccoli present — not in recipe; accuracy: mushrooms present — not in recipe; accuracy: missing spinach |
| P1 | `performance-meals/vietnamese-caramel-braised-chicken-bowls` | MAJOR | REVIEW | accuracy: missing pickled vegetables; accuracy: missing fresh herbs; accuracy: missing sliced chili |
| P1 | `hall-expansion/warm-spinach-chicken-salad` | CRITICAL | REVIEW | accuracy: missing bacon; accuracy: missing mushrooms; accuracy: missing hard-boiled eggs |
| P1 | `performance-meals/white-bean-chicken-chili` | MAJOR | PASS | accuracy: cheddar cheese topping not in recipe |
| P1 | `performance-meals/zaatar-roasted-chicken-thighs` | MAJOR | PASS | accuracy: rice not in recipe |
| P2 | `golden-100/30-minute-pasta-e-fagioli-for-the-hall` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `bbq/andouille-po-boy-rolls-crew` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `breakfast/bagel-lox-breakfast-board` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `performance-meals/baked-falafel-hall-bowls` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `breakfast/baked-oatmeal-mixed-berries` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `golden-100/baked-ziti` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `golden-100/bbq-brisket-burnt-ends` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `golden-100/bbq-chicken-mac-and-cheese` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `golden-100/bbq-chicken-pizza` | PASS | PASS | consistency: colour temperature outlier (+2.8σ vs catalog) |
| P2 | `pizza-night/bbq-chicken-pizza` | PASS | PASS | consistency: colour temperature outlier (+2.8σ vs catalog) |
| P2 | `hall-expansion/bbq-pulled-pork-bowls` | MINOR | REVIEW | accuracy: missing crispy onions; accuracy: missing cheddar cheese; consistency: people in the background |
| P2 | `golden-100/beef-dip` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/beef-gyros-for-the-hall` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `golden-100/beef-stroganoff` | MINOR | REVIEW | accuracy: missing visible mushrooms; accuracy: missing visible onions; accuracy: missing visible garlic |
| P2 | `golden-100/big-chili` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `performance-meals/boneless-chicken-thighs-sweet-potato-spinach` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `breakfast/breakfast-enchiladas` | MINOR | REVIEW | accuracy: missing visible cilantro and cotija or feta; consistency: people in the background; consistency: people or hands in frame |
| P2 | `golden-100/buffalo-chicken-dip` | MINOR | REVIEW | accuracy: green garnish not listed in recipe; consistency: people in the background; consistency: people or hands in frame |
| P2 | `pizza-night/buffalo-chicken-pizza` | MINOR | PASS | consistency: colour temperature outlier (+3.3σ vs catalog); accuracy: missing ranch dressing drizzle; accuracy: missing green onions |
| P2 | `hall-expansion/buffalo-chicken-wraps` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `golden-100/bulgogi-bowls` | MINOR | REVIEW | accuracy: green onions not listed in recipe; consistency: people in the background; consistency: people or hands in frame |
| P2 | `golden-100/butter-chicken` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `performance-meals/cajun-chicken-rice-bowl` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/cajun-chicken-rice-skillet` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `bbq/cajun-grilled-cod-crew` | MINOR | REVIEW | accuracy: missing lemon wedges; consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/cajun-shrimp-rice-bowls` | MINOR | REVIEW | accuracy: green onions visible — not listed in recipe; consistency: people in the background; consistency: people or hands in frame |
| P2 | `bbq/caprese-steak-skewers-crew` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `hall-expansion/cheesy-chicken-broccoli-rice` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `golden-100/chicken-alfredo-bake` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `breakfast/chicken-and-waffles-crew` | PASS | PASS | consistency: brightness outlier (+3.3σ vs catalog) |
| P2 | `golden-100/chicken-caesar` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `golden-100/chicken-parm` | MINOR | REVIEW | accuracy: parsley garnish instead of basil; consistency: people in the background; consistency: people or hands in frame |
| P2 | `golden-100/chicken-quesadillas` | MINOR | REVIEW | accuracy: missing red bell peppers; accuracy: missing yellow onions; accuracy: missing sour cream |
| P2 | `hall-expansion/chicken-thigh-stretch-dinner` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `golden-100/chicken-tikka-masala` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `bbq/chili-lime-grilled-tilapia` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `golden-100/chili-mac` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/chipotle-chicken-burrito-bowls` | MINOR | REVIEW | accuracy: missing guacamole; accuracy: missing sour cream; accuracy: missing onions |
| P2 | `hall-expansion/costco-rotisserie-remix` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/creamy-chicken-penne-alfredo` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `breakfast/crew-french-toast-bake` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `golden-100/crispy-chicken-cutlets` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `performance-meals/crock-barbacoa-chicken` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `breakfast/denver-breakfast-casserole` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `breakfast/eggs-benedict-hall-style` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/firehall-gyro-bowls` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `bbq/firehall-street-elote-cups` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `golden-100/five-ingredient-pasta` | MINOR | REVIEW | accuracy: parmesan cheese not visible; consistency: people in the background; consistency: people or hands in frame |
| P2 | `bbq/flat-top-philly-cheesesteaks-crew` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `golden-100/french-onion-soup-for-the-hall` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `performance-meals/general-tsos-baked-chicken` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `breakfast/german-potato-breakfast-skillet` | PASS | REVIEW | consistency: background includes a kitchen setting with visible objects |
| P2 | `performance-meals/greek-beef-keftedes-lemon-orzo-tzatziki` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `performance-meals/greek-lemon-chicken-potatoes` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `bbq/griddle-smash-sausage-peppers` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `bbq/grilled-chicken-pesto-panini-crew` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `bbq/grilled-cod-lemon-packets` | PASS | REVIEW | consistency: people or hands visible; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `golden-100/grilled-corn-cotija` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/grilled-flank-fajita-bar` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `bbq/grilled-reuben-sandwiches-crew` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `hall-expansion/hall-burger-bar` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/hall-chicken-noodle-soup` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `breakfast/hash-brown-breakfast-casserole` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `performance-meals/herb-baked-salmon-tray` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `performance-meals/herb-marinated-flank-steak-chimichurri-farro` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `performance-meals/honey-lime-chicken-tray` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/honey-mustard-oven-chicken-thighs` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `bbq/honey-sriracha-shrimp-skewers` | MINOR | REVIEW | accuracy: missing visible fried shallots; consistency: people in the background; consistency: people or hands in frame |
| P2 | `performance-meals/italian-sausage-veg-sheet-pan` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `golden-100/jerk-chicken` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `breakfast/johnnycakes-with-syrup` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/kielbasa-cabbage-potato-skillet` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/korean-turkey-rice-bowls` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `performance-meals/kung-pao-chicken-rice-bowls` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/lamb-kofta-skewer-platter` | PASS | PASS | consistency: brightness outlier (+3.0σ vs catalog) |
| P2 | `performance-meals/lean-beef-broccoli-rice` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `performance-meals/lemon-chicken-orzo-soup` | MINOR | REVIEW | accuracy: lemon slices visible instead of zest; consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/loaded-baked-potato-soup-crock` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `bbq/loaded-ranch-potato-salad-crew` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `bbq/maple-bourbon-grilled-trout` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `golden-100/meatball-hoagies` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `golden-100/mediterranean-chickpea` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `golden-100/memphis-dry-rub-ribs` | PASS | REVIEW | consistency: off-standard angle for this dish type; technical: alt text does not match the visible food |
| P2 | `bbq/mixed-lamb-chop-grill-board` | MINOR | REVIEW | accuracy: missing pita breads; accuracy: missing za'atar; accuracy: missing sumac |
| P2 | `hall-expansion/molasses-bourbon-pork-ribs` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `bbq/mongolian-beef-flat-top-crew` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `performance-meals/moroccan-chicken-chickpea-tray` | PASS | REVIEW | consistency: off-brand colour grading; technical: alt text does not match the visible food |
| P2 | `performance-meals/one-pot-beef-orzo-skillet-spinach-feta` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `breakfast/overnight-french-toast-bake` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `breakfast/overnight-oat-bar-crew` | MINOR | REVIEW | accuracy: missing sliced bananas; accuracy: missing cinnamon; consistency: people in the background |
| P2 | `hall-expansion/paprika-roasted-chicken-quarters` | MINOR | REVIEW | accuracy: missing lemon wedges; consistency: people in the background; consistency: people or hands in frame |
| P2 | `golden-100/parm-hero-subs` | PASS | REVIEW | consistency: off-standard angle for this dish type; technical: alt text does not match the visible food |
| P2 | `golden-100/pasta-e-ceci-for-the-hall` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/peanut-chicken-rice-bowls` | MINOR | REVIEW | accuracy: green onions and sesame seeds not listed in recipe; consistency: people in the background; consistency: people or hands in frame |
| P2 | `golden-100/pepperoni-pizza-night` | PASS | PASS | consistency: colour temperature outlier (+2.6σ vs catalog) |
| P2 | `pizza-night/pepperoni-pizza-night` | PASS | PASS | consistency: colour temperature outlier (+2.6σ vs catalog) |
| P2 | `hall-expansion/pork-belly-burnt-ends` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `bbq/portuguese-linguica-grill-platter` | MINOR | REVIEW | accuracy: piri-piri sauce not visible; accuracy: whole-grain mustard not visible; accuracy: fresh parsley not visible |
| P2 | `bbq/pressed-cuban-sandwiches-crew` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `hall-expansion/salmon-rice-bowls-crew` | MINOR | REVIEW | accuracy: green onions not listed in recipe; consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/salsa-verde-chicken-crock` | MINOR | REVIEW | accuracy: cheese on chicken — not in recipe; consistency: people in background; consistency: people or hands in frame |
| P2 | `golden-100/sausage-egg-bake` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/sausage-gnocchi-skillet` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/sausage-peppers-on-buns` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `breakfast/scrapple-and-eggs-skillet` | MINOR | REVIEW | accuracy: toast not cut into triangles; consistency: people in the background; consistency: people or hands in frame |
| P2 | `breakfast/sheet-pan-breakfast-hash` | MINOR | REVIEW | accuracy: yellow onion not visible; accuracy: shredded cheddar not visible; consistency: off-standard angle for sheet pan dish |
| P2 | `performance-meals/sheet-pan-chimichurri-chicken-charred-vegetables` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `pizza-night/sicilian-sheet-pizza` | PASS | PASS | consistency: colour temperature outlier (+2.5σ vs catalog) |
| P2 | `golden-100/smash-burgers` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/smoked-meatloaf` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/smoked-queso-fundido` | PASS | REVIEW | consistency: missing tortilla chips and flour tortillas |
| P2 | `golden-100/smoked-wings-white-sauce` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/smoker-nachos-crew` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `performance-meals/smoky-lentil-kale-soup` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `golden-100/spaghetti-aglio-e-olio-for-the-hall` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/spanish-rice-chicken-one-pot` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `bbq/spiedie-chicken-platter-crew` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/station-cobb-salad` | MINOR | REVIEW | accuracy: missing avocado; consistency: people in the background; consistency: people or hands in frame |
| P2 | `bbq/tandoori-lamb-chop-platter` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `breakfast/tater-tot-breakfast-casserole` | PASS | PASS | consistency: brightness outlier (+2.8σ vs catalog) |
| P2 | `hall-expansion/teriyaki-chicken-rice-bowls` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `golden-100/teriyaki-donburi` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `performance-meals/thai-basil-ground-beef-skillet` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `golden-100/tomato-soup-grilled-cheese-croutons` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame; technical: alt text does not match the visible food |
| P2 | `hall-expansion/tonkotsu-ramen-crew` | PASS | REVIEW | consistency: people or hands visible; consistency: people or hands in frame |
| P2 | `hall-expansion/tourtiere-for-the-crew` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `performance-meals/trinidadian-curry-chicken-potatoes` | PASS | REVIEW | consistency: people or hands in the background; consistency: people or hands in frame |
| P2 | `golden-100/turkey-meatball-zoodles` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `performance-meals/turkey-sweet-potato-chili` | MINOR | REVIEW | accuracy: unlisted garnish on top; consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/weeknight-bbq-ribs-crew` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `performance-meals/white-bean-kale-soup` | PASS | REVIEW | consistency: people in the background; consistency: people or hands in frame |
| P2 | `hall-expansion/white-chicken-chili-crock` | MINOR | REVIEW | accuracy: cilantro garnish not listed in recipe; consistency: people in background; consistency: people or hands in frame |
| P2 | `hall-expansion/wonton-noodle-soup-crew` | PASS | PASS | consistency: brightness outlier (+4.2σ vs catalog) |
| P2 | `bbq/yakiniku-grill-platter-crew` | MINOR | REVIEW | accuracy: missing visible tare glaze; accuracy: missing visible yuzu kosho; accuracy: missing visible sesame seeds |
