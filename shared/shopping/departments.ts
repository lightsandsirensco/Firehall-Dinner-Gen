/**
 * Smart Shopping — grocery aisle classification.
 *
 * Classifies what the shopper picks up, not the ingredient's role in the
 * recipe: "lime, for garnish" is still Produce. Rules run in order:
 *
 *   1. Purchase form in the name — frozen, canned, dried — decides first
 *      ("frozen spinach" is Frozen Foods, "canned corn" is Pantry).
 *   2. Compound names whose head word would mislead ("tomato paste",
 *      "peanut butter", "garlic powder", "coconut milk", "egg noodles").
 *   3. The ingredient lexicon, grouped by aisle.
 *
 * Anything unrecognized is "Other" — shown on the list, never dropped.
 * Bare woody herbs ("thyme") use the recipe unit as a hint: sprigs and
 * bunches are fresh (Produce), teaspoons are the dried jar.
 */

import { DEPARTMENTS, type Department } from "./types";

export { DEPARTMENTS };
export type { Department };

/** Display order when rendering a grouped list. */
export const DEPARTMENT_ORDER: Department[] = [...DEPARTMENTS];

type Rule = [RegExp, Department];

const w = (alternatives: string) => new RegExp(`\\b(?:${alternatives})\\b`);

/** Drinks, including alcohol used for cooking. Checked after vinegar so "red wine vinegar" isn't a drink. */
const BEVERAGES = w(
  "beer|lager|ale|stout|ipa|pilsner|wine|champagne|prosecco|bourbon|whiske?y|rum|vodka|tequila|brandy|cognac|" +
    "coffee|espresso|cold brew|tea|kombucha|soda|cola|root beer|ginger ale|club soda|seltzer|tonic water|sparkling water|" +
    "mineral water|coconut water|sports drink|gatorade|lemonade|apple cider|\\w+ nectar|nectar|sherry|vermouth|port wine|" +
    "(?:orange|apple|cranberry|pineapple|grape|tomato|vegetable|pomegranate|grapefruit|mango|cherry) juice",
);

/** Wines sold in the Asian / vinegar aisle rather than with drinks. */
const COOKING_WINES = w("rice wine|shaoxing(?: wine)?|mirin|cooking (?:wine|sherry)|sake");

const FROZEN_STAPLES = w(
  "hash browns?|tater tots?|ice cream|gelato|sorbet|frozen yogh?urt|puff pastry|phyllo|filo|edamame|" +
    "whipped topping|cool whip|waffles|texas toast|french fries|fries|pierogi|potstickers?|dumplings",
);

const SPICE_SEEDS = w("(?:cumin|coriander|fennel|mustard|caraway|celery|nigella|sesame|poppy|anise|dill) seeds?");

const SPICES = w(
  "salt|kosher salt|sea salt|flaky salt|msg|black pepper|white pepper|ground pepper|peppercorns?|cracked pepper|" +
    "cayenne|red pepper flakes|crushed red pepper|chil[ei] flakes|pepper flakes|aleppo pepper|lemon pepper|" +
    "paprika|smoked paprika|cumin|coriander|turmeric|cinnamon|nutmeg|allspice|cardamom|mace|ground cloves|whole cloves|" +
    "cloves|star anise|saffron|sumac|za.?atar|garam masala|curry powder|five.spice|chinese five spice|ras el hanout|" +
    "herbes de provence|italian seasoning|old bay|cajun|creole seasoning|adobo seasoning|sazon|furikake|" +
    "bay lea(?:f|ves)|dill weed|parsley flakes|ground ginger|ground mustard|dry mustard|mustard powder|" +
    "\\w+ powder|seasoning|seasonings|rub|spice blend|spice mix|chiles? de arbol|ancho chiles?|guajillo chiles?|" +
    "pasilla chiles?|dried chiles?|chipotle chil[ei] powder|urfa biber|fenugreek|asafoetida|celery salt|garlic salt|" +
    "annatto(?: seeds)?|achiote(?: seeds)?|fennel pollen|tellicherry(?: pepper)?|sichuan peppercorns?|" +
    "onion salt|seasoned salt|everything (?:bagel )?seasoning|taco seasoning|fajita seasoning|ranch (?:seasoning|mix|dressing mix)|" +
    "onion soup mix|gravy mix|pumpkin pie spice|apple pie spice|jerk seasoning|berbere|shichimi|togarashi",
);

