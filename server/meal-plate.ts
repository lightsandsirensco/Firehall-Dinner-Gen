/**
 * Builds curated firehall plate structure + display titles from composed ingredients.
 */

import type { GenerateResponse, IngredientItem } from "@shared/schema";
import {
  classifyComponentRole,
  isSeasoningOrGarnish,
  isValidPlateSide,
  STARCH_SIDE_PATTERN,
  VEG_SIDE_PATTERN,
  PROTEIN_PATTERN,
  BREAD_BASE_PATTERN,
} from "@shared/meal-semantics";
import { inferActualProtein } from "./spoonacular-converter";
import { log } from "./index";

export type PlateRole = "main" | "starch" | "veg" | "optional";

export interface PlateLine {
  name: string;
  amount: string;
  role: PlateRole;
}

export interface MealPlate {
  display_title: string;
  main: PlateLine[];
  sides: PlateLine[];
  optional: PlateLine[];
  cuisine_label: string;
}

const STARCH_IN_ITEM = STARCH_SIDE_PATTERN;
const VEG_IN_ITEM = VEG_SIDE_PATTERN;
const PROTEIN_IN_ITEM = PROTEIN_PATTERN;
const EXTRA_IN_ITEM =
  /\b(sauce|dressing|raita|yogurt|pickle|kimchi|salsa|guacamole|garlic bread|aioli|parmesan|au jus|gravy)\b/i;

const WEAK_TITLE =
  /^(chicken|beef|pork|turkey|seafood|fish|shrimp|salmon|grilled\s+\w+|baked\s+\w+)$/i;

const BLOG_TITLE =
  /\b(light|healthy|low[- ]?fat|skinny|clean eating|keto|diet|instant pot|easy|quick|simple|best ever|weeknight)\b/i;

const CUISINE_ADJ: Record<string, string> = {
  cajun: "Cajun",
  mexican: "Mexican",
  italian: "Italian",
  indian: "Indian",
  korean: "Korean",
  thai: "Thai",
  chinese: "Chinese",
  bbq: "BBQ",
  mediterranean: "Mediterranean",
  japanese: "Japanese",
  american: "American",
};

const PROTEIN_MAIN: Record<string, string> = {
  chicken: "Chicken Thighs",
  beef: "Beef",
  pork: "Pork",
  turkey: "Turkey",
  seafood: "Shrimp",
  fish: "Fish",
  vegetarian: "Plant-Based Main",
};

const METHOD_ADJ: Record<string, string> = {
  grilled: "Grilled",
  baked: "Baked",
  roasted: "Roasted",
  braised: "Braised",
  fried: "Pan-Fried",
  sautéed: "Sautéed",
  sauteed: "Sautéed",
  smoked: "Smoked",
  slow_cooked: "Slow-Cooked",
  sheet_pan: "Sheet-Pan",
};

function parsePlateRole(ing: IngredientItem, mealTitle = ""): PlateRole {
  const notes = (ing.notes || "").toLowerCase();
  if (isSeasoningOrGarnish(ing.item, ing.notes)) return "optional";

  if (/station extra|hall extra|plate_role:\s*optional/i.test(notes)) return "optional";
  if (/plate_role:\s*bread|required — bread|bread_base/i.test(notes)) return "starch";
  if (/starch|bowl base|plate_role:\s*starch/i.test(notes)) return "starch";
  if (/veg|plate_role:\s*veg/i.test(notes)) return "veg";

  const role = classifyComponentRole(ing.item, ing.notes, mealTitle);
  if (role === "seasoning" || role === "garnish") return "optional";
  if (role === "sauce") return "optional";
  if (role === "bread_base" || role === "starch_side") return "starch";
  if (role === "veg_side" && isValidPlateSide(ing.item, ing.notes)) return "veg";
  if (role === "optional_extra") return "optional";
  if (role === "main_protein") return "main";

  const item = `${ing.item} ${ing.notes || ""}`;
  if (EXTRA_IN_ITEM.test(item) && !PROTEIN_IN_ITEM.test(item)) return "optional";
  if (BREAD_BASE_PATTERN.test(item) && !PROTEIN_IN_ITEM.test(item)) return "starch";
  if (STARCH_IN_ITEM.test(item) && !PROTEIN_IN_ITEM.test(item)) return "starch";
  if (VEG_IN_ITEM.test(item) && !PROTEIN_IN_ITEM.test(item) && isValidPlateSide(ing.item, ing.notes)) return "veg";
  if (PROTEIN_IN_ITEM.test(item)) return "main";
  return "main";
}

