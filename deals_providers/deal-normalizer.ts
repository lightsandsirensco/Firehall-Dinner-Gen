import type { ProteinType } from "../shared/protein-deals/types.js";
import { isExcludedDealItem } from "./deal-quality.js";

const PROTEIN_RULES: Array<{
  protein_type: ProteinType;
  keywords: string[];
  cuts: Array<{ cut: string; keywords: string[] }>;
}> = [
  {
    protein_type: "chicken",
    keywords: ["chicken", "poultry", "drumstick", "thigh", "breast", "wing", "hen"],
    cuts: [
      { cut: "thighs", keywords: ["thigh", "club pack"] },
      { cut: "breast", keywords: ["breast"] },
      { cut: "wings", keywords: ["wing"] },
      { cut: "drumsticks", keywords: ["drumstick"] },
      { cut: "ground", keywords: ["ground chicken"] },
      { cut: "whole", keywords: ["whole chicken"] },
    ],
  },
  {
    protein_type: "beef",
    keywords: ["beef", "steak", "ground beef", "sirloin", "brisket", "roast beef", "stewing beef"],
    cuts: [
      { cut: "ground", keywords: ["ground beef", "lean ground", "extra lean ground"] },
      { cut: "steak", keywords: ["steak", "sirloin", "striploin", "ribeye", "strips"] },
      { cut: "roast", keywords: ["roast", "brisket", "stewing"] },
    ],
  },
  {
    protein_type: "pork",
    keywords: ["pork", "ham", "bacon", "loin", "chop", "ribs", "shoulder", "belly"],
    cuts: [
      { cut: "ribs", keywords: ["rib", "back rib"] },
      { cut: "chops", keywords: ["chop", "loin chop"] },
      { cut: "shoulder", keywords: ["shoulder", "butt", "blade roast"] },
      { cut: "belly", keywords: ["belly"] },
      { cut: "bacon", keywords: ["bacon"] },
    ],
  },
  {
    protein_type: "sausage",
    keywords: ["sausage", "bratwurst", "kielbasa", "hot dog", "wiener", "italian sausage"],
    cuts: [],
  },
  {
    protein_type: "fish",
    keywords: ["salmon", "cod", "tilapia", "trout", "tuna fillet", "fish fillet", "shrimp", "prawn", "scallop", "mussel", "clam", "lobster", "crab", "seafood"],
    cuts: [{ cut: "fillets", keywords: ["fillet", "fillets"] }],
  },
  {
    protein_type: "turkey",
    keywords: ["turkey", "ground turkey"],
    cuts: [
      { cut: "breast", keywords: ["breast"] },
      { cut: "ground", keywords: ["ground turkey"] },
    ],
  },
];

export interface NormalizedProteinDeal {
  protein_type: ProteinType;
  protein_cut: string | null;
}

export function normalizeProteinDeal(itemName: string): NormalizedProteinDeal | null {
  if (isExcludedDealItem(itemName)) return null;

  const hay = itemName.toLowerCase().replace(/[^a-z0-9\s]/g, " ");

  for (const rule of PROTEIN_RULES) {
    if (rule.keywords.some((kw) => hay.includes(kw))) {
      let protein_cut: string | null = null;
      for (const cutRule of rule.cuts) {
        if (cutRule.keywords.some((kw) => hay.includes(kw))) {
          protein_cut = cutRule.cut;
          break;
        }
      }
      return { protein_type: rule.protein_type, protein_cut };
    }
  }

  return null;
}

/** @deprecated Use normalizeProteinDeal */
export function normalizeDealItem(itemName: string): {
  normalized_item: ProteinType;
  protein_type: ProteinType;
  cut: string | null;
  category: "protein";
  excluded: boolean;
} | null {
  const norm = normalizeProteinDeal(itemName);
  if (!norm) return null;
  return {
    normalized_item: norm.protein_type,
    protein_type: norm.protein_type,
    cut: norm.protein_cut,
    category: "protein",
    excluded: false,
  };
}

export function isProteinType(item: string | null): item is ProteinType {
  return (
    item === "chicken" ||
    item === "beef" ||
    item === "pork" ||
    item === "sausage" ||
    item === "fish" ||
    item === "turkey" ||
    item === "seafood"
  );
}

export function parseFlyerPrice(item: {
  current_price?: number | string | null;
  sale_story?: string | null;
  post_price_text?: string | null;
  pre_price_text?: string | null;
}): { price: number | null; unit: string | null } {
  let price: number | null = null;
  if (item.current_price != null && item.current_price !== "") {
    const n = Number(item.current_price);
    if (!Number.isNaN(n) && n > 0) price = n;
  }

  const unitHay = `${item.post_price_text ?? ""} ${item.pre_price_text ?? ""}`.toLowerCase();
  let unit: string | null = null;
  if (/\blb\b|\/\s*lb|per\s*lb/.test(unitHay)) unit = "lb";
  else if (/\bkg\b|\/\s*kg|per\s*kg/.test(unitHay)) unit = "kg";
  else if (/\beach\b|\/\s*ea/.test(unitHay)) unit = "each";

  if (!unit && item.post_price_text?.trim()) {
    const t = item.post_price_text.trim().toLowerCase();
    if (t.length <= 12) unit = t;
  }

  return { price, unit };
}