/** Fresh herbs that are almost always bought fresh. */
const TENDER_HERBS = w("basil|cilantro|coriander leaves|parsley|mint|dill|chives|tarragon|chervil|lemongrass|shiso|thai basil|curry leaves|kaffir lime leaves|makrut lime leaves|epazote");
/** Herbs sold both fresh and dried — decided by "fresh", "dried", or the unit. */
const WOODY_HERBS = w("thyme|rosemary|sage|oregano|marjoram");

const MEAT_SEAFOOD = w(
  "chicken|turkey|duck|cornish hens?|beef|steaks?|ribeye|rib.?eye|sirloin|flank|skirt|chuck|brisket|short ribs?|tri.tip|" +
    "flat iron|strip steak|new york strip|tenderloin|filet mignon|roast|stew meat|ground meat|burgers?|patties|" +
    "pork|chops?|pork belly|pork shoulder|pork butt|ribs?|baby back|spare ribs|carnitas|lamb|veal|venison|bison|goat meat|" +
    "sausages?|bratwursts?|brats|chorizo|andouille|kielbasa|linguica|hot dogs?|frankfurters?|wieners|" +
    "bacon|pancetta|prosciutto|ham|salami|pepperoni|soppressata|capicola|mortadella|pastrami|corned beef|deli meat|" +
    "meatballs?|plant.based (?:ground|crumbles?|meat|sausage|burger)|beyond (?:beef|meat|burger)|impossible (?:beef|burger)|" +
    "salmon|cod|tilapia|halibut|mahi.?mahi|haddock|pollock|catfish|trout|snapper|swordfish|sea bass|branzino|tuna steaks?|" +
    "ahi|fish fillets?|white fish|whitefish|fish|shrimp|prawns|scallops?|crab|crabmeat|lobster|clams?|mussels?|" +
    "oysters?|calamari|squid|octopus|crawfish|wings?|drumsticks?|thighs?|breasts?|tenders|cutlets?",
);

const DAIRY_EGGS = w(
  "eggs?|egg whites?|egg yolks?|milk|whole milk|buttermilk|half.and.half|cream|heavy cream|whipping cream|sour cream|" +
    "cr[eè]me fra[iî]che|butter|ghee|yogh?urt|greek yogh?urt|kefir|cheese|cheeses|cheddar|mozzarella|parmesan|parmigiano|" +
    "pecorino|romano|provolone|swiss|gruy[eè]re|fontina|gouda|havarti|brie|camembert|feta|goat cheese|chevre|" +
    "blue cheese|gorgonzola|ricotta|cottage cheese|cream cheese|mascarpone|burrata|queso(?: fresco| blanco)?|cotija|" +
    "oaxaca|monterey jack|pepper jack|colby|american cheese|halloumi|paneer|manchego|asiago|labneh|tzatziki|" +
    "(?:almond|oat|soy|cashew|rice|coconut) milk beverage|(?:almond|oat|soy|cashew) milk|non.?dairy (?:milk|creamer)|creamer|" +
    "vegan (?:cheese|butter)|dairy.free (?:cheese|butter)|plant.based butter|margarine",
);

const BAKERY = w(
  "bread|breads|loaf|baguettes?|ciabatta|focaccia|sourdough|brioche|challah|rye bread|pumpernickel|buns?|rolls?|" +
    "slider buns|hoagies?|sub rolls?|bagels?|english muffins?|croissants?|pitas?|pita bread|naan|flatbreads?|lavash|" +
    "tortillas?|wraps?|pizza dough|pizza crusts?|pie crusts?|pie shells?|biscuits?|crescent rolls?|cornbread|muffins?|" +
    "texas toast|garlic bread|arepas",
);

