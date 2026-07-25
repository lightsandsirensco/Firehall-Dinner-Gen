import type { GoldenRecipePage, GoldenRecipePageStep } from "../recipe-page-schema.js";
import type { GoldenRecipeDefinition } from "../types.js";
import {
  CALL_INTERRUPTION_STEP,
  LEFTOVERS_PACK_DOWN_STEP,
  buildStructuredTonightSpread,
  standardLeftovers,
} from "./classics-wheel-editorial.js";
import { GOLDEN_P0_CLASSIC_PACKS } from "./golden-p0-classic-packs.js";

const CONTENT_VERSION = 4;
const SCALE = 1;

type Step = GoldenRecipePageStep;

function step(
  n: number,
  title: string,
  instruction: string,
  minutes: number,
  heatLevel: Step["heatLevel"] = "",
): Step {
  return { stepNumber: n, title, instruction, minutes, heatLevel };
}

function stubDef(page: GoldenRecipePage, slug: string): GoldenRecipeDefinition {
  const protein = page.tags.find((t) => t.startsWith("protein:"))?.slice(8) || "chicken";
  const mealFormat = page.tags.find((t) => t.startsWith("format:"))?.slice(7) || "plated_main";
  return {
    slug,
    title: page.title,
    masterCategoryId: "firehall_classics",
    protein,
    cuisine: page.cuisine,
    mealFormat,
    explorePools: [],
    hookLine: page.subtitle,
    recommendation: {
      feedsHardScore: 8,
      cleanupScore: 6,
      rookieFriendly: 7,
      comfortFoodScore: 8,
      healthyScore: 6,
      gameDayMeal: false,
      quickShiftMeal: false,
      mealPrepFriendly: false,
    },
    imagery: {
      shotPreset: "default",
      promptFocus: page.title,
      mobileCrop: "center",
      lightingStyle: "warm_editorial",
    },
  };
}

function renumber(steps: Step[]): Step[] {
  return steps.map((s, i) => ({ ...s, stepNumber: i + 1 }));
}

function hasCallInterruption(steps: Step[]): boolean {
  return steps.some((s) => /hold for call interruptions/i.test(s.title));
}

function applyTitles(page: GoldenRecipePage, wheelTitle: string): Pick<GoldenRecipePage, "title" | "displayTitle" | "seoTitle"> {
  return {
    title: wheelTitle,
    displayTitle: wheelTitle,
    seoTitle: `${wheelTitle} | Firefighter Meal`,
  };
}

