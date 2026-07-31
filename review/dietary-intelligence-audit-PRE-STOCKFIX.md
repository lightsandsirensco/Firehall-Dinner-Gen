# Food Safety & Dietary Intelligence Audit

Generated: 2026-07-30T16:02:35.956Z

## Summary

Before this sprint, the Firehall Meals catalog had **zero** dietary/allergen tags anywhere — no gluten-free, dairy-free, vegetarian, vegan, or allergen data existed for any of the 432 published recipes. This sprint built a canonical ingredient allergen database (`shared/dietary/ingredient-database.ts`, ~230 ingredient profiles grounded in a frequency audit of every ingredient string actually used in the catalog) and a conservative classification engine (`shared/dietary/classify-recipe.ts`) that classifies every recipe from its actual ingredient list — never from its title.

**Governing rule:** if any ingredient in a recipe cannot be confidently matched to a known dietary profile, the recipe's classification confidence drops to **Low** and it is excluded from every strict filter (Gluten-Free, Vegan, etc.) regardless of what its other ingredients look like. A recipe only ever appears under a strict dietary filter when confidence is **High** — meaning every one of its ingredients resolved to a known, verified profile.

- **Total recipes classified:** 432
- **High confidence (fully verified):** 432 (100%)
- **Low confidence (contains an unverified ingredient — excluded from all strict filters):** 0 (0%)

Every recipe in the current catalog resolved to 100% high confidence after the ingredient database was expanded to cover every distinct ingredient string in use (see `scripts/dietary-classify-catalog.ts`). Any *future* recipe added with an ingredient not yet in the database will correctly default to Low confidence and be held out of strict filters until reviewed — this is expected, intentional behavior, not a bug.

## Per-filter counts

| Filter | Qualifies | Excluded | Coverage |
|---|---|---|---|
| glutenFree | 122 | 310 | 28.2% |
| dairyFree | 154 | 278 | 35.6% |
| eggFree | 307 | 125 | 71.1% |
| nutFree | 421 | 11 | 97.5% |
| peanutFree | 423 | 9 | 97.9% |
| soyFree | 388 | 44 | 89.8% |
| shellfishFree | 418 | 14 | 96.8% |
| fishFree | 384 | 48 | 88.9% |
| porkFree | 314 | 118 | 72.7% |
| vegetarian | 50 | 382 | 11.6% |
| vegan | 6 | 426 | 1.4% |

Low counts for `glutenFree`, `dairyFree`, `vegetarian`, and `vegan` are expected and correct — this is a firefighter comfort-food catalog built around wheat pasta/bread/tortillas, dairy, and meat. The system is not under-tagging; it accurately reflects what's actually in these recipes.

## Recipes with uncertain ingredients (0)

None. Every ingredient string in the current catalog resolved to a known dietary profile.

## Recipes with a "-Free Adaptable" substitution available (357)

These recipes do NOT qualify for the strict filter as written, but a known, single-ingredient substitution would clear them — e.g. swapping soy sauce for tamari to remove gluten. The UI surfaces these as informational "Adaptable" badges on the recipe page; they never appear when a strict filter is active.

- **30-Minute Pasta e Fagioli for the Hall** (`golden-100/30-minute-pasta-e-fagioli-for-the-hall`)
  - Gluten-Free Adaptable: Use a certified gluten-free pasta. Use a certified gluten-free broth or bouillon. Use a certified gluten-free bun/bread and toast on a separate, clean surface.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **Baked Ziti** (`golden-100/baked-ziti`)
  - Gluten-Free Adaptable: Use a certified gluten-free pasta/noodle alternative.
- **Batch Lasagna** (`golden-100/batch-lasagna`)
  - Gluten-Free Adaptable: Use a certified gluten-free pasta/noodle alternative.
  - Pork-Free Adaptable: Swap in chicken or turkey sausage.
- **BBQ Burnt Ends** (`golden-100/bbq-brisket-burnt-ends`)
  - Dairy-Free Adaptable: Use a plant-based butter/margarine.
- **BBQ Chicken Bowls** (`golden-100/bbq-chicken-bowls`)
  - Gluten-Free Adaptable: Use a certified gluten-free rub or build your own from confirmed gluten-free spices.
