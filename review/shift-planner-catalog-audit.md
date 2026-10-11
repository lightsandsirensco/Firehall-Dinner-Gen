# Shift Planner catalog readiness audit

Approved recipes: **427** · meals: **400**

## Primary occasion

| Occasion | Recipes |
| --- | --- |
| dinner | 182 |
| multi_purpose | 132 |
| breakfast | 72 |
| not_a_meal | 27 |
| lunch | 14 |

## Eligible per slot (a recipe can count for several)

| Slot | Recipes |
| --- | --- |
| breakfast | 72 |
| lunch | 116 |
| dinner | 307 |
| late_night | 91 |

## Time (meals)

| Bucket | All meals | breakfast | lunch | dinner | late_night |
| --- | --- | --- | --- | --- | --- |
| Under 30 min | 115 | 8 | 58 | 97 | 73 |
| 30–60 min | 183 | 52 | 53 | 122 | 18 |
| 60–90 min | 37 | 11 | 4 | 24 | 0 |
| 90+ min | 65 | 1 | 1 | 64 | 0 |

## Protein (meals)

| Protein | All meals | breakfast | lunch | dinner | late_night |
| --- | --- | --- | --- | --- | --- |
| Chicken | 120 | 1 | 40 | 112 | 31 |
| Beef | 95 | 2 | 30 | 91 | 25 |
| Pork | 70 | 31 | 11 | 37 | 9 |
| Eggs | 32 | 32 | 0 | 0 | 0 |
| Seafood | 30 | 3 | 11 | 26 | 14 |
| Vegetarian | 29 | 3 | 15 | 20 | 5 |
| Turkey | 15 | 0 | 8 | 13 | 7 |
| Lamb | 5 | 0 | 0 | 5 | 0 |
| Mixed | 4 | 0 | 1 | 3 | 0 |

Batch-friendly: **29** explicit (big-crew / meal-prep category or batch title) + **78** by format.

## Planner slot pools (occasion ∩ slot time budget)

| Slot | Budget | Occasion pool | In budget | none | vegetarian | porkFree | noSeafood | glutenFree | dairyFree |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| breakfast | 20-30 | 72 | 34 | 34 | **11** | 18 | 33 | **10** | **2** |
| breakfast (late crew) | 15-25 | 72 | 24 | 24 | **10** | **14** | 23 | **4** | **1** |
| lunch | 30-45 | 115 | 111 | 111 | **12** | 95 | 93 | 32 | 44 |
| lunch (late crew) | 25-40 | 115 | 96 | 96 | **11** | 81 | 80 | 28 | 37 |
| dinner | 45-60 | 302 | 231 | 231 | 17 | 203 | 188 | 69 | 99 |
| dinner (late crew) | 30-45 | 302 | 217 | 217 | 16 | 192 | 177 | 65 | 97 |
| late_night | 20-30 | 91 | 91 | 91 | **5** | 83 | 74 | 33 | 39 |
| late_night (late crew) | 15-25 | 91 | 91 | 91 | **5** | 83 | 74 | 33 | 39 |

Dinner recipes that never fit a dinner slot's time budget (45–60, +10 grace): **74**.

## Nutrition-goal coverage

| Slot | Pool | With macros | Flags only | None | high_protein strong fit | lower_calorie strong fit | lower_carb strong fit | balanced strong fit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| breakfast | 72 | 0 | 52 | 20 | 0 | 0 | 0 | 0 |
| lunch | 116 | 48 | 29 | 39 | 41 | 8 | 8 | 23 |
| dinner | 307 | 139 | 48 | 120 | 132 | 20 | 44 | 43 |
| late_night | 91 | 46 | 18 | 27 | 44 | 8 | 17 | 18 |

## Metadata issues (55)

