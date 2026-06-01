/**
 * Golden 100 manifest — 100 elite recipes by master category distribution.
 */

import { goldenEntry } from "./entry.js";

export const GOLDEN_100_TARGET_BY_CATEGORY = {
  firehall_classics: 15,
  bbq_grill_nights: 15,
  comfort_food: 12,
  healthy_performance: 12,
  quick_shift_meals: 10,
  pizza_night: 8,
  big_crew_feeders: 8,
  breakfast_brunch: 6,
  global_flavors: 6,
  game_day_watch_party: 4,
  meal_prep_leftovers: 2,
  rookie_friendly: 2,
} as const;

const CLASSICS = [
  goldenEntry({ slug: "chicken-parm", title: "Chicken Parm", cat: "firehall_classics", protein: "chicken", cuisine: "italian", format: "pasta", pools: ["trending", "comfort"], hook: "The hall's Italian night spread", classic: "chicken-parm", id: 638235, inspiration: "Firehall Classics" }),
  goldenEntry({ slug: "steak-tacos", title: "Chimichurri Steak Tacos", cat: "firehall_classics", protein: "beef", cuisine: "mexican", format: "tacos", pools: ["trending", "handheld"], hook: "Charred steak, bright chimichurri, tortilla night", classic: "steak-tacos", id: 716004, inspiration: "Firehall Classics" }),
  goldenEntry({ slug: "smash-burgers", title: "Double Smash Burgers", cat: "firehall_classics", protein: "beef", cuisine: "american", format: "burger", pools: ["trending", "handheld"], hook: "Crispy edges, melty cheese, crew-approved", classic: "smash-burgers", id: 715769, inspiration: "Serious Eats" }),
  goldenEntry({ slug: "chili-garlic-bread", title: "Firehall Chili", cat: "firehall_classics", protein: "beef", cuisine: "american", format: "soup_chili", pools: ["trending", "hearty"], hook: "Post-call comfort in a deep bowl", classic: "chili-garlic-bread", inspiration: "Firehall Classics" }),
  goldenEntry({ slug: "pulled-pork", title: "Pulled Pork Sandwiches", cat: "firehall_classics", protein: "pork", cuisine: "american", format: "sandwich", pools: ["bbq", "handheld"], hook: "Slow-smoked pull, soft buns, fast line", classic: "pulled-pork", inspiration: "Hey Grill Hey" }),
  goldenEntry({ slug: "beef-dip", title: "Blackstone Steak Sandwiches", cat: "firehall_classics", protein: "beef", cuisine: "american", format: "sandwich", pools: ["trending", "beef"], hook: "Au jus dip energy without the fuss", classic: "beef-dip", inspiration: "Firehall Classics" }),
  goldenEntry({ slug: "jerk-chicken", title: "Jerk Chicken & Peas and Rice", cat: "firehall_classics", protein: "chicken", cuisine: "caribbean", format: "grill", pools: ["trending", "chicken"], hook: "Charred jerk thighs, coconut rice and peas, island sides for eight", classic: "jerk-chicken", inspiration: "Firehall Classics" }),
  goldenEntry({ slug: "bbq-chicken-bowls", title: "BBQ Chicken Bowls", cat: "firehall_classics", protein: "chicken", cuisine: "american", format: "bowl", pools: ["trending", "bowl"], hook: "Built bowls, big flavor, one line", classic: "bbq-chicken-bowls", inspiration: "Firehall Classics" }),
  goldenEntry({ slug: "steak-sandwiches", title: "Steak Sandwiches", cat: "firehall_classics", protein: "beef", cuisine: "american", format: "sandwich", pools: ["beef", "handheld"], hook: "Thin-sliced steak, toasted roll, hall classic", classic: "steak-sandwiches", inspiration: "Firehall Classics" }),
  goldenEntry({ slug: "chicken-caesar", title: "Hall Caesar Chicken", cat: "firehall_classics", protein: "chicken", cuisine: "american", format: "salad", pools: ["healthy", "chicken"], hook: "Crispy chicken, real parmesan, crew salad night", classic: "chicken-caesar", inspiration: "Firehall Classics" }),
  goldenEntry({ slug: "crispy-chicken-cutlets", title: "Crispy Chicken Cutlets Marinara", cat: "firehall_classics", protein: "chicken", cuisine: "italian", format: "plated_main", pools: ["trending", "chicken"], hook: "Golden cutlets, bubbling sauce", search: "crispy chicken cutlets marinara dinner", inspiration: "NYT Cooking" }),
  goldenEntry({ slug: "loaded-nacho-skillet", title: "Loaded Nacho Skillet", cat: "firehall_classics", protein: "beef", cuisine: "mexican", format: "bowl", pools: ["handheld", "game_day"], hook: "Game-night skillet the whole hall shares", search: "loaded beef nacho skillet dinner", inspiration: "Bon Appétit" }),
  goldenEntry({ slug: "meatball-hoagies", title: "Firehall Meatball Hoagies", cat: "firehall_classics", protein: "beef", cuisine: "italian", format: "sandwich", pools: ["trending", "handheld"], hook: "Saucy meatballs, melted provolone", search: "meatball sub hoagie dinner", inspiration: "Serious Eats" }),
  goldenEntry({ slug: "parm-hero-subs", title: "Chicken Parm Hero Subs", cat: "firehall_classics", protein: "chicken", cuisine: "italian", format: "sandwich", pools: ["handheld", "chicken"], hook: "Parm flavors in a handheld line", search: "chicken parmesan hero sandwich", inspiration: "Food Network" }),
  goldenEntry({ slug: "hall-taco-bar", title: "Hall Taco Bar Night", cat: "firehall_classics", protein: "beef", cuisine: "mexican", format: "tacos", pools: ["handheld", "trending"], hook: "Build-your-own tacos at the table", search: "ground beef taco bar dinner", inspiration: "Firehall Classics" }),
];

