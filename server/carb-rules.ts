import type { GenerateResponse } from "@shared/schema";
import { log } from "./index";

export interface CarbRule {
  forbiddenBase: RegExp | null;
  forbiddenBaseLabel: string;
  allowedSides: string[];
  defaultSide: string;
  defaultSideHealthy: string;
  baseRequired: boolean;
  allowedBase?: RegExp;
  allowedBaseLabel?: string;
  noneBase?: boolean;
}

export const CARB_RULES: Record<string, CarbRule> = {
  burger: {
    forbiddenBase: /\b(rice|quinoa|pasta|noodles|couscous)\b/i,
    forbiddenBaseLabel: "rice, quinoa, pasta",
    allowedSides: ["potato wedges", "sweet potato fries", "side salad", "coleslaw", "roasted vegetables", "chips"],
    defaultSide: "potato wedges",
    defaultSideHealthy: "sweet potato fries",
    baseRequired: false,
  },
  sandwich: {
    forbiddenBase: /\b(rice|quinoa|pasta|noodles|couscous)\b/i,
    forbiddenBaseLabel: "rice, quinoa, pasta",
    allowedSides: ["potato wedges", "sweet potato fries", "side salad", "coleslaw", "roasted vegetables", "chips"],
    defaultSide: "potato wedges",
    defaultSideHealthy: "side salad",
    baseRequired: false,
  },
  wrap: {
    forbiddenBase: /(?!)/,
    forbiddenBaseLabel: "",
    allowedSides: ["side salad", "roasted vegetables"],
    defaultSide: "",
    defaultSideHealthy: "",
    baseRequired: false,
    allowedBase: /\b(tortilla|wrap|lavash|flatbread)\b/i,
    allowedBaseLabel: "tortilla/wrap",
  },
  taco: {
    forbiddenBase: /(?!)/,
    forbiddenBaseLabel: "",
    allowedSides: ["black beans", "refried beans", "side salad"],
    defaultSide: "",
    defaultSideHealthy: "",
    baseRequired: false,
    allowedBase: /\b(tortilla|taco shell|corn tortilla|flour tortilla)\b/i,
    allowedBaseLabel: "tortilla/taco shell",
  },
  bowl: {
    forbiddenBase: null,
    forbiddenBaseLabel: "",
    allowedSides: [],
    defaultSide: "greens",
    defaultSideHealthy: "greens",
    baseRequired: false,
    allowedBase: /\b(rice|quinoa|noodles|greens|potatoes|sweet potato|farro|barley|cauliflower rice|mixed greens)\b/i,
    allowedBaseLabel: "rice, quinoa, noodles, greens, potatoes",
  },
  pasta: {
    forbiddenBase: /\b(rice|quinoa|potato|fries)\b/i,
    forbiddenBaseLabel: "rice, quinoa, potatoes, fries",
    allowedSides: ["garlic bread", "side salad"],
    defaultSide: "",
    defaultSideHealthy: "",
    baseRequired: true,
    allowedBase: /\b(pasta|spaghetti|penne|rigatoni|fusilli|linguine|fettuccine|rotini|farfalle|ziti|macaroni|orzo|noodle)\b/i,
    allowedBaseLabel: "pasta/noodles",
  },
  "soup-stew": {
    forbiddenBase: /\b(rice|pasta|noodles|quinoa)\b/i,
    forbiddenBaseLabel: "rice, pasta, noodles, quinoa",
    allowedSides: ["crusty bread", "cornbread"],
    defaultSide: "crusty bread",
    defaultSideHealthy: "",
    baseRequired: false,
    noneBase: true,
  },
  "sheet-pan": {
    forbiddenBase: /\b(rice|pasta|noodles|quinoa)\b/i,
    forbiddenBaseLabel: "rice, pasta, noodles",
    allowedSides: [],
    defaultSide: "potatoes",
    defaultSideHealthy: "sweet potatoes",
    baseRequired: false,
    allowedBase: /\b(potato|potatoes|sweet potato|root veg)\b/i,
    allowedBaseLabel: "potatoes, sweet potatoes, root veg",
  },
  "stir-fry": {
    forbiddenBase: null,
    forbiddenBaseLabel: "",
    allowedSides: [],
    defaultSide: "jasmine rice",
    defaultSideHealthy: "jasmine rice",
    baseRequired: true,
    allowedBase: /\b(rice|jasmine rice|noodles|rice noodles|udon|soba|lo mein)\b/i,
    allowedBaseLabel: "jasmine rice or noodles",
  },
  "loaded-fries": {
    forbiddenBase: /\b(rice|pasta|quinoa|noodles)\b/i,
    forbiddenBaseLabel: "rice, pasta, quinoa",
    allowedSides: [],
    defaultSide: "fries",
    defaultSideHealthy: "sweet potato fries",
    baseRequired: true,
    allowedBase: /\b(fries|french fries|potato fries|frozen fries|sweet potato fries)\b/i,
    allowedBaseLabel: "fries",
  },
  "breakfast-for-dinner": {
    forbiddenBase: /\b(rice|pasta|noodles|quinoa)\b/i,
    forbiddenBaseLabel: "rice, pasta, noodles",
    allowedSides: ["toast", "hash browns"],
    defaultSide: "hash browns",
    defaultSideHealthy: "whole grain toast",
    baseRequired: false,
  },
};

