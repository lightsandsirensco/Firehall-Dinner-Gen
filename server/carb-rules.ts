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
    defaultSide: "rice",
    defaultSideHealthy: "quinoa",
    baseRequired: true,
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
    defaultSide: "rice",
    defaultSideHealthy: "rice",
    baseRequired: false,
    allowedBase: /\b(rice|noodles|rice noodles|udon|soba|lo mein)\b/i,
    allowedBaseLabel: "rice or noodles",
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

const BOWL_CARB_ROTATION = ["rice", "quinoa", "potatoes", "noodles", "sweet potato"];
const STIR_FRY_CARB_ROTATION = ["rice", "rice noodles", "udon noodles", "lo mein noodles"];
const recentCarbs: string[] = [];
const MAX_RECENT_CARBS = 10;

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
    pool = healthiness === "lean" ? ["sweet potatoes"] : ["potatoes", "sweet potatoes"];
  } else if (format === "loaded-fries") {
    pool = healthiness === "lean" ? ["sweet potato fries"] : ["fries", "sweet potato fries"];
  } else {
    return "";
  }

  if (pool.length === 0) return "";

  const last = recentCarbs.length > 0 ? recentCarbs[recentCarbs.length - 1] : "";
  const nonRepeat = pool.filter(c => c !== last);
  const finalPool = nonRepeat.length > 0 ? nonRepeat : pool;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

export function buildCarbRulesPromptBlock(mealFormat: string | undefined, healthiness: string): string {
  if (!mealFormat || mealFormat === "random") return "";
  const key = normalizeFormatToRuleKey(mealFormat);
  const rules = CARB_RULES[key];
  if (!rules) return "";

  const lines: string[] = [];
  lines.push("CARB RULES (STRICT — enforced by validator):");

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
  }

  if (rules.allowedSides.length > 0) {
    const sidePick = healthiness === "lean" ? rules.defaultSideHealthy : rules.defaultSide;
    if (sidePick) {
      lines.push(`- Preferred side: ${sidePick}.`);
    }
  }

  lines.push(`- Do NOT use "either/or" carb placeholders — choose ONE specific carb.`);

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

  if (fixed.tags) {
    const currentBaseCarb = (fixed.tags.base_carb || "").toLowerCase();
    if (rules.noneBase && currentBaseCarb && currentBaseCarb !== "none") {
      fixed.tags = { ...fixed.tags, base_carb: "none" };
      fixes.push(`carb_tag_fix:${key}_base_carb→none`);
    }
    if (rules.forbiddenBase && currentBaseCarb && rules.forbiddenBase.test(currentBaseCarb)) {
      const replacement = rules.noneBase ? "none" : (rules.defaultSide || "");
      fixed.tags = { ...fixed.tags, base_carb: replacement };
      fixes.push(`carb_tag_fix:${key}_base_carb_${currentBaseCarb}→${replacement}`);
    }
  }

  return { recipe: fixed, fixes };
}