- **BBQ Chicken Mac and Cheese** (`golden-100/bbq-chicken-mac-and-cheese`)
  - Gluten-Free Adaptable: Use a certified gluten-free pasta. Use a 1:1 gluten-free all-purpose flour blend.
  - Dairy-Free Adaptable: Use a plant-based butter/margarine. Use oat, almond, or soy milk (check tree-nut/soy status of the substitute). Use a dairy-free cheese shred/block alternative.
- **BBQ Chicken Pizza** (`golden-100/bbq-chicken-pizza`)
  - Gluten-Free Adaptable: Use a certified gluten-free pizza crust.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **BBQ Chicken Sliders** (`golden-100/bbq-chicken-sliders`)
  - Gluten-Free Adaptable: Use a certified gluten-free bread/crust/wrapper alternative. Use a certified gluten-free broth or bouillon.
  - Dairy-Free Adaptable: Use a plant-based butter/margarine.
  - Egg-Free Adaptable: Use an egg-free/vegan mayonnaise.
- **Beef Barley Soup** (`golden-100/beef-barley-soup`)
  - Gluten-Free Adaptable: Use a certified gluten-free broth or bouillon. Substitute rice or a gluten-free grain.
- **Beef and Broccoli** (`golden-100/beef-broccoli`)
  - Gluten-Free Adaptable: Use tamari (check soy-free brands separately) or coconut aminos. Use a certified gluten-free or vegetarian 'oyster' sauce alternative.
  - Soy-Free Adaptable: Use coconut aminos.
- **Beef Dip Sandwiches** (`golden-100/beef-dip`)
  - Gluten-Free Adaptable: Use a certified gluten-free broth or bouillon. Use a certified gluten-free Worcestershire sauce. Use tamari (check soy-free brands separately) or coconut aminos. Use a certified gluten-free bun/bread and toast on a separate, clean surface. Use a certified gluten-free frozen fry/tot brand, or fresh-cut potatoes.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative. Use a plant-based butter/margarine.
  - Egg-Free Adaptable: Use an egg-free/vegan mayonnaise.
  - Soy-Free Adaptable: Use coconut aminos.
- **Beef Stroganoff** (`golden-100/beef-stroganoff`)
  - Gluten-Free Adaptable: Use a certified gluten-free pasta or rice noodles. Use a 1:1 gluten-free all-purpose flour blend. Use a certified gluten-free broth or bouillon. Use a certified gluten-free Worcestershire sauce.
  - Egg-Free Adaptable: Use an egg-free wheat or rice noodle.
- **Beer Can Chicken** (`golden-100/beer-can-chicken`)
  - Gluten-Free Adaptable: Use a certified gluten-free beer or non-alcoholic broth instead. Make your own blend from individually confirmed gluten-free spices, or use a certified gluten-free seasoning packet.
  - Alcohol-Free Adaptable: Substitute non-alcoholic beer or broth.
- **Firehall Chili** (`golden-100/big-chili`)
  - Gluten-Free Adaptable: Use a certified gluten-free beer or brewed coffee instead. Use a certified gluten-free broth or bouillon. Use tamari (check soy-free brands separately) or coconut aminos. Use a certified gluten-free Worcestershire sauce. Use a certified gluten-free bread/crust/wrapper alternative.
  - Soy-Free Adaptable: Use coconut aminos.
  - Alcohol-Free Adaptable: Substitute brewed coffee or broth.
- **Breakfast Burrito Bar** (`golden-100/breakfast-burrito-bar`)
  - Gluten-Free Adaptable: Use certified gluten-free tortillas or corn tortillas.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
  - Pork-Free Adaptable: Swap in chicken or turkey sausage.
- **Breakfast Sausage Gravy Pizza** (`golden-100/breakfast-sausage-pizza`)
  - Gluten-Free Adaptable: Use a certified gluten-free pizza crust. Use a 1:1 gluten-free all-purpose flour blend. Thicken with cornstarch or a gluten-free flour blend instead of a wheat roux.
  - Pork-Free Adaptable: Swap in chicken or turkey sausage.
- **Bulgogi Bowls** (`golden-100/bulgogi-bowls`)
  - Gluten-Free Adaptable: Use tamari (check soy-free brands separately) or coconut aminos.
  - Soy-Free Adaptable: Use coconut aminos.