function stamp(): Pick<GoldenRecipePage, "contentVersion" | "generatedAt"> {
  return {
    contentVersion: CONTENT_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

function merge(page: GoldenRecipePage, wheelTitle: string, patch: Partial<GoldenRecipePage>): GoldenRecipePage {
  return { ...page, ...applyTitles(page, wheelTitle), ...patch, ...stamp() };
}

function hallProTips(extra: string[]): string[] {
  return [
    ...extra,
    "Keep a backup tray at 200°F for firefighters returning from a run — never serve picked-over pans to late crew.",
    "Taste for salt at the end — hall palates run salty after long shifts.",
    "Log hold times on the pan with a grease pencil when tones drop mid-service.",
    "Spot-check proteins with an instant-read thermometer before reopening the line after a call.",
  ];
}

function fixChickenParm(page: GoldenRecipePage, wheelTitle: string): GoldenRecipePage {
  const pack = GOLDEN_P0_CLASSIC_PACKS["chicken-parm"]!(SCALE, stubDef(page, "chicken-parm"));
  const steps = renumber([
    pack.steps[0]!,
    pack.steps[1]!,
    pack.steps[2]!,
    step(
      4,
      "Verify cutlet temps before saucing",
      "Probe the thickest cutlet — target 155°F out of the fry oil; carryover and baking will finish to 165°F under cheese. Any piece below 155°F goes back to the skillet for 2 minutes per side. Drain on racks, not paper-only, so crust stays crisp.",
      5,
    ),
    pack.steps[3]!,
    pack.steps[4]!,
    step(
      7,
      "Rest baked cutlets",
      "Pull hotel pans when cheese bubbles at the edges and cutlets read 165°F at the center. Rest 3 minutes uncovered — molten cheese sets and breading stays crunchy. Keep marinara on low beside the pans.",
      3,
      "low",
    ),
    pack.steps[5]!,
    CALL_INTERRUPTION_STEP(9, "chicken cutlets"),
    LEFTOVERS_PACK_DOWN_STEP(10, "chicken cutlets"),
  ]);

  return merge(page, wheelTitle, {
    ingredients: pack.ingredients,
    prepTime: pack.prepMinutes ?? page.prepTime,
    cookTime: pack.cookMinutes ?? page.cookTime,
    steps,
    proTips: hallProTips([
      "Hold sauced pasta separate from cutlets so breading stays crisp.",
      "Broil mozzarella only 1–2 min — watch the hall oven.",
      "Pull chicken at 160°F out of the oil and let carryover hit 165°F under cheese.",
    ]),
    tonightSpread: buildStructuredTonightSpread("Chicken Parm cutlets", ["spaghetti", "marinara", "garlic bread"]),
    leftovers: standardLeftovers("chicken cutlets", [
      "Add a splash of stock or water when reheating marinara — thick sauce tightens in the fridge.",
    ]),
  });
}

function fixSteakTacos(page: GoldenRecipePage, wheelTitle: string): GoldenRecipePage {
  const base = page.steps.filter((s) => !/hold for call|pack down leftovers/i.test(s.title));
  const steps = renumber([
    ...base,
    CALL_INTERRUPTION_STEP(base.length + 1, "sliced steak"),
    LEFTOVERS_PACK_DOWN_STEP(base.length + 2, "sliced steak"),
  ]);

  return merge(page, wheelTitle, {
    steps,
    proTips: hallProTips([
      "Slice steak only after resting — rushing guarantees chewy tacos.",
      "Keep chimichurri loose; a thick paste won't cling to sliced steak.",
      "Char tortillas until pliable — cold shells crack when folded.",
    ]),
    tonightSpread: buildStructuredTonightSpread(
      "Street-style steak tacos",
      ["charred corn tortillas", "pickled red onions"],
      ["chimichurri", "cotija", "lime crema", "cilantro", "jalapeño slices"],
    ),
    leftovers: standardLeftovers("sliced steak", [
      "Store chimichurri and pickled onions separately — acid wilts warm meat overnight.",
    ]),
  });
}

function fixPulledPork(page: GoldenRecipePage, wheelTitle: string): GoldenRecipePage {
  const pack = GOLDEN_P0_CLASSIC_PACKS["pulled-pork"]!(SCALE, stubDef(page, "pulled-pork"));
  const steps = renumber([
    pack.steps[0]!,
    pack.steps[1]!,
    pack.steps[2]!,
    pack.steps[3]!,
    step(
      5,
      "Warm buns for the line",
      "Split brioche or kaiser rolls and warm wrapped in foil at 300°F for 5 minutes until soft and steamy. Stack cut-side up on sheet trays — cold buns kill BBQ sandwich morale.",
      10,
      "medium",
    ),
    step(
      6,
      "Stage the sandwich counter",
      "Set shredded pork in a deep hotel pan with a ladle of cooking juices on top. Line buns, slaw, pickles, and extra BBQ sauce in separate bowls with tongs. Hot pork center, cold crunch at the far end.",
      8,
      "low",
    ),
    step(
      7,
      "Build pulled pork sandwiches",
      "Crew piles pork on buns and tops with slaw and pickles. This is BBQ pulled pork — soft buns and tangy slaw, not Italian subs. Carolina fans swipe yellow mustard on the bottom bun first; keep extra sauce on the line for anyone who wants it wetter.",
      10,
      "low",
    ),
    step(
      8,
      "Verify pork hold temps",
      "Spot-check the pork pan — service temp should stay at or above 140°F. If below, return to a 200°F oven covered until steaming. Shredded pork that reads under 140°F gets reheated to 165°F before the line reopens.",
      5,
    ),
    CALL_INTERRUPTION_STEP(9, "shredded pork"),
    LEFTOVERS_PACK_DOWN_STEP(10, "shredded pork"),
  ]);

  return merge(page, wheelTitle, {
    ingredients: pack.ingredients,
    prepTime: pack.prepMinutes ?? page.prepTime,
    cookTime: pack.cookMinutes ?? page.cookTime,
    steps,
    proTips: hallProTips([
      "Pull pork at 203°F when it shreds with a fork — rushing the roast gives tough sandwiches.",
      "Toss with vinegar before BBQ sauce so the pull tastes bright, not one-note sweet.",
      "Keep slaw cold on ice — hot pork plus cold slaw is the hall move.",
    ]),
    tonightSpread: buildStructuredTonightSpread("BBQ pulled pork", ["soft buns", "tangy coleslaw"], ["pickle chips", "extra BBQ sauce", "yellow mustard"]),
    leftovers: standardLeftovers("shredded pork", [
      "Reheat pork with a splash of apple cider vinegar and broth so it stays saucy, not dry.",
    ]),
  });
}

function fixSmashBurgers(page: GoldenRecipePage, wheelTitle: string): GoldenRecipePage {
  const base = page.steps.filter((s) => !/hold for call|hold finished|pack down leftovers/i.test(s.title));
  const steps = renumber([
    ...base,
    CALL_INTERRUPTION_STEP(base.length + 1, "smash burger patties"),
    step(
      base.length + 2,
      "Hold finished stacks for the line",
      "Keep completed double stacks on a wire rack in a 200°F oven up to 8 minutes — never stack hot burgers or bottoms steam soggy. Wipe the griddle between batches so burnt fat does not taint the next round. Fries hold in a warm pan with the door cracked.",
      5,
      "low",
    ),
    LEFTOVERS_PACK_DOWN_STEP(base.length + 3, "cooked patties"),
  ]);

  return merge(page, wheelTitle, {
    steps,
    proTips: hallProTips([
      "Smash once per side — re-smashing after crust forms tears the lace.",
      "American cheese melts faster than cheddar; use it for that diner drape.",
      "Dirty sauce on both bun faces — lettuce goes between sauce and patty as a juice barrier.",
    ]),
    tonightSpread: buildStructuredTonightSpread(
      "Double smash burgers with caramelized onions",
      ["diner fries", "dill pickle chips"],
      ["dirty sauce", "shredded iceberg", "optional bacon"],
    ),
    leftovers: standardLeftovers("cooked patties", [
      "Store buns separately — stacked overnight turns crisp edges soft.",
    ]),
  });
}

function fixChiliGarlicBread(page: GoldenRecipePage, wheelTitle: string): GoldenRecipePage {
  const steps = renumber([
    step(
      1,
      "Toast the anchos and blend the chile base",
      "Tear dried ancho chiles open; discard stems and seeds. Toast in the dry stock pot over medium heat, pressing flat, 30–45 seconds per side until they smell like raisins and toast — never scorching, which turns them bitter. Add 2 cups of broth and simmer 5 minutes until the chiles are fully pliable — softening first is what keeps the puree silky instead of gritty. Blend with the chipotles in adobo until completely smooth, about 1 minute. This puree is the backbone: fresh-toasted chiles carry the deep fruit and smoky depth that jarred chili powder lost on the shelf.",
      12,
      "medium",
    ),
    step(
      2,
      "Prep the station",
      "Dice onions ¼ inch and mince garlic. Drain and rinse kidney and pinto beans. Open the crushed tomatoes. Measure chili powder, cumin, smoked paprika, oregano, and cocoa powder into one bowl — they hit hot fat together and burn if you're hunting jars. Line two sheet pans for garlic bread; chili moves fast once heat starts.",
      15,
    ),
    step(
      3,
      "Brown the beef hard, in batches",
      "Heat 2 tbsp oil over medium-high until shimmering. Add ground chuck in two or three batches — press flat and leave untouched 3–4 minutes so a deep brown crust forms before breaking into crumbles. Browning builds the roasty backbone; a crowded pot steams the meat gray. Cook each batch until no pink remains (160°F). Transfer to a bowl and pour off all but 2 tbsp fat, keeping the browned fond in the pot.",
      15,
      "medium-high",
    ),
    step(
      4,
      "Soften onions and bloom the spices",
      "Drop to medium. Cook onions with a pinch of salt 6–8 minutes, scraping fond, until soft with golden edges. Stir in garlic 30 seconds. Add the spice bowl — chili powder, cumin, smoked paprika, oregano, cocoa — into the fat and stir 45–60 seconds until toasty. Spices are fat-soluble; blooming in hot fat pulls out flavor water never touches. Stir in tomato paste and brown sugar; cook 1 minute until brick red.",
      10,
      "medium",
    ),
    step(
      5,
      "Deglaze and build the pot",
      "Pour in the beer or coffee and scrape the bottom clean — that roasty note backs up the chiles like it does in competition pots. Simmer 2 minutes to cook off the raw edge. Stir in the ancho-chipotle puree, crushed tomatoes, remaining broth, soy sauce, and Worcestershire, then return the browned meat and its juices.",
      5,
      "medium-high",
    ),
    step(
      6,
      "Simmer low, then add the beans",
      "Drop to a lazy simmer — small bubbles, never a boil, which turns the meat grainy. Cook uncovered 25 minutes, stirring every 10. Stir in kidney and pinto beans and simmer 20 more — added late, they season through without blowing out. Ready when a spoon drag leaves a trail that closes slowly.",
      45,
      "medium-low",
    ),
    step(
      7,
      "Thicken with masa and finish with acid",
      "Whisk masa harina with ½ cup warm water into a slurry; stir in and simmer 3–4 minutes until glossy and thick — masa adds sweet corn depth, not just body. Kill the heat, then stir in cider vinegar and hot sauce and taste for salt. Long simmers dull brightness; finishing acid snaps every layer back into focus.",
      5,
      "low",
    ),
    step(
      8,
      "Bake the cheesy garlic bread",
      "While the pot simmers, mash softened butter with minced garlic and a pinch of salt. Halve loaves lengthwise, spread butter edge to edge — bare edges burn before the center melts. Top with cheddar and mozzarella. Bake at 425°F 10–12 minutes until cheese bubbles with golden spots. Hold under loose foil — sealed foil steams crisp crust soft.",
      12,
      "high",
    ),
    step(
      9,
      "Set the topping bar and serve the line",
      "Portion sour cream, shredded cheddar, sliced jalapeños, cilantro, and diced onion into labeled bowls on ice — the bar lets every firefighter set their own heat. Ladle deep bowls, slice bread into thick sticks on a separate tray so steam does not sog the crust, and call the crew while it's hot.",
      8,
      "low",
    ),
    CALL_INTERRUPTION_STEP(10, "beef chili"),
    LEFTOVERS_PACK_DOWN_STEP(11, "beef chili"),
  ]);

  return merge(page, wheelTitle, {
    steps,
    proTips: hallProTips([
      "If chili tastes flat at the end, reach for cider vinegar and salt, not more chili powder — flat almost always means it needs acid.",
      "Day-two chili beats day-one; the ancho base keeps marrying overnight. Reheat to 165°F with a splash of broth.",
      "No dried anchos at the store? Bloom 3 extra tbsp chili powder in the fat — less depth, still a solid pot.",
      "Simmer until a drag through the pot leaves a trail that closes slowly — soup-thin chili won't stand up to toppings or bread.",
    ]),
    tonightSpread: buildStructuredTonightSpread(
      "Ancho-chipotle beef chili",
      ["cheesy garlic bread sticks", "sour cream topping bar"],
      ["shredded cheddar", "diced onion", "fresh jalapeños", "cilantro"],
    ),
    leftovers: standardLeftovers("beef chili", [
      "Reheat chili on the stove with a splash of broth — the masa thickens it overnight.",
      "Day-old garlic bread rebakes 5 minutes at 400°F; never store bread sealed with hot chili.",
    ]),
  });
}

function fixChickenCaesar(page: GoldenRecipePage, wheelTitle: string): GoldenRecipePage {
  const steps = renumber([
    step(
      1,
      "Prep romaine and dressing station",
      "Chop romaine hearts into bite-sized pieces; wash and spin dry — wet lettuce rejects dressing. Shave parmesan into a bowl. Set Caesar dressing, croutons, and lemon wedges in labeled containers before any heat goes on.",
      12,
    ),
    step(
      2,
      "Crisp the bacon",
      "Lay thick-cut bacon on sheet pans in a single layer. Bake at 400°F 15–18 minutes until shatter-crisp and deep mahogany — bacon clears its 145°F internal temp point long before it crisps, so here you cook for texture, not safety. Drain on paper towels; crumble when cool. Hold warm in a dry pan — wet bacon steams the salad.",
      18,
      "high",
    ),
    step(
      3,
      "Grill the chicken",
      "Heat a grill pan or flat-top over medium-high until a water drop sizzles. Season chicken breasts with salt, pepper, and garlic powder. Cook 5–6 minutes per side until deep grill marks show and thickest part reads 160°F. Rest 5 minutes tented with foil.",
      16,
      "medium-high",
    ),
    step(
      4,
      "Verify chicken at 165°F",
      "Slice rested chicken across the grain and probe the center of the thickest piece — must read 165°F before it hits the salad line. Any pink or under-temp slice goes back to the grill 2 minutes per side. Hold sliced chicken loosely covered at 140°F.",
      5,
    ),
    step(
      5,
      "Bake garlic bread",
      "Spread garlic butter on halved baguettes edge to edge. Bake at 400°F 8–10 minutes until edges are crisp and tops golden — garlic burns fast, so watch the last 2 minutes. Slice on a bias and hold in a warm pan.",
      10,
      "high",
    ),
    step(
      6,
      "Toast the croutons",
      "Toss day-old bread cubes with olive oil, salt, and garlic powder. Spread on a sheet pan and bake at 400°F 8–10 minutes until crunchy through the center — soft cores sog out dressed romaine in minutes.",
      10,
      "high",
    ),
    step(
      7,
      "Bake diner fries (optional)",
      "Spread frozen fries in a single layer on sheet pans. Bake at 425°F 20–22 minutes until deeply golden with audible crunch when shaken. Season with salt immediately out of the oven; hold in a warm pan with the door cracked.",
      22,
      "high",
    ),
    step(
      8,
      "Toss the Caesar",
      "Toss dried romaine with dressing gradually — coated leaves, not soup. Fold in half the parmesan, croutons, and crumbled bacon. Add dressing in two passes so bowls stay crisp until the crew hits the line.",
      10,
    ),
    step(
      9,
      "Plate hot chicken over salad",
      "Lay warm sliced chicken over the dressed romaine in hotel pans or individual bowls. Finish with remaining parmesan, bacon, and a lemon squeeze at the table. Garlic bread and fries go on separate trays.",
      5,
      "low",
    ),
    CALL_INTERRUPTION_STEP(10, "grilled chicken"),
    LEFTOVERS_PACK_DOWN_STEP(11, "grilled chicken"),
  ]);

  return merge(page, wheelTitle, {
    steps,
    proTips: hallProTips([
      "Slice chicken thick and against the grain so it feels like a main, not a garnish.",
      "Dress each bowl to order — soggy Caesar kills the vibe.",
      "Pull chicken at 160°F and let carryover hit 165°F during rest — dry breast ruins crew morale.",
    ]),
    tonightSpread: buildStructuredTonightSpread(
      "Grilled chicken Caesar",
      ["garlic bread", "croutons", "crispy bacon", "shaved parmesan", "optional diner fries"],
    ),
    leftovers: standardLeftovers("grilled chicken", [
      "Store dressed salad separately from chicken — acid wilts romaine overnight.",
    ]),
  });
}

function fixJerkChicken(page: GoldenRecipePage, wheelTitle: string): GoldenRecipePage {
  const spread = buildStructuredTonightSpread(
    "Jerk chicken thighs",
    ["coconut rice and peas", "grilled pineapple", "sharp cabbage slaw"],
    ["hot sauce", "lime wedges"],
  );
  const patch: Partial<GoldenRecipePage> = {
    tonightSpread: page.tonightSpread.some((l) => l.startsWith("Main:")) ? page.tonightSpread : spread,
    leftovers:
      page.leftovers.length >= 3
        ? page.leftovers
        : standardLeftovers("jerk chicken", [
            "Reheat rice covered with a splash of water or stock over medium-low until steaming throughout.",
          ]),
  };
  if (!hasCallInterruption(page.steps)) {
    patch.steps = renumber([...page.steps, CALL_INTERRUPTION_STEP(page.steps.length + 1, "jerk chicken")]);
  }
  return merge(page, wheelTitle, patch);
}

function fixBeefDip(page: GoldenRecipePage, wheelTitle: string): GoldenRecipePage {
  const steps = renumber([
    step(
      1,
      "Season and temper the chuck",
      "Pat the chuck (or sirloin tip) dry; rub all over with kosher salt and black pepper. Let it sit at room temperature 30 minutes while the kitchen preheats — a cold center extends the cook and dries out the exterior before the middle catches up.",
      30,
    ),
    step(
      2,
      "Sear and roast the beef",
      "Sear the roast in a hot Dutch oven with oil 3–4 minutes per side until deeply browned all over — that crust is the backbone of the au jus. Add beef broth, halved yellow onions, and smashed garlic; cover and roast at 325°F for 2½–3 hours until fork-tender, well past the 145°F internal temp safe minimum and up around 200°F where collagen melts into gelatin. Rest covered 20 minutes so juices stay in the meat for thin slicing.",
      180,
      "medium",
    ),
    step(
      3,
      "Build the au jus",
      "Strain pan juices into a fat separator; skim most of the fat. Simmer the defatted juices with the Worcestershire sauce and soy sauce 10 minutes until deeply savory — the soy adds glutamate depth without tasting Asian. Taste for salt: au jus should taste like concentrated roast drippings, not dishwater. Hold hot in a deep cambro for dipping.",
      15,
      "medium-low",
    ),
    step(
      4,
      "Slice beef paper-thin",
      "Slice the rested meat across the grain as thin as possible — a sharp slicer or steady knife hand matters, and thick slices chew like rope. Pile sliced beef in a hotel pan with a ladle of au jus spooned over to keep it moist. Cover loosely with foil and hold at 140°F until service.",
      15,
      "low",
    ),
    step(
      5,
      "Toast hoagie rolls",
      "Split hoagie rolls and toast cut-side down on a griddle or under the broiler until golden. Butter lightly if the hall likes richness. Stack cut-side up on sheet trays — soft soggy rolls collapse in au jus.",
      8,
      "medium-high",
    ),
    step(
      6,
      "Bake crispy fries",
      "Spread frozen fries in a single layer on sheet pans. Bake at 425°F 22–25 minutes until deeply golden with audible crunch. Season with salt immediately; hold in a warm oven with the door cracked.",
      25,
      "high",
    ),
    step(
      7,
      "Quick coleslaw",
      "Toss coleslaw mix with mayonnaise, apple cider vinegar, salt, and pepper until lightly coated — sharp and crunchy, not wet. Keep cold on ice until the line opens.",
      10,
    ),
    step(
      8,
      "Melt provolone on beef (optional)",
      "Lay provolone slices over warm sliced beef under the broiler 1–2 minutes until melted and laced at the edges. Skip if the crew wants classic dip-only — both styles work on the hall line.",
      3,
      "high",
    ),
    step(
      9,
      "Run the beef dip line",
      "Load toasted hoagies with sliced beef and optional melted cheese. Ladle hot au jus into deep cups for dipping — the jus should come up halfway on the sandwich when dunked. Serve fries and coleslaw on separate trays.",
      8,
      "low",
    ),
    CALL_INTERRUPTION_STEP(10, "sliced roast beef"),
    LEFTOVERS_PACK_DOWN_STEP(11, "sliced roast beef"),
  ]);

  return merge(page, wheelTitle, {
    cuisine: "canadian",
    ingredients: [
      { name: "Chuck roast or sirloin tip", quantity: "5", unit: "lb", group: "Main" },
      { name: "Low-sodium beef broth", quantity: "6", unit: "cups", group: "Au jus" },
      { name: "Yellow onion, halved", quantity: "2", unit: "large", group: "Au jus" },
      { name: "Garlic cloves, smashed", quantity: "6", unit: "cloves", group: "Au jus" },
      { name: "Worcestershire sauce", quantity: "2", unit: "tbsp", group: "Au jus" },
      { name: "Soy sauce", quantity: "1", unit: "tbsp", group: "Au jus" },
      { name: "Hoagie rolls", quantity: "24", unit: "count", group: "Buns" },
      { name: "Provolone slices", quantity: "24", unit: "count", group: "Cheese", notes: "optional" },
      { name: "Frozen steak fries", quantity: "5", unit: "lb", group: "Sides" },
      { name: "Coleslaw mix", quantity: "2", unit: "lb", group: "Sides" },
      { name: "Mayonnaise", quantity: "0.75", unit: "cup", group: "Sides" },
      { name: "Apple cider vinegar", quantity: "3", unit: "tbsp", group: "Sides" },
      { name: "Kosher salt", quantity: "2", unit: "tbsp", group: "Seasoning" },
      { name: "Black pepper", quantity: "1", unit: "tbsp", group: "Seasoning" },
      { name: "Unsalted butter", quantity: "4", unit: "tbsp", group: "Buns", notes: "optional" },
    ],
    prepTime: 35,
    cookTime: 210,
    steps,
    proTips: hallProTips([
      "Slice beef only after a full rest — rushing guarantees dry dip sandwiches.",
      "Keep au jus hot in a deep cambro with a ladle — cold jus is the fastest way to lose hall cred.",
      "Toast rolls hard enough to survive a full dunk without disintegrating.",
    ]),
    tonightSpread: buildStructuredTonightSpread(
      "Beef dip sandwiches with hot au jus",
      ["crispy fries", "tangy coleslaw"],
      ["provolone melt (optional)", "extra jus for dipping"],
    ),
    leftovers: standardLeftovers("sliced roast beef", [
      "Reheat au jus separately and simmer sliced beef in jus 3 minutes until 165°F before second shift.",
    ]),
  });
}

function fixBbqChickenMacAndCheese(page: GoldenRecipePage, wheelTitle: string): GoldenRecipePage {
  const spread = buildStructuredTonightSpread(
    "BBQ chicken mac and cheese from the hotel pan",
    ["extra warmed BBQ sauce", "crispy fried onions", "sliced green onions"],
    ["splash of milk at the line if the mac tightened on hold"],
  );
  const patch: Partial<GoldenRecipePage> = {
    tonightSpread: page.tonightSpread.some((l) => l.startsWith("Main:")) ? page.tonightSpread : spread,
    leftovers:
      page.leftovers.length >= 3
        ? page.leftovers
        : standardLeftovers("BBQ chicken mac", [
            "Reheat covered at 325°F until 165°F at center; loosen with milk and a spoon of BBQ sauce.",
          ]),
  };
  if (!hasCallInterruption(page.steps)) {
    patch.steps = renumber([...page.steps, CALL_INTERRUPTION_STEP(page.steps.length + 1, "BBQ chicken mac")]);
  }
  return merge(page, wheelTitle, patch);
}

function fixBbqChickenBowls(page: GoldenRecipePage, wheelTitle: string): GoldenRecipePage {
  const steps = renumber([
    step(
      1,
      "Rinse and cook the rice",
      "Rinse long-grain rice until water runs clear. Simmer with a 1:1.5 rice-to-water ratio and a pinch of salt 18 minutes until tender. Fluff with a fork and hold covered at 200°F — dry rice won't accept sauce on the line.",
      20,
      "medium",
    ),
    step(
      2,
      "Season the chicken thighs",
      "Pat boneless chicken thighs dry; coat all over with BBQ rub. Let sit 10 minutes while the grill heats — dry skin chars instead of steaming.",
      10,
    ),
    step(
      3,
      "Grill chicken to 165°F",
      "Grill over medium-high 5–7 minutes per side until char marks show and thickest part reads 165°F on an instant-read thermometer. Rest 5 minutes tented with foil — carryover finishes the last degrees.",
      18,
      "medium-high",
    ),
    step(
      4,
      "Slice rested chicken",
      "Slice chicken into strips against any grain you see. Hold in a hotel pan with a light glaze of warmed BBQ sauce spooned over — not drowned, or the line goes soggy.",
      5,
      "low",
    ),
    step(
      5,
      "Dress the slaw",
      "Toss coleslaw mix with a splash of vinegar, salt, and pepper — keep cold on ice. Cold crunch against hot chicken is the bowl's texture contrast.",
      8,
    ),
    step(
      6,
      "Warm the corn",
      "Heat corn kernels in a dry skillet or on the grill 4–5 minutes until lightly charred and steaming. Season with salt; hold beside the rice.",
      6,
      "medium-high",
    ),
    step(
      7,
      "Warm the BBQ sauce",
      "Warm BBQ sauce in a small pot over low heat — do not boil or sugars scorch. Keep a ladle on the line for crews who want extra smoke on their bowl.",
      5,
      "low",
    ),
    step(
      8,
      "Stage the bowl line",
      "Set rice in the first hotel pan, sliced chicken in the second, corn and slaw in separate pans. Hot components closest to the crew; cold slaw at the far end so it stays crisp.",
      8,
      "low",
    ),
    step(
      9,
      "Build the bowls",
      "Base of rice, sliced BBQ chicken, charred corn, and a pile of slaw on top. Drizzle extra sauce on the side. BBQ Chicken Bowls move fastest when everyone can see all components before they grab a bowl.",
      8,
    ),
    CALL_INTERRUPTION_STEP(10, "sliced chicken"),
    LEFTOVERS_PACK_DOWN_STEP(11, "sliced chicken"),
  ]);

  return merge(page, wheelTitle, {
    ingredients: [
      { name: "Long-grain rice, uncooked", quantity: "3", unit: "cups", group: "Base" },
      { name: "Boneless chicken thighs", quantity: "3", unit: "lb", group: "Main" },
      { name: "BBQ rub", quantity: "3", unit: "tbsp", group: "Seasoning" },
      { name: "BBQ sauce", quantity: "1.5", unit: "cups", group: "Sauce" },
      { name: "Corn kernels", quantity: "3", unit: "cups", group: "Toppings" },
      { name: "Coleslaw mix", quantity: "2", unit: "lb", group: "Toppings" },
      { name: "Apple cider vinegar", quantity: "2", unit: "tbsp", group: "Slaw" },
      { name: "Kosher salt", quantity: "1", unit: "tbsp", group: "Seasoning" },
      { name: "Black pepper", quantity: "1", unit: "tsp", group: "Seasoning" },
    ],
    steps,
    proTips: hallProTips([
      "Glaze sauce at the end so it doesn't burn on the grill.",
      "Keep slaw on ice under the counter — warm slaw collapses in minutes.",
      "Pull chicken at 163°F if holding under foil; verify 165°F before the line opens.",
    ]),
    tonightSpread: buildStructuredTonightSpread(
      "BBQ glazed chicken strips",
      ["steamed rice", "charred corn", "crunchy coleslaw"],
      ["extra BBQ sauce"],
    ),
    leftovers: standardLeftovers("sliced chicken", [
      "Reheat rice covered with a splash of water so grains loosen instead of clumping.",
    ]),
  });
}

function fixSteakSandwiches(page: GoldenRecipePage, wheelTitle: string): GoldenRecipePage {
  const steps = renumber([
    step(
      1,
      "Season and temper the steak",
      "Pat sirloin or flank steaks dry; salt and pepper generously. Let them sit at room temperature 20 minutes while surfaces come up to heat — a cold center overcooks the exterior before the middle warms.",
      20,
    ),
    step(
      2,
      "Roast the vegetables",
      "Toss bell peppers and zucchini with olive oil, salt, and minced garlic. Spread on sheet pans; roast at 425°F 22 minutes until charred edges show and centers are tender. Hold warm in foil.",
      22,
      "high",
    ),
    step(
      3,
      "Grill steak to temp",
      "Grill over high heat (450°F surface) 3–5 minutes per side until the internal temp reads 130–140°F for medium — flank needs a hard sear then brief finish; sirloin takes even heat. The zero-pink safe point for whole-muscle steak is 145°F. Rest 8 minutes tented with foil.",
      12,
      "high",
    ),
    step(
      4,
      "Slice against the grain",
      "Slice rested steak thin at a sharp angle against the grain — short muscle fibers, not long chewy lines. Hold loosely covered at 140°F in a hotel pan with a spoon of butter melted over top.",
      10,
      "low",
    ),
    step(
      5,
      "Bake garlic fries",
      "Spread frozen fries in a single layer. Bake at 425°F 20–22 minutes until crisp; toss hot fries with melted butter and minced garlic. Season with salt immediately; hold in a warm pan.",
      22,
      "high",
    ),
    step(
      6,
      "Sauté onions and mushrooms",
      "Cook sliced onions over medium-high until golden, then add mushrooms until browned and moisture evaporates. Hold warm for the toppings bar with a pinch of salt.",
      10,
      "medium-high",
    ),
    step(
      7,
      "Build Caesar and horseradish aioli",
      "Toss romaine with Caesar dressing, croutons, and parmesan — dress lightly so leaves stay crisp. Whisk horseradish into mayonnaise for aioli; keep both cold on ice until service.",
      10,
    ),
    step(
      8,
      "Toast buns and melt provolone",
      "Split sub rolls and toast cut-side down until golden. Pile the rested slices on toasted bottoms, lay provolone over top, and broil 1–2 minutes until cheese laces the edges. Finish with onions, mushrooms, and aioli.",
      12,
      "medium-high",
    ),
    step(
      9,
      "Run the toppings bar",
      "Set steak sandwiches, garlic fries, Caesar salad, roasted vegetables, onions, mushrooms, aioli, and extra provolone in a row. Crew builds their own stack — hot steak center, cold Caesar at the far end.",
      8,
      "low",
    ),
    CALL_INTERRUPTION_STEP(10, "sliced steak"),
    LEFTOVERS_PACK_DOWN_STEP(11, "sliced steak"),
  ]);

  return merge(page, wheelTitle, {
    steps,
    proTips: hallProTips([
      "Slice steak thin after the rest — crew eats better and portions stretch.",
      "Toast buns hard enough to hold juice without falling apart.",
      "Keep Caesar and aioli on ice until the line opens.",
    ]),
    tonightSpread: buildStructuredTonightSpread(
      "Steak sandwiches with melted provolone",
      ["garlic fries", "Caesar salad", "roasted peppers and zucchini"],
      ["sautéed onions", "mushrooms", "horseradish aioli", "extra provolone"],
    ),
    leftovers: standardLeftovers("sliced steak", [
      "Store buns separately — assemble fresh; toasted rolls go soggy overnight.",
    ]),
  });
}

const FIXERS: Record<string, (page: GoldenRecipePage, wheelTitle: string) => GoldenRecipePage> = {
  "chicken-parm": fixChickenParm,
  "steak-tacos": fixSteakTacos,
  "pulled-pork": fixPulledPork,
  "smash-burgers": fixSmashBurgers,
  "big-chili": fixChiliGarlicBread,
  "chili-garlic-bread": fixChiliGarlicBread,
  "chicken-caesar": fixChickenCaesar,
  "jerk-chicken": fixJerkChicken,
  "beef-dip": fixBeefDip,
  "bbq-chicken-bowls": fixBbqChickenBowls,
  "bbq-chicken-mac-and-cheese": fixBbqChickenMacAndCheese,
  "steak-sandwiches": fixSteakSandwiches,
};

export function applyClassicsWheelFix(
  slug: string,
  page: GoldenRecipePage,
  wheelTitle: string,
): GoldenRecipePage {
  const fixer = FIXERS[slug];
  if (!fixer) {
    return { ...page, ...applyTitles(page, wheelTitle), ...stamp() };
  }
  return fixer(page, wheelTitle);
}

export const CLASSICS_WHEEL_IMAGE_FIX_SLUGS = [
  "steak-tacos",
  "smash-burgers",
  "big-chili",
  "jerk-chicken",
  "beef-dip",
  "bbq-chicken-mac-and-cheese",
] as const;

/** Wheel heroes prioritized for appetite / accuracy upgrade regeneration. */
export const CLASSICS_WHEEL_HERO_REGEN_SLUGS = [
  "jerk-chicken",
  "beef-dip",
  "smash-burgers",
] as const;

export function classicHallGoldenHeroPath(slug: string): string {
  return `/images/golden-100/${slug}.jpg`;
}