const GRAINS = w(
  "rice|jasmine rice|basmati rice|brown rice|wild rice|arborio|sushi rice|quinoa|couscous|pearl couscous|bulgur|farro|" +
    "barley|freekeh|millet|oats|rolled oats|steel.cut oats|oatmeal|polenta|grits|" +
    "pasta|spaghetti|penne|rigatoni|ziti|fusilli|rotini|farfalle|bow.?ties?|linguine|fettuccine|tagliatelle|pappardelle|" +
    "bucatini|angel hair|capellini|lasagna(?: noodles| sheets)?|macaroni|elbows?|orzo|ditalini|shells|orecchiette|" +
    "cavatappi|campanelle|gemelli|radiatori|tortellini|ravioli|gnocchi|egg noodles|noodles|ramen|udon|soba|lo mein|" +
    "rice noodles|vermicelli|glass noodles|rice paper|mac and cheese",
);

const PRODUCE = w(
  "onions?|red onions?|yellow onions?|white onions?|sweet onions?|vidalia|green onions?|scallions?|spring onions?|" +
    "shallots?|leeks?|garlic|garlic cloves?|ginger|ginger root|galangal|turmeric root|" +
    "potato(?:es)?|russets?|yukon golds?|sweet potato(?:es)?|yams?|carrots?|celery|celery root|celeriac|" +
    "tomato(?:es)?|roma tomato(?:es)?|cherry tomato(?:es)?|grape tomato(?:es)?|heirloom tomato(?:es)?|tomatillos?|" +
    "lettuce|romaine|iceberg|butter lettuce|mixed greens|spring mix|salad greens|arugula|spinach|baby spinach|kale|" +
    "chard|collard greens|collards|mustard greens|cabbage|red cabbage|napa cabbage|bok choy|coleslaw mix|slaw mix|" +
    "brussels sprouts|broccoli|broccolini|broccoli rabe|cauliflower|zucchini|courgettes?|squash|butternut squash|" +
    "acorn squash|spaghetti squash|yellow squash|pumpkin|cucumbers?|eggplants?|aubergine|mushrooms?|cremini|portobello|" +
    "shiitake|oyster mushrooms|button mushrooms|asparagus|green beans|haricots verts|snap peas|sugar snap peas|snow peas|" +
    "okra|corn on the cob|ears? of corn|sweet corn|corn|avocados?|guacamole|pico de gallo|" +
    "bell peppers?|peppers?|jalape[nñ]os?|serranos?|poblanos?|anaheim|habaneros?|fresno chil(?:e|i|ie)s?|thai chil(?:e|i|ie)s?|" +
    "bird.?s eye chil(?:e|i|ie)s?|chil(?:e|i|ie)s?|chil(?:e|i) peppers?|shishito|padron|" +
    "radish(?:es)?|daikon|beets?|turnips?|parsnips?|rutabaga|jicama|fennel|fennel bulb|artichokes?|watercress|" +
    "sprouts|bean sprouts|microgreens|pea shoots|salad kit|" +
    "lemons?|limes?|oranges?|clementines?|mandarins?|grapefruit|apples?|pears?|bananas?|plantains?|berries|strawberr(?:y|ies)|" +
    "blueberr(?:y|ies)|raspberr(?:y|ies)|blackberr(?:y|ies)|cranberr(?:y|ies)|grapes?|pineapples?|mangos?|mangoes|peaches|peach|" +
    "nectarines?|plums?|cherr(?:y|ies)|watermelon|cantaloupe|honeydew|melon|kiwis?|pomegranates?|pomegranate (?:seeds|arils)|" +
    "figs?|dates|persimmons?|papaya|passion fruit|coconut|zest|lemon juice|lime juice|" +
    "tofu|tempeh|seitan|hummus|kimchi|wonton wrappers|egg roll wrappers|spring roll wrappers|dumpling wrappers|" +
    "thyme|rosemary|sage|oregano|marjoram|herbs",
);