const BBQ = [
  goldenEntry({ slug: "smoked-brisket", title: "Kansas City Smoked Brisket", cat: "bbq_grill_nights", protein: "beef", cuisine: "american", format: "grill", pools: ["bbq", "beef"], hook: "Low-and-slow smoke for the whole crew", search: "smoked beef brisket bbq", inspiration: "AmazingRibs", img: { lightingStyle: "grill_char", promptFocus: "sliced brisket smoke ring, charred bark" } }),
  goldenEntry({ slug: "memphis-dry-rub-ribs", title: "Memphis Dry Rub Ribs", cat: "bbq_grill_nights", protein: "pork", cuisine: "american", format: "grill", pools: ["bbq"], hook: "Sticky bark, fall-off-bone ribs", search: "memphis dry rub pork ribs", inspiration: "AmazingRibs" }),
  goldenEntry({ slug: "beer-can-chicken", title: "Beer Can Chicken", cat: "bbq_grill_nights", protein: "chicken", cuisine: "american", format: "grill", pools: ["bbq", "chicken"], hook: "Juicy bird, crispy skin, grill marks", search: "beer can chicken grilled", inspiration: "Hey Grill Hey" }),
  goldenEntry({ slug: "ny-strip-herb-butter", title: "Grilled NY Strip with Herb Butter", cat: "bbq_grill_nights", protein: "beef", cuisine: "american", format: "grill", pools: ["bbq", "beef"], hook: "Steakhouse night at the station", search: "grilled new york strip herb butter", inspiration: "Serious Eats" }),
  goldenEntry({ slug: "bbq-chicken-sliders", title: "BBQ Chicken Sliders", cat: "bbq_grill_nights", protein: "chicken", cuisine: "american", format: "sandwich", pools: ["bbq", "handheld"], hook: "Sweet-smoky sliders for a hungry line", search: "bbq pulled chicken sliders", inspiration: "Traeger" }),
  goldenEntry({ slug: "grilled-pork-chops", title: "Charcoal Grilled Pork Chops", cat: "bbq_grill_nights", protein: "pork", cuisine: "american", format: "grill", pools: ["bbq"], hook: "Thick chops, caramelized edges", search: "grilled thick pork chops dinner", inspiration: "Hey Grill Hey" }),
  goldenEntry({ slug: "smoked-wings-white-sauce", title: "Smoked Wings with White BBQ Sauce", cat: "bbq_grill_nights", protein: "chicken", cuisine: "american", format: "grill", pools: ["bbq", "game_day"], hook: "Smoked wings, tangy Alabama sauce", search: "smoked chicken wings white bbq sauce", inspiration: "AmazingRibs" }),
  goldenEntry({ slug: "texas-beef-ribs", title: "Texas-Style Beef Ribs", cat: "bbq_grill_nights", protein: "beef", cuisine: "american", format: "grill", pools: ["bbq", "beef"], hook: "Massive bones, pepper crust, smoke", search: "texas style beef short ribs bbq", inspiration: "Traeger" }),
  goldenEntry({ slug: "cedar-plank-salmon", title: "Cedar Plank Grilled Salmon", cat: "bbq_grill_nights", protein: "seafood", cuisine: "american", format: "grill", pools: ["bbq", "healthy"], hook: "Smoke-kissed salmon without the mess", search: "cedar plank grilled salmon", inspiration: "Serious Eats" }),
  goldenEntry({ slug: "honey-garlic-pork-tenderloin", title: "Honey Garlic Grilled Pork Tenderloin", cat: "bbq_grill_nights", protein: "pork", cuisine: "american", format: "grill", pools: ["bbq"], hook: "Fast grill, glossy glaze, feeds eight", search: "honey garlic grilled pork tenderloin", inspiration: "Hey Grill Hey" }),
  goldenEntry({ slug: "flank-chimichurri", title: "Grilled Flank Steak with Chimichurri", cat: "bbq_grill_nights", protein: "beef", cuisine: "argentinian", format: "grill", pools: ["bbq", "beef"], hook: "Bright herbs, charred beef", search: "grilled flank steak chimichurri", inspiration: "Serious Eats" }),
  goldenEntry({ slug: "carolina-mustard-pork", title: "Carolina Mustard Pulled Pork", cat: "bbq_grill_nights", protein: "pork", cuisine: "american", format: "sandwich", pools: ["bbq", "handheld"], hook: "Tangy mustard pull, soft buns", search: "carolina mustard pulled pork", inspiration: "AmazingRibs" }),
  goldenEntry({ slug: "grilled-corn-cotija", title: "Grilled Street Corn with Cotija", cat: "bbq_grill_nights", protein: "vegetarian", cuisine: "mexican", format: "grill", pools: ["bbq"], hook: "Charred corn, creamy cotija finish", search: "mexican street corn grilled cotija", inspiration: "Bon Appétit" }),
  goldenEntry({ slug: "teriyaki-salmon-grill", title: "Teriyaki Grilled Salmon", cat: "bbq_grill_nights", protein: "seafood", cuisine: "japanese", format: "grill", pools: ["bbq", "healthy"], hook: "Glazed salmon, grill-first cleanup", search: "teriyaki grilled salmon dinner", inspiration: "NYT Cooking" }),
  goldenEntry({ slug: "bbq-brisket-burnt-ends", title: "BBQ Burnt Ends", cat: "bbq_grill_nights", protein: "beef", cuisine: "american", format: "grill", pools: ["bbq", "beef"], hook: "Caramelized burnt ends, pure smoke", search: "bbq burnt ends brisket", inspiration: "AmazingRibs" }),
];

