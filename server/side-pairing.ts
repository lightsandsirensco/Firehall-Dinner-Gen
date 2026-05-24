/**
 * Cuisine- and identity-aware side pairing with rotation.
 * Replaces generic "baby potatoes + black pepper" fallback composition.
 */

import type { RecipeStep } from "@shared/schema";
import {
  bundlesForMeal,
  type SideBundle,
} from "@shared/meal-archetype-sides";
import {
  detectMealIdentity,
  isSeasoningOrGarnish,
  type MealIdentity,
} from "@shared/meal-semantics";
import { getRecentCarbs, trackCarb } from "./carb-rules";
import {
  getSessionSideBundles,
  getSessionSideStarch,
  getSessionSideVeg,
  trackSessionComposedSides,
} from "./cache-store.js";
import { log } from "./index";

export interface SidePairingContext {
  title: string;
  mealFormat: string;
  cuisine: string;
  protein: string;
  healthiness: string;
  allergens: string[];
  formatKey: string;
  /** When set, side rotation is scoped to this session (not global). */
  sessionKey?: string;
}

export interface ComposedSidePick {
  starchKey: string | null;
  vegLabel: string | null;
  extraLabel: string | null;
  pairingSource: string;
  bundleId?: string | null;
}

/** Starch template registry — keys used across composition + validation. */
export const STARCH_TEMPLATES: Record<string, { item: string; amount: string; step: RecipeStep; carbTag?: string }> = {
  "jasmine rice": {
    item: "Jasmine rice, uncooked",
    amount: "3 cups",
    carbTag: "rice",
    step: {
      heading: "Cook jasmine rice (simmer, 15–18 min)",
      body: "Rinse rice, simmer covered until fluffy. Hold warm for the crew.",
    },
  },
  "basmati rice": {
    item: "Basmati rice, uncooked",
    amount: "3 cups",
    carbTag: "rice",
    step: {
      heading: "Cook basmati rice (simmer, 15–18 min)",
      body: "Rinse basmati, simmer until light and separate. Fluff and keep warm.",
    },
  },
  "Spanish rice": {
    item: "Long-grain rice, uncooked",
    amount: "3 cups",
    carbTag: "rice",
    step: {
      heading: "Cook Spanish-style rice (simmer, 18–20 min)",
      body: "Sauté rice with onion and garlic, add tomato and broth, simmer until tender. Hold warm for tacos or bowls.",
    },
  },
  "roasted potatoes": {
    item: "Yukon gold potatoes, cubed",
    amount: "3 lbs",
    carbTag: "potatoes",
    step: {
      heading: "Roast the potatoes (425°F, 25–30 min)",
      body: "Toss cubed potatoes with oil, salt, and seasoning. Roast at 425°F until golden, flipping once.",
    },
  },
  "potato wedges": {
    item: "Potato wedges",
    amount: "2.5 lbs",
    carbTag: "potatoes",
    step: {
      heading: "Bake potato wedges (425°F, 22–28 min)",
      body: "Toss wedges with oil and seasoning. Bake until crispy outside and tender inside.",
    },
  },
  fries: {
    item: "Frozen steak fries",
    amount: "3 lbs",
    carbTag: "potatoes",
    step: {
      heading: "Bake the fries (425°F, 18–24 min)",
      body: "Spread fries on sheet pans, bake until crisp. Season and serve hot.",
    },
  },
  "mashed potatoes": {
    item: "Yukon gold potatoes",
    amount: "3 lbs",
    carbTag: "potatoes",
    step: {
      heading: "Mash the potatoes (simmer, 20 min)",
      body: "Boil potatoes until tender. Mash with butter, salt, and warm milk until creamy.",
    },
  },
  "mac and cheese": {
    item: "Macaroni, dry",
    amount: "2 lbs",
    carbTag: "pasta",
    step: {
      heading: "Make mac & cheese (simmer + bake, 25 min)",
      body: "Cook macaroni, toss with cheese sauce, and bake until bubbly. Hold warm on the table.",
    },
  },
  spaghetti: {
    item: "Spaghetti, dry",
    amount: "2 lbs",
    carbTag: "pasta",
    step: {
      heading: "Cook spaghetti (boil, 10–12 min)",
      body: "Boil spaghetti in salted water until al dente. Drain and toss with a little olive oil; hold warm for plating.",
    },
  },
  "garlic bread": {
    item: "Garlic bread",
    amount: "2 loaves",
    carbTag: "bread",
    step: {
      heading: "Warm garlic bread (400°F, 8–10 min)",
      body: "Heat garlic bread until warm and crisp at the edges.",
    },
  },
  "cornbread": {
    item: "Cornbread mix",
    amount: "2 boxes",
    carbTag: "bread",
    step: {
      heading: "Bake cornbread (400°F, 18–22 min)",
      body: "Mix and bake cornbread per package. Cut into squares for the crew.",
    },
  },
  coleslaw: {
    item: "Coleslaw mix",
    amount: "2 bags (14 oz each)",
    step: {
      heading: "Toss the coleslaw (no heat, 5 min)",
      body: "Toss slaw with mayo and vinegar. Chill until mains are ready.",
    },
  },
  "side salad": {
    item: "Mixed salad greens",
    amount: "2 large bags",
    step: {
      heading: "Build the side salad (no heat, 5 min)",
      body: "Toss greens with dressing just before serving.",
    },
  },
  naan: {
    item: "Naan bread",
    amount: "12 pieces",
    carbTag: "bread",
    step: {
      heading: "Warm the naan (400°F, 4–6 min)",
      body: "Heat naan until soft. Stack for the table.",
    },
  },
  quinoa: {
    item: "Quinoa, uncooked",
    amount: "2 cups",
    carbTag: "quinoa",
    step: {
      heading: "Cook quinoa (simmer, 15 min)",
      body: "Rinse quinoa, simmer until tender. Fluff with a fork.",
    },
  },
  "crusty bread": {
    item: "Crusty bread",
    amount: "2 loaves, sliced",
    carbTag: "bread",
    step: {
      heading: "Slice the bread (no heat, 3 min)",
      body: "Slice bread and serve in a basket alongside stew or chili.",
    },
  },
};

