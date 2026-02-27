import type { GenerateResponse } from "@shared/schema";
import { log } from "./index";

export interface CrewScaleAuditResult {
  ok: boolean;
  fixes: string[];
  issues: string[];
  metrics: {
    crewSize: number;
    proteinLbs: number;
    baseCarbCups: number;
    vegCups: number;
    appliance: string;
    totalMinutes: number;
    caloriesPerServing: number;
    proteinGPerServing: number;
  };
}

const PROTEIN_KEYWORDS = /\b(chicken|beef|pork|turkey|salmon|fish|shrimp|steak|ground\s+\w+|tenderloin|breast|thigh|drumstick|fillet|cod|tilapia|mahi|tuna|sausage|brisket|ribs)\b/i;
const CARB_KEYWORDS = /\b(rice|pasta|quinoa|potatoes|noodles|couscous|farro|bulgur|orzo|fries|sweet potatoes?)\b/i;
const VEG_KEYWORDS = /\b(broccoli|pepper|carrot|onion|zucchini|squash|tomato|spinach|kale|cabbage|cauliflower|corn|peas|green beans|asparagus|mushroom|lettuce|cucumber|celery|mixed vegetables?|bell pepper)\b/i;

const WEIGHT_UNIT_PATTERNS: { pattern: RegExp; toLbs: (val: number) => number }[] = [
  { pattern: /^lbs?$/i, toLbs: (v) => v },
  { pattern: /^pounds?$/i, toLbs: (v) => v },
  { pattern: /^oz$/i, toLbs: (v) => v / 16 },
  { pattern: /^kg$/i, toLbs: (v) => v * 2.205 },
  { pattern: /^g$/i, toLbs: (v) => v / 453.6 },
];

const VOLUME_CUP_PATTERNS: { pattern: RegExp; toCups: (val: number) => number }[] = [
  { pattern: /^cups?$/i, toCups: (v) => v },
  { pattern: /^tbsp$/i, toCups: (v) => v / 16 },
  { pattern: /^tsp$/i, toCups: (v) => v / 48 },
];

function parseQty(amount: string): { qty: number; unit: string } {
  if (!amount || !amount.trim()) return { qty: 0, unit: "" };
  const cleaned = amount.replace(/[¼]/g, "0.25").replace(/[½]/g, "0.5").replace(/[¾]/g, "0.75");
  const m = cleaned.trim().match(/^([\d.\/\s]+)\s*(.*)$/);
  if (!m) return { qty: 0, unit: amount.trim() };
  let val: number;
  const numStr = m[1].trim();
  if (numStr.includes("/")) {
    const parts = numStr.split("/");
    val = parseFloat(parts[0]) / (parseFloat(parts[1]) || 1);
  } else if (numStr.includes(" ")) {
    const [whole, frac] = numStr.split(/\s+/);
    val = parseFloat(whole) + (frac && frac.includes("/") ? parseFloat(frac.split("/")[0]) / parseFloat(frac.split("/")[1]) : 0);
  } else {
    val = parseFloat(numStr);
  }
  if (isNaN(val)) val = 0;
  return { qty: Math.round(val * 100) / 100, unit: m[2].trim().toLowerCase() };
}

function toWeight(qty: number, unit: string): number {
  for (const p of WEIGHT_UNIT_PATTERNS) {
    if (p.pattern.test(unit)) return p.toLbs(qty);
  }
  return 0;
}

function toVolume(qty: number, unit: string): number {
  for (const p of VOLUME_CUP_PATTERNS) {
    if (p.pattern.test(unit)) return p.toCups(qty);
  }
  return 0;
}

function sumProteinLbs(ingredients: { item: string; amount: string }[]): number {
  let total = 0;
  for (const ing of ingredients) {
    if (PROTEIN_KEYWORDS.test(ing.item)) {
      const { qty, unit } = parseQty(ing.amount);
      const lbs = toWeight(qty, unit);
      if (lbs > 0) total += lbs;
      else if (unit === "" && qty > 0 && qty <= 30) {
        total += qty * 0.375;
      }
    }
  }
  return Math.round(total * 100) / 100;
}