- **Cedar Plank Salmon** (`golden-100/cedar-plank-salmon`)
  - Gluten-Free Adaptable: Use tamari (check soy-free brands separately) or coconut aminos.
  - Soy-Free Adaptable: Use coconut aminos.
- **Chicken Alfredo Bake** (`golden-100/chicken-alfredo-bake`)
  - Gluten-Free Adaptable: Use a certified gluten-free pasta/noodle alternative.
- **Chicken Caesar Salad** (`golden-100/chicken-caesar`)
  - Gluten-Free Adaptable: Use a certified gluten-free bun/bread and toast on a separate, clean surface. Use a certified gluten-free bread/crust/wrapper alternative. Use a certified gluten-free frozen fry/tot brand, or fresh-cut potatoes.
- **Chicken and Dumplings** (`golden-100/chicken-dumpling-soup`)
  - Gluten-Free Adaptable: Use a 1:1 gluten-free all-purpose flour blend. Use a certified gluten-free broth or bouillon.
  - Dairy-Free Adaptable: Use a plant-based butter/margarine. Use oat, almond, or soy milk (check tree-nut/soy status of the substitute).
- **Chicken Parmesan** (`golden-100/chicken-parm`)
  - Gluten-Free Adaptable: Use a 1:1 gluten-free all-purpose flour blend. Use certified gluten-free panko/breadcrumbs, or crushed gluten-free crackers. Use a certified gluten-free pasta.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **Chicken Pot Pie** (`golden-100/chicken-pot-pie`)
  - Gluten-Free Adaptable: Use a certified gluten-free broth or bouillon. Use a certified gluten-free bread/crust/wrapper alternative.
  - Dairy-Free Adaptable: Use a plant-based butter/margarine.
- **Chicken Quesadillas** (`golden-100/chicken-quesadillas`)
  - Gluten-Free Adaptable: Use certified gluten-free tortillas or corn tortillas.
- **Chicken Souvlaki** (`golden-100/chicken-souvlaki`)
  - Gluten-Free Adaptable: Use a certified gluten-free bun/bread and toast on a separate, clean surface.
- **Chicken Tortilla Soup for the Hall** (`golden-100/chicken-tortilla-soup-for-the-hall`)
  - Gluten-Free Adaptable: Make your own blend from individually confirmed gluten-free spices, or use a certified gluten-free seasoning packet. Use a certified gluten-free broth or bouillon.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **Chili Mac Skillet** (`golden-100/chili-mac`)
  - Gluten-Free Adaptable: Use a certified gluten-free pasta. Use a certified gluten-free broth or bouillon.
- **Chorizo Breakfast Tacos** (`golden-100/chorizo-breakfast-tacos`)
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
  - Pork-Free Adaptable: Swap in chicken or turkey sausage.
- **Crispy Chicken Cutlets Marinara** (`golden-100/crispy-chicken-cutlets`)
  - Gluten-Free Adaptable: Use a 1:1 gluten-free all-purpose flour blend. Use certified gluten-free panko/breadcrumbs, or crushed gluten-free crackers.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **Detroit-Style Pepperoni Pizza** (`golden-100/detroit-style-pizza`)
  - Gluten-Free Adaptable: Use a 1:1 gluten-free all-purpose flour blend.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative. Use a plant-based butter/margarine.
- **Chicken Enchilada Casserole** (`golden-100/enchilada-casserole`)
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **Quick Philly Skillet** (`golden-100/fast-philly-skillet`)
  - Gluten-Free Adaptable: Use a certified gluten-free bun/bread and toast on a separate, clean surface.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **Garlic Butter Pasta** (`golden-100/five-ingredient-pasta`)
  - Gluten-Free Adaptable: Use a certified gluten-free pasta.
  - Dairy-Free Adaptable: Use a plant-based butter/margarine. Use a dairy-free cheese shred/block alternative.
- **Four-Step Chicken Piccata** (`golden-100/four-step-chicken-piccata`)
  - Gluten-Free Adaptable: Use a 1:1 gluten-free all-purpose flour blend. Use a certified gluten-free broth or bouillon.
  - Dairy-Free Adaptable: Use a plant-based butter/margarine.
  - Alcohol-Free Adaptable: Substitute broth plus a splash of vinegar for the acidity.