/** Identity-first pairing (title + format). */
const IDENTITY_STARCH: Partial<Record<MealIdentity, string[]>> = {
  french_dip: ["fries", "potato wedges"],
  burger: ["potato wedges", "fries"],
  sandwich: ["potato wedges", "coleslaw"],
  taco: ["jasmine rice"],
  wrap: ["jasmine rice", "side salad"],
  pasta: ["garlic bread"],
  bowl: ["jasmine rice", "quinoa"],
  stir_fry: ["jasmine rice", "jasmine rice"],
  indian_curry: ["basmati rice", "jasmine rice", "naan"],
  soup_stew: ["crusty bread", "cornbread"],
  plated_main: ["mashed potatoes", "roasted potatoes", "jasmine rice"],
};

const IDENTITY_VEG: Partial<Record<MealIdentity, string[]>> = {
  french_dip: ["Creamy coleslaw", "Side salad with ranch"],
  burger: ["Creamy coleslaw", "Pickle spear platter"],
  sandwich: ["Creamy coleslaw", "Side salad"],
  taco: ["Pico & shredded lettuce", "Street corn (elote style)"],
  indian_curry: ["Cucumber yogurt salad", "Tomato-cucumber salad"],
  pasta: ["Caesar salad", "Garlic parmesan broccoli"],
  bbq: ["Creamy coleslaw", "Baked beans"],
  stir_fry: ["Garlic broccoli", "Frozen stir-fry vegetables"],
  plated_main: ["Garlic parmesan broccoli", "Roasted carrots & peppers", "Green beans with butter"],
};

const CUISINE_STARCH: Record<string, string[]> = {
  korean: ["jasmine rice"],
  thai: ["jasmine rice"],
  chinese: ["jasmine rice"],
  indian: ["basmati rice", "naan"],
  mexican: ["jasmine rice", "Spanish rice"],
  italian: ["garlic bread"],
  bbq: ["potato wedges", "mac and cheese", "cornbread"],
  cajun: ["mashed potatoes", "cornbread"],
  mediterranean: ["jasmine rice", "quinoa"],
  japanese: ["jasmine rice"],
  american: ["mashed potatoes", "potato wedges", "mac and cheese", "fries"],
};

