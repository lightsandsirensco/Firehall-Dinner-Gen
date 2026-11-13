/**
 * Explore "Featured" default order: hand-picked recipes that have passed
 * automated validation and individual culinary review, dinners before
 * breakfasts. Everything not listed follows A–Z.
 */
export const EXPLORE_FEATURED_SLUGS: readonly string[] = [
  "smash-burgers",
  "big-chili",
  "steak-tacos",
  "bbq-chicken-bowls",
  "chicken-parm",
  "pulled-pork",
  "beef-broccoli",
  "chicken-shawarma-pitas",
  "chili-lime-grilled-tilapia",
  "chicken-pot-pie",
  "jerk-chicken",
  "beef-dip",
  "five-ingredient-pasta",
  "teriyaki-chicken-rice-bowls",
  "chipotle-lime-chicken-tacos",
  "shawarma-bar-night",
  "mostaccioli-sausage-bake",
  "herb-baked-salmon-tray",
  "bbq-chicken-sliders",
  "chicken-caesar",
  "steak-sandwiches",
  "peruvian-sheet-pan-chicken-aji-verde",
  "applewood-pork-shoulder-steaks",
  "30-minute-pasta-e-fagioli-for-the-hall",
  "high-protein-chicken-fried-rice",
  "beef-gyros-for-the-hall",
  "caprese-chicken-bake",
  "loaded-baked-potato-bar",
  "mac-and-cheese-bake",
  "bbq-chicken-mac-and-cheese",
  "honey-lime-chicken-tray",
  "mediterranean-baked-fish-tray",
  "peanut-chicken-rice-bowls",
  "chicken-quesadillas",
  "andouille-po-boy-rolls-crew",
  "pesto-tomato-chicken-tray",
  "costco-rotisserie-remix",
  "hall-breakfast-burritos",
  "cast-iron-breakfast-skillet",
  "fire-captain-omelette-bar",
  "chorizo-breakfast-hash",
  "bagel-sandwich-line",
  "baked-oatmeal-mixed-berries",
  "bagel-lox-breakfast-board",
  "bbq-breakfast-hash",
  "belgian-waffle-platter",
  "black-bean-egg-white-breakfast-burritos",
  "berry-vanilla-protein-overnight-oats",
];

export type ExploreSortMode = "featured" | "az";

const FEATURED_RANK = new Map(EXPLORE_FEATURED_SLUGS.map((slug, i) => [slug, i]));

export function sortExploreEntries<T extends { slug: string; title: string }>(rows: readonly T[], mode: ExploreSortMode): T[] {
  const byTitle = (a: T, b: T) => a.title.localeCompare(b.title);
  if (mode === "az") return [...rows].sort(byTitle);
  return [...rows].sort((a, b) => {
    const ra = FEATURED_RANK.get(a.slug) ?? Infinity;
    const rb = FEATURED_RANK.get(b.slug) ?? Infinity;
    return ra === rb ? byTitle(a, b) : ra - rb;
  });
}