- **French Onion Soup for the Hall** (`golden-100/french-onion-soup-for-the-hall`)
  - Gluten-Free Adaptable: Use a certified gluten-free broth or bouillon. Use a certified gluten-free bun/bread and toast on a separate, clean surface.
  - Alcohol-Free Adaptable: Substitute broth plus a splash of vinegar for the acidity.
- **French Toast Casserole** (`golden-100/french-toast-casserole`)
  - Gluten-Free Adaptable: Use a certified gluten-free bun/bread and toast on a separate, clean surface.
- **Game Day Nachos** (`golden-100/game-day-nachos`)
  - Gluten-Free Adaptable: Make your own blend from individually confirmed gluten-free spices, or use a certified gluten-free seasoning packet.
- **Garlic Butter Shrimp** (`golden-100/garlic-butter-shrimp`)
  - Dairy-Free Adaptable: Use a plant-based butter/margarine.
  - Alcohol-Free Adaptable: Substitute broth plus a splash of vinegar for the acidity.
- **Ginger Salmon Rice Bowls** (`golden-100/ginger-salmon-bowls`)
  - Gluten-Free Adaptable: Use tamari (check soy-free brands separately) or coconut aminos.
  - Soy-Free Adaptable: Use coconut aminos.
- **Greek Chicken Bowls** (`golden-100/greek-chicken-bowls`)
  - Gluten-Free Adaptable: Make your own blend from individually confirmed gluten-free spices, or use a certified gluten-free seasoning packet.
- **Street Corn with Cotija** (`golden-100/grilled-corn-cotija`)
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
  - Egg-Free Adaptable: Use an egg-free/vegan mayonnaise.
- **Grilled Pork Chops** (`golden-100/grilled-pork-chops`)
  - Gluten-Free Adaptable: Use tamari (check soy-free brands separately) or coconut aminos.
  - Soy-Free Adaptable: Use coconut aminos.
- **Honey Garlic Pork Tenderloin** (`golden-100/honey-garlic-pork-tenderloin`)
  - Gluten-Free Adaptable: Use tamari (check soy-free brands separately) or coconut aminos.
  - Soy-Free Adaptable: Use coconut aminos.
- **Hot Honey Soppressata Pizza** (`golden-100/honey-soppressata-pizza`)
  - Gluten-Free Adaptable: Use a certified gluten-free pizza crust.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **Jambalaya** (`golden-100/jambalaya`)
  - Gluten-Free Adaptable: Use a certified gluten-free broth or bouillon. Make your own blend from individually confirmed gluten-free spices, or use a certified gluten-free seasoning packet.
  - Pork-Free Adaptable: Swap in chicken or turkey sausage.
- **Jerk Chicken & Rice and Peas** (`golden-100/jerk-chicken`)
  - Gluten-Free Adaptable: Use tamari (check soy-free brands separately) or coconut aminos. Use a certified gluten-free broth or bouillon.
  - Soy-Free Adaptable: Use coconut aminos.
- **Nacho Skillet** (`golden-100/loaded-nacho-skillet`)
  - Gluten-Free Adaptable: Make your own blend from individually confirmed gluten-free spices, or use a certified gluten-free seasoning packet.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **Baked Mac and Cheese** (`golden-100/mac-and-cheese-bake`)
  - Gluten-Free Adaptable: Use a certified gluten-free pasta. Use a 1:1 gluten-free all-purpose flour blend. Use certified gluten-free panko/breadcrumbs, or crushed gluten-free crackers.
  - Dairy-Free Adaptable: Use a plant-based butter/margarine. Use oat, almond, or soy milk (check tree-nut/soy status of the substitute). Use a dairy-free cheese shred/block alternative.
- **Margherita Pizza** (`golden-100/margherita-pizza`)
  - Gluten-Free Adaptable: Use a 1:1 gluten-free all-purpose flour blend.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **Meat Lover's Pizza** (`golden-100/meat-lovers-sheet-pizza`)
  - Gluten-Free Adaptable: Use a certified gluten-free pizza crust.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **Meatball Hoagies** (`golden-100/meatball-hoagies`)
  - Gluten-Free Adaptable: Use a certified gluten-free bun/bread and toast on a separate, clean surface.
  - Dairy-Free Adaptable: Use oat, almond, or soy milk (check tree-nut/soy status of the substitute). Use a dairy-free cheese shred/block alternative. Use a plant-based butter/margarine.
  - Pork-Free Adaptable: Swap in chicken or turkey sausage.