const CUISINE_VEG: Record<string, string[]> = {
  mexican: ["Pico & shredded lettuce", "Street corn (elote style)", "Bagged slaw with lime"],
  italian: ["Caesar salad", "Garlic parmesan broccoli", "Green beans with butter"],
  indian: ["Cucumber yogurt salad", "Tomato-cucumber salad"],
  korean: ["Quick cucumber salad", "Sesame slaw"],
  thai: ["Cucumber salad with lime", "Garlic broccoli"],
  chinese: ["Garlic broccoli", "Frozen stir-fry vegetables"],
  cajun: ["Corn on the cob", "Green beans with Cajun seasoning"],
  mediterranean: ["Greek salad", "Roasted peppers & onions"],
  bbq: ["Creamy coleslaw", "Corn on the cob", "Baked beans"],
  japanese: ["Sesame slaw", "Frozen edamame"],
  american: ["Creamy coleslaw", "Caesar salad", "Garlic parmesan broccoli", "Corn on the cob"],
};

const CUISINE_EXTRA: Record<string, string[]> = {
  indian: ["Warm naan"],
  mexican: ["Lime wedges and cilantro"],
  italian: ["Grated parmesan for the table"],
  bbq: ["BBQ sauce on the side", "Pickles"],
  korean: ["Kimchi"],
  mediterranean: ["Tzatziki"],
};

const recentStarchKeys: string[] = [];
const recentVegLabels: string[] = [];
const recentBundleIds: string[] = [];
const MAX_RECENT_SIDES = 8;
const MAX_RECENT_BUNDLES = 6;

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function normalizeCuisine(cuisine: string): string {
  const c = (cuisine || "any").toLowerCase().replace(/\s+/g, "_");
  if (c.includes("middle")) return "mediterranean";
  if (c === "asian") return "chinese";
  return c === "any" ? "american" : c;
}

function allergenBlocks(item: string, allergens: string[]): boolean {
  const a = allergens.map((x) => x.toLowerCase());
  const t = item.toLowerCase();
  if (a.includes("gluten") && /\b(bread|bun|pasta|naan|pita|flour|noodle|macaroni|tortilla|roll|hoagie|cornbread)\b/i.test(t)) {
    return true;
  }
  if (a.includes("dairy") && /\b(cheese|butter|cream|yogurt|parmesan|mac and cheese)\b/i.test(t)) {
    return true;
  }
  return false;
}

function pickFromPool(
  pool: string[],
  recent: string[],
  healthiness: string,
  allergens: string[],
  preferLight = false,
  seed = "",
): string | null {
  let viable = pool.filter((s) => s && !allergenBlocks(s, allergens));
  if (viable.length === 0) return null;

  const recentSet = new Set(recent.map((r) => r.toLowerCase()));
  let fresh = viable.filter((s) => !recentSet.has(s.toLowerCase()) && !recentSet.has(sideKey(s)));
  if (fresh.length === 0) fresh = viable;

  if (healthiness === "lean" || preferLight) {
    const light = fresh.filter((s) =>
      /salad|slaw|cucumber|green|broccoli|asparagus|pepper|roasted|grilled|vegetable|veg|rice|quinoa|sweet potato|greens/i.test(
        s,
      ),
    );
    if (light.length > 0) viable = light;
    else viable = fresh;
  } else {
    viable = fresh;
  }

  const start = seed ? hashSeed(seed) % viable.length : 0;
  for (let i = 0; i < viable.length; i++) {
    const pick = viable[(start + i) % viable.length];
    if (!recentSet.has(pick.toLowerCase()) && !recentSet.has(sideKey(pick))) return pick;
  }
  return viable[0];
}

function bundlePassesAllergens(bundle: SideBundle, allergens: string[]): boolean {
  if (allergenBlocks(bundle.starchKey, allergens)) return false;
  if (allergenBlocks(bundle.vegLabel, allergens)) return false;
  if (bundle.extraLabel && allergenBlocks(bundle.extraLabel, allergens)) return false;
  return true;
}