function sumCarbCups(ingredients: { item: string; amount: string }[]): number {
  let total = 0;
  for (const ing of ingredients) {
    if (CARB_KEYWORDS.test(ing.item)) {
      const { qty, unit } = parseQty(ing.amount);
      const cups = toVolume(qty, unit);
      if (cups > 0) total += cups;
      else {
        const lbs = toWeight(qty, unit);
        if (lbs > 0) total += lbs * 2.5;
      }
    }
  }
  return Math.round(total * 100) / 100;
}

function sumVegCups(ingredients: { item: string; amount: string }[]): number {
  let total = 0;
  for (const ing of ingredients) {
    if (VEG_KEYWORDS.test(ing.item) && !PROTEIN_KEYWORDS.test(ing.item)) {
      const { qty, unit } = parseQty(ing.amount);
      const cups = toVolume(qty, unit);
      if (cups > 0) total += cups;
      else {
        const lbs = toWeight(qty, unit);
        if (lbs > 0) total += lbs * 3;
      }
    }
  }
  return Math.round(total * 100) / 100;
}

function detectAppliance(steps: { heading?: string; body?: string }[]): string {
  const text = steps.map(s => `${s.heading || ""} ${s.body || ""}`).join(" ").toLowerCase();
  if (/\b(oven|bake|roast|broil)\b/.test(text)) return "oven";
  if (/\b(grill|grille|bbq)\b/.test(text)) return "grill";
  if (/\b(slow\s*cook|crock\s*pot)\b/.test(text)) return "slow_cooker";
  if (/\b(instant\s*pot|pressure\s*cook)\b/.test(text)) return "instant_pot";
  if (/\b(air\s*fr)/i.test(text)) return "air_fryer";
  return "stovetop";
}

const MIN_PROTEIN_LBS_PER_PERSON = 0.375;
const MIN_CARB_CUPS_PER_PERSON = 0.5;
const MIN_VEG_CUPS_PER_PERSON = 0.75;

function roundToKitchenFriendly(val: number, unit: string): string {
  if (/lbs?|pounds?/i.test(unit)) {
    const rounded = Math.round(val * 4) / 4;
    if (rounded === Math.floor(rounded)) return `${rounded} ${unit}`;
    const whole = Math.floor(rounded);
    const frac = rounded - whole;
    const fracStr = frac === 0.25 ? "¼" : frac === 0.5 ? "½" : frac === 0.75 ? "¾" : `${frac}`;
    return whole > 0 ? `${whole}${fracStr} ${unit}` : `${fracStr} ${unit}`;
  }
  if (/cups?/i.test(unit)) {
    const rounded = Math.round(val * 4) / 4;
    if (rounded === Math.floor(rounded)) return `${rounded} ${unit}`;
    const whole = Math.floor(rounded);
    const frac = rounded - whole;
    const fracStr = frac === 0.25 ? "¼" : frac === 0.5 ? "½" : frac === 0.75 ? "¾" : `${frac}`;
    return whole > 0 ? `${whole}${fracStr} ${unit}` : `${fracStr} ${unit}`;
  }
  return `${Math.ceil(val)} ${unit}`;
}