const PANTRY = w(
  "broth|stock|bone broth|bouillon|better than bouillon|consomm[eé]|clam juice|" +
    "tomato paste|tomato sauce|tomato puree|passata|crushed tomato(?:es)?|diced tomato(?:es)?|stewed tomato(?:es)?|" +
    "whole peeled tomato(?:es)?|san marzano|fire.roasted tomato(?:es)?|sun.dried tomato(?:es)?|rotel|" +
    "beans|black beans|pinto beans|kidney beans|cannellini|navy beans|great northern beans|butter beans|lima beans|" +
    "refried beans|baked beans|chili beans|chickpeas|garbanzo(?: beans)?|lentils|split peas|black.eyed peas|" +
    "coconut milk|coconut cream|evaporated milk|sweetened condensed milk|condensed milk|powdered milk|milk powder|" +
    "cream of (?:mushroom|chicken|celery) soup|soup|chipotles? in adobo|chipotle peppers|adobo sauce|green chil(?:e|i|ie)s|" +
    "roasted red peppers|artichoke hearts|hearts of palm|water chestnuts|bamboo shoots|baby corn|creamed corn|" +
    "pumpkin pur[eé]e|applesauce|apple sauce|cranberry sauce|canned \\w+|tuna|sardines|anchovies|anchovy fillets|" +
    "flour|all.purpose flour|bread flour|whole wheat flour|almond flour|rice flour|masa(?: harina)?|cornmeal|cornstarch|" +
    "corn starch|arrowroot|tapioca|baking powder|baking soda|yeast|cream of tartar|gelatin|vanilla|vanilla extract|" +
    "\\w+ extract|cocoa|chocolate|chocolate chips|cacao|sprinkles|marshmallows?|" +
    "sugar|brown sugar|powdered sugar|confectioners.? sugar|granulated sugar|honey|maple syrup|agave|molasses|corn syrup|" +
    "simple syrup|stevia|sweetener|jam|jelly|preserves|marmalade|nutella|lemon curd|" +
    "peanut butter|almond butter|cashew butter|sunflower (?:seed )?butter|apple butter|" +
    "nuts|almonds|walnuts|pecans|peanuts|cashews|pistachios|pine nuts|hazelnuts|macadamia|" +
    "sunflower seeds|pumpkin seeds|pepitas|chia seeds|flax ?seeds?|flaxseed meal|hemp seeds|" +
    "raisins|craisins|dried (?:cranberries|apricots|cherries|figs|dates|fruit|mango)|prunes|" +
    "breadcrumbs|bread crumbs|panko|croutons|crackers|graham crackers?|saltines|stuffing mix|stuffing|" +
    "tortilla chips|chips|potato chips|corn chips|pretzels|popcorn|taco shells|tostadas?|tostada shells|" +
    "cereal|granola|cornflakes|corn flakes|rice cakes|protein powder|whey|nutritional yeast|" +
    "nori|seaweed|dried mushrooms|porcini|dried beans|pancake mix|waffle mix|biscuit mix|baking mix|bisquick|" +
    "cake mix|brownie mix|pudding mix|jello|gravy|pie filling|graham cracker crumbs|shredded coconut|coconut flakes",
);

const CONDIMENTS = w(
  "oil|oils|olive oil|extra.virgin olive oil|vegetable oil|canola oil|sesame oil|avocado oil|coconut oil|peanut oil|" +
    "grapeseed oil|sunflower oil|chili oil|truffle oil|cooking spray|nonstick spray|vinegar|" +
    "ketchup|mustard|dijon|whole.grain mustard|mayo|mayonnaise|aioli|miracle whip|relish|pickles?|pickled \\w+|" +
    "dill pickles|capers?|olives?|kalamata|castelvetrano|pepperoncini|banana peppers|giardiniera|sauerkraut|" +
    "horseradish|wasabi|hot sauce|sriracha|tabasco|frank.?s(?: redhot)?|buffalo sauce|wing sauce|bbq sauce|" +
    "barbecue sauce|steak sauce|a1|worcestershire|soy sauce|tamari|shoyu|coconut aminos|liquid aminos|fish sauce|" +
    "oyster sauce|hoisin|teriyaki|ponzu|sweet chil(?:e|i) sauce|chil(?:e|i) sauce|chil(?:e|i) garlic sauce|sambal(?: oelek)?|" +
    "gochujang|doenjang|ssamjang|miso|tahini|harissa|chil(?:e|i) crisp|chil(?:e|i) paste|curry paste|" +
    "(?:red|green|yellow) curry paste|shrimp paste|anchovy paste|garlic paste|ginger paste|salsa|salsa verde|" +
    "enchilada sauce|mole|marinara|pasta sauce|pizza sauce|alfredo(?: sauce)?|vodka sauce|pesto|chimichurri|" +
    "dressing|vinaigrette|ranch|caesar dressing|blue cheese dressing|italian dressing|hot honey|liquid smoke|" +
    "kecap manis|yuzu kosho|preserved lemons?|sauce|sauces|glaze|marinade",
);