const COMFORT = [
  goldenEntry({ slug: "mac-and-cheese-bake", title: "Baked Mac and Cheese", cat: "comfort_food", protein: "vegetarian", cuisine: "american", format: "bake", pools: ["comfort", "pasta"], hook: "Creamy, bubbling, hall-approved mac", search: "baked mac and cheese dinner", inspiration: "NYT Cooking" }),
  goldenEntry({ slug: "shepherds-pie", title: "Shepherd's Pie with Greek Salad", cat: "comfort_food", protein: "beef", cuisine: "british", format: "plated_main", pools: ["comfort", "hearty"], hook: "Golden potato cap over rich filling, Greek salad on the side", search: "shepherds pie ground beef greek salad", inspiration: "Bon Appétit" }),
  goldenEntry({ slug: "meatloaf-mashed", title: "Classic Meatloaf with Mashed Potatoes", cat: "comfort_food", protein: "beef", cuisine: "american", format: "plated_main", pools: ["comfort"], hook: "Sunday-dinner energy on a weeknight", search: "meatloaf mashed potatoes dinner", inspiration: "Serious Eats" }),
  goldenEntry({ slug: "chicken-pot-pie", title: "Chicken Pot Pie", cat: "comfort_food", protein: "chicken", cuisine: "american", format: "plated_main", pools: ["comfort", "chicken"], hook: "Flaky crust, creamy filling", search: "chicken pot pie dinner", inspiration: "NYT Cooking" }),
  goldenEntry({ slug: "beef-stroganoff", title: "Beef Stroganoff", cat: "comfort_food", protein: "beef", cuisine: "russian", format: "pasta", pools: ["comfort", "pasta"], hook: "Silky sauce, wide noodles", search: "beef stroganoff egg noodles", inspiration: "Serious Eats" }),
  goldenEntry({ slug: "loaded-baked-potato-bar", title: "Loaded Baked Potato Bar", cat: "comfort_food", protein: "beef", cuisine: "american", format: "bowl", pools: ["comfort", "beef"], hook: "Build-your-own spuds for the crew", search: "loaded baked potato bar dinner", inspiration: "Firehall Classics" }),
  goldenEntry({ slug: "creamy-tuscan-chicken", title: "Creamy Tuscan Chicken", cat: "comfort_food", protein: "chicken", cuisine: "italian", format: "plated_main", pools: ["comfort", "chicken"], hook: "Sun-dried tomato, spinach, rich cream", search: "creamy tuscan chicken dinner", inspiration: "Sip and Feast" }),
  goldenEntry({ slug: "philly-cheesesteak-skillet", title: "Philly Cheesesteak Skillet", cat: "comfort_food", protein: "beef", cuisine: "american", format: "skillet", pools: ["comfort", "beef"], hook: "Melted provolone, peppers, one pan", search: "philly cheesesteak skillet dinner", inspiration: "Serious Eats" }),
  goldenEntry({ slug: "sausage-peppers-onions", title: "Sausage Peppers and Onions", cat: "comfort_food", protein: "pork", cuisine: "italian", format: "skillet", pools: ["comfort", "one_pot"], hook: "Sheet-pan Italian comfort", search: "italian sausage peppers onions dinner", inspiration: "NYT Cooking" }),
  goldenEntry({ slug: "beef-barley-soup", title: "Beef Barley Soup", cat: "comfort_food", protein: "beef", cuisine: "american", format: "soup_chili", pools: ["hearty", "comfort"], hook: "Cold-night bowl that fills everyone", search: "beef barley soup hearty", inspiration: "Bon Appétit" }),
  goldenEntry({ slug: "baked-ziti", title: "Baked Ziti", cat: "comfort_food", protein: "beef", cuisine: "italian", format: "pasta", pools: ["comfort", "pasta"], hook: "Cheesy pasta bake for the table", search: "baked ziti meat sauce dinner", inspiration: "GialloZafferano" }),
  goldenEntry({ slug: "chicken-dumpling-soup", title: "Chicken and Dumplings", cat: "comfort_food", protein: "chicken", cuisine: "american", format: "soup_chili", pools: ["hearty", "comfort"], hook: "Post-shift hug in a pot", search: "chicken and dumplings soup", inspiration: "Serious Eats" }),
];

