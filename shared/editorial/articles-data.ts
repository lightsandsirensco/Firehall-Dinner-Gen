/**
 * Editorial guides — source of truth. Run `npm run content:generate-guides` to publish JSON.
 */

import type { EditorialArticle } from "./content-schema.js";
import { SRC } from "./guide-sources.js";
import { NUTRITION_PERFORMANCE_ARTICLES } from "./nutrition-articles-data.js";
import { SEO_TRAFFIC_ARTICLES } from "./seo-articles-data.js";
import { STATION_LIFESTYLE_ARTICLES } from "./lifestyle-articles-data.js";
import { HEALTHY_HALL_SMOOTHIES_ARTICLE } from "./smoothie-guide-article.js";
import { CORNERSTONE_BLOG_ARTICLES } from "./cornerstone-articles-data.js";
import { CREW_COOKING_GUIDES } from "./crew-cooking-guides-data.js";
import { buildSeoGuide, meal } from "./seo-article-build.js";

const UPDATED = "2026-09-30T18:00:00.000Z";

const CORE_EDITORIAL_ARTICLES: EditorialArticle[] = [
  buildSeoGuide({
    slug: "bbq-night-at-the-station",
    title: "BBQ Night at the Fire Station: How to Grill for a Crowd",
    seoTitle: "How to Grill for a Crowd: Zones, Capacity and Timing",
    subtitle:
      "A two-zone fire, how much fits on the grill, times and temperatures for burgers, chicken and sausages, and a schedule for grill night for 12.",
    description:
      "How to grill for a crowd of 8 to 20: two-zone fires, grill capacity, times and temperatures for burgers, chicken and sausages, and safe holding.",
    keywords: [
      "grill for a crowd",
      "fire station bbq",
      "grilling for a large group",
      "two zone fire",
      "grilled chicken thigh temperature",
    ],
    topic: "station_cooking",
    pillar: "recipes_meals",
    readMinutes: 8,
    updatedAt: UPDATED,
    intro:
      "Grilling for a crowd fails in two familiar ways: chicken that is charred outside and underdone at the bone, and a grill too small for the amount of food, so the first plates are cold before the last burgers are done. Both come down to setup rather than recipe. A two-zone fire lets you sear over high heat and then finish thicker pieces gently with the lid closed. Knowing how much your grill holds tells you how many rounds you need and what to start first. This guide covers the two-zone setup, grill capacity, times and temperatures for the usual cookout foods, sauce and flare-ups, food safety outdoors, and a schedule for 12.",
    sections: [
      {
        id: "two-zone",
        heading: "Set up a two-zone fire",
        paragraphs: [
          "A two-zone fire has a hot side for searing and a cooler side for cooking through. On a charcoal grill, pile the lit coals on one half of the grate and leave the other half empty. On a gas grill, run the burners on one side at high and turn the others to low or off. Thin foods such as burgers, sausages that are already cooked, and boneless chicken cook entirely over direct heat. Thick or bone-in pieces start on the cool side with the lid closed, which works like an oven, then move to the hot side for a few minutes to crisp and char.",
          "Aim for about 450 to 550°F (230 to 290°C) over the direct side and 325 to 375°F (165 to 190°C) on the indirect side with the lid closed. A lid thermometer is close enough for the indirect side. The two zones also give you somewhere to move food during a flare-up and a place to hold cooked food hot while the next round cooks.",
        ],
      },
      {
        id: "capacity",
        heading: "How much fits on the grill",
        paragraphs: [
          "Count your grill's capacity before deciding the menu. A two-zone fire halves the direct cooking area, so a grill that holds 14 burgers over full heat holds about 7 at a time over the hot side. For 12 people eating two burgers each, that is several rounds. It is usually faster to cook the bone-in chicken or sausages first on the indirect side, hold them, and use the whole grate for burgers at the end.",
        ],
        table: {
          caption: "Approximate grill capacity with space between pieces",
          columns: ["Grill", "Main cooking area", "4 in (10 cm) burger patties, full grate", "Bone-in chicken thighs, indirect side"],
          rows: [
            ["22 in (57 cm) charcoal kettle", "About 360 sq in", "12 to 14", "10 to 12"],
            ["3-burner gas grill", "About 400 to 450 sq in", "14 to 18", "12 to 14"],
            ["4 to 5 burner gas grill", "About 550 to 650 sq in", "20 to 25", "16 to 20"],
            ["36 in (91 cm) flat-top griddle", "About 750 sq in", "24 to 28 smashed patties", "Not suited to bone-in chicken"],
          ],
        },
      },
      {
        id: "times",
        heading: "Quantities, times and temperatures",
        paragraphs: [
          "Cook times are a guide; the thermometer decides. Push it into the thickest part of the meat, away from bone. The temperatures are the USDA minimums, with Health Canada's figure where it differs. Bone-in chicken thighs and drumsticks are safe at 165°F (74°C), but they are juicier and more tender taken to 175 to 185°F (80 to 85°C), because their connective tissue needs the extra heat to soften.",
        ],
        table: {
          caption: "Grilling guide for common cookout foods",
          columns: ["Food", "Per person", "Heat", "Time", "Done at"],
          rows: [
            ["Burgers, 1/3 lb and 3/4 in thick", "1 to 2", "Direct, medium-high", "4 to 5 min per side", "160°F (71°C)"],
            ["Raw sausages, bratwurst", "1 to 2", "Indirect, then direct to brown", "15 to 20 min, then 3 to 4 min", "160°F (71°C); poultry sausage 165°F (74°C)"],
            ["Precooked hot dogs", "1 to 2", "Direct, medium", "5 to 7 min, turning", "Steaming hot, 165°F (74°C)"],
            ["Bone-in chicken thighs or drumsticks", "3/4 lb (340 g)", "Indirect, lid closed, then direct", "30 to 40 min, then 3 to 5 min", "165°F (74°C) minimum; best at 175 to 185°F"],
            ["Boneless chicken thighs", "1/2 lb (225 g)", "Direct, medium", "5 to 6 min per side", "165°F (74°C)"],
            ["Chicken breast, pounded to 3/4 in", "1/2 lb (225 g)", "Direct, medium", "5 to 6 min per side", "165°F (74°C)"],
            ["Pork chops, 1 in thick", "1", "Direct, medium-high", "4 to 5 min per side, rest 3 min", "145°F (63°C); Health Canada 160°F (71°C)"],
            ["Steak, 1 in thick", "1/2 lb (225 g)", "Direct, high", "4 to 5 min per side, rest 3 min", "145°F (63°C) USDA minimum"],
            ["Corn on the cob, husked", "1 ear", "Direct, medium", "10 to 12 min, turning", "Kernels tender and spotted brown"],
          ],
        },
      },
      {
        id: "sauce-flare-ups",
        heading: "Sauce, flare-ups and charring",
        paragraphs: [
          "Most barbecue sauces are high in sugar, and sugar burns quickly over direct heat. Cook the meat almost all the way first, then brush the sauce on during the last 5 to 10 minutes on the indirect side, turning once or twice so it sets into a sticky glaze rather than a black crust. Serve extra sauce at the table from a clean bowl, never from the one used on raw meat.",
          "Flare-ups come from fat dripping onto the coals or burners. Trim thick fat, don't press burgers down with a spatula, and when a flare-up starts, move the food to the indirect side and close the lid, which starves the flames of air. Empty the grease tray before a big cook, keep the lid within reach, and never use water on a grease fire.",
        ],
      },
      {
        id: "safety",
        heading: "Food safety at a cookout",
        paragraphs: [
          "Outdoor cooking makes cross-contamination easy, because raw meat, cooked meat and salad all end up on the same small table. Use one set of tongs and one platter for raw meat and a clean set for cooked, and don't put cooked food back on the plate that carried it raw. Marinate in the fridge rather than on the counter, and if you want to use a marinade as a sauce, set some aside before it touches raw meat or boil it first.",
          "Hold cooked meat hot on the indirect side of the grill, or covered in a pan in a 200°F (95°C) oven, at 140°F (60°C) or above. Cold sides, salads and toppings stay in the fridge or on ice until serving. Food should not sit out for more than two hours, or one hour when it is above 90°F (32°C) outside.",
        ],
      },
      {
        id: "schedule",
        heading: "A grill night schedule for 12",
        paragraphs: [
          "This menu is bone-in chicken thighs, sausages, burgers, corn and slaw for 12, cooked on a mid-size gas grill or a kettle. The rule is to cook the slowest, most forgiving food first and hold it, and finish with the quickest food on the full grate.",
        ],
        steps: [
          "Earlier in the day: season the chicken, shape 12 to 18 patties and chill them, and make the slaw with the dressing kept separate.",
          "75 minutes before: light a full chimney of charcoal (15 to 20 minutes until the coals are covered in gray ash) or preheat the gas grill for 10 to 15 minutes.",
          "60 minutes before: put 9 lb (4 kg) of bone-in chicken on the indirect side, lid closed.",
          "35 minutes before: add the raw sausages to the indirect side. Move the chicken to the hot side for 3 to 5 minutes to crisp, then into a covered pan in a low oven.",
          "20 minutes before: brown the sausages over direct heat and move them to the oven. Grill the corn.",
          "12 minutes before: cook the burgers over the whole grate, adding cheese in the last minute. Toast the buns for 30 to 60 seconds. Dress the slaw and serve.",
        ],
      },
    ],
    practicalAdvice: [
      "Set up two zones: sear over direct heat and cook thick or bone-in pieces over indirect heat with the lid closed.",
      "Count your grill's capacity and cook the slowest food first, then hold it hot.",
      "Brush sugary sauces on only in the last 5 to 10 minutes, over indirect heat.",
      "Use separate tongs and platters for raw and cooked meat.",
      "Check every batch with a thermometer: 160°F (71°C) for burgers, 165°F (74°C) or more for chicken.",
    ],
    mealRecommendations: [
      meal("pulled-pork", "Pulled Pork Sandwiches", "Smoke or oven-braise ahead so the grill is free for sides and burgers."),
      meal("beer-can-chicken", "Beer Can Chicken", "Whole birds cooked entirely on the indirect side."),
      meal("jerk-chicken", "Jerk Chicken", "Bone-in thighs that suit the two-zone method."),
      meal("bbq-chicken-bowls", "BBQ Chicken Bowls", "Grilled chicken served as a bowl line instead of on buns."),
      meal("chicken-souvlaki", "Grilled Chicken Souvlaki", "Skewers over direct heat; soak wooden skewers first."),
      meal("cedar-plank-salmon", "Cedar Plank Grilled Salmon", "Cooks on the indirect side on a soaked plank, so it won't stick."),
      meal("grilled-corn-cotija", "Grilled Street Corn", "A side that uses the direct zone while meat rests."),
      meal("texas-central-brisket-crew", "Smoked Brisket", "A long smoke for a day with a full afternoon to tend the fire."),
    ],
    faqs: [
      {
        question: "How long before dinner should I light the grill?",
        answer:
          "For charcoal, allow 15 to 20 minutes for a chimney of coals to ash over and another 5 to 10 minutes for the grate to heat. A gas grill needs 10 to 15 minutes with the lid closed. If bone-in chicken is on the menu, light it about 75 minutes before you want to eat.",
      },
    ],
    relatedArticleSlugs: [
      "best-firehouse-meals-large-crews",
      "cooking-for-10-firefighters",
      "station-kitchen-essentials",
      "firehall-taco-night-ideas",
    ],
    sources: [SRC.usdaTemps, SRC.hcTemps, SRC.usdaDangerZone, SRC.usdaKeepFoodSafe],
  }),

  buildSeoGuide({
    slug: "planning-tonights-station-dinner",
    title: "Planning Tonight's Station Dinner: How to Choose, Time and Organize It",
    seoTitle: "How to Plan Tonight's Station Dinner: Timing and Thawing",
    subtitle:
      "Choose by time and crew size, check what needs thawing, work backward from serving time, split the jobs, and keep five pantry dinners in reserve.",
    description:
      "How to plan tonight's station dinner: choose by time and crew size, work out when to thaw and start, split the jobs, and keep five pantry dinners ready.",
    keywords: [
      "plan tonight's station dinner",
      "what to cook for dinner tonight for a group",
      "plan a dinner for a crew",
      "dinner timeline",
      "pantry dinners",
    ],
    topic: "meal_planning",
    pillar: "operations_how_to",
    readMinutes: 8,
    updatedAt: UPDATED,
    intro:
      "Most station dinners get decided too late. By 17:00, the choice has already been made for you by what is thawed, which appliance is free and how much time is left. Planning tonight's dinner comes down to three questions asked by mid-afternoon: how long before people want to eat, how many are eating, and what equipment is available. The answers narrow the options to a few formats. After that, work backward from serving time to find when meat must be thawed, when to shop and when cooking has to start. This guide gives a decision table, a thawing chart, a sample timeline with jobs split between people, and five pantry dinners for nights when nothing was planned.",
    sections: [
      {
        id: "choose",
        heading: "Choose by time, crew size and equipment",
        paragraphs: [
          "Start with time, because it rules out the most. Then check crew size: above 8 people, choose a line or a tray bake rather than anything plated or cooked in single portions. Finally, check the equipment. If the oven is already in use, pick something from the stovetop or slow cooker column; if you only have a stovetop, a Dutch oven covers braises and one-pot rice dishes.",
        ],
        table: {
          caption: "Dinner formats by the time available",
          columns: ["Time before eating", "Formats that fit", "Examples"],
          rows: [
            ["Under 30 minutes", "Skillet, stir-fry, quesadillas, quick pasta, shrimp", "Philly cheesesteak skillet, garlic butter shrimp, quesadillas"],
            ["30 to 60 minutes", "Sheet-pan dinners, rice bowls, tacos, burgers", "Sheet-pan fajitas, teriyaki bowls, smash burgers"],
            ["60 to 90 minutes", "Baked pasta, roast chicken pieces, chili, one-pot rice", "Baked ziti, enchilada casserole, jambalaya"],
            ["2 hours or more", "Braises, pot roast, pulled pork, lasagna from scratch", "Beef stew, pulled pork, batch lasagna"],
          ],
        },
      },
      {
        id: "thawing",
        heading: "Check the freezer first: thawing decides the menu",
        paragraphs: [
          "Frozen meat is the most common reason a planned dinner becomes a takeout order. The fridge is the safest way to thaw but the slowest: even 1 lb (450 g) of ground meat or boneless chicken needs about a full day, and larger packages need about 24 hours for every 4 to 5 lb. If dinner is tonight and the meat is still frozen at noon, use cold water or the microwave, or change the menu.",
          "Cold-water thawing takes about 30 minutes per pound. Keep the meat in a sealed bag, submerge it, and change the water every 30 minutes so it stays cold. Food thawed in cold water or the microwave has to be cooked straight away. Thin, separated pieces can also be cooked from frozen, which takes about 50 percent longer.",
        ],
        table: {
          caption: "Safe thawing methods and times",
          columns: ["Method", "1 lb (450 g)", "3 to 4 lb (1.4 to 1.8 kg)", "After thawing"],
          rows: [
            ["Refrigerator", "About 24 hours", "About 24 hours", "Keeps 1 to 2 days (ground meat, poultry) or 3 to 5 days (roasts, chops)"],
            ["Cold water, changed every 30 min", "About 30 minutes to 1 hour", "2 to 3 hours", "Cook immediately"],
            ["Microwave defrost", "Minutes", "Minutes, turning often", "Cook immediately; edges may start to cook"],
            ["Cook from frozen", "No thawing", "No thawing", "Allow about 50 percent more cooking time; never in a slow cooker"],
          ],
        },
      },
      {
        id: "timeline",
        heading: "Work backward from serving time",
        paragraphs: [
          "Once the dish is chosen, write the serving time down and count back. This example is baked ziti, salad and garlic bread for 8, served at 18:00. The tray bake is forgiving once assembled, so most of the risk is in starting late. Putting the cook's name, the dish and the serving time on the board also means that if the cook is called away partway through, whoever takes over knows exactly what stage it is at.",
          "Split the jobs before cooking starts. The cook owns the menu and timing, one helper does prep and sets the table, and someone other than the cook leads cleanup. Ask about allergies once when the menu is posted, write them down, and keep an allergen-free portion separate before anything is mixed in.",
        ],
        steps: [
          "14:00: decide the dish, check the fridge, pantry and freezer, and write the shopping list.",
          "14:30: shop. Buy 2 lb (900 g) of ziti, 1 1/2 lb (680 g) sausage, two 24 oz jars of marinara, 2 lb ricotta, 1 1/2 lb mozzarella, salad greens and two loaves of bread.",
          "16:00: brown the sausage, simmer it with the sauce, and boil the pasta 2 minutes short of the package time.",
          "16:45: assemble two 9 x 13 in (23 x 33 cm) dishes. Cover them and refrigerate if dinner might slip.",
          "17:10: bake covered at 375°F (190°C) for 30 minutes, then uncovered for 10 to 15 minutes until the center reaches 165°F (74°C).",
          "17:45: toast the garlic bread, dress the salad, and set out plates. Serve at 18:00 and put leftovers away within two hours.",
        ],
      },
      {
        id: "pantry-dinners",
        heading: "Five dinners from the pantry when nothing was planned",
        paragraphs: [
          "A short list of shelf-stable and freezer staples makes it possible to cook a real dinner for a crew without shopping. Keep dry pasta, long-grain rice, canned tomatoes, canned beans, tortillas, eggs, cheese, frozen vegetables, a couple of pounds of frozen ground meat, garlic, onions and a basic spice shelf. With those, all five dinners below are possible in under 45 minutes for 8 people.",
        ],
        table: {
          caption: "Pantry dinners for 8",
          columns: ["Dinner", "What it uses", "Time"],
          rows: [
            ["Bean and cheese quesadillas with salsa", "16 tortillas, 3 cans beans, 1 1/2 lb cheese, jarred salsa", "25 minutes"],
            ["Pasta with quick tomato sauce", "2 lb pasta, two 28 oz cans crushed tomatoes, garlic, chili flakes, Parmesan", "25 minutes"],
            ["Egg fried rice", "8 cups cold cooked rice, 12 eggs, 2 lb frozen mixed vegetables, soy sauce", "20 minutes, with rice cooked earlier"],
            ["Quick beef and bean chili", "2 1/2 lb ground beef cooked from frozen, 3 cans beans, 2 cans tomatoes, chili powder", "45 minutes"],
            ["Potato and cheese frittata", "18 eggs, 2 lb frozen diced potatoes, 2 cups cheese, onion", "35 minutes; eggs to 160°F (71°C)"],
          ],
        },
      },
      {
        id: "plan-changes",
        heading: "When the plan changes",
        paragraphs: [
          "If more people turn up than you planned for, add starch and sides rather than a second protein: another pound of pasta, a pot of rice, or more bread stretches a meal quickly and cheaply. If fewer eat, stop assembling the second tray and refrigerate it for the next shift rather than baking everything.",
          "If a call interrupts cooking, turn off the heat and cover everything, and don't leave meat partly cooked to finish later. Food that won't be eaten within two hours goes in the fridge. The interruption guide covers dinners built to handle that kind of night.",
        ],
      },
    ],
    practicalAdvice: [
      "Decide dinner by mid-afternoon: time available first, then crew size, then equipment.",
      "Check the freezer early; fridge thawing takes about a day even for small packages.",
      "Write the serving time down and count back to when cooking must start.",
      "Split the jobs before cooking: cook, prep helper, and a separate cleanup lead.",
      "Keep enough pantry staples for five no-shop dinners.",
    ],
    mealRecommendations: [
      meal("baked-ziti", "Baked Ziti", "The worked timeline above; assemble early and bake when the crew is close."),
      meal("fast-philly-skillet", "Fast Philly Cheesesteak Skillet", "An under-30-minute skillet when the afternoon got away."),
      meal("sheet-pan-fajitas", "Sheet Pan Chicken Fajitas", "A 30 to 60 minute option that uses only the oven."),
      meal("enchilada-casserole", "Enchilada Casserole", "A 60 to 90 minute bake that can be assembled ahead."),
      meal("chicken-quesadillas", "Chicken Quesadillas", "Close to a pantry dinner when there's cooked chicken in the fridge."),
      meal("jambalaya", "Cajun Jambalaya", "A one-pot dinner for when the oven is busy."),
      meal("smash-burgers", "Double Smash Burgers", "Fast on a griddle once the patties are portioned."),
    ],
    faqs: [
      {
        question: "What can I cook if the meat is still frozen at 4 p.m.?",
        answer:
          "Thaw it in a sealed bag in cold water, changing the water every 30 minutes; a 1 lb package takes about an hour. Thin or separated pieces can also be cooked from frozen with about 50 percent more time. Otherwise, switch to a pantry dinner such as quesadillas, pasta with tomato sauce or a frittata.",
      },
    ],
    relatedArticleSlugs: [
      "feeding-a-firehall-crew",
      "fast-firehall-meals-under-30-minutes",
      "firehall-grocery-planning",
      "firehall-kitchen-culture",
    ],
    sources: [SRC.usdaThaw, SRC.usdaTemps, SRC.hcTemps, SRC.fdaAllergies],
  }),
];

/** Core guides + SEO pillars + nutrition + lifestyle + listicles. */
export const EDITORIAL_ARTICLES: EditorialArticle[] = [
  ...CREW_COOKING_GUIDES,
  ...CORE_EDITORIAL_ARTICLES,
  ...SEO_TRAFFIC_ARTICLES,
  ...NUTRITION_PERFORMANCE_ARTICLES,
  ...STATION_LIFESTYLE_ARTICLES,
  ...CORNERSTONE_BLOG_ARTICLES,
  HEALTHY_HALL_SMOOTHIES_ARTICLE,
];

export function getEditorialArticleBySlug(slug: string): EditorialArticle | undefined {
  return EDITORIAL_ARTICLES.find((a) => a.slug === slug);
}
