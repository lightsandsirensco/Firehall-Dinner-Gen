/**
 * Curated side bundles — complete starch + veg (+ optional extra) per meal identity.
 * Prevents random "rice + broccoli" / "potatoes + broccoli" repetition.
 */

import type { MealIdentity } from "./meal-semantics";

export interface SideBundle {
  id: string;
  starchKey: string;
  vegLabel: string;
  extraLabel?: string | null;
}

/** Keys must match STARCH_TEMPLATES in server/side-pairing.ts */
export const MEAL_IDENTITY_SIDE_BUNDLES: Partial<Record<MealIdentity, SideBundle[]>> = {
  pasta: [
    { id: "pasta-caesar", starchKey: "garlic bread", vegLabel: "Caesar salad" },
    { id: "pasta-broccoli", starchKey: "garlic bread", vegLabel: "Garlic parmesan broccoli" },
    { id: "pasta-salad", starchKey: "garlic bread", vegLabel: "Side salad with ranch", extraLabel: "Grated parmesan for the table" },
  ],
  taco: [
    { id: "taco-rice-pico", starchKey: "jasmine rice", vegLabel: "Pico & shredded lettuce", extraLabel: "Lime wedges and cilantro" },
    { id: "taco-spanish-elote", starchKey: "Spanish rice", vegLabel: "Street corn (elote style)" },
    { id: "taco-rice-slaw", starchKey: "jasmine rice", vegLabel: "Bagged slaw with lime" },
  ],
  burger: [
    { id: "burger-wedges-slaw", starchKey: "potato wedges", vegLabel: "Creamy coleslaw" },
    { id: "burger-fries-pickle", starchKey: "fries", vegLabel: "Pickle spear platter", extraLabel: "BBQ sauce on the side" },
    { id: "burger-wedges-salad", starchKey: "potato wedges", vegLabel: "Side salad with ranch" },
  ],
  sandwich: [
    { id: "sandwich-wedges-slaw", starchKey: "potato wedges", vegLabel: "Creamy coleslaw" },
    { id: "sandwich-wedges-salad", starchKey: "potato wedges", vegLabel: "Side salad" },
  ],
  french_dip: [
    { id: "dip-fries-slaw", starchKey: "fries", vegLabel: "Creamy coleslaw" },
    { id: "dip-wedges-slaw", starchKey: "potato wedges", vegLabel: "Side salad with ranch" },
  ],
  indian_curry: [
    { id: "curry-basmati-raita", starchKey: "basmati rice", vegLabel: "Cucumber yogurt salad", extraLabel: "Warm naan" },
    { id: "curry-rice-tomato", starchKey: "jasmine rice", vegLabel: "Tomato-cucumber salad", extraLabel: "Warm naan" },
  ],
  stir_fry: [
    { id: "stirfry-rice-veg", starchKey: "jasmine rice", vegLabel: "Frozen stir-fry vegetables" },
    { id: "stirfry-rice-broccoli", starchKey: "jasmine rice", vegLabel: "Garlic broccoli" },
  ],
  bowl: [
    { id: "bowl-rice-cucumber", starchKey: "jasmine rice", vegLabel: "Quick cucumber salad" },
    { id: "bowl-quinoa-slaw", starchKey: "quinoa", vegLabel: "Sesame slaw" },
  ],
  soup_stew: [
    { id: "stew-bread-salad", starchKey: "crusty bread", vegLabel: "Side salad" },
    { id: "stew-cornbread-beans", starchKey: "cornbread", vegLabel: "Green beans with butter" },
  ],
  wrap: [
    { id: "wrap-rice-pico", starchKey: "jasmine rice", vegLabel: "Pico & shredded lettuce" },
    { id: "wrap-rice-salad", starchKey: "jasmine rice", vegLabel: "Side salad with ranch" },
  ],
  plated_main: [
    { id: "plated-rice-broccoli", starchKey: "jasmine rice", vegLabel: "Garlic parmesan broccoli" },
    { id: "plated-mash-beans", starchKey: "mashed potatoes", vegLabel: "Green beans with butter" },
    { id: "plated-wedges-slaw", starchKey: "potato wedges", vegLabel: "Creamy coleslaw" },
    { id: "plated-mac-caesar", starchKey: "mac and cheese", vegLabel: "Caesar salad" },
    { id: "plated-cornbread-carrots", starchKey: "cornbread", vegLabel: "Roasted carrots & peppers" },
    { id: "plated-quinoa-salad", starchKey: "quinoa", vegLabel: "Greek salad" },
    { id: "plated-rice-edamame", starchKey: "jasmine rice", vegLabel: "Frozen edamame" },
    { id: "plated-fries-salad", starchKey: "fries", vegLabel: "Side salad with ranch" },
  ],
};

/** Format-level bundles when identity resolves to generic plated_main */
export const FORMAT_SIDE_BUNDLES: Partial<Record<string, SideBundle[]>> = {
  sheet_pan: [
    { id: "sheetpan-rice-broccoli", starchKey: "jasmine rice", vegLabel: "Roasted carrots & peppers" },
    { id: "sheetpan-quinoa-salad", starchKey: "quinoa", vegLabel: "Side salad" },
  ],
  one_pot: [
    { id: "onepot-cornbread-salad", starchKey: "cornbread", vegLabel: "Caesar salad" },
    { id: "onepot-rice-slaw", starchKey: "jasmine rice", vegLabel: "Creamy coleslaw" },
  ],
  grill: [
    { id: "grill-wedges-slaw", starchKey: "potato wedges", vegLabel: "Creamy coleslaw", extraLabel: "BBQ sauce on the side" },
    { id: "grill-corn-salad", starchKey: "cornbread", vegLabel: "Corn on the cob" },
  ],
  casserole: [
    { id: "casserole-bread-salad", starchKey: "garlic bread", vegLabel: "Caesar salad" },
    { id: "casserole-cornbread-beans", starchKey: "cornbread", vegLabel: "Green beans with butter" },
  ],
};

export function bundlesForMeal(identity: MealIdentity, formatKey: string): SideBundle[] {
  const byIdentity = MEAL_IDENTITY_SIDE_BUNDLES[identity];
  if (byIdentity?.length) return byIdentity;
  const fmt = (formatKey || "").toLowerCase().replace(/-/g, "_");
  return FORMAT_SIDE_BUNDLES[fmt] || MEAL_IDENTITY_SIDE_BUNDLES.plated_main || [];
}
