/**
 * Smart Shopping — practical purchase amounts.
 *
 * The list keeps the exact merged cooking total (`quantities`); this module
 * answers "what do I actually pick up?" — whole onions, lemons instead of
 * "⅜ cup lemon juice", sticks of butter, cartons of broth, and "check pantry"
 * for spices and small amounts of oil. Conversions are common US grocery
 * yields and package sizes, so labels say "about" wherever a yield varies.
 *
 * Pure and display-only: nothing here is persisted, so a saved list always
 * reflects the current rules.
 */
import { formatKitchenFraction } from "./ingredient-normalizer";
import type { Department, ShoppingQuantity } from "./types";
import { baseFactor, displayUnit, unitFamily } from "./units";

export interface PurchaseSuggestion {
  /** What to buy, e.g. "3 lemons", "2 sticks", "Check pantry". */
  label: string;
  /** Usually already stocked — confirm before buying. */
  pantryCheck?: boolean;
}

export interface PurchaseItemInput {
  canonicalKey: string;
  displayName: string;
  department: Department;
  quantities: ShoppingQuantity[];
}

const ML_PER_TBSP = baseFactor("tbsp")!;
const ML_PER_CUP = baseFactor("cup")!;
const G_PER_OZ = baseFactor("oz")!;
const G_PER_LB = baseFactor("lb")!;

interface Totals {
  ml: number;
  g: number;
  count: number;
  other: Map<string, number>;
}

function totalsOf(quantities: ShoppingQuantity[]): Totals {
  const t: Totals = { ml: 0, g: 0, count: 0, other: new Map() };
  for (const q of quantities) {
    const fam = unitFamily(q.unit);
    if (fam === "volume") t.ml += q.value * baseFactor(q.unit)!;
    else if (fam === "mass") t.g += q.value * baseFactor(q.unit)!;
    else if (fam === "count") t.count += q.value;
    else t.other.set(q.unit, (t.other.get(q.unit) ?? 0) + q.value);
  }
  return t;
}

const otherTotal = (t: Totals, ...units: string[]) => units.reduce((sum, u) => sum + (t.other.get(u) ?? 0), 0);
const hasOnlyVolume = (t: Totals) => t.ml > 0 && t.g === 0 && t.count === 0 && t.other.size === 0;
const ceil = (n: number) => Math.max(1, Math.ceil(n - 1e-9));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Fresh herbs: one supermarket bunch or clamshell gives roughly a cup of chopped leaves. */
const FRESH_HERB = /\b(parsley|cilantro|basil|dill|mint|chives?|tarragon|thyme|rosemary|sage|oregano)\b/;
/** Leafy herbs nobody keeps dried for a recipe that measures them in cups or tablespoons. */
const ALWAYS_FRESH_HERB = /^(?:flat leaf |italian )?(parsley|cilantro|mint|basil)$/;
const SPICE =
  /\b(salt|pepper(?:corns?)?|powder|paprika|cumin|coriander|turmeric|cinnamon|nutmeg|allspice|cardamom|cloves? ground|ground cloves?|seasoning|rub|flakes|cayenne|bay lea\w*|extract|baking soda|garam masala|five spice|za.?atar|sumac|ras el hanout|star anise|caraway|seeds?|msg|bouillon|dried \w+)\b/;
const SMALL_PANTRY_LIQUID =
  /\b(oil|vinegar|soy sauce|tamari|worcestershire|hot sauce|sriracha|fish sauce|liquid smoke|cooking spray|honey|maple syrup|sesame oil)\b/;
const DRY_BAKING = /^(?:(?:all purpose|all-purpose|bread|self rising) )?flour$|^(?:granulated |white |brown |light brown |dark brown |powdered |cane )?sugar$|^cornstarch$|^corn starch$/;

type Rule = (item: PurchaseItemInput, t: Totals) => PurchaseSuggestion | null;