const BOWL_CARB_ROTATION = ["greens", "quinoa", "potatoes", "sweet potato", "none"];
const STIR_FRY_CARB_ROTATION = ["jasmine rice", "rice noodles", "jasmine rice", "udon noodles"];
const recentCarbs: string[] = [];
const MAX_RECENT_CARBS = 10;

export interface ChooseCarbContext {
  meal_format: string;
  healthiness: string;
  time: string;
  budget: string;
  allergens: string[];
  crew_size: number;
}

export function chooseCarb(ctx: ChooseCarbContext): "none" | "rice" | "quinoa" | "potatoes" | "sweet_potatoes" | "pasta" | "noodles" | "bread" | "tortilla" | "greens" {
  const key = normalizeFormatToRuleKey(ctx.meal_format);
  const hasGluten = ctx.allergens.includes("gluten");

  if (key === "soup-stew") return "none";
  if (key === "burger" || key === "sandwich") return "none";
  if (key === "pasta") return "pasta";
  if (key === "wrap" || key === "taco") return "tortilla";

  if (key === "sheet-pan") {
    if (ctx.healthiness === "lean") return "none";
    return "potatoes";
  }

  if (key === "bowl") {
    if (ctx.healthiness === "lean") return "greens";
    const pool: Array<"none" | "greens" | "quinoa" | "potatoes" | "sweet_potatoes"> = ["greens", "quinoa", "potatoes", "none"];
    if (ctx.crew_size >= 12) {
      return pickRandom(["greens", "potatoes", "none"] as const);
    }
    return pickRandom(pool);
  }

  if (key === "stir-fry") {
    return "rice";
  }

  if (key === "loaded-fries") return "potatoes";
  if (key === "breakfast-for-dinner") return "potatoes";

  if (ctx.healthiness === "lean") return "none";
  if (ctx.crew_size >= 12) {
    return pickRandom(["none", "potatoes", "greens"] as const);
  }

  return "none";
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function trackCarb(carb: string): void {
  const c = carb.toLowerCase().trim();
  if (!c || c === "none") return;
  recentCarbs.push(c);
  if (recentCarbs.length > MAX_RECENT_CARBS) recentCarbs.shift();
}

export function getRecentCarbs(): string[] {
  return [...recentCarbs];
}

export function pickCarbForFormat(
  format: string,
  healthiness: string,
  allergens: string[],
): string {
  const rules = CARB_RULES[format];
  if (!rules) return "";

  if (rules.noneBase) return "none";

  const hasGluten = allergens.includes("gluten");

  let pool: string[];
  if (format === "bowl") {
    pool = [...BOWL_CARB_ROTATION];
    if (hasGluten) pool = pool.filter(c => !["noodles", "barley", "farro", "couscous"].includes(c));
  } else if (format === "stir-fry") {
    pool = [...STIR_FRY_CARB_ROTATION];
    if (hasGluten) pool = pool.filter(c => !["udon noodles", "lo mein noodles"].includes(c));
  } else if (format === "sheet-pan") {
    pool = healthiness === "lean" ? ["none", "sweet potatoes"] : ["potatoes", "sweet potatoes", "none"];
  } else if (format === "loaded-fries") {
    pool = healthiness === "lean" ? ["sweet potato fries"] : ["fries", "sweet potato fries"];
  } else {
    return "none";
  }

  if (pool.length === 0) return "none";

  const last = recentCarbs.length > 0 ? recentCarbs[recentCarbs.length - 1] : "";
  const nonRepeat = pool.filter(c => c !== last);
  const finalPool = nonRepeat.length > 0 ? nonRepeat : pool;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

export function buildCarbRulesPromptBlock(mealFormat: string | undefined, healthiness: string, carbCtx?: ChooseCarbContext): string {
  if (!mealFormat || mealFormat === "random") {
    return `CARB POLICY: Carbs are OPTIONAL. Do NOT default to rice. Only include a carb if it genuinely improves the dish. Set base_carb tag to "none" if no carb is used.`;
  }
  const key = normalizeFormatToRuleKey(mealFormat);
  const rules = CARB_RULES[key];
  if (!rules) return "";

  const chosenCarb = carbCtx ? chooseCarb(carbCtx) : null;

  const lines: string[] = [];
  lines.push("CARB RULES (STRICT — enforced by validator):");

  if (chosenCarb) {
    if (chosenCarb === "none") {
      lines.push(`- CHOSEN CARB: none. Do NOT include any carb (rice, pasta, quinoa, noodles) in ingredients or steps.`);
      lines.push(`- Do NOT include "start the rice", "cook the pasta", or "serve over rice" steps.`);
      lines.push(`- Set base_carb tag to "none".`);
    } else {
      lines.push(`- CHOSEN CARB: ${chosenCarb}. Use ${chosenCarb} as the base carb for this recipe.`);
      lines.push(`- Set base_carb tag to "${chosenCarb}".`);
    }
  }

  if (rules.noneBase) {
    lines.push(`- base_carb MUST be "none". This format does NOT have a base carb.`);
    lines.push(`- Do NOT include rice, pasta, noodles, or quinoa as a base ingredient.`);
    lines.push(`- Allowed thickeners inside the dish: potato, beans, lentils, barley.`);
    if (rules.allowedSides.length > 0) {
      lines.push(`- Optional side (NOT base): ${rules.allowedSides.join(", ")} — serve separately, not "over".`);
    }
    return lines.join("\n");
  }

  if (rules.forbiddenBase && rules.forbiddenBaseLabel) {
    lines.push(`- FORBIDDEN as base carb: ${rules.forbiddenBaseLabel}. Do NOT include these as a base or side.`);
    lines.push(`- Do NOT say "serve over rice" or "start the rice".`);
  }

  if (rules.allowedBase && rules.allowedBaseLabel) {
    lines.push(`- Allowed base: ${rules.allowedBaseLabel}.`);
  }

  if (rules.baseRequired) {
    lines.push(`- A base carb IS required for this format.`);
  } else {
    lines.push(`- Carbs are OPTIONAL for this format. Do NOT default to rice.`);
  }

  if (key === "bowl") {
    lines.push(`- Base can be greens, quinoa, potatoes, or no carb (protein bowl). Do NOT default to rice.`);
  } else if (key === "stir-fry") {
    lines.push(`- ALWAYS include jasmine rice as the base. Stir-fry dishes are served over jasmine rice by default. Include a rice cooking step at the beginning.`);
  }

  if (rules.allowedSides.length > 0) {
    const sidePick = healthiness === "lean" ? rules.defaultSideHealthy : rules.defaultSide;
    if (sidePick && sidePick !== "none") {
      lines.push(`- Preferred side: ${sidePick}.`);
    }
  }

  lines.push(`- Choose ONE specific carb or "none". Do NOT use "either/or" carb placeholders.`);

  return lines.join("\n");
}

function normalizeFormatToRuleKey(format: string): string {
  const f = format.toLowerCase().replace(/_/g, "-");
  if (f === "soup-chili" || f === "soup_chili") return "soup-stew";
  if (f === "sheet-pan" || f === "sheet_pan") return "sheet-pan";
  if (f === "stir-fry" || f === "stir_fry") return "stir-fry";
  if (f === "loaded-fries" || f === "loaded_fries") return "loaded-fries";
  if (f === "breakfast" || f === "breakfast-for-dinner") return "breakfast-for-dinner";
  if (f === "burger" || f === "burgers") return "burger";
  if (f === "tacos" || f === "taco") return "taco";
  if (f.includes("sandwich")) return "sandwich";
  return f;
}

export function normalizeFormatKeyForCarb(mealFormat: string): string {
  return normalizeFormatToRuleKey(mealFormat);
}

function isBaseRice(recipe: GenerateResponse): boolean {
  const ingsText = (recipe.ingredients || []).map(i => i.item.toLowerCase()).join(" ");
  if (!/\brice\b/.test(ingsText)) return false;
  if (/rice vinegar|rice wine|rice paper|rice noodle/i.test(ingsText)) return false;
  return true;
}

function hasRiceStep(recipe: GenerateResponse): boolean {
  const stepsStr = (recipe.steps || []).map(s => `${s.heading} ${s.body}`).join(" ").toLowerCase();
  return /\bstart the rice\b|\bcook the rice\b|\bserve over rice\b|\bserve on rice\b/i.test(stepsStr);
}

export function enforceCarbs(recipe: GenerateResponse, mealFormat: string | undefined, healthiness: string, allergens: string[]): { recipe: GenerateResponse; fixes: string[] } {
  if (!mealFormat || mealFormat === "random") return { recipe, fixes: [] };

  const key = normalizeFormatToRuleKey(mealFormat);
  const rules = CARB_RULES[key];
  if (!rules) return { recipe, fixes: [] };

  let fixed = { ...recipe, ingredients: [...(recipe.ingredients || [])], steps: [...(recipe.steps || [])] };
  const fixes: string[] = [];
  const hasGluten = allergens.includes("gluten");

  if ((key === "burger" || key === "sandwich") && isBaseRice(fixed)) {
    fixed.ingredients = fixed.ingredients.filter(i => !/\brice\b/i.test(i.item) || /rice vinegar|rice wine/i.test(i.item));
    fixed.steps = fixed.steps.filter(s => !/\bstart the rice\b|\bcook the rice\b/i.test(`${s.heading} ${s.body}`));
    fixed.steps = fixed.steps.map(s => ({
      ...s,
      body: s.body.replace(/\bserve over rice\b/gi, "serve on the side"),
      heading: s.heading.replace(/\bserve over rice\b/gi, "plate"),
    }));

    const side = healthiness === "lean" ? "Sweet potato fries" : "Potato wedges";
    const hasPotatoSide = fixed.ingredients.some(i => /potato|fries|wedge/i.test(i.item));
    if (!hasPotatoSide) {
      fixed.ingredients.push({ item: side, amount: "2 lbs", notes: "Bake at 425°F for 20 min" });
    }

    if (fixed.tags) {
      fixed.tags = { ...fixed.tags, base_carb: "none" };
    }
    fixes.push(`carb_fix:${key}_removed_rice→${side.toLowerCase()}`);
    log(`[carbRules] ${key}: removed rice base, added ${side}`, "carb");
  }

  if (key === "soup-stew") {
    if (isBaseRice(fixed)) {
      const hasRiceInside = fixed.ingredients.some(i =>
        /\brice\b/i.test(i.item) && /\bin stew\b|\binto stew\b|\bsimmer\b|\bthicken/i.test(i.notes || "")
      );
      if (!hasRiceInside) {
        fixed.ingredients = fixed.ingredients.filter(i => !/\brice\b/i.test(i.item) || /rice vinegar|rice wine/i.test(i.item));
        fixes.push("carb_fix:stew_removed_rice_base");
      }
    }

    fixed.steps = fixed.steps.filter(s => !/\bstart the rice\b|\bcook the rice\b/i.test(`${s.heading} ${s.body}`));
    fixed.steps = fixed.steps.map(s => ({
      ...s,
      body: s.body.replace(/\bserve over rice\b/gi, "ladle into bowls"),
      heading: s.heading.replace(/\bserve over rice\b/gi, "ladle into bowls"),
    }));

    if (fixes.length > 0) {
      const hasBread = fixed.ingredients.some(i => /bread|cornbread/i.test(i.item));
      if (!hasBread && !hasGluten) {
        fixed.ingredients.push({ item: "Crusty bread", amount: "1 loaf, sliced", notes: "Served alongside" });
        fixes.push("carb_fix:stew_added_bread_side");
      }
      if (fixed.tags) {
        fixed.tags = { ...fixed.tags, base_carb: "none" };
      }
      log(`[carbRules] soup-stew: removed rice, set base_carb=none`, "carb");
    }

    if (fixed.tags && fixed.tags.base_carb && /rice|pasta|noodle|quinoa/i.test(fixed.tags.base_carb)) {
      fixed.tags = { ...fixed.tags, base_carb: "none" };
      fixes.push("carb_fix:stew_tag_base_carb→none");
    }
  }

  if ((key === "wrap" || key === "taco") && isBaseRice(fixed)) {
    const ingsText = (fixed.ingredients || []).map(i => i.item.toLowerCase()).join(" ");
    const hasRiceAsBase = /\brice\b/.test(ingsText) && !/rice vinegar|rice wine|rice paper|rice noodle/i.test(ingsText);
    if (hasRiceAsBase) {
      const stepsStr = (fixed.steps || []).map(s => `${s.heading} ${s.body}`).join(" ").toLowerCase();
      const riceIsBase = /serve over rice|start the rice|cook the rice|bed of rice/i.test(stepsStr);
      if (riceIsBase) {
        fixed.ingredients = fixed.ingredients.filter(i => !/\brice\b/i.test(i.item) || /rice vinegar|rice wine/i.test(i.item));
        fixed.steps = fixed.steps.filter(s => !/\bstart the rice\b|\bcook the rice\b/i.test(`${s.heading} ${s.body}`));
        fixed.steps = fixed.steps.map(s => ({
          ...s,
          body: s.body.replace(/\bserve over rice\b/gi, `fill the ${key}s`),
        }));

        const hasExtraBeans = fixed.ingredients.some(i => /beans|lentils|chickpea/i.test(i.item));
        if (!hasExtraBeans) {
          fixed.ingredients.push({ item: "Black beans, drained and rinsed", amount: "1 can (15 oz)", notes: "" });
        }

        if (fixed.tags) {
          fixed.tags = { ...fixed.tags, base_carb: key === "taco" ? "tortilla" : "wrap" };
        }
        fixes.push(`carb_fix:${key}_removed_rice_base→beans`);
        log(`[carbRules] ${key}: removed rice base, added beans`, "carb");
      }
    }
  }

  if (key === "sheet-pan" && isBaseRice(fixed)) {
    fixed.ingredients = fixed.ingredients.filter(i => !/\brice\b/i.test(i.item) || /rice vinegar|rice wine/i.test(i.item));
    fixed.steps = fixed.steps.filter(s => !/\bstart the rice\b|\bcook the rice\b/i.test(`${s.heading} ${s.body}`));
    fixed.steps = fixed.steps.map(s => ({
      ...s,
      body: s.body.replace(/\bserve over rice\b/gi, "serve from the sheet pan"),
    }));

    const hasPotato = fixed.ingredients.some(i => /potato/i.test(i.item));
    if (!hasPotato) {
      const side = healthiness === "lean" ? "Sweet potatoes, cubed" : "Baby potatoes, halved";
      fixed.ingredients.push({ item: side, amount: "1.5 lbs", notes: "Toss with oil, roast on pan" });
    }

    if (fixed.tags) {
      fixed.tags = { ...fixed.tags, base_carb: "potatoes" };
    }
    fixes.push("carb_fix:sheet_pan_removed_rice→potatoes");
    log(`[carbRules] sheet-pan: removed rice, added potatoes`, "carb");
  }

  if (key === "breakfast-for-dinner" && isBaseRice(fixed)) {
    fixed.ingredients = fixed.ingredients.filter(i => !/\brice\b/i.test(i.item) || /rice vinegar|rice wine/i.test(i.item));
    fixed.steps = fixed.steps.filter(s => !/\bstart the rice\b|\bcook the rice\b/i.test(`${s.heading} ${s.body}`));
    fixed.steps = fixed.steps.map(s => ({
      ...s,
      body: s.body.replace(/\bserve over rice\b/gi, "plate alongside"),
    }));

    const hasPotato = fixed.ingredients.some(i => /potato|hash brown/i.test(i.item));
    if (!hasPotato) {
      fixed.ingredients.push({ item: "Hash browns", amount: "1.5 lbs", notes: "Frozen, cook in skillet" });
    }
    if (fixed.tags) {
      fixed.tags = { ...fixed.tags, base_carb: "potato" };
    }
    fixes.push("carb_fix:breakfast_removed_rice→hash_browns");
    log(`[carbRules] breakfast: removed rice, added hash browns`, "carb");
  }

  const RICE_ALLOWED_FORMATS = new Set(["bowl", "stir-fry", "rice-bake"]);
  const titleRequiresRice = RICE_REQUIRED_PATTERNS.test(fixed.title || "");
  if (!RICE_ALLOWED_FORMATS.has(key) && !titleRequiresRice && isBaseRice(fixed)) {
    const alreadyHandled = key === "burger" || key === "sandwich" || key === "soup-stew" || key === "wrap" || key === "taco" || key === "sheet-pan" || key === "breakfast-for-dinner";
    if (!alreadyHandled) {
      fixed.ingredients = fixed.ingredients.filter(i => !/\brice\b/i.test(i.item) || /rice vinegar|rice wine|rice paper|rice noodle/i.test(i.item));
      fixed.steps = fixed.steps.filter(s => !/\bstart the rice\b|\bcook the rice\b/i.test(`${s.heading} ${s.body}`));
      fixed.steps = fixed.steps.map(s => ({
        ...s,
        body: s.body.replace(/\bserve over rice\b/gi, "plate and serve"),
        heading: s.heading.replace(/\bserve over rice\b/gi, "plate and serve"),
      }));
      if (fixed.tags) {
        const replacement = key === "sheet-pan" ? "potatoes" : "none";
        fixed.tags = { ...fixed.tags, base_carb: replacement };
      }
      fixes.push(`carb_fix:${key}_removed_rice→none`);
      log(`[carbRules] ${key}: removed rice base, set base_carb=none`, "carb");
    }
  }

  if (fixed.tags) {
    const currentBaseCarb = (fixed.tags.base_carb || "").toLowerCase();

    if ((currentBaseCarb === "none" || !currentBaseCarb) && !titleRequiresRice && !RICE_ALLOWED_FORMATS.has(key)) {
      fixed.steps = fixed.steps.filter(s => {
        const text = `${s.heading} ${s.body}`;
        if (/\bstart the rice\b|\bcook the rice\b|\bstart the pasta\b/i.test(text)) {
          fixes.push("carb_fix:removed_stale_carb_step");
          return false;
        }
        return true;
      });
      fixed.steps = fixed.steps.map(s => ({
        ...s,
        body: s.body.replace(/\bserve over rice\b/gi, "plate and serve").replace(/\bserve on rice\b/gi, "plate and serve"),
        heading: s.heading.replace(/\bserve over rice\b/gi, "plate and serve").replace(/\bserve on rice\b/gi, "plate and serve"),
      }));
    }

    if ((currentBaseCarb === "none" || !currentBaseCarb) && !titleRequiresRice && fixed.title) {
      const titleBefore = fixed.title;
      fixed.title = fixed.title
        .replace(/\s+Rice\b/gi, "")
        .replace(/\bRice\s+/gi, "")
        .replace(/\s+Pasta\b/gi, "")
        .replace(/\bPasta\s+/gi, "")
        .trim();
      if (fixed.title !== titleBefore) {
        fixes.push(`carb_fix:title_stripped_carb_word`);
      }
    }

    if (rules.noneBase && currentBaseCarb && currentBaseCarb !== "none") {
      fixed.tags = { ...fixed.tags, base_carb: "none" };
      fixes.push(`carb_tag_fix:${key}_base_carb→none`);
    }
    if (rules.forbiddenBase && currentBaseCarb && rules.forbiddenBase.test(currentBaseCarb)) {
      const replacement = rules.noneBase ? "none" : (rules.defaultSide || "none");
      fixed.tags = { ...fixed.tags, base_carb: replacement };
      fixes.push(`carb_tag_fix:${key}_base_carb_${currentBaseCarb}→${replacement}`);
    }
  }

  return { recipe: fixed, fixes };
}

const RICE_REQUIRED_PATTERNS = /\b(stir[- ]?fry|teriyaki|curry|fried rice|rice bowl|bibimbap|bulgogi|katsu|thai basil|kung pao|orange chicken|general tso|mongolian|szechuan|sweet and sour|lo mein|chow mein|tikka masala|butter chicken)\b/i;

const RICE_REQUIRED_FORMATS = new Set(["stir-fry"]);

function isRiceDish(title: string, mealFormat: string | undefined): boolean {
  if (mealFormat) {
    const key = normalizeFormatToRuleKey(mealFormat);
    if (RICE_REQUIRED_FORMATS.has(key)) return true;
  }
  return RICE_REQUIRED_PATTERNS.test(title);
}

function hasActualRiceIngredient(recipe: GenerateResponse): boolean {
  const ingsText = (recipe.ingredients || []).map(i => i.item.toLowerCase()).join(" ");
  if (!/\brice\b/.test(ingsText)) return false;
  if (/rice vinegar|rice wine|rice paper|rice noodle/i.test(ingsText) && !/jasmine rice|white rice|basmati rice|brown rice|long.grain rice|uncooked rice|^rice$/i.test(ingsText)) return false;
  return true;
}

function riceQtyForCrew(crewSize: number): { amount: string; waterAmount: string } {
  if (crewSize <= 4) return { amount: "2 cups", waterAmount: "3.5 cups" };
  if (crewSize <= 6) return { amount: "3 cups", waterAmount: "5.25 cups" };
  if (crewSize <= 8) return { amount: "4 cups", waterAmount: "7 cups" };
  if (crewSize <= 10) return { amount: "5 cups", waterAmount: "8.75 cups" };
  return { amount: "6 cups", waterAmount: "10.5 cups" };
}

export function ensureRiceForRiceDishes(
  recipe: GenerateResponse,
  mealFormat: string | undefined,
  crewSize: number,
  allergens: string[]
): { recipe: GenerateResponse; fixes: string[] } {
  const title = recipe.title || "";
  if (!isRiceDish(title, mealFormat)) return { recipe, fixes: [] };

  if (allergens.some(a => /rice/i.test(a))) return { recipe, fixes: [] };

  if (hasActualRiceIngredient(recipe)) {
    const fixes: string[] = [];
    let fixed = { ...recipe, steps: [...(recipe.steps || [])], tags: recipe.tags ? { ...recipe.tags } : undefined };

    const hasRiceStep = fixed.steps.some(s => /cook.*rice|start.*rice|rice.*package/i.test(`${s.heading} ${s.body}`));
    if (!hasRiceStep) {
      const { amount, waterAmount } = riceQtyForCrew(crewSize);
      fixed.steps.unshift({
        heading: "Cook rice according to package instructions",
        body: `Rinse ${amount} jasmine rice under cold water. Combine with ${waterAmount} water in a pot, bring to a boil, reduce to low, cover, and simmer 15-18 minutes until tender. Fluff with a fork and set aside.`,
      });
      fixes.push("rice_step_added");
      log(`[carbRules] Rice dish "${title}": added rice cooking step`, "carb");
    }

    if (fixed.tags) {
      fixed.tags.base_carb = "rice";
    }
    return { recipe: fixed, fixes };
  }

  const fixes: string[] = [];
  let fixed = { ...recipe, ingredients: [...(recipe.ingredients || [])], steps: [...(recipe.steps || [])], tags: recipe.tags ? { ...recipe.tags } : undefined };

  const { amount, waterAmount } = riceQtyForCrew(crewSize);
  fixed.ingredients.push({
    item: "Jasmine rice, uncooked",
    amount,
    notes: "",
  });
  fixes.push("rice_ingredient_added");

  const hasRiceStep = fixed.steps.some(s => /cook.*rice|start.*rice|rice.*package/i.test(`${s.heading} ${s.body}`));
  if (!hasRiceStep) {
    fixed.steps.unshift({
      heading: "Cook rice according to package instructions",
      body: `Rinse ${amount} jasmine rice under cold water. Combine with ${waterAmount} water in a pot, bring to a boil, reduce to low, cover, and simmer 15-18 minutes until tender. Fluff with a fork and set aside.`,
    });
    fixes.push("rice_step_added");
  }

  const lastStep = fixed.steps[fixed.steps.length - 1];
  if (lastStep && !/rice/i.test(`${lastStep.heading} ${lastStep.body}`)) {
    fixed.steps[fixed.steps.length - 1] = {
      ...lastStep,
      body: lastStep.body.replace(/plate and serve/i, "serve over jasmine rice").replace(/\.$/, "") + (lastStep.body.includes("rice") ? "" : ". Serve over jasmine rice."),
    };
  }

  if (fixed.tags) {
    fixed.tags.base_carb = "rice";
  }

  log(`[carbRules] Rice dish "${title}": added jasmine rice ingredient + step for ${crewSize} crew`, "carb");
  return { recipe: fixed, fixes };
}