const HEALTHY = [
  goldenEntry({ slug: "lemon-herb-salmon", title: "Lemon Herb Grilled Salmon", cat: "healthy_performance", protein: "seafood", cuisine: "mediterranean", format: "grill", pools: ["healthy"], hook: "High protein, light cleanup", search: "lemon herb grilled salmon", inspiration: "NYT Cooking" }),
  goldenEntry({ slug: "greek-chicken-bowls", title: "Greek Chicken Bowls", cat: "healthy_performance", protein: "chicken", cuisine: "greek", format: "bowl", pools: ["healthy", "bowl"], hook: "Tzatziki, crisp veg, lean chicken", search: "greek chicken bowl", inspiration: "Bon Appétit" }),
  goldenEntry({ slug: "turkey-chili", title: "High-Protein Turkey Chili", cat: "healthy_performance", protein: "turkey", cuisine: "american", format: "soup_chili", pools: ["healthy", "hearty"], hook: "Big pot, lean protein, hall fuel", search: "turkey chili healthy dinner", inspiration: "Serious Eats" }),
  goldenEntry({ slug: "sheet-pan-fajitas", title: "Sheet Pan Chicken Fajitas", cat: "healthy_performance", protein: "chicken", cuisine: "mexican", format: "sheet_pan", pools: ["healthy", "quick"], hook: "One pan, peppers, lean strips", search: "sheet pan chicken fajitas", inspiration: "Budget Bytes" }),
  goldenEntry({ slug: "stuffed-peppers", title: "Quinoa Stuffed Peppers", cat: "healthy_performance", protein: "beef", cuisine: "american", format: "plated_main", pools: ["healthy"], hook: "Colorful, balanced, batch-friendly", search: "quinoa stuffed bell peppers beef", inspiration: "NYT Cooking" }),
  goldenEntry({ slug: "chicken-souvlaki", title: "Grilled Chicken Souvlaki", cat: "healthy_performance", protein: "chicken", cuisine: "greek", format: "grill", pools: ["healthy", "chicken"], hook: "Marinated skewers, pita-ready", search: "chicken souvlaki grilled", inspiration: "Serious Eats" }),
  goldenEntry({ slug: "turkey-burgers", title: "Black Bean Turkey Burgers", cat: "healthy_performance", protein: "turkey", cuisine: "american", format: "burger", pools: ["healthy", "handheld"], hook: "Juicy lean burgers that still satisfy", search: "turkey black bean burgers", inspiration: "Bon Appétit" }),
  goldenEntry({ slug: "ginger-salmon-bowls", title: "Ginger Salmon Rice Bowls", cat: "healthy_performance", protein: "seafood", cuisine: "asian", format: "bowl", pools: ["healthy", "bowl"], hook: "Bright ginger glaze, clean bowls", search: "ginger salmon rice bowl", inspiration: "NYT Cooking" }),
  goldenEntry({ slug: "mediterranean-chickpea", title: "Mediterranean Chickpea Bowls", cat: "healthy_performance", protein: "vegetarian", cuisine: "mediterranean", format: "bowl", pools: ["healthy", "bowl"], hook: "Plant-forward without feeling light", search: "mediterranean chickpea bowl dinner", inspiration: "Bon Appétit" }),
  goldenEntry({ slug: "turkey-meatball-zoodles", title: "Turkey Meatballs with Zucchini Noodles", cat: "healthy_performance", protein: "turkey", cuisine: "italian", format: "pasta", pools: ["healthy"], hook: "Classic flavors, lighter base", search: "turkey meatballs zucchini noodles", inspiration: "Serious Eats" }),
  goldenEntry({ slug: "performance-burrito-bowls", title: "Performance Chicken Burrito Bowls", cat: "healthy_performance", protein: "chicken", cuisine: "mexican", format: "bowl", pools: ["healthy", "bowl"], hook: "Macros-friendly, still craveable", search: "chicken burrito bowl healthy", inspiration: "Budget Bytes" }),
  goldenEntry({ slug: "herb-roasted-thighs", title: "Herb Roasted Chicken Thighs", cat: "healthy_performance", protein: "chicken", cuisine: "american", format: "roast", pools: ["healthy", "chicken"], hook: "Crispy skin, lean protein, oven ease", search: "herb roasted chicken thighs dinner", inspiration: "NYT Cooking" }),
];