function shortLabel(name: string): string {
  return name
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/,\s*uncooked/i, "")
    .replace(/\s*halved/i, "")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function isWeakTitle(title: string): boolean {
  const t = (title || "").trim();
  if (!t) return true;
  if (t.split(/\s+/).length <= 1) return true;
  if (WEAK_TITLE.test(t)) return true;
  if (BLOG_TITLE.test(t)) return true;
  return false;
}

function pickMainLabel(
  mainItems: PlateLine[],
  originalTitle: string,
  protein: string,
  cuisine: string,
  cookingMethod?: string,
): string {
  if (!isWeakTitle(originalTitle)) {
    const base = originalTitle.split(/\s+with\s+/i)[0].trim();
    return toTitleCase(base);
  }

  const adj = CUISINE_ADJ[cuisine.toLowerCase()] || "";
  const method =
    METHOD_ADJ[(cookingMethod || "").toLowerCase().replace(/\s+/g, "_")] || "";
  const fromIng = mainItems.find((m) => PROTEIN_IN_ITEM.test(m.name));
  if (fromIng && fromIng.name.split(" ").length >= 2) {
    const label = toTitleCase(fromIng.name);
    if (adj && !label.toLowerCase().includes(adj.toLowerCase())) {
      return `${adj} ${label}`;
    }
    return label;
  }

  const pLabel = PROTEIN_MAIN[protein.toLowerCase()] || "Chicken Thighs";
  return [adj, method, pLabel].filter(Boolean).join(" ");
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(And|With|Or|The|A|An)\b/g, (m) => m.toLowerCase());
}

export function buildDisplayTitle(
  mainLabel: string,
  starch: PlateLine | undefined,
  veg: PlateLine | undefined,
  mealFormat: string,
): string {
  const format = (mealFormat || "").replace(/_/g, "-");
  if (format === "bowl" || format === "stir-fry") {
    const base = starch ? shortLabel(starch.name) : "Rice";
    return `${mainLabel} Bowls with ${base}${veg ? ` & ${shortLabel(veg.name)}` : ""}`;
  }
  if (format === "burger" || format === "sandwich") {
    return `${mainLabel}${veg ? ` with ${shortLabel(veg.name)}` : ""}`;
  }
  if (starch && veg) {
    return `${mainLabel} with ${shortLabel(starch.name)} & ${shortLabel(veg.name)}`;
  }
  if (starch) return `${mainLabel} with ${shortLabel(starch.name)}`;
  if (veg) return `${mainLabel} with ${shortLabel(veg.name)}`;
  return mainLabel;
}