function pickArchetypeBundle(
  ctx: SidePairingContext,
  identity: MealIdentity,
  recentAllStarch: string[],
): ComposedSidePick | null {
  const bundles = bundlesForMeal(identity, ctx.formatKey);
  if (bundles.length === 0) return null;

  let viable = bundles.filter((b) => bundlePassesAllergens(b, ctx.allergens));
  if (viable.length === 0) viable = bundles;

  const bundleRecent = bundleRecentForCtx(ctx);
  const vegRecent = vegRecentForCtx(ctx);
  const recentBundleSet = new Set(bundleRecent);
  let fresh = viable.filter((b) => {
    if (recentBundleSet.has(b.id)) return false;
    const sk = sideKey(b.starchKey);
    const vk = sideKey(b.vegLabel);
    const starchHits = recentAllStarch.filter((r) => r === sk || r.includes(sk)).length;
    const vegHits = vegRecent.filter((v) => sideKey(v) === vk).length;
    return starchHits < 2 && vegHits < 2;
  });
  if (fresh.length === 0) fresh = viable;

  if (ctx.healthiness === "lean") {
    const light = fresh.filter((b) =>
      /salad|slaw|cucumber|green|broccoli|asparagus|pepper|roasted|grilled|vegetable|veg|rice|quinoa|greens/i.test(
        `${b.starchKey} ${b.vegLabel}`,
      ),
    );
    if (light.length > 0) fresh = light;
  }

  const start = hashSeed(`${ctx.title}|${identity}`) % fresh.length;
  for (let i = 0; i < fresh.length; i++) {
    const b = fresh[(start + i) % fresh.length];
    if (!recentBundleSet.has(b.id)) {
      return {
        starchKey: b.starchKey,
        vegLabel: b.vegLabel,
        extraLabel: b.extraLabel ?? null,
        pairingSource: `bundle:${b.id}`,
        bundleId: b.id,
      };
    }
  }

  const b = fresh[0];
  return {
    starchKey: b.starchKey,
    vegLabel: b.vegLabel,
    extraLabel: b.extraLabel ?? null,
    pairingSource: `bundle:${b.id}`,
    bundleId: b.id,
  };
}

export function sideKey(labelOrKey: string): string {
  return labelOrKey.toLowerCase().replace(/\s+/g, "_").replace(/[()]/g, "");
}

export function trackComposedSides(
  starchKey: string | null,
  vegLabel: string | null,
  bundleId?: string | null,
  sessionKey?: string,
): void {
  if (sessionKey) {
    trackSessionComposedSides(sessionKey, starchKey, vegLabel, bundleId);
    return;
  }
  if (starchKey) {
    const k = sideKey(starchKey);
    recentStarchKeys.push(k);
    if (recentStarchKeys.length > MAX_RECENT_SIDES) recentStarchKeys.shift();
    const tpl = STARCH_TEMPLATES[starchKey];
    if (tpl?.carbTag) trackCarb(tpl.carbTag);
  }
  if (vegLabel) {
    recentVegLabels.push(vegLabel);
    if (recentVegLabels.length > MAX_RECENT_SIDES) recentVegLabels.shift();
  }
  if (bundleId) {
    recentBundleIds.push(bundleId);
    if (recentBundleIds.length > MAX_RECENT_BUNDLES) recentBundleIds.shift();
  }
}

function starchRecentForCtx(ctx: SidePairingContext): string[] {
  const recentCarbKeys = getRecentCarbs().map((c) => sideKey(c));
  if (ctx.sessionKey) {
    return [...getSessionSideStarch(ctx.sessionKey).map(sideKey), ...recentCarbKeys];
  }
  return [...recentStarchKeys, ...recentCarbKeys];
}

function vegRecentForCtx(ctx: SidePairingContext): string[] {
  if (ctx.sessionKey) return getSessionSideVeg(ctx.sessionKey);
  return recentVegLabels;
}

function bundleRecentForCtx(ctx: SidePairingContext): string[] {
  if (ctx.sessionKey) return getSessionSideBundles(ctx.sessionKey);
  return recentBundleIds;
}

/** Title-specific curated dinners (highest priority). */
function pickTitleCurated(title: string): Partial<ComposedSidePick> | null {
  const t = title.toLowerCase();
  if (/\bfrench dip\b/.test(t)) {
    return { starchKey: "fries", vegLabel: "Creamy coleslaw", extraLabel: null, pairingSource: "title:french_dip" };
  }
  if (/\b(butter chicken|chicken tikka masala|tikka masala)\b/.test(t)) {
    return { starchKey: "basmati rice", vegLabel: "Cucumber yogurt salad", extraLabel: "Warm naan", pairingSource: "title:indian_curry" };
  }
  if (/\bchicken parm/.test(t)) {
    return {
      starchKey: "spaghetti",
      vegLabel: "Caesar salad",
      extraLabel: "Garlic bread",
      pairingSource: "title:chicken_parm",
    };
  }
  if (/\b(korean beef|bulgogi|bibimbap)\b/.test(t)) {
    return { starchKey: "jasmine rice", vegLabel: "Quick cucumber salad", extraLabel: "Kimchi", pairingSource: "title:korean" };
  }
  if (/\b(pulled pork|bbq pork|pulled chicken)\b/.test(t)) {
    return { starchKey: "potato wedges", vegLabel: "Creamy coleslaw", extraLabel: "BBQ sauce on the side", pairingSource: "title:bbq" };
  }
  if (/\b(mac and cheese|mac & cheese)\b/i.test(t)) {
    return { starchKey: "mac and cheese", vegLabel: "Garlic parmesan broccoli", pairingSource: "title:mac" };
  }
  return null;
}