/** Ordered: the first matching rule wins. */
const RULES: Rule[] = [
  // Household / non-food supplies ("coffee filters" is not coffee).
  [
    w(
      "(?:coffee )?filters?|paper towels?|napkins|paper plates|plastic wrap|cling wrap|(?:aluminum |tin )?foil|" +
        "parchment(?: paper)?|wax paper|zip.?(?:lock|top) bags?|trash bags?|garbage bags?|dish soap|sponges?|" +
        "charcoal|lighter fluid|wooden skewers|bamboo skewers|skewers|toothpicks|cupcake liners|cedar planks?|propane",
    ),
    "Other",
  ],
  [w("vinegar|vinaigrette|salad dressing|cooking spray|oil spray|nonstick spray|olive oil spray|shortening|lard"), "Condiments, Sauces & Oils"],
  [w("baking soda|baking powder|cocoa powder|cacao powder|protein powder|custard powder|milk powder|powdered milk"), "Pantry & Canned Goods"],
  [w("soda bread|pretzel dough"), "Bakery & Bread"],
  [COOKING_WINES, "Condiments, Sauces & Oils"],
  [BEVERAGES, "Beverages"],

  // Purchase form.
  [w("frozen"), "Frozen Foods"],
  [FROZEN_STAPLES, "Frozen Foods"],
  [w("canned|tinned|can of|cans of|\\d+.?oz\\.? cans?"), "Pantry & Canned Goods"],

  // Compounds whose head word would mislead.
  [SPICE_SEEDS, "Spices & Seasonings"],
  [w("sesame seeds?|poppy seeds?"), "Spices & Seasonings"],
  [w("(?:chicken|beef|vegetable|veggie|turkey|pork|fish|seafood|mushroom|bone) (?:broth|stock|bouillon|base)"), "Pantry & Canned Goods"],
  [w("cream of (?:mushroom|chicken|celery)(?: soup)?"), "Pantry & Canned Goods"],
  [w("ice cream"), "Frozen Foods"],
  [w("peanut butter|almond butter|cashew butter|sunflower (?:seed )?butter|apple butter"), "Pantry & Canned Goods"],
  [w("butter lettuce|butternut(?: squash)?"), "Produce"],
  [w("butter beans"), "Pantry & Canned Goods"],
  [w("coconut milk|coconut cream|evaporated milk|condensed milk|powdered milk|milk powder|milk chocolate"), "Pantry & Canned Goods"],
  [w("coconut aminos"), "Condiments, Sauces & Oils"],
  [w("coconut oil"), "Condiments, Sauces & Oils"],
  [w("shredded coconut|coconut flakes|flaked coconut|desiccated coconut"), "Pantry & Canned Goods"],
  [w("egg noodles"), "Pasta, Rice & Grains"],
  [w("egg roll wrappers|wonton wrappers|spring roll wrappers|dumpling wrappers"), "Produce"],
  [w("rice vinegar|rice wine"), "Condiments, Sauces & Oils"],
  [w("rice flour|rice cakes"), "Pantry & Canned Goods"],
  [w("cauliflower rice|riced cauliflower"), "Produce"],
  [w("flour tortillas?|corn tortillas?"), "Bakery & Bread"],
  [w("tortilla chips|corn chips|pita chips|bagel chips"), "Pantry & Canned Goods"],
  [w("bread crumbs|breadcrumbs|panko|bread flour|cornbread mix|stuffing"), "Pantry & Canned Goods"],
  [w("cornstarch|corn starch|cornmeal|corn flour|corn syrup|corn flakes|cornflakes"), "Pantry & Canned Goods"],
  [w("creamed corn|baby corn"), "Pantry & Canned Goods"],
  [w("lemon pepper|lime pepper"), "Spices & Seasonings"],
  [w("lemon curd|preserved lemons?"), "Condiments, Sauces & Oils"],
  [w("lemon juice|lime juice|lemon zest|lime zest|orange zest|lemon wedges|lime wedges"), "Produce"],
  [w("ginger ale"), "Beverages"],
  [w("ground ginger|ginger powder|garlic powder|garlic salt|granulated garlic|garlic granules|onion powder|onion flakes|dried minced onion|minced onion flakes|onion salt"), "Spices & Seasonings"],
  [w("pickled ginger|pickled jalape[nñ]os|pickled onions|pickled red onions"), "Condiments, Sauces & Oils"],
  [w("chil(?:e|i) powder|chil(?:e|i) flakes|chipotle powder|ancho (?:chil[ei] )?powder"), "Spices & Seasonings"],
  [w("chil(?:e|i) sauce|chil(?:e|i) crisp|chil(?:e|i) oil|chil(?:e|i) paste|chil(?:e|i) garlic sauce"), "Condiments, Sauces & Oils"],
  [w("chili beans"), "Pantry & Canned Goods"],
  [w("diced green chil(?:e|i|ie)s|green chil(?:e|i|ie)s|hatch chil(?:e|i|ie)s"), "Pantry & Canned Goods"],
  [w("dried (?:\\w+ )?chil(?:e|i|ie)s?|chiles de arbol|ancho chil(?:e|i|ie)s?|guajillo|pasilla|chipotle chil(?:e|i|ie)s"), "Spices & Seasonings"],
  [w("chipotles? in adobo|chipotle peppers|adobo sauce"), "Pantry & Canned Goods"],
  [w("roasted red peppers?|sun.dried tomato(?:es)?|artichoke hearts"), "Pantry & Canned Goods"],
  [w("banana peppers|pepperoncini|cherry peppers"), "Condiments, Sauces & Oils"],
  [w("salt and (?:black )?pepper|salt & pepper|black pepper|white pepper|ground pepper|peppercorns?|cracked pepper|pepper flakes"), "Spices & Seasonings"],
  [w("tomato (?:paste|sauce|puree)|crushed tomato(?:es)?|diced tomato(?:es)?|stewed tomato(?:es)?|whole peeled tomato(?:es)?|san marzano|fire.roasted tomato(?:es)?|rotel"), "Pantry & Canned Goods"],
  [w("garlic (?:chil[ei] )?sauce|garlic paste|ginger paste|garlic aioli"), "Condiments, Sauces & Oils"],
  [w("garlic butter"), "Dairy & Eggs"],
  [w("garlic bread|texas toast|cinnamon rolls?|pie crusts?|pie shells?|pie dough"), "Bakery & Bread"],
  [w("garlic|garlic cloves?|cloves? (?:of )?garlic|heads? of garlic"), "Produce"],
  [w("coriander leaves|fresh coriander|lettuce wraps|lettuce leaves|lettuce cups"), "Produce"],
  [
    w(
      "ground (?:sage|thyme|rosemary|oregano|cinnamon|nutmeg|cloves|cumin|coriander|mustard|allspice|cardamom|turmeric|fennel|chipotle|cayenne|paprika|black pepper|white pepper)|rubbed sage",
    ),
    "Spices & Seasonings",
  ],
  [w("dried (?:\\w+ )?mushrooms|dried shiitake|dried porcini|porcini"), "Pantry & Canned Goods"],
  [w("mustard greens"), "Produce"],
  [w("dry mustard|mustard powder|ground mustard"), "Spices & Seasonings"],
  [w("ranch (?:seasoning|mix|dressing mix)|taco seasoning|fajita seasoning|onion soup mix|gravy mix"), "Spices & Seasonings"],
  [w("sausages?|sausage links|bratwursts?|brats|hot dogs?|kielbasa|chorizo|andouille|scrapple|black pudding|burnt ends|chickens"), "Meat & Seafood"],
  [w("tzatziki(?: sauce)?|(?:mexican |chipotle )?crema"), "Dairy & Eggs"],
  [w("crispy (?:fried )?onions|french.fried onions|fried onions|fried shallots|crispy shallots|totopos|tortilla strips|roasted soybeans|soy nuts"), "Pantry & Canned Goods"],
  [w("chutney|tamarind(?: paste| concentrate)?|achiote paste|recado(?: rojo)?(?: paste)?|laksa paste|kitchen bouquet|nam pla|balsamic(?: glaze| syrup| reduction)?|saba|cornichons"), "Condiments, Sauces & Oils"],
  [w("coleslaw|tabbouleh(?: salad)?"), "Produce"],
  [w("seasoned (?:rice vinegar|breadcrumbs|bread crumbs)"), "Pantry & Canned Goods"],
  [w("salad dressing|dressing|vinaigrette"), "Condiments, Sauces & Oils"],
  [w("apple cider"), "Beverages"],
  [w("applesauce|apple sauce|cranberry sauce|pie filling"), "Pantry & Canned Goods"],
  [w("pizza dough|pizza crusts?"), "Bakery & Bread"],
  [w("cheese sauce|queso dip"), "Dairy & Eggs"],
  [w("mac and cheese|macaroni and cheese"), "Pasta, Rice & Grains"],
  [w("cream cheese|sour cream|heavy cream|whipping cream|whipped cream|cr[eè]me fra[iî]che"), "Dairy & Eggs"],
  [w("cream of tartar"), "Pantry & Canned Goods"],
  [w("graham crackers?|graham cracker crumbs"), "Pantry & Canned Goods"],
  [w("hot honey"), "Condiments, Sauces & Oils"],
  [w("green beans|haricots verts|snap peas|snow peas|sugar snap peas"), "Produce"],
  [w("bean sprouts"), "Produce"],
  [w("vanilla beans?"), "Spices & Seasonings"],
  [w("peas|green peas|sweet peas"), "Frozen Foods"],
  [w("tuna steaks?|ahi tuna|sushi.grade tuna"), "Meat & Seafood"],
  [w("tuna|sardines|anchovies|anchovy fillets"), "Pantry & Canned Goods"],
  [w("anchovy paste|fish sauce|oyster sauce|shrimp paste|clam juice"), "Condiments, Sauces & Oils"],
  [w("steak sauce|steak seasoning|chicken seasoning|poultry seasoning|pork rub|brisket rub|rib rub"), "Spices & Seasonings"],
  [w("meatballs?"), "Meat & Seafood"],

  // Fresh vs dried herbs.
  [w("fresh (?:thyme|rosemary|sage|oregano|marjoram|basil|cilantro|parsley|mint|dill|chives|tarragon|herbs?)"), "Produce"],
  [w("dried (?:thyme|rosemary|sage|oregano|marjoram|basil|cilantro|parsley|mint|dill|chives|tarragon|herbs?)"), "Spices & Seasonings"],
  [w("dried (?:beans|lentils|chickpeas|split peas)"), "Pantry & Canned Goods"],
  [w("dried (?:cranberries|apricots|cherries|figs|dates|fruit|mango|blueberries)"), "Pantry & Canned Goods"],
  [w("dried pasta"), "Pasta, Rice & Grains"],

  // Lexicon, most specific aisle first.
  [w("sauce|sauces|glaze|marinade|salsa|pesto|mayo|mayonnaise|aioli|ketchup|mustard|dijon|relish|hot sauce|sriracha|worcestershire|soy sauce|tamari|hoisin|teriyaki|gochujang|miso|tahini|harissa|sambal(?: oelek)?|curry paste|chimichurri|marinara"), "Condiments, Sauces & Oils"],
  [SPICES, "Spices & Seasonings"],
  [CONDIMENTS, "Condiments, Sauces & Oils"],
  [PANTRY, "Pantry & Canned Goods"],
  [GRAINS, "Pasta, Rice & Grains"],
  [BAKERY, "Bakery & Bread"],
  [DAIRY_EGGS, "Dairy & Eggs"],
  [MEAT_SEAFOOD, "Meat & Seafood"],
  [TENDER_HERBS, "Produce"],
  [PRODUCE, "Produce"],
];