const QUICK = [
  goldenEntry({ slug: "garlic-butter-shrimp", title: "Garlic Butter Shrimp", cat: "quick_shift_meals", protein: "seafood", cuisine: "american", format: "skillet", pools: ["quick"], hook: "Twenty minutes, max flavor", search: "garlic butter shrimp dinner quick", rec: { quickShiftMeal: true, cleanupScore: 9 } }),
  goldenEntry({ slug: "sheet-pan-sausage-peppers", title: "Sheet Pan Sausage and Peppers", cat: "quick_shift_meals", protein: "pork", cuisine: "italian", format: "sheet_pan", pools: ["quick", "one_pot"], hook: "One pan, minimal dishes", search: "sheet pan sausage peppers dinner", rec: { quickShiftMeal: true } }),
  goldenEntry({ slug: "skillet-chicken-alfredo", title: "One-Skillet Chicken Alfredo", cat: "quick_shift_meals", protein: "chicken", cuisine: "italian", format: "pasta", pools: ["quick", "pasta"], hook: "Creamy pasta without the marathon", search: "one skillet chicken alfredo", rec: { quickShiftMeal: true } }),
  goldenEntry({ slug: "beef-broccoli", title: "Quick Beef and Broccoli", cat: "quick_shift_meals", protein: "beef", cuisine: "chinese", format: "skillet", pools: ["quick"], hook: "Takeout vibes, hall timing", search: "beef broccoli stir fry dinner", rec: { quickShiftMeal: true } }),
  goldenEntry({ slug: "chicken-tikka-masala", title: "Chicken Tikka Masala", cat: "quick_shift_meals", protein: "chicken", cuisine: "indian", format: "plated_main", pools: ["quick"], hook: "Rich curry on a busy night", search: "chicken tikka masala dinner", rec: { quickShiftMeal: true } }),
  goldenEntry({ slug: "fast-philly-skillet", title: "Fast Philly Cheesesteak Skillet", cat: "quick_shift_meals", protein: "beef", cuisine: "american", format: "skillet", pools: ["quick", "beef"], hook: "Cheesy steak without the wait", search: "quick philly cheesesteak skillet", rec: { quickShiftMeal: true } }),
  goldenEntry({ slug: "pork-carnitas-tacos", title: "Quick Pork Carnitas Tacos", cat: "quick_shift_meals", protein: "pork", cuisine: "mexican", format: "tacos", pools: ["quick", "handheld"], hook: "Crispy edges, fast tortilla night", search: "quick pork carnitas tacos", rec: { quickShiftMeal: true } }),
  goldenEntry({ slug: "chicken-quesadillas", title: "Shredded Chicken Quesadillas", cat: "quick_shift_meals", protein: "chicken", cuisine: "mexican", format: "handheld", pools: ["quick", "handheld"], hook: "Melty, crispy, line-friendly", search: "chicken quesadillas dinner", rec: { quickShiftMeal: true } }),
  goldenEntry({ slug: "chili-mac", title: "Chili Mac Skillet", cat: "quick_shift_meals", protein: "beef", cuisine: "american", format: "skillet", pools: ["quick", "comfort"], hook: "Two cravings, one pan", search: "chili mac skillet dinner", rec: { quickShiftMeal: true } }),
  goldenEntry({ slug: "pad-thai", title: "Firehall Pad Thai", cat: "quick_shift_meals", protein: "chicken", cuisine: "thai", format: "skillet", pools: ["quick"], hook: "Sweet-tangy wok noodles, lime, and crushed peanuts", search: "firehall pad thai chicken wok noodles", rec: { quickShiftMeal: true } }),
];