- **Meatloaf and Mashed Potatoes** (`golden-100/meatloaf-mashed`)
  - Gluten-Free Adaptable: Use certified gluten-free panko/breadcrumbs, or crushed gluten-free crackers.
  - Dairy-Free Adaptable: Use a plant-based butter/margarine.
- **Mediterranean Chickpea Bowls** (`golden-100/mediterranean-chickpea`)
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **Moroccan Lamb Meatballs** (`golden-100/moroccan-meatballs`)
  - Gluten-Free Adaptable: Use a certified gluten-free pasta/noodle alternative.
- **NY Strip with Herb Butter** (`golden-100/ny-strip-herb-butter`)
  - Dairy-Free Adaptable: Use a plant-based butter/margarine.
- **Chicken and Rice** (`golden-100/one-pot-chicken-rice`)
  - Gluten-Free Adaptable: Use a certified gluten-free broth or bouillon.
  - Dairy-Free Adaptable: Use a plant-based butter/margarine.
- **Pancake Short Stack** (`golden-100/pancake-short-stack`)
  - Gluten-Free Adaptable: Use a 1:1 gluten-free all-purpose flour blend.
  - Dairy-Free Adaptable: Use oat, almond, or soy milk (check tree-nut/soy status of the substitute).
- **Parm Hero Subs** (`golden-100/parm-hero-subs`)
  - Gluten-Free Adaptable: Use a 1:1 gluten-free all-purpose flour blend. Use certified gluten-free panko/breadcrumbs, or crushed gluten-free crackers. Use a certified gluten-free bun/bread and toast on a separate, clean surface.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **Pasta e Ceci (Pasta with Chickpeas)** (`golden-100/pasta-e-ceci-for-the-hall`)
  - Gluten-Free Adaptable: Use a certified gluten-free pasta. Use a certified gluten-free broth or bouillon.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- **Pepperoni Pizza** (`golden-100/pepperoni-pizza-night`)
  - Gluten-Free Adaptable: Use a 1:1 gluten-free all-purpose flour blend.
  - Dairy-Free Adaptable: Use a dairy-free cheese shred/block alternative.
- …and 297 more (see `review/dietary-intelligence-audit.json` for the full list).

## Most common hidden-allergen ingredients across the catalog

| Allergen | Ingredient | Recipes |
|---|---|---|
| egg | large eggs | 80 |
| dairy | unsalted butter | 59 |
| gluten | chicken broth | 44 |
| dairy | whole milk | 33 |
| gluten | soy sauce | 29 |
| soy | soy sauce | 29 |
| gluten | beef broth | 28 |
| dairy | sour cream | 28 |
| gluten | all-purpose flour | 26 |
| dairy | grated parmesan | 25 |
| dairy | shredded cheddar | 22 |
| dairy | butter | 22 |
| gluten | pizza dough balls (15 oz) | 21 |
| dairy | low-moisture mozzarella, shredded | 20 |
| egg | mayonnaise | 20 |
| gluten | worcestershire sauce | 19 |
| fish | worcestershire sauce | 19 |
| dairy | plain greek yogurt | 18 |
| dairy | heavy cream | 12 |
| gluten | hoagie rolls | 11 |
| pork | bacon | 11 |
| dairy | cheddar cheese | 11 |
| dairy | greek yogurt | 11 |
| dairy | milk | 10 |
| dairy | parmesan cheese | 9 |
| dairy | provolone slices | 9 |
| alcohol | vanilla extract | 9 |
| pork | breakfast sausage | 9 |
| pork | thick-cut bacon | 8 |
| dairy | fresh mozzarella, torn | 8 |

## QA test cases

See `scripts/dietary-qa-test-cases.ts` for the automated pass/fail suite covering: soy sauce, tamari, panko, rice noodles, corn tortillas, flour tortillas, modified food starch, oats, beer, and teriyaki. Run with `npx tsx scripts/dietary-qa-test-cases.ts`.
