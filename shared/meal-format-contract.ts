/**
 * Single source of truth for meal-format structure — sides, carbs, titles, taco rules.
 */

export type FormatKey =
  | "burger"
  | "tacos"
  | "wrap"
  | "bowl"
  | "pasta"
  | "salad"
  | "sheet_pan"
  | "skillet"
  | "stir_fry"
  | "soup_chili"
  | "stew"
  | "grill"
  | "one_pot"
  | "sandwich"
  | "casserole"
  | "plated_main"
  | "loaded_fries"
  | "random";

export function normalizeFormatKey(raw: string | undefined): FormatKey {
  const f = (raw || "random").toLowerCase().replace(/\s+/g, "_");
  if (f === "taco") return "tacos";
  if (f === "soup" || f === "soup-chili" || f === "soup_chili") return "soup_chili";
  if (f === "stir-fry" || f === "stir_fry") return "stir_fry";
  if (f === "sheet-pan" || f === "sheet_pan") return "sheet_pan";
  if (f === "one-pot" || f === "one_pot") return "one_pot";
  if (f === "loaded_fries" || f === "loaded-fries") return "loaded_fries";
  return f as FormatKey;
}

export interface FormatContract {
  /** Allowed composed starch keys from side-pairing (empty = no auto starch side) */
  starchPool: string[];
  /** Require tortilla/shell in ingredients to use "taco" in title */
  requiresTortillaForTacoTitle: boolean;
  /** Forbidden as base carb / composed side */
  forbiddenStarches: RegExp;
  /** Minimum ingredient evidence to label meal as tacos */
  tortillaPattern: RegExp;
  /** Skip automatic veg side injection (salad-forward meals) */
  skipAutoVeg?: boolean;
  /** Skip automatic starch side injection */
  skipAutoStarch?: boolean;
}

const RICE_AS_BASE = /\b(jasmine rice|basmati|white rice|brown rice|spanish rice|serve over rice|bed of rice)\b/i;

export const FORMAT_CONTRACTS: Record<string, FormatContract> = {
  tacos: {
    starchPool: [],
    requiresTortillaForTacoTitle: true,
    forbiddenStarches: RICE_AS_BASE,
    tortillaPattern: /\b(tortillas?|taco shells?|corn tortillas?|flour tortillas?|hard shells?|soft shells?)\b/i,
    skipAutoStarch: true,
  },
  wrap: {
    starchPool: ["side salad"],
    requiresTortillaForTacoTitle: false,
    forbiddenStarches: /\b(jasmine rice|basmati)\b/i,
    tortillaPattern: /\b(tortilla|wrap|flatbread|pita)\b/i,
    skipAutoStarch: true,
  },
  burger: {
    starchPool: ["potato wedges", "fries", "coleslaw"],
    requiresTortillaForTacoTitle: false,
    forbiddenStarches: /\b(jasmine rice|basmati|pasta|spaghetti)\b/i,
    tortillaPattern: /\b(bun|roll|brioche)\b/i,
    skipAutoStarch: false,
  },
  pasta: {
    starchPool: ["garlic bread"],
    requiresTortillaForTacoTitle: false,
    forbiddenStarches: /\b(jasmine rice|basmati|quinoa)\b/i,
    tortillaPattern: /\b(pasta|spaghetti|penne|rigatoni|fettuccine|linguine)\b/i,
    skipAutoStarch: false,
  },
  bowl: {
    starchPool: ["jasmine rice", "quinoa"],
    requiresTortillaForTacoTitle: false,
    forbiddenStarches: /\b(tortilla|taco shell|bun)\b/i,
    tortillaPattern: /\b(rice|quinoa|grain|noodle)\b/i,
  },
  salad: {
    starchPool: ["garlic bread", "potato wedges"],
    requiresTortillaForTacoTitle: false,
    forbiddenStarches: RICE_AS_BASE,
    tortillaPattern: /\b(romaine|greens|lettuce)\b/i,
    skipAutoVeg: true,
  },
  soup_chili: {
    starchPool: ["crusty bread", "cornbread"],
    requiresTortillaForTacoTitle: false,
    forbiddenStarches: /\b(jasmine rice|basmati)\b/i,
    tortillaPattern: /\b(broth|stock|chili|beans)\b/i,
  },
};

export function getFormatContract(mealFormat: string | undefined): FormatContract | null {
  const key = normalizeFormatKey(mealFormat);
  return FORMAT_CONTRACTS[key] ?? null;
}

export function ingredientsText(ingredients: { item?: string; notes?: string }[]): string {
  return (ingredients || []).map((i) => `${i.item || ""} ${i.notes || ""}`).join(" ");
}

export function mealHasTortillas(ingredients: { item?: string; notes?: string }[]): boolean {
  const contract = FORMAT_CONTRACTS.tacos;
  return contract.tortillaPattern.test(ingredientsText(ingredients));
}

/** Title claims tacos but plate does not support it */
export function titleClaimsTacos(title: string): boolean {
  return /\btaco(s)?\b/i.test(title || "");
}

export function titleMatchesIngredients(
  title: string,
  ingredients: { item?: string; notes?: string }[],
  mealFormat?: string,
): { ok: boolean; reason?: string } {
  const ings = ingredientsText(ingredients);
  const fmt = normalizeFormatKey(mealFormat);

  if (titleClaimsTacos(title) && !FORMAT_CONTRACTS.tacos.tortillaPattern.test(ings)) {
    return { ok: false, reason: "title_taco_no_tortilla" };
  }

  if (/\bburger\b/i.test(title) && !/\b(bun|patty|burger|roll)\b/i.test(ings)) {
    return { ok: false, reason: "title_burger_no_bun" };
  }

  if (/\bpasta\b/i.test(title) && !/\b(pasta|spaghetti|penne|rigatoni|fettuccine|linguine|macaroni)\b/i.test(ings)) {
    return { ok: false, reason: "title_pasta_no_pasta" };
  }

  if (fmt === "tacos" && !mealHasTortillas(ingredients)) {
    return { ok: false, reason: "format_taco_no_tortilla" };
  }

  if (FORMAT_CONTRACTS.tacos.forbiddenStarches.test(ings) && (fmt === "tacos" || titleClaimsTacos(title))) {
    return { ok: false, reason: "taco_with_rice" };
  }

  return { ok: true };
}

export function starchPoolForFormat(
  formatKey: string,
  identity: string,
  title: string,
): string[] {
  const contract = getFormatContract(formatKey);
  if (contract?.skipAutoStarch) return contract.starchPool;

  if (titleClaimsTacos(title) && !mealHasTortillas([])) {
    return [];
  }

  if (identity === "taco" && contract) {
    return contract.starchPool;
  }

  return contract?.starchPool ?? [];
}
