import type { RecipeCorrection } from "../types.js";
import { field, ing } from "./helpers.js";

/**
 * BBQ index `protein` values had drifted from the recipes (ribeye listed as
 * pork, shrimp as beef, three meat platters as vegetarian). The Explore slug
 * overrides masked most of it on screen; the raw data is corrected so nothing
 * downstream inherits the wrong family. Values match each page's `protein:` tag.
 */
const BBQ_INDEX_PROTEIN: Array<[slug: string, was: string, now: string]> = [
  ["honey-chipotle-chicken-thighs", "pork", "chicken"],
  ["brisket-style-beef-sandwiches-au-jus", "chicken", "beef"],
  ["hot-honey-grilled-sausage-peppers", "beef", "pork"],
  ["texas-central-brisket-crew", "pork", "beef"],
  ["competition-bbq-chicken-thighs", "beef", "chicken"],
  ["smoked-bbq-chicken-wings-tray", "beef", "chicken"],
  ["hickory-smoked-chicken-breast", "beef", "chicken"],
  ["reverse-seared-ribeye-crew", "pork", "beef"],
  ["smoked-picanha-steak-platter", "pork", "beef"],
  ["smoked-mac-and-cheese-crew", "pork", "vegetarian"],
  ["smoked-baked-beans-crew", "chicken", "pork"],
  ["smoked-potato-salad-tray", "chicken", "vegetarian"],
  ["lamb-merguez-skewers-crew", "chicken", "lamb"],
  ["pork-satay-skewers-crew", "beef", "pork"],
  ["honey-sriracha-shrimp-skewers", "beef", "seafood"],
  ["yakiniku-grill-platter-crew", "pork", "beef"],
  ["tandoori-lamb-chop-platter", "vegetarian", "lamb"],
  ["portuguese-linguica-grill-platter", "vegetarian", "pork"],
  ["spiedie-chicken-platter-crew", "vegetarian", "chicken"],
  ["pollo-asado-citrus-platter", "lamb", "chicken"],
  ["mixed-lamb-chop-grill-board", "pork", "lamb"],
  ["maple-bourbon-grilled-trout", "beef", "seafood"],
  ["grilled-cod-lemon-packets", "beef", "seafood"],
  ["grilled-chicken-pesto-panini-crew", "beef", "chicken"],
  ["pressed-cuban-sandwiches-crew", "lamb", "pork"],
  ["grilled-reuben-sandwiches-crew", "pork", "beef"],
  ["andouille-po-boy-rolls-crew", "chicken", "pork"],
  ["cast-iron-steak-fajita-sizzlers", "chicken", "beef"],
  ["firehall-hibachi-mixed-grill-crew", "lamb", "mixed"],
  ["flat-top-philly-cheesesteaks-crew", "seafood", "beef"],
  ["griddle-smash-sausage-peppers", "seafood", "pork"],
  ["mongolian-beef-flat-top-crew", "seafood", "beef"],
  ["firehall-street-elote-cups", "seafood", "vegetarian"],
  ["loaded-ranch-potato-salad-crew", "chicken", "pork"],
  ["grilled-peach-burrata-salad", "beef", "pork"],
  ["charred-broccolini-lemon-tray", "pork", "seafood"],
];

export const B3_DIETARY: RecipeCorrection[] = [
  {
    slug: "pretzel-bite-platter", collection: "hall-expansion", batch: "B3-dietary", category: "dietary",
    findings: ["vegetarian_label_contradicts_ingredients"],
    summary: "Anchovy-free Worcestershire so the vegetarian label is true",
    rationale: "Labeled vegetarian, but standard Worcestershire contains anchovies. Anchovy-free Worcestershire is widely sold and tastes the same in beer cheese.",
    ops: [ing(5, "name", "Worcestershire sauce", "vegetarian (anchovy-free) Worcestershire sauce")],
  },
  ...BBQ_INDEX_PROTEIN.map(([slug, was, now]): RecipeCorrection => ({
    slug, collection: "bbq", batch: "B3-dietary", category: "dietary", target: "index",
    findings: ["index_protein_mismatch"],
    summary: `Catalog index protein corrected: ${was} → ${now}`,
    rationale: `The recipe is ${now}${now === "vegetarian" ? " (no meat or fish)" : ""}; the index entry said ${was}.`,
    ops: [field("protein", was, now)],
  })),
];

const VEG_PARM = "labeled vegetarian (microbial rennet)";

/** Meatless recipes whose cheese is traditionally made with animal rennet. */
const RENNET_GUIDANCE: Array<[RecipeCorrection["collection"], string, number, string | undefined, string]> = [
  ["golden-100", "30-minute-pasta-e-fagioli-for-the-hall", 10, "finely grated, plus rind if you have it", `finely grated, plus rind if you have it; use a Parmesan ${VEG_PARM}`],
  ["golden-100", "mac-and-cheese-bake", 5, undefined, `use a Gruyère ${VEG_PARM}, or Monterey Jack`],
  ["golden-100", "mac-and-cheese-bake", 11, undefined, `use a Parmesan ${VEG_PARM}`],
  ["hall-expansion", "chickpea-pasta-primavera-white-beans", 7, "grated", `grated; use a Parmesan ${VEG_PARM}`],
  ["hall-expansion", "cottage-cheese-spinach-stuffed-shells", 3, "grated", `grated; use a Parmesan ${VEG_PARM}`],
  ["golden-100", "five-ingredient-pasta", 3, undefined, `use a Parmesan ${VEG_PARM}`],
  ["hall-expansion", "pasta-bar-night", 3, "grated", `grated; use a Parmesan ${VEG_PARM}`],
  ["hall-expansion", "pasta-bar-night", 5, undefined, "use a pesto labeled vegetarian (traditional pesto uses animal-rennet Parmesan)"],
  ["golden-100", "pasta-e-ceci-for-the-hall", 8, "grated", `grated; use a Parmesan ${VEG_PARM}`],
  ["performance-meals", "cottage-cheese-protein-pasta", 4, "grated", `grated; use a Parmesan ${VEG_PARM}`],
  ["bbq", "smoked-mac-and-cheese-crew", 6, "shredded", `shredded; use a Gruyère ${VEG_PARM}`],
  ["golden-100", "spaghetti-aglio-e-olio-for-the-hall", 5, "optional at the line", `optional at the line; use a Parmesan ${VEG_PARM}`],
  ["performance-meals", "white-bean-kale-soup", 8, "2-inch chunk", `2-inch chunk, from a Parmesan ${VEG_PARM}`],
];

const bySlug = new Map<string, typeof RENNET_GUIDANCE>();
for (const row of RENNET_GUIDANCE) bySlug.set(row[1], [...(bySlug.get(row[1]) ?? []), row]);

export const B3_DIETARY_RENNET: RecipeCorrection[] = [...bySlug.values()].map((rows) => ({
  slug: rows[0]![1],
  collection: rows[0]![0],
  batch: "B3-dietary-02",
  category: "dietary",
  findings: ["vegetarian_claim_animal_rennet"],
  summary: "Cheese line now tells the cook to buy a vegetarian (microbial-rennet) version, so the Vegetarian label is supported",
  rationale:
    "Parmigiano-Reggiano, Grana Padano and Pecorino Romano must be made with animal rennet, and Gruyère traditionally is, so a recipe listing plain Parmesan or Gruyère isn't vegetarian as written. Vegetarian-labeled versions are widely sold.",
  reference: "Parmigiano-Reggiano and Pecorino Romano PDO specifications (animal rennet); Vegetarian Society guidance on rennet",
  ops: rows.map(([, , idx, was, now]) => ing(idx, "notes", was, now)),
}));
