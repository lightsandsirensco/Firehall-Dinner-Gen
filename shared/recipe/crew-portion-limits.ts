/**
 * Firefighter crew portion sanity limits — protein, starch, and veg per seat.
 */

import type { GoldenRecipePageIngredient } from "../golden-100/recipe-page-schema.js";

export type ProteinPortionClass =
  | "chicken"
  | "ground_beef"
  | "steak"
  | "pulled_pork"
  | "salmon"
  | "other";

export interface PortionOzRange {
  /** Target center of hall portion (raw weight). */
  targetOz: number;
  /** Flag / clamp above this (raw oz per firefighter). */
  hardMaxOz: number;
}

export const PROTEIN_OZ_PER_FIREFIGHTER: Record<ProteinPortionClass, PortionOzRange> = {
  chicken: { targetOz: 8, hardMaxOz: 12 },
  ground_beef: { targetOz: 8, hardMaxOz: 12 },
  steak: { targetOz: 10, hardMaxOz: 12 },
  pulled_pork: { targetOz: 8, hardMaxOz: 12 },
  salmon: { targetOz: 7, hardMaxOz: 8 },
  other: { targetOz: 8, hardMaxOz: 12 },
};

/** Cooked starch per firefighter (cups). */
export const CARB_CUPS_PER_FIREFIGHTER = { target: 1.25, hardMax: 2 };

/** Salad / veg per firefighter (cups). */
export const VEG_CUPS_PER_FIREFIGHTER = { target: 1.5, hardMax: 2.5 };

const PROTEIN_NAME =
  /\b(chicken|turkey|beef|pork|steak|salmon|fish|shrimp|cod|tilapia|tuna|sausage|brisket|ribs|ham|ground\s+\w+|tenderloin|breast|thigh|drumstick|fillet|deli roast beef|pork shoulder|pulled pork)\b/i;

const CHICKEN = /\b(chicken|turkey)\b/i;
const STEAK = /\b(steak|sirloin|flank|strip|ribeye|ny strip|skirt)\b/i;
const GROUND = /\b(ground\s+(beef|turkey|pork|chicken|lamb)|ground beef|ground turkey)\b/i;
const PULLED = /\b(pulled pork|pork shoulder|carnitas|shredded pork)\b/i;
const SALMON = /\b(salmon|cod|tilapia|mahi|fish fillet)\b/i;

const CARB_NAME =
  /\b(rice|pasta|penne|spaghetti|noodles|quinoa|couscous|farro|orzo|potatoes|fries|macaroni|bread cubes|croutons|tortilla chips|chips)\b/i;

const VEG_NAME =
  /\b(romaine|lettuce|salad|broccoli|pepper|carrot|onion|zucchini|squash|tomato|spinach|kale|cabbage|cauliflower|corn|peas|green beans|asparagus|mushroom|cucumber|celery|coleslaw|slaw|vegetable)\b/i;

const LB_UNITS = /^(lb|lbs|pound|pounds)$/i;
const OZ_UNITS = /^(oz|ounce|ounces)$/i;
const CUP_UNITS = /^(cup|cups)$/i;
const COUNT_UNITS = /^(count|head|heads|loaf|loaves|bag|bags|bunch|bunches)$/i;

