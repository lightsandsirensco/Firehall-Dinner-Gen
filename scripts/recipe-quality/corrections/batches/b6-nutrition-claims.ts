import type { CorrectionCollection, RecipeCorrection } from "../types.js";
import { field } from "./helpers.js";

/** Pages whose nutrition is withheld (no verified estimate) but still carried High Protein flags. */
const WITHHELD_HIGH_PROTEIN: Array<[CorrectionCollection, string]> = [
  ["golden-100", "beef-dip"],
  ["golden-100", "jerk-chicken"],
  ["golden-100", "loaded-baked-potato-bar"],
  ["golden-100", "mac-and-cheese-bake"],
  ["golden-100", "pulled-pork"],
  ["hall-expansion", "peanut-chicken-rice-bowls"],
  ["pizza-night", "breakfast-sausage-pizza"],
  ["pizza-night", "detroit-style-pizza"],
  ["pizza-night", "firehall-supreme-pizza"],
  ["pizza-night", "honey-soppressata-pizza"],
  ["pizza-night", "jalapeno-popper-pizza"],
  ["pizza-night", "margherita-pizza"],
  ["pizza-night", "meat-lovers-sheet-pizza"],
  ["pizza-night", "nashville-hot-chicken-pizza"],
  ["pizza-night", "pepperoni-pizza-night"],
  ["pizza-night", "sicilian-sheet-pizza"],
  ["pizza-night", "smoked-brisket-bbq-pizza"],
  ["pizza-night", "taco-pizza"],
  ["pizza-night", "white-garlic-chicken-pizza"],
];

export const B6_NUTRITION_CLAIMS: RecipeCorrection[] = WITHHELD_HIGH_PROTEIN.map(([collection, slug]) => ({
  slug, collection, batch: "B6-nutrition-claims-01", category: "claim",
  findings: ["high_protein_claim_unverified"],
  summary: "High Protein flags cleared — nutrition is withheld, so the claim can't be verified",
  rationale: "The page shows no nutrition estimate, yet its stored flags still marked it High Protein, which the Pick Tonight generator read directly.",
  ops: [
    field("nutrition.filterFlags.highProtein", true, false),
    field("nutrition.badgeCandidates.highProtein", true, false),
  ],
}));