const SPOON_UNIT = /^(?:tsp|teaspoons?|tbsp|tablespoons?|t|pinch(?:es)?|dash(?:es)?)$/i;

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Text the rules read: the name with its parentheticals (they often carry
 * "15 oz can"), plus a purchase form stated by a can unit or by notes that
 * lead with it ("frozen, thawed").
 */
function matchText(name: string, notes: string, unit: string): string {
  const base = normalize(name);
  const form = /^\s*(frozen|canned|dried)\b/i.exec(notes)?.[1]?.toLowerCase() ?? (/^cans?$/i.test(unit.trim()) ? "canned" : null);
  return form && !base.includes(form) ? `${form} ${base}` : base;
}

export interface ClassifyHints {
  /** Recipe unit ("sprigs", "tsp") — decides bare woody herbs. */
  unit?: string;
}

/** Classify an ingredient into the aisle it's bought from. Never throws; unknown items are "Other". */
export function classifyDepartment(name: string, notes = "", hints: ClassifyHints = {}): Department {
  const text = matchText(name, notes, hints.unit ?? "");
  const nameOnly = text.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

  if (WOODY_HERBS.test(nameOnly) && !/\b(?:fresh|dried|ground|seasoning|rub|sprigs?|bunch|leaves)\b/.test(nameOnly)) {
    const words = nameOnly.split(" ").filter((t) => !/^(?:of|a|chopped|minced)$/.test(t));
    if (words.length <= 2) {
      const unit = (hints.unit ?? "").trim();
      if (unit && SPOON_UNIT.test(unit)) return "Spices & Seasonings";
      if (/^oregano$|^marjoram$/.test(words.join(" ")) && !unit) return "Spices & Seasonings";
      return "Produce";
    }
  }

  const rule = RULES.find(([pattern]) => pattern.test(text));
  if (!rule) return "Other";
  if (rule[1] === "Produce" && /^jars?$/i.test((hints.unit ?? "").trim())) return "Condiments, Sauces & Oils";
  return rule[1];
}

