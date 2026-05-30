import { parseQuantityAmount } from "../recipe/normalization.js";
import type { CatalogIngredientLine } from "./types.js";

export interface ParsedIngredientAmount {
  quantity: number;
  unit: string;
  raw: string;
}

/** Parse quantity/unit from catalog ingredient lines (handles embedded amounts). */
export function parseCatalogIngredientAmount(ing: CatalogIngredientLine): ParsedIngredientAmount {
  const qtyRaw = (ing.quantity || "").trim();
  const unitRaw = (ing.unit || "").trim();

  if (qtyRaw && !unitRaw) {
    const embedded = parseQuantityAmount(qtyRaw);
    if (embedded.quantity != null) {
      return { quantity: embedded.quantity, unit: embedded.unit, raw: qtyRaw };
    }
    const range = qtyRaw.match(/^([\d.]+)\s*[–-]\s*([\d.]+)/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        return { quantity: (a + b) / 2, unit: "", raw: qtyRaw };
      }
    }
    const n = Number(qtyRaw);
    if (!Number.isNaN(n)) return { quantity: n, unit: "", raw: qtyRaw };
  }

  if (qtyRaw && unitRaw) {
    const frac = qtyRaw.match(/^([\d./]+)$/);
    let quantity = 1;
    if (frac) {
      if (qtyRaw.includes("/")) {
        const [a, b] = qtyRaw.split("/").map(Number);
        quantity = b ? a / b : a;
      } else {
        quantity = Number(qtyRaw);
      }
    } else {
      quantity = Number(qtyRaw) || 1;
    }
    return { quantity, unit: unitRaw.toLowerCase(), raw: `${qtyRaw} ${unitRaw}` };
  }

  return { quantity: 1, unit: unitRaw.toLowerCase(), raw: qtyRaw || unitRaw };
}

export function gramsFromAmount(
  quantity: number,
  unit: string,
  unitGrams: Record<string, number> | undefined,
): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const u = unit.toLowerCase().replace(/\./g, "").trim();

  if (unitGrams?.[u]) return quantity * unitGrams[u];

  const aliases: Record<string, string> = {
    pounds: "lb",
    pound: "lb",
    lbs: "lb",
    ounces: "oz",
    ounce: "oz",
    grams: "g",
    gram: "g",
    kilograms: "kg",
    kilogram: "kg",
    tablespoons: "tbsp",
    tablespoon: "tbsp",
    teaspoons: "tsp",
    teaspoon: "tsp",
    cups: "cup",
    cans: "can",
    cloves: "clove",
    large: "large",
    medium: "medium",
    slices: "slice",
    count: "count",
  };
  const normalized = aliases[u] || u;

  if (unitGrams?.[normalized]) return quantity * unitGrams[normalized];

  switch (normalized) {
    case "lb":
      return quantity * 454;
    case "oz":
      return quantity * 28.35;
    case "g":
      return quantity;
    case "kg":
      return quantity * 1000;
    case "cup":
      return quantity * (unitGrams?.cup ?? 120);
    case "tbsp":
      return quantity * (unitGrams?.tbsp ?? 15);
    case "tsp":
      return quantity * (unitGrams?.tsp ?? 5);
    case "quart":
      return quantity * 960;
    case "pint":
      return quantity * 480;
    case "":
    case "count":
      return quantity * (unitGrams?.count ?? 100);
    default:
      return quantity * (unitGrams?.count ?? 80);
  }
}
