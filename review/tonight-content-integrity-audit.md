# Tonight content-integrity audit

Generated: 2026-11-12T18:34:16.296Z

- Tonight-eligible recipes: **352** (default dinner pool 349)
- Served by Tonight after eligibility gate: **341**; excluded: **11**
- Recipes with any issue: **30** (served: 24); blocking among served: **0**
- Recipes needing a new image: **0**

| Issue | Recipes |
| --- | --- |
| G_ingredient_instruction_mismatch | 25 |
| N_hidden_from_explore | 6 |

## Flagged recipes

| Slug | Title | Tonight | Hero | Issues | Proposed fix |
| --- | --- | --- | --- | --- | --- |
| `grilled-pork-chops` | Grilled Pork Chops | served | `/images/golden-100/grilled-pork-chops.jpg` | G_ingredient_instruction_mismatch: 3/5 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `teriyaki-salmon-grill` | Teriyaki Salmon | served | `/images/golden-100/teriyaki-salmon-grill.jpg` | G_ingredient_instruction_mismatch: 3/5 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `turkey-chili` | Turkey Chili | served | `/images/golden-100/turkey-chili.jpg` | G_ingredient_instruction_mismatch: steps call for sour cream, jalapeno, bread — not in ingredients | align ingredient list with steps |
| `herb-roasted-thighs` | Herb Roasted Chicken Thighs | served | `/images/golden-100/herb-roasted-thighs.jpg` | G_ingredient_instruction_mismatch: 5/6 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `garlic-butter-shrimp` | Garlic Butter Shrimp | served | `/images/golden-100/garlic-butter-shrimp.jpg` | G_ingredient_instruction_mismatch: steps call for rice, bread, pasta — not in ingredients | align ingredient list with steps |
| `breakfast-burrito-bar` | Breakfast Burrito Bar | excluded (not_explore_eligible) | `/images/golden-100/breakfast-burrito-bar.jpg` | N_hidden_from_explore: not in Explore catalog | apply Explore's eligibility gate to Tonight |
| `pancake-short-stack` | Pancake Short Stack | excluded (not_explore_eligible) | `/images/golden-100/pancake-short-stack.jpg` | G_ingredient_instruction_mismatch: 2/5 ingredients never referenced in steps<br>N_hidden_from_explore: not in Explore catalog | rewrite steps to use the listed ingredients; apply Explore's eligibility gate to Tonight |
| `french-toast-casserole` | French Toast Casserole | excluded (not_explore_eligible) | `/images/golden-100/french-toast-casserole.jpg` | N_hidden_from_explore: not in Explore catalog | apply Explore's eligibility gate to Tonight |
| `chorizo-breakfast-tacos` | Chorizo Breakfast Tacos | excluded (not_explore_eligible) | `/images/golden-100/chorizo-breakfast-tacos.jpg` | N_hidden_from_explore: not in Explore catalog | apply Explore's eligibility gate to Tonight |
| `philly-egg-rolls` | Philly Cheesesteak Egg Rolls | served | `/images/golden-100/philly-egg-rolls.jpg` | G_ingredient_instruction_mismatch: 3/6 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `turkey-sausage-egg-muffins` | Turkey Sausage Egg Muffins | excluded (not_explore_eligible) | `/images/golden-100/turkey-sausage-egg-muffins.jpg` | N_hidden_from_explore: not in Explore catalog | apply Explore's eligibility gate to Tonight |
| `veggie-egg-casserole-tray` | Veggie Egg Casserole | excluded (not_explore_eligible) | `/images/golden-100/veggie-egg-casserole-tray.jpg` | N_hidden_from_explore: not in Explore catalog | apply Explore's eligibility gate to Tonight |
| `smoked-corned-beef` | Smoked Corned Beef Brisket | served | `/images/hall-expansion/smoked-corned-beef.jpg` | G_ingredient_instruction_mismatch: 4/10 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `hall-burger-bar` | Hall Burger Bar | served | `/images/hall-expansion/hall-burger-bar.jpg` | G_ingredient_instruction_mismatch: 5/10 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `lebanese-chicken-shish-platter` | Lebanese Chicken Shish Platter | served | `/images/hall-expansion/lebanese-chicken-shish-platter.jpg` | G_ingredient_instruction_mismatch: steps call for mayo, cucumber, tomato, mint — not in ingredients | align ingredient list with steps |
| `firehall-korean-beef-bowls` | Korean Beef Bowls | served | `/images/hall-expansion/firehall-korean-beef-bowls.jpg` | G_ingredient_instruction_mismatch: steps call for garlic, green onion, onion — not in ingredients | align ingredient list with steps |
| `mediterranean-beef-bowls` | Mediterranean Beef Bowls | served | `/images/hall-expansion/mediterranean-beef-bowls.jpg` | G_ingredient_instruction_mismatch: steps call for garlic, parsley, paprika — not in ingredients | align ingredient list with steps |
| `salmon-rice-bowls-crew` | Salmon Rice Bowls for the Crew | served | `/images/hall-expansion/salmon-rice-bowls-crew.jpg` | G_ingredient_instruction_mismatch: steps call for honey, ginger, vinegar — not in ingredients | align ingredient list with steps |
| `korean-turkey-rice-bowls` | Korean Turkey Rice Bowls | served | `/images/hall-expansion/korean-turkey-rice-bowls.jpg` | G_ingredient_instruction_mismatch: steps call for garlic, soy sauce, brown sugar, vinegar — not in ingredients | align ingredient list with steps |
| `white-chicken-chili-crock` | White Chicken Chili Crock | served | `/images/hall-expansion/white-chicken-chili-crock.jpg` | G_ingredient_instruction_mismatch: steps call for cilantro, lime, onion, cumin — not in ingredients | align ingredient list with steps |
| `italian-beef-slow-cooker` | Italian Beef Slow Cooker Sandwiches | served | `/images/hall-expansion/italian-beef-slow-cooker.jpg` | G_ingredient_instruction_mismatch: steps call for garlic, onion, bell pepper — not in ingredients | align ingredient list with steps |
| `smoker-nachos-crew` | Smoker Nachos for the Crew | served | `/images/hall-expansion/smoker-nachos-crew.jpg` | G_ingredient_instruction_mismatch: steps call for cilantro, bbq sauce, onion — not in ingredients | align ingredient list with steps |
| `pasta-e-fagioli-hall` | Pasta e Fagioli for the Hall | served | `/images/hall-expansion/pasta-e-fagioli-hall.jpg` | G_ingredient_instruction_mismatch: steps call for parsley, parmesan, onion — not in ingredients | align ingredient list with steps |
| `spanish-rice-chicken-one-pot` | Spanish Rice Chicken One Pot | served | `/images/hall-expansion/spanish-rice-chicken-one-pot.jpg` | G_ingredient_instruction_mismatch: steps call for garlic, onion, paprika — not in ingredients | align ingredient list with steps |
| `gochujang-beef-skewers-crew` | Seoul Chili Pear Beef Cubes | served | `/images/smoker-catalog/gochujang-beef-skewers-crew.jpg` | G_ingredient_instruction_mismatch: 4/10 ingredients never referenced in steps<br>G_ingredient_instruction_mismatch: steps call for garlic, soy sauce, green onion, peanuts, onion — not in ingredients | rewrite steps to use the listed ingredients; align ingredient list with steps |
| `tandoori-lamb-chop-platter` | Kashmiri Mustard-Oil Lamb Chop Feast | served | `/images/smoker-catalog/tandoori-lamb-chop-platter.jpg` | G_ingredient_instruction_mismatch: 5/10 ingredients never referenced in steps<br>G_ingredient_instruction_mismatch: steps call for garlic, cilantro, lemon — not in ingredients | rewrite steps to use the listed ingredients; align ingredient list with steps |
| `griddle-smash-sausage-peppers` | Giardiniera Smash Sausage Hoagies | served | `/images/smoker-catalog/griddle-smash-sausage-peppers.jpg` | G_ingredient_instruction_mismatch: 4/9 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `firehall-street-elote-cups` | Epazote Esquites Street Cups | served | `/images/smoker-catalog/firehall-street-elote-cups.jpg` | G_ingredient_instruction_mismatch: 5/10 ingredients never referenced in steps | rewrite steps to use the listed ingredients |
| `loaded-ranch-potato-salad-crew` | Blue Cheese Fingerling Ranch Tray | served | `/images/smoker-catalog/loaded-ranch-potato-salad-crew.jpg` | G_ingredient_instruction_mismatch: 5/10 ingredients never referenced in steps<br>G_ingredient_instruction_mismatch: steps call for green onion, cheddar, onion, bacon, paprika — not in ingredients | rewrite steps to use the listed ingredients; align ingredient list with steps |
| `firehall-antipasto-pasta-salad` | Mortadella Farfalle Antipasto Tray | served | `/images/smoker-catalog/firehall-antipasto-pasta-salad.jpg` | G_ingredient_instruction_mismatch: 7/10 ingredients never referenced in steps<br>G_ingredient_instruction_mismatch: steps call for garlic, vinegar, onion — not in ingredients | rewrite steps to use the listed ingredients; align ingredient list with steps |

## Recipes needing a new image