const PIZZA = [
  goldenEntry({ slug: "pepperoni-pizza-night", title: "Classic Pepperoni Pizza", cat: "pizza_night", protein: "pork", cuisine: "italian", format: "pizza", pools: ["handheld", "trending"], hook: "Friday hall pie — not delivery", search: "homemade pepperoni pizza", img: { shotPreset: "pizza", lightingStyle: "warm_editorial" } }),
  goldenEntry({ slug: "detroit-style-pizza", title: "Detroit-Style Pepperoni Pizza", cat: "pizza_night", protein: "pork", cuisine: "american", format: "pizza", pools: ["handheld"], hook: "Crispy cheese edges, thick crust", search: "detroit style pepperoni pizza", img: { shotPreset: "pizza" } }),
  goldenEntry({ slug: "bbq-chicken-pizza", title: "BBQ Chicken Pizza", cat: "pizza_night", protein: "chicken", cuisine: "american", format: "pizza", pools: ["handheld", "bbq"], hook: "Sweet BBQ, red onion, cilantro", search: "bbq chicken pizza", img: { shotPreset: "pizza" } }),
  goldenEntry({ slug: "white-garlic-chicken-pizza", title: "White Garlic Chicken Pizza", cat: "pizza_night", protein: "chicken", cuisine: "italian", format: "pizza", pools: ["handheld"], hook: "Creamy white pie, roasted garlic", search: "white sauce chicken pizza", img: { shotPreset: "pizza" } }),
  goldenEntry({ slug: "meat-lovers-sheet-pizza", title: "Meat Lover's Sheet Pan Pizza", cat: "pizza_night", protein: "pork", cuisine: "american", format: "pizza", pools: ["handheld"], hook: "Feeds the crew from one tray", search: "meat lovers sheet pan pizza", img: { shotPreset: "pizza" } }),
  goldenEntry({ slug: "margherita-pizza", title: "Fresh Margherita Pizza", cat: "pizza_night", protein: "vegetarian", cuisine: "italian", format: "pizza", pools: ["handheld"], hook: "Basil, mozzarella, blistered crust", search: "margherita pizza fresh mozzarella", img: { shotPreset: "pizza" } }),
  goldenEntry({ slug: "honey-soppressata-pizza", title: "Hot Honey Soppressata Pizza", cat: "pizza_night", protein: "pork", cuisine: "italian", format: "pizza", pools: ["handheld"], hook: "Sweet heat, charred salami", search: "hot honey soppressata pizza", img: { shotPreset: "pizza" } }),
  goldenEntry({ slug: "breakfast-sausage-pizza", title: "Breakfast Sausage Gravy Pizza", cat: "pizza_night", protein: "pork", cuisine: "american", format: "pizza", pools: ["breakfast", "handheld"], hook: "Brunch pie for the late shift", search: "breakfast sausage gravy pizza", img: { shotPreset: "pizza", lightingStyle: "morning_soft" } }),
];