| Recipe | Kind | Issue |
| --- | --- | --- |
| 30-Minute Pasta e Fagioli for the Hall (`30-minute-pasta-e-fagioli-for-the-hall`) | firehall_catalog | protein label 'Vegetarian' but dietary analysis says not vegetarian |
| BBQ Meatball Skewers (`bbq-meatball-skewers`) | hall_expansion | appetizer, not a meal — previously eligible for meal slots |
| Blue Cheese Fingerling Ranch Tray (`loaded-ranch-potato-salad-crew`) | bbq_catalog | side, not a meal — previously eligible for meal slots |
| Breakfast Sausage Gravy Pizza (`breakfast-sausage-pizza`) | firehall_catalog | breakfast dish filed outside the breakfast catalog (meal format pizza) |
| Buffalo Chicken Dip (`buffalo-chicken-dip`) | firehall_catalog | appetizer, not a meal — previously eligible for meal slots |
| Epazote Esquites Street Cups (`firehall-street-elote-cups`) | bbq_catalog | side, not a meal — previously eligible for meal slots |
| Firehall Charcuterie Board (`firehall-charcuterie-board`) | hall_expansion | appetizer, not a meal — previously eligible for meal slots |
| Jalapeño Popper Dip (`jalapeno-popper-dip`) | hall_expansion | appetizer, not a meal — previously eligible for meal slots |
| Loaded Potato Skins (`loaded-potato-skins`) | hall_expansion | appetizer, not a meal — previously eligible for meal slots |
| Mortadella Farfalle Antipasto Tray (`firehall-antipasto-pasta-salad`) | bbq_catalog | side, not a meal — previously eligible for meal slots |
| Pasta e Ceci (Pasta with Chickpeas) (`pasta-e-ceci-for-the-hall`) | firehall_catalog | protein label 'Vegetarian' but dietary analysis says not vegetarian |
| Philly Cheesesteak Egg Rolls (`philly-egg-rolls`) | firehall_catalog | appetizer, not a meal — previously eligible for meal slots |
| Pistachio Peach and Burrata Salad (`grilled-peach-burrata-salad`) | bbq_catalog | side, not a meal — previously eligible for meal slots |
| Pretzel Bite Platter with Beer Cheese (`pretzel-bite-platter`) | hall_expansion | protein label 'Vegetarian' but dietary analysis says not vegetarian |
| Pretzel Bite Platter with Beer Cheese (`pretzel-bite-platter`) | hall_expansion | appetizer, not a meal — previously eligible for meal slots |
| Sausage Egg Bake (`sausage-egg-bake`) | firehall_catalog | breakfast dish filed outside the breakfast catalog (meal format bake) |
| Sicilian Anchovy Broccolini Tray (`charred-broccolini-lemon-tray`) | bbq_catalog | side, not a meal — previously eligible for meal slots |
| Smoked Baked Beans for the Crew (`smoked-baked-beans-crew`) | bbq_catalog | side, not a meal — previously eligible for meal slots |
| Smoked Mac and Cheese for the Crew (`smoked-mac-and-cheese-crew`) | bbq_catalog | side, not a meal — previously eligible for meal slots |
| Smoked Potato Salad Tray (`smoked-potato-salad-tray`) | bbq_catalog | side, not a meal — previously eligible for meal slots |
| Smoked Queso Fundido (`smoked-queso-fundido`) | hall_expansion | appetizer, not a meal — previously eligible for meal slots |
| Spicy Tomato Bisque with Grilled Brie Toast (`spicy-tomato-bisque-grilled-brie-toast`) | firehall_catalog | protein label 'Vegetarian' but dietary analysis says not vegetarian |
| Street Corn with Cotija (`grilled-corn-cotija`) | firehall_catalog | side, not a meal — previously eligible for meal slots |
| Tomato Soup with Grilled Cheese Croutons (`tomato-soup-grilled-cheese-croutons`) | firehall_catalog | protein label 'Vegetarian' but dietary analysis says not vegetarian |
| Ancho-Tilapia with Charred Corn Salsa (`chili-lime-grilled-tilapia`) | bbq_catalog | meal format 'crew_kebab' is a BBQ authoring template, not the dish |
| Andouille Po Boy Rolls for the Crew (`andouille-po-boy-rolls-crew`) | bbq_catalog | meal format 'smokehouse_board' is a BBQ authoring template, not the dish |
| Binghamton White-Wine Spiedie Tray (`spiedie-chicken-platter-crew`) | bbq_catalog | meal format 'side' is a BBQ authoring template, not the dish |
| Black Iron Remoulade Cod Plates (`cajun-grilled-cod-crew`) | bbq_catalog | meal format 'crew_kebab' is a BBQ authoring template, not the dish |
| Blue Cheese Fingerling Ranch Tray (`loaded-ranch-potato-salad-crew`) | bbq_catalog | meal format 'hoagie_press' is a BBQ authoring template, not the dish |
| Caper-Butter Cod Foil Packets (`grilled-cod-lemon-packets`) | bbq_catalog | meal format 'crew_kebab' is a BBQ authoring template, not the dish |
| Cast Iron Skirt Steak Sizzlers (`cast-iron-steak-fajita-sizzlers`) | bbq_catalog | meal format 'smokehouse_board' is a BBQ authoring template, not the dish |
| Cooper Sharp Chopped Ribeye Hoagies (`flat-top-philly-cheesesteaks-crew`) | bbq_catalog | meal format 'river_fish' is a BBQ authoring template, not the dish |
| Epazote Esquites Street Cups (`firehall-street-elote-cups`) | bbq_catalog | meal format 'tropical_fillet' is a BBQ authoring template, not the dish |
| Firehall Burnt Ends Platter (`firehall-burnt-ends-platter`) | bbq_catalog | meal format 'burger' is a BBQ authoring template, not the dish |
| Giardiniera Smash Sausage Hoagies (`griddle-smash-sausage-peppers`) | bbq_catalog | meal format 'bayou_fillet' is a BBQ authoring template, not the dish |
| Grilled Reuben Sandwiches for the Crew (`grilled-reuben-sandwiches-crew`) | bbq_catalog | meal format 'smokehouse_board' is a BBQ authoring template, not the dish |
| Kashmiri Mustard-Oil Lamb Chop Feast (`tandoori-lamb-chop-platter`) | bbq_catalog | meal format 'side' is a BBQ authoring template, not the dish |
| Lisbon Piri-Piri Linguica Spread (`portuguese-linguica-grill-platter`) | bbq_catalog | meal format 'side' is a BBQ authoring template, not the dish |
| Mortadella Farfalle Antipasto Tray (`firehall-antipasto-pasta-salad`) | bbq_catalog | meal format 'hoagie_press' is a BBQ authoring template, not the dish |
| Palm Sugar Lime Shrimp Skewers (`honey-sriracha-shrimp-skewers`) | bbq_catalog | meal format 'burger' is a BBQ authoring template, not the dish |
| Pecan Bourbon Whole Trout Board (`maple-bourbon-grilled-trout`) | bbq_catalog | meal format 'crew_kebab' is a BBQ authoring template, not the dish |
| Pistachio Peach and Burrata Salad (`grilled-peach-burrata-salad`) | bbq_catalog | meal format 'hoagie_press' is a BBQ authoring template, not the dish |
| Pressed Cuban Sandwiches for the Crew (`pressed-cuban-sandwiches-crew`) | bbq_catalog | meal format 'smokehouse_board' is a BBQ authoring template, not the dish |
| Reverse-Seared Ribeye for the Crew (`reverse-seared-ribeye-crew`) | bbq_catalog | meal format 'sandwich' is a BBQ authoring template, not the dish |
| Scallion Crisp Mongolian Flank Tray (`mongolian-beef-flat-top-crew`) | bbq_catalog | meal format 'foil_fish' is a BBQ authoring template, not the dish |
| Sicilian Anchovy Broccolini Tray (`charred-broccolini-lemon-tray`) | bbq_catalog | meal format 'hoagie_press' is a BBQ authoring template, not the dish |
| Smoked Baked Beans for the Crew (`smoked-baked-beans-crew`) | bbq_catalog | meal format 'grill' is a BBQ authoring template, not the dish |
| Smoked Mac and Cheese for the Crew (`smoked-mac-and-cheese-crew`) | bbq_catalog | meal format 'sandwich' is a BBQ authoring template, not the dish |
| Smoked Picanha Steak Platter (`smoked-picanha-steak-platter`) | bbq_catalog | meal format 'sandwich' is a BBQ authoring template, not the dish |
| Smoked Potato Salad Tray (`smoked-potato-salad-tray`) | bbq_catalog | meal format 'grill' is a BBQ authoring template, not the dish |
| Sun-Dried Tomato Pesto Panini Press (`grilled-chicken-pesto-panini-crew`) | bbq_catalog | meal format 'smokehouse_board' is a BBQ authoring template, not the dish |
| Teppan Shrimp and Pork Belly Mixed Grill (`firehall-hibachi-mixed-grill-crew`) | bbq_catalog | meal format 'smokehouse_board' is a BBQ authoring template, not the dish |
| Texas Central Brisket for the Crew (`texas-central-brisket-crew`) | bbq_catalog | meal format 'sandwich' is a BBQ authoring template, not the dish |
| Yucatán Achiote Pollo Asado Spread (`pollo-asado-citrus-platter`) | bbq_catalog | meal format 'crew_kebab' is a BBQ authoring template, not the dish |
| Za'atar Loin and Shoulder Lamb Board (`mixed-lamb-chop-grill-board`) | bbq_catalog | meal format 'crew_kebab' is a BBQ authoring template, not the dish |