export function parseQuantity(qty: string | number | undefined): number {
  if (qty == null) return 0;
  if (typeof qty === "number") return Number.isFinite(qty) ? qty : 0;
  const cleaned = String(qty)
    .replace(/[¼]/g, "0.25")
    .replace(/[½]/g, "0.5")
    .replace(/[¾]/g, "0.75")
    .trim();
  if (cleaned.includes("/")) {
    const [a, b] = cleaned.split("/").map((x) => parseFloat(x.trim()));
    if (a && b) return a / b;
  }
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatKitchenQuantity(n: number): string {
  if (n <= 0) return "";
  if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
  const eighths = Math.round(n * 8) / 8;
  if (eighths === 0.25) return "1/4";
  if (eighths === 0.5) return "1/2";
  if (eighths === 0.75) return "3/4";
  if (eighths === 1.25) return "1 1/4";
  if (eighths === 1.5) return "1 1/2";
  if (eighths === 1.75) return "1 3/4";
  return String(Math.round(n * 10) / 10);
}

export function classifyProtein(name: string): ProteinPortionClass {
  const n = name.toLowerCase();
  if (SALMON.test(n)) return "salmon";
  if (PULLED.test(n)) return "pulled_pork";
  if (STEAK.test(n)) return "steak";
  if (GROUND.test(n)) return "ground_beef";
  if (CHICKEN.test(n)) return "chicken";
  if (/\b(beef|pork|turkey|ham|sausage|brisket|ribs)\b/i.test(n)) return "other";
  return "other";
}

export function isProteinIngredient(name: string): boolean {
  return PROTEIN_NAME.test(name) && !/\b(broth|stock|bouillon|sauce|dressing|gravy)\b/i.test(name);
}

export function isCarbIngredient(name: string): boolean {
  return CARB_NAME.test(name);
}

export function isVegIngredient(name: string): boolean {
  return VEG_NAME.test(name) && !isProteinIngredient(name);
}

function toPounds(qty: number, unit: string): number | null {
  const u = unit.trim().toLowerCase();
  if (LB_UNITS.test(u)) return qty;
  if (OZ_UNITS.test(u)) return qty / 16;
  if (u === "kg") return qty * 2.205;
  if (u === "g") return qty / 453.6;
  return null;
}

function toCups(qty: number, unit: string): number | null {
  const u = unit.trim().toLowerCase();
  if (CUP_UNITS.test(u)) return qty;
  if (u === "tbsp") return qty / 16;
  if (u === "tsp") return qty / 48;
  return null;
}

export interface PortionFix {
  name: string;
  crewSize: number;
  oldQuantity: string;
  newQuantity: string;
  unit: string;
  ozPerFirefighter?: number;
  cupsPerFirefighter?: number;
  reason: string;
}

export interface ClampGoldenIngredientsResult {
  ingredients: GoldenRecipePageIngredient[];
  fixes: PortionFix[];
  flags: PortionFix[];
}

function fixEntry(
  ing: GoldenRecipePageIngredient,
  crewSize: number,
  newQty: number,
  reason: string,
  ozPer?: number,
  cupsPer?: number,
): PortionFix {
  const oldQty = ing.quantity ?? "";
  const unit = ing.unit ?? "";
  return {
    name: ing.name,
    crewSize,
    oldQuantity: unit ? `${oldQty} ${unit}`.trim() : oldQty,
    newQuantity: unit ? `${formatKitchenQuantity(newQty)} ${unit}`.trim() : formatKitchenQuantity(newQty),
    unit,
    ozPerFirefighter: ozPer,
    cupsPerFirefighter: cupsPer,
    reason,
  };
}

/** Clamp scaled golden-catalog ingredients to firefighter-realistic portions. */
export function clampGoldenIngredientsForCrew(
  ingredients: GoldenRecipePageIngredient[],
  crewSize: number,
): ClampGoldenIngredientsResult {
  const fixes: PortionFix[] = [];
  const flags: PortionFix[] = [];

  const clamped = ingredients.map((ing) => {
    const name = ing.name || "";
    const unit = (ing.unit || "").trim();
    const qty = parseQuantity(ing.quantity);
    if (qty <= 0 || crewSize <= 0) return { ...ing };

    if (isProteinIngredient(name)) {
      const lbs = toPounds(qty, unit);
      if (lbs == null) return { ...ing };
      const ozPer = (lbs * 16) / crewSize;
      const proteinClass = classifyProtein(name);
      const limits = PROTEIN_OZ_PER_FIREFIGHTER[proteinClass];
      if (ozPer > limits.hardMaxOz) {
        const newLbs = (limits.targetOz * crewSize) / 16;
        const fix = fixEntry(
          ing,
          crewSize,
          newLbs,
          `Protein capped from ${Math.round(ozPer * 10) / 10} oz to ${limits.targetOz} oz per firefighter (${proteinClass})`,
          limits.targetOz,
        );
        fixes.push(fix);
        return { ...ing, quantity: formatKitchenQuantity(newLbs) };
      }
      if (ozPer > limits.hardMaxOz * 0.95) {
        flags.push(
          fixEntry(ing, crewSize, qty, `Protein near limit: ${Math.round(ozPer * 10) / 10} oz per firefighter`, ozPer),
        );
      }
      return { ...ing };
    }

    if (isCarbIngredient(name)) {
      const cups = toCups(qty, unit);
      if (cups == null) return { ...ing };
      const cupsPer = cups / crewSize;
      if (cupsPer > CARB_CUPS_PER_FIREFIGHTER.hardMax) {
        const newCups = CARB_CUPS_PER_FIREFIGHTER.target * crewSize;
        fixes.push(
          fixEntry(
            ing,
            crewSize,
            newCups,
            `Starch capped from ${Math.round(cupsPer * 10) / 10} to ${CARB_CUPS_PER_FIREFIGHTER.target} cups per firefighter`,
            undefined,
            CARB_CUPS_PER_FIREFIGHTER.target,
          ),
        );
        return { ...ing, quantity: formatKitchenQuantity(newCups) };
      }
      return { ...ing };
    }

    if (isVegIngredient(name)) {
      const cups = toCups(qty, unit);
      if (cups != null) {
        const cupsPer = cups / crewSize;
        if (cupsPer > VEG_CUPS_PER_FIREFIGHTER.hardMax) {
          const newCups = VEG_CUPS_PER_FIREFIGHTER.target * crewSize;
          fixes.push(
            fixEntry(
              ing,
              crewSize,
              newCups,
              `Vegetable capped from ${Math.round(cupsPer * 10) / 10} to ${VEG_CUPS_PER_FIREFIGHTER.target} cups per firefighter`,
              undefined,
              VEG_CUPS_PER_FIREFIGHTER.target,
            ),
          );
          return { ...ing, quantity: formatKitchenQuantity(newCups) };
        }
        return { ...ing };
      }

      if (COUNT_UNITS.test(unit) && /romaine|lettuce|head/i.test(name)) {
        const per = qty / crewSize;
        if (per > 1.5) {
          const newQty = Math.max(1, Math.round(crewSize * 1.1));
          fixes.push(
            fixEntry(
              ing,
              crewSize,
              newQty,
              `Salad greens capped from ${Math.round(per * 10) / 10} heads to ~1 head per firefighter`,
            ),
          );
          return { ...ing, quantity: String(newQty) };
        }
      }
    }

    return { ...ing };
  });

  return { ingredients: clamped, fixes, flags };
}

export function auditProteinOzPerFirefighter(
  name: string,
  quantity: string | number | undefined,
  unit: string | undefined,
  crewSize: number,
): number | null {
  if (!isProteinIngredient(name)) return null;
  const qty = parseQuantity(quantity);
  const lbs = toPounds(qty, unit || "");
  if (lbs == null || crewSize <= 0) return null;
  return Math.round(((lbs * 16) / crewSize) * 10) / 10;
}