const LEGACY_DEPARTMENTS: Record<string, Department> = {
  Proteins: "Meat & Seafood",
  "Dairy / Dairy Alternatives": "Dairy & Eggs",
  "Bakery / Dough": "Bakery & Bread",
  Frozen: "Frozen Foods",
  "Condiments & Sauces": "Condiments, Sauces & Oils",
};

export function isDepartment(value: unknown): value is Department {
  return typeof value === "string" && (DEPARTMENTS as readonly string[]).includes(value);
}

/**
 * A stored section name in current terms. Names from the old 8-section list
 * are reclassified from the item itself ("Pantry & Spices" split into three
 * aisles); a name that was never a department is returned as null.
 */
export function resolveStoredDepartment(stored: unknown, itemName: string, notes = ""): Department | null {
  if (isDepartment(stored)) return stored;
  if (typeof stored !== "string") return null;
  if (stored === "Pantry & Spices" || stored in LEGACY_DEPARTMENTS) {
    const fresh = classifyDepartment(itemName, notes);
    if (fresh !== "Other" || stored === "Pantry & Spices") return fresh;
    return LEGACY_DEPARTMENTS[stored] ?? "Other";
  }
  return null;
}

/** Sort key for a section title: known aisles in walking order, then anything custom, "Other" last. */
export function departmentSortIndex(title: string): number {
  const i = DEPARTMENT_ORDER.indexOf(title as Department);
  if (title === "Other") return DEPARTMENT_ORDER.length + 1;
  return i >= 0 ? i : DEPARTMENT_ORDER.length;
}