export function auditCrewScale(recipe: GenerateResponse, crewSize: number): CrewScaleAuditResult {
  const fixes: string[] = [];
  const issues: string[] = [];

  const ings = (recipe.ingredients || []).map(i => ({ item: i.item || "", amount: i.amount || "" }));
  const steps = recipe.steps || [];

  let proteinLbs = sumProteinLbs(ings);
  let carbCups = sumCarbCups(ings);
  let vegCups = sumVegCups(ings);
  const appliance = detectAppliance(steps);
  const totalMinutes = recipe.timing?.total_minutes || 0;
  const caloriesPerServing = recipe.macros_per_serving?.calories || 0;
  const proteinGPerServing = recipe.macros_per_serving?.protein_g || 0;

  const minProtein = crewSize * MIN_PROTEIN_LBS_PER_PERSON;
  const minCarb = crewSize * MIN_CARB_CUPS_PER_PERSON;
  const minVeg = crewSize * MIN_VEG_CUPS_PER_PERSON;

  if (proteinLbs > 0 && proteinLbs < minProtein) {
    const needed = Math.ceil(minProtein * 4) / 4;
    for (let i = 0; i < recipe.ingredients.length; i++) {
      if (PROTEIN_KEYWORDS.test(recipe.ingredients[i].item)) {
        const { qty, unit } = parseQty(recipe.ingredients[i].amount);
        if (toWeight(qty, unit) > 0) {
          const ratio = needed / proteinLbs;
          const newQty = qty * ratio;
          recipe.ingredients[i] = {
            ...recipe.ingredients[i],
            amount: roundToKitchenFriendly(newQty, unit || "lbs"),
          };
          fixes.push(`protein scaled: ${recipe.ingredients[i].item} ${qty}→${Math.round(newQty * 100) / 100} ${unit} (min ${needed} lbs for ${crewSize})`);
        }
      }
    }
    proteinLbs = needed;
  }

  if (carbCups > 0 && carbCups < minCarb) {
    const needed = Math.ceil(minCarb * 2) / 2;
    for (let i = 0; i < recipe.ingredients.length; i++) {
      if (CARB_KEYWORDS.test(recipe.ingredients[i].item)) {
        const { qty, unit } = parseQty(recipe.ingredients[i].amount);
        const cups = toVolume(qty, unit);
        if (cups > 0) {
          const ratio = needed / carbCups;
          const newQty = qty * ratio;
          recipe.ingredients[i] = {
            ...recipe.ingredients[i],
            amount: roundToKitchenFriendly(newQty, unit || "cups"),
          };
          fixes.push(`carb scaled: ${recipe.ingredients[i].item} ${qty}→${Math.round(newQty * 100) / 100} ${unit} (min ${needed} cups for ${crewSize})`);
        }
      }
    }
    carbCups = needed;
  }

  if (vegCups > 0 && vegCups < minVeg) {
    const needed = Math.ceil(minVeg);
    for (let i = 0; i < recipe.ingredients.length; i++) {
      if (VEG_KEYWORDS.test(recipe.ingredients[i].item) && !PROTEIN_KEYWORDS.test(recipe.ingredients[i].item)) {
        const { qty, unit } = parseQty(recipe.ingredients[i].amount);
        const cups = toVolume(qty, unit);
        if (cups > 0) {
          const ratio = needed / vegCups;
          const newQty = qty * ratio;
          recipe.ingredients[i] = {
            ...recipe.ingredients[i],
            amount: roundToKitchenFriendly(newQty, unit || "cups"),
          };
          fixes.push(`veg scaled: ${recipe.ingredients[i].item} ${qty}→${Math.round(newQty * 100) / 100} ${unit}`);
        }
      }
    }
    vegCups = needed;
  }

  if (crewSize >= 12) {
    if (appliance === "air_fryer") {
      issues.push(`air_fryer_unrealistic: air fryer alone cannot serve ${crewSize}`);
      const stepsText = steps.map(s => `${s.heading || ""} ${s.body || ""}`).join(" ");
      if (!/\bbatch/i.test(stepsText)) {
        const lastStepIdx = recipe.steps.length - 1;
        if (lastStepIdx >= 0) {
          recipe.steps[lastStepIdx] = {
            ...recipe.steps[lastStepIdx],
            body: recipe.steps[lastStepIdx].body + ` Note: Cook in multiple batches to serve ${crewSize}. Keep finished portions warm in a 200°F oven.`,
          };
          fixes.push("added batch cooking note for air fryer");
        }
      }
    }

    if (appliance === "stovetop") {
      const stepsText = steps.map(s => `${s.heading || ""} ${s.body || ""}`).join(" ").toLowerCase();
      if (!/\b(dutch oven|stock pot|large pot|big pot|roasting pan)\b/.test(stepsText) && !/\bbatch/i.test(stepsText)) {
        for (let i = 0; i < recipe.steps.length; i++) {
          if (/\bskillet\b/i.test(recipe.steps[i].body)) {
            recipe.steps[i] = {
              ...recipe.steps[i],
              body: recipe.steps[i].body.replace(/\b(large )?skillet\b/i, "large Dutch oven or stock pot"),
            };
            fixes.push("stovetop: upgraded skillet to Dutch oven for large crew");
            break;
          }
        }
      }
    }

    if (appliance === "oven") {
      const stepsText = steps.map(s => `${s.heading || ""} ${s.body || ""}`).join(" ").toLowerCase();
      if (/\b(1|one|single)\s*(baking|sheet)\s*(pan|tray)?\b/.test(stepsText) || (!/\b(2|two|multiple|both)\b/.test(stepsText) && /\bsheet\s*pan\b/.test(stepsText))) {
        for (let i = 0; i < recipe.steps.length; i++) {
          if (/sheet\s*pan/i.test(recipe.steps[i].body) && !/\b(2|two|multiple)\b/i.test(recipe.steps[i].body)) {
            recipe.steps[i] = {
              ...recipe.steps[i],
              body: recipe.steps[i].body.replace(/\bsheet\s*pan\b/i, "2 sheet pans"),
            };
            fixes.push("oven: upgraded to 2 sheet pans for large crew");
            break;
          }
        }
      }
    }
  }

  if (crewSize >= 12 && recipe.timing) {
    const prepBase = recipe.timing.prep_minutes || 0;
    const cookBase = recipe.timing.cook_minutes || 0;

    const scaleFactor = appliance === "stovetop" || appliance === "air_fryer" ? 0.4 : 0.2;
    const minPrepIncrease = Math.ceil(prepBase * scaleFactor);
    if (minPrepIncrease > 2) {
      const newPrep = prepBase + minPrepIncrease;
      fixes.push(`timing: prep ${prepBase}→${newPrep} min (large crew adjustment +${Math.round(scaleFactor * 100)}%)`);
      recipe.timing.prep_minutes = newPrep;
    }

    const needsBatching = appliance === "stovetop" || appliance === "air_fryer" || appliance === "grill";
    if (needsBatching && cookBase > 0) {
      const batchMultiplier = crewSize >= 15 ? 1.5 : 1.3;
      const newCook = Math.ceil(cookBase * batchMultiplier);
      if (newCook > cookBase + 3) {
        fixes.push(`timing: cook ${cookBase}→${newCook} min (batch cooking for ${crewSize})`);
        recipe.timing.cook_minutes = newCook;
      }
    }

    recipe.timing.total_minutes = (recipe.timing.prep_minutes || 0) + (recipe.timing.cook_minutes || 0);
  }

  if (recipe.macros_per_serving) {
    const macros = recipe.macros_per_serving;
    if (macros.calories > 1200) {
      issues.push(`calories_too_high: ${macros.calories} cal/serving likely multiplied by crew size`);
      const corrected = Math.round(macros.calories / crewSize) * (crewSize > 6 ? 1 : 1);
      if (corrected < macros.calories && corrected >= 300) {
        recipe.macros_per_serving = { ...macros, calories: Math.round(macros.calories / Math.ceil(crewSize / 4)) };
        fixes.push(`macros: calories ${macros.calories}→${recipe.macros_per_serving.calories} (likely multiplied)`);
      }
    }
    if (macros.protein_g > 120) {
      issues.push(`protein_g_too_high: ${macros.protein_g}g/serving likely multiplied`);
      recipe.macros_per_serving = { ...recipe.macros_per_serving, protein_g: Math.round(macros.protein_g / Math.ceil(crewSize / 4)) };
      fixes.push(`macros: protein_g ${macros.protein_g}→${recipe.macros_per_serving.protein_g}g`);
    }
  }

  if (crewSize >= 12 && recipe.tags) {
    if (recipe.tags.quick_cleanup && totalMinutes > 30) {
      recipe.tags.quick_cleanup = false;
      fixes.push("removed quick_cleanup tag (unrealistic for large crew with long cook time)");
    }
  }

  const ok = issues.length === 0;
  const metrics = {
    crewSize,
    proteinLbs,
    baseCarbCups: carbCups,
    vegCups,
    appliance,
    totalMinutes: recipe.timing?.total_minutes || totalMinutes,
    caloriesPerServing: recipe.macros_per_serving?.calories || caloriesPerServing,
    proteinGPerServing: recipe.macros_per_serving?.protein_g || proteinGPerServing,
  };

  if (fixes.length > 0 || issues.length > 0) {
    log(`[crewScaleAudit] crew=${crewSize} proteinLbs=${metrics.proteinLbs} baseCarbCups=${metrics.baseCarbCups} appliance=${metrics.appliance} fixes=[${fixes.join("; ")}] issues=[${issues.join("; ")}]`, "audit");
  }

  return { ok, fixes, issues, metrics };
}
