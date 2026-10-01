/**
 * Food-choice guides with a cooking focus: lighter dinners that still taste
 * good, protein-forward crew meals, and station snacks.
 */

import { SRC } from "./guide-sources.js";
import { buildSeoGuide, meal } from "./seo-article-build.js";

const UPDATED = "2026-09-30T18:00:00.000Z";

export const NUTRITION_PERFORMANCE_ARTICLES = [
  buildSeoGuide({
    slug: "healthy-meals-that-still-taste-good",
    title: "Healthy Meals That Still Taste Good: Cooking Lighter for a Crew",
    seoTitle: "Healthy Meals That Taste Good: Lighter Cooking for a Crowd",
    subtitle:
      "Keeping lean chicken, pork and fish juicy, roasting vegetables people actually eat, sauces with big flavor, and a bowl line for 10.",
    description:
      "Healthy meals that still taste good for a crew: keeping lean chicken and fish juicy, roasting vegetables properly, bold sauces, and bowl lines.",
    keywords: [
      "healthy meals that taste good",
      "healthy firehall meals",
      "healthy meals for a crowd",
      "how to keep chicken breast juicy",
      "roasted vegetable times",
    ],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    readMinutes: 8,
    updatedAt: UPDATED,
    intro:
      "Lighter cooking has a reputation for tasting like a compromise, and usually that is a cooking problem rather than an ingredient problem. Lean meat dries out because it has little fat to protect it, vegetables taste flat when they are steamed or crowded onto a pan, and lower-fat dishes lose flavor when nothing replaces the richness. Each of those has a fix: salt lean protein ahead and pull it at the right temperature, roast vegetables hot and spread out, and let bold sauces carry the flavor. Serving it as a bowl line lets everyone choose their own portions of each part. This is cooking guidance for a crew, not medical or dietary advice.",
    sections: [
      {
        id: "lean-protein",
        heading: "Keep lean protein juicy",
        paragraphs: [
          "Chicken breast, pork loin and white fish have very little fat or connective tissue, so there is no margin once they pass their target temperature. Three habits keep them moist. Salt them ahead: about 3/4 tsp of kosher salt per pound (450 g), at least an hour or up to a day ahead in the fridge, which helps the meat hold onto its juices as it cooks. Even out the thickness, pounding breasts to about 3/4 in (2 cm) so the thin end doesn't overcook while the thick end finishes. And use a thermometer, pulling the meat as soon as it reaches temperature.",
          "The temperatures below are USDA minimums, with Health Canada's figure where it differs. Pork loin at 145°F (63°C) with a 3-minute rest is slightly pink and much juicier than pork cooked to the old 160°F standard.",
        ],
        table: {
          caption: "Cooking lean proteins without drying them out",
          columns: ["Protein", "Best method", "Done at", "What helps"],
          rows: [
            ["Chicken breast, pounded to 3/4 in", "Roast at 425°F (220°C) 15 to 18 min, or grill over medium", "165°F (74°C)", "Salt ahead; slice across the grain after 5 minutes' rest"],
            ["Pork tenderloin or loin", "Sear, then roast at 400°F (200°C)", "145°F (63°C) plus 3 min rest; Health Canada 160°F (71°C)", "A mustard or spice rub adds flavor without fat"],
            ["Salmon fillets", "Roast at 425°F (220°C) 10 to 12 min", "145°F (63°C); Health Canada 158°F (70°C)", "Skin side down on the pan protects the flesh"],
            ["Cod, haddock, other white fish", "Roast at 425°F (220°C) 8 to 12 min", "145°F (63°C); Health Canada 158°F (70°C)", "Flakes easily when done; top with a crumb or herb crust"],
            ["93% lean ground turkey", "Brown in batches", "165°F (74°C)", "Add tomato paste and a splash of stock; it is drier than beef"],
          ],
        },
      },
      {
        id: "vegetables",
        heading: "Roast vegetables so people eat them",
        paragraphs: [
          "Vegetables get eaten when they are browned and seasoned, not when they are soft and grey. Roast them at 425 to 450°F (220 to 230°C), cut to an even size, patted dry, and tossed with about 1 tbsp oil and 1/2 tsp salt per pound. Spread them in a single layer with space between pieces: crowded vegetables release water and steam instead of browning, which is the same problem as crowding meat. For 10 people, plan on 4 to 5 lb (1.8 to 2.3 kg) of vegetables across two half sheet pans.",
          "Finish them after they come out of the oven. A squeeze of lemon, a splash of vinegar, grated Parmesan or chopped herbs make a plain tray taste considered.",
        ],
        table: {
          caption: "Roasting times at 425°F (220°C) in a single layer",
          columns: ["Vegetable", "Cut", "Time"],
          rows: [
            ["Broccoli or cauliflower", "1 1/2 in (4 cm) florets", "18 to 25 min"],
            ["Carrots", "1/2 in (1 cm) coins or sticks", "25 to 30 min"],
            ["Potatoes or sweet potatoes", "3/4 in (2 cm) cubes", "30 to 40 min, turning once"],
            ["Brussels sprouts", "Halved, cut side down", "20 to 25 min"],
            ["Bell peppers and onions", "1/2 in (1 cm) strips", "20 to 25 min"],
            ["Zucchini", "3/4 in (2 cm) half moons", "15 to 20 min"],
            ["Green beans", "Trimmed, whole", "12 to 15 min"],
          ],
        },
      },
      {
        id: "sauces",
        heading: "Sauces that carry the flavor",
        paragraphs: [
          "A strong sauce is what makes a simple grilled chicken or roasted salmon taste like a finished dish. Herb, yogurt and citrus sauces add a lot of flavor for little fat, and they are all made ahead in a few minutes. Serve them on the side so people use as much as they like, and make more than you think you need; on a bowl line, the sauce runs out before anything else.",
        ],
        table: {
          caption: "Make-ahead sauces for 10",
          columns: ["Sauce", "Quantities for 10", "Goes with", "Keeps in the fridge"],
          rows: [
            ["Tzatziki", "2 cups Greek yogurt, 1 grated cucumber squeezed dry, 2 garlic cloves, 2 tbsp lemon juice, dill, salt", "Chicken, lamb, souvlaki, grain bowls", "3 to 4 days"],
            ["Chimichurri", "2 cups parsley, 4 garlic cloves, 1/2 cup olive oil, 1/4 cup red wine vinegar, chili flakes, salt", "Steak, chicken, roasted potatoes", "3 days"],
            ["Ginger-scallion", "1 cup sliced scallions, 1/4 cup grated ginger, 1/3 cup neutral oil, 1 tsp salt", "Rice bowls, salmon, chicken", "4 days"],
            ["Peanut-lime", "1/2 cup peanut butter, 1/4 cup soy sauce, 1/4 cup lime juice, 2 tbsp honey, warm water to thin", "Noodle and rice bowls, grilled chicken", "5 days"],
            ["Salsa verde (tomatillo)", "2 lb tomatillos broiled, 1 onion, 2 jalapeños, cilantro, lime, salt, blended", "Tacos, chicken, eggs", "5 days"],
          ],
        },
      },
      {
        id: "bowl-line",
        heading: "Build a bowl line for 10",
        paragraphs: [
          "A bowl line is the easiest way to serve a lighter dinner to a crew with different appetites. Everyone takes the same components but builds their own ratio, so nobody gets a fixed small plate. Set it up in this order: grain, protein, a cooked vegetable, a raw or crunchy vegetable, sauce, then toppings. Most of it can be made ahead, and leftovers become lunch the next day.",
        ],
        steps: [
          "Grain: 5 cups raw rice, farro or quinoa, cooked ahead and kept covered and warm.",
          "Protein: 4 to 5 lb (1.8 to 2.3 kg) raw boneless chicken, salmon or pork, roasted or grilled and sliced.",
          "Cooked vegetable: 4 lb of vegetables roasted on two half sheet pans.",
          "Crunchy vegetable: shredded cabbage, sliced cucumber or quick-pickled onions (1 sliced red onion in 1/2 cup vinegar, 1 tbsp sugar and 1 tsp salt for 20 minutes).",
          "Sauce: two from the table above, one creamy and one sharp.",
          "Toppings: lime wedges, herbs, toasted seeds, crumbled feta, hot sauce.",
        ],
      },
      {
        id: "swaps",
        heading: "Lighter swaps that don't cost flavor",
        paragraphs: [
          "Some swaps work well and some don't. Greek yogurt can replace half the sour cream in a dip or topping without anyone noticing. Breaded cutlets baked on a wire rack at 425°F (220°C) stay crisp on both sides, which frying doesn't manage without a lot of oil. Chili and pasta sauce can take an extra pound of vegetables or a can of beans. Ground turkey can stand in for beef if it is browned well and seasoned more boldly, since it has less fat carrying the flavor.",
          "Swaps that usually disappoint include fat-free cheese, which doesn't melt, and replacing all the pasta or rice with vegetable noodles for a hungry crew. It is better to keep the starch at a normal portion and make the vegetable side larger.",
        ],
      },
    ],
    practicalAdvice: [
      "Salt lean meat at least an hour ahead and pull it as soon as it reaches temperature.",
      "Roast vegetables at 425 to 450°F (220 to 230°C) in a single layer with space between pieces.",
      "Serve at least one strong sauce on the side; make more than seems necessary.",
      "Serve lighter dinners as a bowl line so people build their own portions.",
      "Make the vegetable side bigger rather than shrinking the starch.",
    ],
    mealRecommendations: [
      meal("greek-chicken-bowls", "Greek Chicken Power Bowls", "The bowl line above with tzatziki and a crunchy salad."),
      meal("ginger-salmon-bowls", "Ginger Salmon Rice Bowls", "Salmon roasted skin side down, with a ginger sauce."),
      meal("chicken-souvlaki", "Grilled Chicken Souvlaki", "Marinated skewers that stay juicy over medium heat."),
      meal("lemon-herb-salmon", "Lemon Herb Grilled Salmon", "A simple fish dinner finished with lemon and herbs."),
      meal("sheet-pan-fajitas", "Sheet Pan Chicken Fajitas", "Chicken and peppers roasted hot on two pans."),
      meal("mediterranean-chickpea", "Mediterranean Chickpea Bowls", "A meatless bowl that still fills a plate."),
      meal("turkey-burgers", "Black Bean Turkey Burgers", "Beans keep lean turkey patties moist."),
      meal("teriyaki-donburi", "Teriyaki Donburi", "A rice bowl with a glaze that carries the flavor."),
    ],
    faqs: [
      {
        question: "How do I keep chicken breast from drying out when cooking for a crowd?",
        answer:
          "Pound the breasts to an even 3/4 in (2 cm), salt them at least an hour ahead, and roast them at 425°F (220°C) on sheet pans with space between them. Start checking at 15 minutes and pull them at 165°F (74°C). Let them rest 5 minutes before slicing across the grain.",
      },
    ],
    relatedArticleSlugs: [
      "high-protein-firehall-meals",
      "healthy-station-snacks",
      "healthy-smoothies-at-the-hall",
      "bbq-night-at-the-station",
    ],
    sources: [SRC.usdaTemps, SRC.hcTemps],
  }),

  buildSeoGuide({
    slug: "high-protein-firehall-meals",
    title: "High-Protein Firehall Meals: Protein-Forward Dinners for a Crew",
    seoTitle: "High-Protein Meals for a Crowd: Portions, Sources, Recipes",
    subtitle:
      "How much protein common foods contain, how much raw meat to buy per person, cheaper protein sources, and breakfasts and sides that add more.",
    description:
      "High-protein meals for a crowd: protein in common foods, raw amounts to buy per person, cheaper sources, and dinners that deliver 35 to 40 g each.",
    keywords: [
      "high protein meals for a crowd",
      "high protein firehall meals",
      "protein per serving chicken",
      "cheap high protein meals",
      "high protein breakfast casserole",
    ],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    readMinutes: 8,
    updatedAt: UPDATED,
    intro:
      "A protein-forward crew dinner is mostly a shopping and portioning question: how much raw meat, fish, eggs or beans to buy so each plate carries a real serving, and how to add protein through sides and sauces without doubling the grocery bill. A good target for a hearty main is about 35 to 40 g of protein per plate, which is roughly 6 to 7 oz (170 to 200 g) of raw boneless meat or fish per person. This guide gives protein figures for common foods from USDA's FoodData Central, raw amounts to buy for 10, cheaper ways to add protein, and breakfasts and sides that contribute. Individual needs depend on body size and activity; this is cooking and shopping guidance, not medical advice.",
    sections: [
      {
        id: "protein-content",
        heading: "How much protein is in common foods",
        paragraphs: [
          "The figures below are rounded from USDA FoodData Central and are for typical cooked servings. Meat, poultry and fish lose water as they cook but keep almost all their protein, so a cooked portion has more protein per ounce than the same weight raw. That is why raw quantities in the next section look larger than the cooked servings here.",
        ],
        table: {
          caption: "Approximate protein in common foods (USDA FoodData Central, rounded)",
          columns: ["Food", "Serving", "Protein"],
          rows: [
            ["Chicken breast, cooked", "5 oz (140 g)", "About 44 g"],
            ["Chicken thigh, skinless, cooked", "5 oz (140 g)", "About 36 g"],
            ["90% lean ground beef, cooked", "4 oz (115 g)", "About 30 g"],
            ["Pork loin, cooked", "5 oz (140 g)", "About 39 g"],
            ["Salmon, cooked", "5 oz (140 g)", "About 31 to 35 g"],
            ["Shrimp, cooked", "5 oz (140 g)", "About 34 g"],
            ["Eggs", "3 large", "About 19 g"],
            ["Plain Greek yogurt", "3/4 cup (170 g)", "About 17 g"],
            ["Cottage cheese", "1 cup (225 g)", "About 25 g"],
            ["Firm tofu", "5 oz (140 g)", "About 24 g"],
            ["Lentils, cooked", "1 cup (200 g)", "About 18 g"],
            ["Black beans, cooked", "1 cup (170 g)", "About 15 g"],
            ["Quinoa, cooked", "1 cup (185 g)", "About 8 g"],
          ],
        },
      },
      {
        id: "buying",
        heading: "How much to buy for a protein-forward dinner",
        paragraphs: [
          "To put about 35 to 40 g of protein on each plate from the main alone, buy more than the standard 1/2 lb (225 g) of raw boneless meat per person. The amounts below are raw weights. Bone-in cuts need about half as much again, because bone and skin can be a third or more of the weight. Round up to the package and keep leftovers for lunches.",
          "Fish and shrimp cook in minutes, so a protein-forward seafood dinner for 10 is a sheet-pan job. Tofu needs pressing for 15 to 20 minutes under a weighted pan before cooking so it browns rather than steams.",
        ],
        table: {
          caption: "Raw amounts for about 35 to 40 g of protein per person",
          columns: ["Protein", "Raw per person", "For 10 people"],
          rows: [
            ["Boneless chicken breast", "6 oz (170 g)", "3 3/4 lb (1.7 kg)"],
            ["Boneless chicken thighs", "7 oz (200 g)", "4 1/2 lb (2 kg)"],
            ["90% lean ground beef or 93% ground turkey", "7 oz (200 g)", "4 1/2 lb (2 kg)"],
            ["Pork loin or tenderloin", "6 1/2 oz (185 g)", "4 lb (1.8 kg)"],
            ["Salmon fillets", "7 oz (200 g)", "4 1/2 lb (2 kg)"],
            ["Peeled raw shrimp", "7 oz (200 g)", "4 1/2 lb (2 kg)"],
            ["Firm tofu", "9 oz (250 g)", "5 1/2 lb (2.5 kg)"],
          ],
        },
      },
      {
        id: "cheaper-protein",
        heading: "Cheaper ways to add protein",
        paragraphs: [
          "Meat is the most expensive part of a high-protein dinner, so the cheaper approach is to let several foods contribute. Three 15 oz (425 g) cans of beans add about as much protein to a pot of chili as another 3/4 lb (340 g) of ground beef, at a fraction of the cost. Brown and green lentils blend into ground-meat sauces. Chicken thighs cost less than breasts and hold up better on a line. Eggs are one of the cheapest sources per gram, which makes frittatas, egg fried rice and breakfast bakes good value.",
          "Dairy helps too. A yogurt sauce, a cheese topping or cottage cheese mixed into a baked pasta each add protein without another pan. Bean sides, edamame and grain salads made with quinoa or farro add a few more grams per plate than plain rice.",
        ],
      },
      {
        id: "sides-sauces",
        heading: "Sides and sauces that add protein",
        paragraphs: [
          "Once the main is set, sides are the easiest place to add protein without changing the dinner. The swaps here cost little and take no more work than the usual side, and most can be made ahead.",
        ],
        table: {
          caption: "Protein-adding sides and sauces for 10",
          columns: ["Instead of", "Try", "Quantities for 10"],
          rows: [
            ["Plain rice", "Rice and black beans, or quinoa", "4 cups raw rice plus 3 cans beans, or 5 cups raw quinoa"],
            ["Sour cream", "Greek yogurt with lime and salt", "3 cups yogurt"],
            ["Green salad alone", "Salad with chickpeas and feta", "2 cans chickpeas, 8 oz (225 g) feta"],
            ["Garlic bread", "Edamame with sea salt", "2 lb (900 g) frozen shelled edamame, boiled 4 to 5 min"],
            ["Creamy dressing", "Yogurt-tahini sauce", "2 cups yogurt, 1/2 cup tahini, lemon, garlic"],
          ],
        },
      },
      {
        id: "breakfast",
        heading: "Protein at breakfast and overnight",
        paragraphs: [
          "Breakfast is where most crew meals fall short on protein, because pancakes and pastries carry very little. An egg bake fixes that and is made the night before. For 8: whisk 18 eggs with 2 cups of cottage cheese, 1 cup of milk and 1 tsp salt, add 1 lb (450 g) of cooked sausage or ham and 2 cups of cheese, pour into a 9 x 13 in (23 x 33 cm) dish, and bake at 350°F (175°C) for 45 to 55 minutes until the center reaches 160°F (71°C). Each portion has around 30 g of protein.",
          "For overnight or early-morning eating without a cook, keep hard-cooked eggs (a week in the fridge in their shells), Greek yogurt with granola stored separately so it stays crisp, and cottage cheese with fruit.",
        ],
      },
    ],
    practicalAdvice: [
      "Buy about 6 to 7 oz (170 to 200 g) of raw boneless meat or fish per person for a protein-forward main.",
      "Add beans or lentils to ground-meat dishes to raise protein at lower cost.",
      "Use Greek yogurt, cottage cheese and cheese to add protein through sauces and bakes.",
      "Swap plain rice or bread for bean, quinoa or edamame sides.",
      "Make breakfast an egg bake with cottage cheese rather than a pancake-only morning.",
    ],
    mealRecommendations: [
      meal("turkey-chili", "High-Protein Turkey Chili", "Ground turkey and beans together in one pot."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "The beef-and-bean approach to cheaper protein."),
      meal("greek-chicken-bowls", "Greek Chicken Power Bowls", "Chicken, chickpeas and tzatziki on one bowl line."),
      meal("chicken-souvlaki", "Grilled Chicken Souvlaki", "Skewers make even protein portions easy."),
      meal("sausage-egg-bake", "Sausage Egg Bake", "A protein-forward breakfast assembled the night before."),
      meal("ginger-salmon-bowls", "Ginger Salmon Rice Bowls", "Salmon roasted on sheet pans for a crew."),
    ],
    faqs: [
      {
        question: "How much chicken should I buy per person for a high-protein dinner?",
        answer:
          "About 6 oz (170 g) of raw boneless chicken breast or 7 oz (200 g) of boneless thighs per person, which cooks down to a portion with roughly 35 to 40 g of protein. For bone-in pieces, buy about 10 oz (280 g) per person.",
      },
    ],
    relatedArticleSlugs: [
      "healthy-meals-that-still-taste-good",
      "cheap-firehall-meals",
      "firehall-meal-prep-ideas",
      "healthy-smoothies-at-the-hall",
    ],
    sources: [SRC.usdaFoodData, SRC.usdaTemps, SRC.hcTemps, SRC.usdaEggs],
  }),

  buildSeoGuide({
    slug: "healthy-station-snacks",
    title: "Healthy Station Snacks: What to Stock and What to Make Ahead",
    seoTitle: "Healthy Snacks for a Crowd: What to Stock and Make Ahead",
    subtitle:
      "What to keep on the shelf and in the fridge, six snacks to make in batches, how long each keeps, and how to run a shared snack shelf.",
    description:
      "Healthy station snacks for a shared kitchen: what to stock, six make-ahead snacks with batch quantities, and how long each keeps in the fridge.",
    keywords: [
      "healthy station snacks",
      "healthy snacks for a crowd",
      "make ahead snacks",
      "how long do hard boiled eggs last",
      "homemade hummus",
    ],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    readMinutes: 7,
    updatedAt: UPDATED,
    intro:
      "Snacks in a shared kitchen get eaten when they are visible, ready to eat and clearly fresh. Healthy station snacks that sit unprepared in the back of the crisper get thrown out, while a labelled container of cut vegetables and hummus at eye level is gone by the end of the shift. The work is mostly an hour of batch prep once or twice a week: boil a couple of dozen eggs, make a batch of hummus, cut vegetables and portion nuts. This guide covers what to stock, six make-ahead snacks with quantities and fridge life, how to run a shared snack shelf, and safety for perishable snacks. It is about food and storage, not medical or dietary advice.",
    sections: [
      {
        id: "stock",
        heading: "What to keep stocked",
        paragraphs: [
          "Aim for a mix of ready-to-eat items that need no preparation and a few things made in batches. Fresh fruit that keeps well on the counter (apples, oranges, bananas) covers the no-effort end. Dairy and eggs give more staying power. Shelf-stable items such as nuts, whole-grain crackers and popcorn kernels fill the gaps between shopping trips.",
        ],
        table: {
          caption: "Snacks to stock and how to store them",
          columns: ["Category", "Examples", "Where to store"],
          rows: [
            ["Whole fruit", "Apples, oranges, bananas, pears", "Counter bowl; apples and pears last longer in the fridge"],
            ["Berries and grapes", "Blueberries, grapes, strawberries", "Fridge, unwashed until eaten"],
            ["Dairy", "Greek yogurt cups, string cheese, cottage cheese", "Fridge, eye-level shelf"],
            ["Eggs", "Hard-cooked eggs in the shell", "Fridge, in a labelled container"],
            ["Nuts and seeds", "Almonds, peanuts, pumpkin seeds", "Sealed bins in the pantry, or the fridge for longer storage"],
            ["Grains", "Whole-grain crackers, rice cakes, popcorn kernels, oats", "Pantry"],
            ["Dips", "Hummus, bean dip, tzatziki", "Fridge, dated"],
          ],
        },
      },
      {
        id: "make-ahead",
        heading: "Six snacks to make in batches",
        paragraphs: [
          "Each of these takes 10 to 30 minutes of active work and makes enough for a crew for several days. Label every container with the date it was made. Fridge life assumes the fridge is at 40°F (4°C) or below and that the food goes in within two hours of being made.",
        ],
        table: {
          caption: "Make-ahead snacks: quantities and fridge life",
          columns: ["Snack", "Batch", "Makes", "Keeps in the fridge"],
          rows: [
            ["Hard-cooked eggs", "24 eggs: cover by 1 in of water, bring to a boil, cover off the heat for 12 min, then ice water", "24 eggs", "1 week in the shell"],
            ["Hummus", "Two 15 oz cans chickpeas, 1/3 cup tahini, 1/4 cup lemon juice, 1 garlic clove, 1 tsp salt, ice water to blend", "About 4 cups", "4 days"],
            ["Cut vegetables", "3 lb of carrots, celery, peppers and snap peas, cut into sticks", "About 10 cups", "4 to 5 days, in a sealed container lined with paper towel"],
            ["Oat and peanut butter bites", "2 cups oats, 1 cup peanut butter, 1/2 cup honey, 1/2 cup chocolate chips, 2 tbsp ground flax", "About 30 bites", "1 week"],
            ["Yogurt parfait jars", "Greek yogurt and fruit in jars, granola in a separate container", "As many jars as needed", "3 days; add granola just before eating"],
            ["Stovetop popcorn", "1/2 cup kernels and 3 tbsp oil in a covered 6 qt pot, shaken over medium-high heat", "About 14 to 16 cups", "1 week in an airtight container at room temperature"],
          ],
        },
      },
      {
        id: "eggs",
        heading: "Hard-cooked eggs that peel easily",
        paragraphs: [
          "Hard-cooked eggs are the most useful make-ahead snack, and they only cause problems when they are hard to peel or overcooked, with a green ring around the yolk. The green ring is a harmless reaction between the yolk and white that comes from cooking too long or cooling too slowly. Eggs a week or more old peel more easily than very fresh ones.",
        ],
        steps: [
          "Put eggs in a single layer in a pot and cover with cold water by 1 in (2.5 cm).",
          "Bring to a full boil over high heat, then turn off the heat, cover, and leave for 12 minutes for large eggs.",
          "Move the eggs straight into a bowl of ice water for at least 5 minutes to stop the cooking.",
          "Refrigerate in their shells, dated, and use within a week. Peeled eggs are best eaten the same day.",
        ],
      },
      {
        id: "shelf",
        heading: "Running a shared snack shelf",
        paragraphs: [
          "Put one shelf of the fridge at eye level aside for crew snacks and keep everything on it in clear, labelled containers. One person on the rotation restocks it on a set day each week and throws out anything past its date, which keeps people trusting what they find there. Portion nuts and trail mix into small containers or bags, since a big open bag goes stale and gets picked through.",
          "Pay for snacks from the same grocery fund as meals so the shelf doesn't depend on one person buying for everyone. Keep a fruit bowl on the counter where people pass, because food that is visible gets eaten first.",
        ],
      },
      {
        id: "safety",
        heading: "Keeping perishable snacks safe",
        paragraphs: [
          "Yogurt, cheese, eggs, hummus, cut fruit and cut vegetables are perishable and shouldn't be out of the fridge for more than two hours in total. That includes time sitting on the counter during a long afternoon. Cut melon and other cut fruit must go back in the fridge. Put out small amounts and refill them, rather than leaving a large bowl out all day.",
          "Nuts and peanut butter are common allergens. If anyone on the crew has a nut allergy, keep nut snacks in their own sealed, labelled bin away from other food, and use a separate scoop for each container.",
        ],
      },
    ],
    practicalAdvice: [
      "Batch-prep eggs, hummus and cut vegetables once or twice a week and date every container.",
      "Keep snacks at eye level in clear containers; visible food gets eaten.",
      "Assign weekly restocking to the rotation and clear out anything past its date.",
      "Keep perishable snacks out of the fridge for no more than two hours in total.",
      "Store nut snacks in their own labelled bin if anyone has a nut allergy.",
    ],
    mealRecommendations: [
      meal("mediterranean-chickpea", "Mediterranean Chickpea Bowls", "Make extra chickpeas for snack boxes with hummus and vegetables."),
      meal("greek-chicken-bowls", "Greek Chicken Power Bowls", "Leftover chicken and tzatziki make a quick snack plate."),
      meal("turkey-chili", "High-Protein Turkey Chili", "Portion into cups for a small, filling snack between meals."),
    ],
    faqs: [
      {
        question: "How long do hard-boiled eggs last in the fridge?",
        answer:
          "About a week in their shells, according to USDA, as long as they were refrigerated within two hours of cooking. Peeled eggs are best eaten the same day. Date the container so the next shift knows when they were made.",
      },
    ],
    relatedArticleSlugs: [
      "healthy-smoothies-at-the-hall",
      "firehall-meal-prep-ideas",
      "best-meals-24-hour-shift",
      "firehall-kitchen-culture",
    ],
    sources: [SRC.usdaEggs, SRC.usdaDangerZone, SRC.fdaAllergies, SRC.usdaKeepFoodSafe],
  }),
];
