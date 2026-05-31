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
      "Crew piles pork on buns and tops with slaw and pickles. This is BBQ pulled pork — soft buns and tangy slaw, not Italian subs. Keep extra sauce on the line for crews who want more smoke.",
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
  const base = page.steps.filter(
    (s) => !/hold for call|pack down leftovers|leftovers & storage/i.test(s.title),
  );
  const steps = renumber([
    ...base,
    CALL_INTERRUPTION_STEP(base.length + 1, "beef chili"),
    LEFTOVERS_PACK_DOWN_STEP(base.length + 2, "beef chili"),
  ]);

  return merge(page, wheelTitle, {
    steps,
    proTips: hallProTips([
      "If chili tastes flat, add ½ tsp more smoked paprika and a pinch of salt — not more sugar.",
      "Hold garlic bread under loose foil on the counter; cut open only when the line forms.",
      "Simmer until a drag through the pot leaves a clear trail — soup-thin chili won't coat fries or bread.",
    ]),
    tonightSpread: buildStructuredTonightSpread(
      "Firehouse smoked beef chili",
      ["cheesy garlic bread sticks", "sour cream topping bar"],
      ["shredded cheddar", "diced onion", "fresh jalapeños", "cilantro"],
    ),
    leftovers: standardLeftovers("beef chili", [
      "Reheat chili on the stove with a splash of broth — it thickens overnight.",
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
      "Lay thick-cut bacon on sheet pans in a single layer. Bake at 400°F 15–18 minutes until shatter-crisp and deep mahogany. Drain on paper towels; crumble when cool. Hold warm in a dry pan — wet bacon steams the salad.",
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
      "Season the roast beef",
      "Pat chuck roast or sirloin tip dry; rub all over with kosher salt and black pepper. Let sit at room temperature 30 minutes while the oven heats — cold centers extend cook time and dry the exterior.",
      30,
    ),
    step(
      2,
      "Sear and roast the beef",
      "Sear the roast in a hot Dutch oven with oil until deeply browned on all sides. Add beef broth, onion halves, and garlic; cover and roast at 325°F 2½–3 hours until fork-tender and 200°F internal. Rest covered 20 minutes — juices stay in the meat for thin slicing.",
      180,
      "medium",
    ),
    step(
      3,
      "Build the au jus",
      "Strain pan juices into a fat separator; skim most of the fat. Simmer defatted juices with a splash of Worcestershire and soy 10 minutes until deeply savory. Taste for salt — au jus should taste like concentrated beef broth, not plain water. Hold hot in a deep cambro for dipping.",
      15,
      "medium-low",
    ),
    step(
      4,
      "Slice beef paper-thin",
      "Slice rested roast across the grain as thin as possible — a sharp slicer or steady knife hand matters. Pile sliced beef in a hotel pan with a ladle of au jus spooned over to keep moist. Cover loosely with foil at 140°F until service.",
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
      "Pat sirloin or flank steaks dry; salt and pepper generously. Let sit at room temperature 20 minutes while ovens and grill heat — cold centers overcook the exterior before the middle warms.",
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
      "Grill over high heat (450°F surface) 3–5 minutes per side until 130–140°F for medium — flank needs a hard sear then brief finish; sirloin takes even heat. Rest 8 minutes tented with foil.",
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
      "Split sub rolls and toast cut-side down until golden. Pile sliced steak on toasted bottoms, lay provolone over top, and broil 1–2 minutes until cheese laces the edges. Finish with onions, mushrooms, and aioli.",
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
  "chili-garlic-bread": fixChiliGarlicBread,
  "chicken-caesar": fixChickenCaesar,
  "jerk-chicken": fixJerkChicken,
  "beef-dip": fixBeefDip,
  "bbq-chicken-bowls": fixBbqChickenBowls,
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
  "chili-garlic-bread",
] as const;

export function classicHallGoldenHeroPath(slug: string): string {
  return `/images/golden-100/${slug}.jpg`;
}