const RULES: Rule[] = [
  // Citrus juice/zest → whole fruit (about 3 Tbsp juice per lemon, 2 per lime; 1 Tbsp zest each).
  (item, t) => {
    const m = item.canonicalKey.match(/^(?:fresh )?(lemon|lime) (juice|zest)$/);
    if (!m || !hasOnlyVolume(t)) return null;
    const tbsp = t.ml / ML_PER_TBSP;
    const perFruit = m[2] === "zest" ? 1 : m[1] === "lemon" ? 3 : 2;
    return { label: `about ${plural(ceil(tbsp / perFruit), m[1])}` };
  },
  // Garlic cloves (and minced garlic, about 3 cloves per Tbsp) → heads of about 10 cloves.
  (item, t) => {
    if (!/^(?:garlic|garlic clove|minced garlic)$/.test(item.canonicalKey)) return null;
    const cloves = otherTotal(t, "clove", "head") + t.count + (t.ml / ML_PER_TBSP) * 3;
    if (cloves <= 0 || t.g > 0) return null;
    return { label: plural(ceil(cloves / 10), "head") };
  },
  // Butter → sticks (8 Tbsp / 4 oz each).
  (item, t) => {
    if (!/^(?:unsalted |salted )?butter$/.test(item.canonicalKey)) return null;
    const sticks = t.ml / (ML_PER_TBSP * 8) + t.g / (G_PER_OZ * 4) + otherTotal(t, "stick");
    if (sticks <= 0) return null;
    const n = ceil(sticks);
    return { label: n >= 4 ? `${plural(n, "stick")} (${plural(ceil(n / 4), "1 lb box", "1 lb boxes")})` : plural(n, "stick") };
  },
  // Eggs → whole eggs, with cartons of a dozen.
  (item, t) => {
    if (!/^(?:egg|egg white|egg yolk)$/.test(item.canonicalKey) || t.count <= 0) return null;
    return { label: `${ceil(t.count / 12)} dozen` };
  },
  // Broth/stock → 32 oz cartons (4 cups).
  (item, t) => {
    if (!/\b(broth|stock)\b/.test(item.canonicalKey) || !hasOnlyVolume(t)) return null;
    return { label: `${ceil(t.ml / (ML_PER_CUP * 4))} × 32 oz carton` };
  },
  // Heavy cream → pints; milk/buttermilk → quart, half gallon, or gallons.
  (item, t) => {
    if (!hasOnlyVolume(t)) return null;
    const key = item.canonicalKey;
    if (/\b(heavy cream|whipping cream|heavy whipping cream|half and half)\b/.test(key)) {
      const pints = ceil(t.ml / (ML_PER_CUP * 2));
      return { label: pints > 2 ? `${ceil(pints / 2)} × quart` : `${pints} × pint` };
    }
    if (/^(?:whole |2% |skim |low fat )?(milk|buttermilk)$/.test(key)) {
      if (t.ml <= ML_PER_CUP * 4) return { label: "1 quart" };
      if (t.ml <= ML_PER_CUP * 8) return { label: "½ gallon" };
      return { label: plural(ceil(t.ml / (ML_PER_CUP * 16)), "gallon") };
    }
    return null;
  },
  // Sour cream / yogurt → 8 oz (1 cup) or 16 oz (2 cup) tubs.
  (item, t) => {
    if (!/\b(sour cream|yogurt)\b/.test(item.canonicalKey) || !hasOnlyVolume(t)) return null;
    const cups = t.ml / ML_PER_CUP;
    return { label: cups <= 1 ? "1 × 8 oz tub" : `${ceil(cups / 2)} × 16 oz tub` };
  },
  // Shredded cheese → 8 oz bags (about 2 cups each).
  (item, t) => {
    if (!/\b(shredded|grated)\b/i.test(item.displayName) || !/cheese|cheddar|mozzarella|jack|colby|mexican blend/.test(item.canonicalKey)) {
      return null;
    }
    if (/parmesan|pecorino/.test(item.canonicalKey)) return null;
    const oz = (t.ml / ML_PER_CUP) * 4 + t.g / G_PER_OZ;
    if (oz <= 0) return null;
    return { label: `${ceil(oz / 8)} × 8 oz bag` };
  },
  // Cream cheese → 8 oz blocks.
  (item, t) => {
    if (!/\bcream cheese\b/.test(item.canonicalKey)) return null;
    const oz = (t.ml / ML_PER_CUP) * 8 + t.g / G_PER_OZ;
    if (oz <= 0) return null;
    return { label: `${ceil(oz / 8)} × 8 oz block` };
  },
  // Dry rice by volume → 2 lb bags (about 1 cup uncooked per 7 oz).
  (item, t) => {
    if (!/^(?:long grain |white |brown |jasmine |basmati |arborio )*rice$/.test(item.canonicalKey)) return null;
    if (/\bcooked\b/i.test(item.displayName) || !hasOnlyVolume(t)) return null;
    const lb = ((t.ml / ML_PER_CUP) * 7) / 16;
    return { label: `${ceil(lb / 2)} × 2 lb bag` };
  },
  // Dry pasta by weight → 1 lb boxes.
  (item, t) => {
    if (!/\b(pasta|spaghetti|penne|rigatoni|ziti|linguine|fettuccine|macaroni|elbow|rotini|fusilli|orzo|ditalini|shells|bowtie|farfalle|lasagna|egg noodle)\b/.test(item.canonicalKey)) {
      return null;
    }
    if (t.g <= 0 || t.ml > 0) return null;
    return { label: `${ceil(t.g / G_PER_LB)} × 1 lb box` };
  },
  // Tortillas and buns → packs.
  (item, t) => {
    if (t.count <= 0) return null;
    if (/\btortilla\b/.test(item.canonicalKey)) return { label: `${ceil(t.count / 10)} × pack of 10` };
    if (/\b(bun|hamburger bun|hot dog bun|slider bun|brioche bun|hoagie roll|sub roll)\b/.test(item.canonicalKey)) {
      return { label: `${ceil(t.count / 8)} × pack of 8` };
    }
    return null;
  },
  // Fresh herbs by volume → bunches.
  (item, t) => {
    if (!FRESH_HERB.test(item.canonicalKey) || /\b(dried|ground)\b/.test(item.canonicalKey)) return null;
    const fresh = /\bfresh\b/i.test(item.displayName) || ALWAYS_FRESH_HERB.test(item.canonicalKey);
    if (!fresh) return null;
    const sprigs = otherTotal(t, "sprig");
    if (sprigs > 0 && t.ml === 0) return { label: plural(ceil(sprigs / 15), "bunch", "bunches") };
    if (!hasOnlyVolume(t)) return null;
    return { label: plural(ceil(t.ml / ML_PER_CUP), "bunch", "bunches") };
  },
  // Spices, salt, small amounts of oil/sauces, flour/sugar under a cup → usually on hand.
  (item, t) => {
    const key = item.canonicalKey;
    if (item.department === "Produce" || item.department === "Meat & Seafood" || /protein powder/.test(key)) return null;
    const smallVolume = t.g === 0 && t.count === 0 && t.ml <= ML_PER_CUP / 2;
    if (SPICE.test(key) && !FRESH_HERB.test(key) && smallVolume) {
      return { label: "Check pantry", pantryCheck: true };
    }
    if (SMALL_PANTRY_LIQUID.test(key) && smallVolume) return { label: "Check pantry", pantryCheck: true };
    if (DRY_BAKING.test(key) && t.g === 0 && t.count === 0 && t.ml <= ML_PER_CUP) {
      return { label: "Check pantry", pantryCheck: true };
    }
    return null;
  },
  // Meat/seafood by weight → round up to the nearest ¼ lb (whole ounces under a pound).
  (item, t) => {
    if (item.department !== "Meat & Seafood" || t.g <= 0 || t.ml > 0 || t.count > 0) return null;
    const lb = t.g / G_PER_LB;
    if (lb < 1) {
      const oz = ceil(t.g / G_PER_OZ);
      return { label: `${oz} oz` };
    }
    // Same tolerance the cooking amount uses to display as a quarter pound, so "2¼ lb" never becomes "2½ lb".
    return { label: `${formatKitchenFraction(Math.ceil(lb * 4 - 0.12) / 4)} lb` };
  },
  // Anything counted in whole units (onions, peppers, cans, heads, bunches…) → round up.
  (_item, t) => {
    if (t.ml > 0 || t.g > 0) return null;
    const parts: string[] = [];
    if (t.count > 0) parts.push(String(ceil(t.count)));
    for (const [unit, value] of t.other) {
      if (!unit) continue;
      const n = ceil(value);
      parts.push(`${n} ${displayUnit(unit, n)}`);
    }
    return parts.length > 0 ? { label: parts.join(" + ") } : null;
  },
];

/**
 * Practical purchase amount for a merged list item, or null when there's no
 * better way to say it than the cooking amount. Callers hide a suggestion
 * that reads the same as the cooking amount.
 */
export function purchaseSuggestion(item: PurchaseItemInput): PurchaseSuggestion | null {
  const totals = totalsOf(item.quantities);
  for (const rule of RULES) {
    const suggestion = rule(item, totals);
    if (suggestion) return suggestion;
  }
  return null;
}