const PLATED_STARCH_ROTATION = ["mashed potatoes", "jasmine rice", "potato wedges", "mac and cheese", "cornbread", "quinoa"];

/**
 * Pick starch + veg (+ optional extra) for a meal.
 */
export function pickComposedSides(ctx: SidePairingContext): ComposedSidePick {
  const cuisineKey = normalizeCuisine(ctx.cuisine);
  const identity = detectMealIdentity(ctx.title, ctx.formatKey);
  const recentAllStarch = starchRecentForCtx(ctx);
  const vegRecent = vegRecentForCtx(ctx);

  const curated = pickTitleCurated(ctx.title);
  if (curated?.starchKey || curated?.vegLabel) {
    const curatedStarch = curated.starchKey ? sideKey(curated.starchKey) : "";
    const starchRepeated =
      curatedStarch &&
      recentAllStarch.filter((r) => r === curatedStarch || r.includes(curatedStarch)).length >= 2;
    const vegRepeated =
      curated.vegLabel &&
      vegRecent.filter((v) => sideKey(v) === sideKey(curated.vegLabel!)).length >= 2;

    if (!starchRepeated && !vegRepeated) {
      return {
        starchKey: curated.starchKey ?? null,
        vegLabel: curated.vegLabel ?? null,
        extraLabel: curated.extraLabel ?? null,
        pairingSource: curated.pairingSource || "title",
      };
    }
    log(`[side-pair] Rotating off curated "${ctx.title}" — recent overlap`, "compose");
  }

  const archetype = pickArchetypeBundle(ctx, identity, recentAllStarch);
  if (archetype?.starchKey && archetype.vegLabel) {
    log(
      `[side-pair] "${ctx.title}" → bundle ${archetype.bundleId} starch=${archetype.starchKey} veg=${archetype.vegLabel}`,
      "compose",
    );
    return archetype;
  }

  let starchPool = IDENTITY_STARCH[identity] || [];
  if (starchPool.length === 0) starchPool = CUISINE_STARCH[cuisineKey] || PLATED_STARCH_ROTATION;

  let vegPool = IDENTITY_VEG[identity as MealIdentity] || CUISINE_VEG[cuisineKey] || CUISINE_VEG.american;

  if (identity === "burger" || identity === "sandwich" || identity === "french_dip") {
    starchPool = starchPool.filter((k) => k !== "roasted potatoes");
  }

  if (ctx.formatKey === "pasta") {
    starchPool = ["garlic bread"];
    vegPool = CUISINE_VEG.italian;
  }
  if (ctx.formatKey === "bowl" || ctx.formatKey === "stir-fry") {
    starchPool = ["jasmine rice", "quinoa"];
  }

  const starchKey = pickFromPool(
    starchPool,
    recentAllStarch,
    ctx.healthiness,
    ctx.allergens,
    false,
    `${ctx.title}:starch`,
  );
  const vegLabel = pickFromPool(
    vegPool,
    vegRecent,
    ctx.healthiness,
    ctx.allergens,
    false,
    `${ctx.title}:veg`,
  );

  const extraPool = CUISINE_EXTRA[cuisineKey] || [];
  const extraLabel = extraPool.length > 0
    ? pickFromPool(extraPool, [], ctx.healthiness, ctx.allergens, false, `${ctx.title}:extra`) ?? null
    : null;

  const source = `identity:${identity}|cuisine:${cuisineKey}`;

  log(
    `[side-pair] "${ctx.title}" → starch=${starchKey || "none"} veg=${vegLabel || "none"} (${source})`,
    "compose",
  );

  return { starchKey, vegLabel, extraLabel, pairingSource: source };
}

export function getStarchTemplate(key: string) {
  return STARCH_TEMPLATES[key] || null;
}

/** Never use roasted/baby potatoes as the generic default. */
export function fallbackStarchKey(ctx: SidePairingContext): string {
  const pick = pickComposedSides(ctx);
  return pick.starchKey || "jasmine rice";
}