export function buildMealPlate(
  recipe: GenerateResponse,
  ctx: {
    cuisine: string;
    protein: string;
    mealFormat: string;
    originalTitle: string;
    cookingMethod?: string;
  },
): MealPlate {
  const lines: PlateLine[] = (recipe.ingredients || [])
    .filter((ing) => !isSeasoningOrGarnish(ing.item, ing.notes))
    .map((ing) => ({
      name: shortLabel(ing.item),
      amount: ing.amount || "",
      role: parsePlateRole(ing, ctx.originalTitle),
    }));

  const mains = lines.filter((l) => l.role === "main");
  const starches = lines.filter((l) => l.role === "starch");
  const vegs = lines.filter((l) => l.role === "veg");
  const optional = lines.filter((l) => l.role === "optional");

  // If everything landed in main, split heuristically
  if (mains.length > 4 && starches.length === 0 && vegs.length === 0) {
    for (const line of [...mains]) {
      if (STARCH_IN_ITEM.test(line.name) && !PROTEIN_IN_ITEM.test(line.name)) {
        starches.push({ ...line, role: "starch" });
      } else if (VEG_IN_ITEM.test(line.name) && !PROTEIN_IN_ITEM.test(line.name)) {
        vegs.push({ ...line, role: "veg" });
      }
    }
    const starchNames = new Set(starches.map((s) => s.name));
    const vegNames = new Set(vegs.map((v) => v.name));
    const filteredMain = mains.filter(
      (m) => !starchNames.has(m.name) && !vegNames.has(m.name),
    );
    mains.length = 0;
    mains.push(...(filteredMain.length ? filteredMain : [lines[0]]));
  }

  const mainLabel = pickMainLabel(
    mains,
    ctx.originalTitle,
    ctx.protein,
    ctx.cuisine,
    ctx.cookingMethod,
  );
  const starch = starches.find((s) => s.role === "starch") || starches[0];
  const veg = vegs.find((v) => v.role === "veg" && isValidPlateSide(v.name)) || vegs.find((v) => isValidPlateSide(v.name));
  const display_title = buildDisplayTitle(mainLabel, starch, veg, ctx.mealFormat);

  const cuisine_label =
    CUISINE_ADJ[ctx.cuisine.toLowerCase()] ||
    (ctx.cuisine && ctx.cuisine !== "any" ? toTitleCase(ctx.cuisine) : "Hall");

  return {
    display_title,
    main: [{ name: mainLabel, amount: mains[0]?.amount || "", role: "main" }],
    sides: [...starches, ...vegs].filter((s) => isValidPlateSide(s.name) || s.role === "starch").slice(0, 5),
    optional: optional.slice(0, 4),
    cuisine_label,
  };
}

/** Apply plate structure + curated title to recipe. */
export function finalizeMealPlate(
  recipe: GenerateResponse,
  ctx: {
    cuisine: string;
    protein: string;
    mealFormat: string;
    originalTitle: string;
    crewSize: number;
  },
): GenerateResponse {
  const inferred = inferActualProtein(ctx.originalTitle, []);
  const protein = ctx.protein !== "any" ? ctx.protein : inferred !== "unknown" ? inferred : "chicken";

  const plate = buildMealPlate(recipe, {
    ...ctx,
    protein,
    cookingMethod: recipe.tags?.cooking_method || "",
  });
  let title = plate.display_title;

  if (isWeakTitle(title)) {
    title = `${plate.cuisine_label} ${PROTEIN_MAIN[protein] || "Crew Dinner"}`.trim();
  }

  log(`[plate] title="${title}" main=${plate.main.length} sides=${plate.sides.length} opt=${plate.optional.length}`, "plate");

  const totalMin = recipe.timing?.total_minutes ?? 35;

  return {
    ...recipe,
    title,
    meal_plate: plate,
    why_it_fits_tonight: buildPlateSummary(plate, ctx.crewSize, totalMin),
  } as GenerateResponse & { meal_plate: MealPlate };
}

export function resolvePolishTitle(
  polishedTitle: string,
  displayTitle: string,
  originalTitle: string,
): string {
  if (isWeakTitle(polishedTitle)) return displayTitle;
  if (isWeakTitle(originalTitle) && !isWeakTitle(displayTitle)) return displayTitle;
  return polishedTitle;
}

export function buildPlateSummary(plate: MealPlate, crewSize: number, totalMin: number): string {
  const main = shortLabel(plate.main[0]?.name || "the main");
  const starch = plate.sides.find((s) => s.role === "starch" || STARCH_IN_ITEM.test(s.name));
  const veg = plate.sides.find((s) => s.role === "veg" || VEG_IN_ITEM.test(s.name));
  const parts: string[] = [main];
  if (starch) parts.push(shortLabel(starch.name));
  if (veg) parts.push(shortLabel(veg.name));
  const spread = parts.join(" · ");
  return `Tonight's board: ${spread} — feeds ${crewSize} in ~${totalMin} min. Real hall portions, family-style on the table.`;
}