const BIG_CREW = [
  goldenEntry({ slug: "batch-lasagna", title: "Giant Batch Lasagna", cat: "big_crew_feeders", protein: "beef", cuisine: "italian", format: "pasta", pools: ["beef", "comfort"], hook: "Feeds 12+ without drama", search: "large batch lasagna dinner", rec: { feedsHardScore: 10 } }),
  goldenEntry({ slug: "pulled-pork-mac", title: "Pulled Pork Mac and Cheese", cat: "big_crew_feeders", protein: "pork", cuisine: "american", format: "pasta", pools: ["bbq", "comfort"], hook: "BBQ meets mac — hall legend", search: "pulled pork mac and cheese bake", rec: { feedsHardScore: 9 } }),
  goldenEntry({ slug: "chicken-alfredo-bake", title: "Chicken Alfredo Bake", cat: "big_crew_feeders", protein: "chicken", cuisine: "italian", format: "pasta", pools: ["chicken", "pasta"], hook: "Creamy tray bake for seconds", search: "chicken alfredo pasta bake", rec: { feedsHardScore: 9 } }),
  goldenEntry({ slug: "big-chili", title: "Hall-Sized Beef and Bean Chili", cat: "big_crew_feeders", protein: "beef", cuisine: "american", format: "soup_chili", pools: ["hearty", "beef"], hook: "Double pot, triple appetite", search: "large batch beef chili", rec: { feedsHardScore: 10 } }),
  goldenEntry({ slug: "enchilada-casserole", title: "Chicken Enchilada Casserole", cat: "big_crew_feeders", protein: "chicken", cuisine: "mexican", format: "plated_main", pools: ["chicken", "handheld"], hook: "Stacked tortillas, melted cheese", search: "chicken enchilada casserole large", rec: { feedsHardScore: 9 } }),
  goldenEntry({ slug: "sausage-egg-bake", title: "Sausage Egg Bake for the Crew", cat: "big_crew_feeders", protein: "pork", cuisine: "american", format: "bake", pools: ["breakfast", "beef"], hook: "Morning feed after night shift", search: "large sausage egg breakfast bake", rec: { feedsHardScore: 10 } }),
  goldenEntry({ slug: "jambalaya", title: "Cajun Jambalaya for the Hall", cat: "big_crew_feeders", protein: "mixed", cuisine: "cajun", format: "one_pot", pools: ["hearty"], hook: "One pot, loud flavor, full table", search: "cajun jambalaya large batch", rec: { feedsHardScore: 10 } }),
  goldenEntry({ slug: "loaded-potato-feed", title: "Loaded Potato Feed", cat: "big_crew_feeders", protein: "beef", cuisine: "american", format: "bowl", pools: ["comfort", "beef"], hook: "Self-serve spuds for twenty", search: "loaded baked potato bar feed", rec: { feedsHardScore: 10 } }),
];

const BREAKFAST = [
  goldenEntry({ slug: "breakfast-burrito-bar", title: "Breakfast Burrito Bar", cat: "breakfast_brunch", protein: "pork", cuisine: "mexican", format: "handheld", pools: ["breakfast", "handheld"], hook: "Build burritos before the rig rolls", search: "breakfast burrito bar chorizo", img: { lightingStyle: "morning_soft" } }),
  goldenEntry({ slug: "pancake-short-stack", title: "Pancake Short Stack for the Crew", cat: "breakfast_brunch", protein: "vegetarian", cuisine: "american", format: "breakfast", pools: ["breakfast"], hook: "Fluffy stacks, bacon on the side", search: "buttermilk pancakes bacon breakfast", img: { lightingStyle: "morning_soft" } }),
  goldenEntry({ slug: "bacon-egg-hash", title: "Bacon Egg Hash Brown Skillet", cat: "breakfast_brunch", protein: "pork", cuisine: "american", format: "skillet", pools: ["breakfast"], hook: "Crispy potatoes, runny eggs", search: "bacon egg hash brown skillet", img: { lightingStyle: "morning_soft" } }),
  goldenEntry({ slug: "french-toast-casserole", title: "French Toast Casserole", cat: "breakfast_brunch", protein: "vegetarian", cuisine: "american", format: "bake", pools: ["breakfast"], hook: "Feed the hall before the bell", search: "french toast casserole bake", img: { lightingStyle: "morning_soft" } }),
  goldenEntry({ slug: "chorizo-breakfast-tacos", title: "Chorizo Breakfast Tacos", cat: "breakfast_brunch", protein: "pork", cuisine: "mexican", format: "tacos", pools: ["breakfast", "handheld"], hook: "Spicy chorizo, warm tortillas", search: "chorizo breakfast tacos", img: { lightingStyle: "morning_soft" } }),
  goldenEntry({ slug: "biscuits-gravy", title: "Biscuits and Gravy", cat: "breakfast_brunch", protein: "pork", cuisine: "american", format: "breakfast", pools: ["breakfast", "comfort"], hook: "Southern comfort for a slow morning", search: "sausage biscuits and gravy", img: { lightingStyle: "morning_soft" } }),
];

const GLOBAL = [
  goldenEntry({ slug: "thai-basil-chicken", title: "Thai Basil Chicken Stir Fry", cat: "global_flavors", protein: "chicken", cuisine: "thai", format: "skillet", pools: ["quick", "bowl"], hook: "Wok heat, holy basil, jasmine rice", search: "thai basil chicken stir fry", inspiration: "Serious Eats" }),
  goldenEntry({ slug: "bulgogi-bowls", title: "Korean Bulgogi Rice Bowls", cat: "global_flavors", protein: "beef", cuisine: "korean", format: "bowl", pools: ["bowl", "beef"], hook: "Sweet soy beef, pickled crunch", search: "korean bulgogi rice bowl", inspiration: "NYT Cooking" }),
  goldenEntry({ slug: "butter-chicken", title: "Butter Chicken", cat: "global_flavors", protein: "chicken", cuisine: "indian", format: "plated_main", pools: ["comfort"], hook: "Rich tomato butter sauce, naan-ready", search: "butter chicken dinner", inspiration: "Serious Eats" }),
  goldenEntry({ slug: "street-corn-chicken", title: "Mexican Street Corn Chicken Bowls", cat: "global_flavors", protein: "chicken", cuisine: "mexican", format: "bowl", pools: ["bowl", "handheld"], hook: "Elote flavors in a bowl", search: "mexican street corn chicken bowl", inspiration: "Bon Appétit" }),
  goldenEntry({ slug: "moroccan-meatballs", title: "Moroccan Spiced Lamb Meatballs", cat: "global_flavors", protein: "lamb", cuisine: "moroccan", format: "plated_main", pools: ["comfort"], hook: "Warm spices, couscous base", search: "moroccan lamb meatballs dinner", inspiration: "NYT Cooking" }),
  goldenEntry({ slug: "teriyaki-donburi", title: "Teriyaki Chicken Donburi", cat: "global_flavors", protein: "chicken", cuisine: "japanese", format: "bowl", pools: ["bowl", "quick"], hook: "Glazed chicken over steamed rice", search: "teriyaki chicken rice bowl", inspiration: "Serious Eats" }),
];

const GAME_DAY = [
  goldenEntry({ slug: "game-day-nachos", title: "Loaded Game Day Nachos", cat: "game_day_watch_party", protein: "beef", cuisine: "mexican", format: "bowl", pools: ["game_day", "handheld"], hook: "Chip mountain for the whole couch", search: "loaded nachos ground beef", rec: { gameDayMeal: true }, img: { lightingStyle: "game_day_bright" } }),
  goldenEntry({ slug: "buffalo-chicken-dip", title: "Buffalo Chicken Dip", cat: "game_day_watch_party", protein: "chicken", cuisine: "american", format: "bake", pools: ["game_day", "handheld"], hook: "Spicy dip, chips, zero utensils", search: "buffalo chicken dip baked", rec: { gameDayMeal: true }, img: { lightingStyle: "game_day_bright" } }),
  goldenEntry({ slug: "slider-bar", title: "Hall Slider Bar", cat: "game_day_watch_party", protein: "beef", cuisine: "american", format: "burger", pools: ["game_day", "handheld"], hook: "Mini burgers, max variety", search: "beef slider bar dinner", rec: { gameDayMeal: true }, img: { lightingStyle: "game_day_bright" } }),
  goldenEntry({ slug: "philly-egg-rolls", title: "Philly Cheesesteak Egg Rolls", cat: "game_day_watch_party", protein: "beef", cuisine: "american", format: "handheld", pools: ["game_day", "handheld"], hook: "Crunchy handhelds for watch night", search: "philly cheesesteak egg rolls", rec: { gameDayMeal: true }, img: { lightingStyle: "game_day_bright" } }),
];

const MEAL_PREP = [
  goldenEntry({ slug: "sunday-chili-batch", title: "Sunday Batch Chili", cat: "meal_prep_leftovers", protein: "beef", cuisine: "american", format: "soup_chili", pools: ["slow", "hearty"], hook: "Cook once, feed the week", search: "big batch beef chili meal prep", rec: { mealPrepFriendly: true } }),
  goldenEntry({ slug: "sheet-pan-meal-prep", title: "Sheet Pan Chicken Trays", cat: "meal_prep_leftovers", protein: "chicken", cuisine: "american", format: "sheet_pan", pools: ["healthy", "quick"], hook: "Portioned trays, reheat-ready", search: "sheet pan chicken trays", rec: { mealPrepFriendly: true } }),
];

const ROOKIE = [
  goldenEntry({ slug: "one-pot-chicken-rice", title: "One-Pot Chicken and Rice", cat: "rookie_friendly", protein: "chicken", cuisine: "american", format: "one_pot", pools: ["one_pot", "quick"], hook: "One pot, hard to mess up", search: "one pot chicken and rice dinner", rec: { rookieFriendly: 10, cleanupScore: 9 } }),
  goldenEntry({ slug: "five-ingredient-pasta", title: "Garlic Butter Pasta", cat: "rookie_friendly", protein: "vegetarian", cuisine: "italian", format: "pasta", pools: ["one_pot", "pasta"], hook: "Pantry pasta the rookies can nail", search: "garlic butter pasta simple", rec: { rookieFriendly: 10 } }),
];

export const GOLDEN_100_RECIPES = [
  ...CLASSICS,
  ...BBQ,
  ...COMFORT,
  ...HEALTHY,
  ...QUICK,
  ...PIZZA,
  ...BIG_CREW,
  ...BREAKFAST,
  ...GLOBAL,
  ...GAME_DAY,
  ...MEAL_PREP,
  ...ROOKIE,
];
