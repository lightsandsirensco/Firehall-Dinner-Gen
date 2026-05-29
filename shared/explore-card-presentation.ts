import type { ExploreRecipeCard } from "./explore-recipe.js";
import { isSoftHeldExploreCard } from "./explore-imagery-status.js";

export type ExploreBadge =
  | "high_protein"
  | "comfort_food"
  | "one_pot"
  | "bbq"
  | "healthy"
  | "crew_favorite"
  | "under_30"
  | "shift_meal";

export interface ExploreCardPresentation {
  primaryProtein?: string;
  comfortLabel?: string;
  badges: ExploreBadge[];
  /** Max 2 short labels for overlay chips */
  displayBadges: string[];
  /** Quick-info pills for cinematic cards (time + traits) */
  quickPills: string[];
  hookLine: string;
}

const BADGE_LABELS: Record<ExploreBadge, string> = {
  high_protein: "High Protein",
  comfort_food: "Comfort",
  one_pot: "One Pot",
  bbq: "BBQ",
  healthy: "Healthy",
  crew_favorite: "Crew Favorite",
  under_30: "30 Min",
  shift_meal: "Shift Meal",
};

const TRAIT_PILL_PRIORITY: ExploreBadge[] = [
  "crew_favorite",
  "under_30",
  "high_protein",
  "one_pot",
  "comfort_food",
  "bbq",
  "healthy",
  "shift_meal",
];

function detectProtein(title: string): string | undefined {
  const t = title.toLowerCase();
  const checks: [RegExp, string][] = [
    [/chicken/i, "Chicken"],
    [/beef|steak|brisket|goulash/i, "Beef"],
    [/pork|sausage|bacon|ham/i, "Pork"],
    [/salmon|fish|shrimp|seafood|scallop|cod|tuna|crab|lobster/i, "Seafood"],
    [/turkey/i, "Turkey"],
    [/lamb|mutton/i, "Lamb"],
    [/tofu|tempeh|lentil|chickpea|bean/i, "Plant-Based"],
  ];
  for (const [pattern, label] of checks) {
    if (pattern.test(t)) return label;
  }
  return undefined;
}

function detectComfort(title: string, summary: string, pool?: string): string | undefined {
  const combined = `${title} ${summary}`.toLowerCase();
  if (pool === "comfort") return "Comfort Food";
  if (/bbq|barbecue|pulled\s*pork|smoked|grill/i.test(combined)) return "BBQ";
  if (/mac.*cheese|casserole|meatloaf|pot\s*pie|chili|stew|comfort|cheesy|loaded/i.test(combined)) {
    return "Comfort Food";
  }
  if (/one[- ]pot|one[- ]pan|sheet\s*pan/i.test(combined)) return "One Pot";
  return undefined;
}

function collectBadges(
  recipe: ExploreRecipeCard,
  protein?: string,
  comfort?: string,
): ExploreBadge[] {
  const badges: ExploreBadge[] = [];
  const combined = `${recipe.title} ${recipe.summary || ""}`.toLowerCase();

  if (/high[- ]?protein|lean protein|protein[- ]?packed/i.test(combined)) {
    badges.push("high_protein");
  }
  if (comfort === "Comfort Food") badges.push("comfort_food");
  if (comfort === "BBQ") badges.push("bbq");
  if (comfort === "One Pot" || /one[- ]pot|one[- ]pan/i.test(combined)) badges.push("one_pot");
  if (recipe.readyInMinutes > 0 && recipe.readyInMinutes <= 30) badges.push("under_30");
  if (recipe._curatedSlug) badges.push("crew_favorite");
  if (/post[- ]?fire|shift|hall|crew/i.test(combined)) badges.push("shift_meal");
  if (recipe._pool === "healthy" || /grilled|lean|light|salad|salmon/i.test(combined)) {
    badges.push("healthy");
  }

  return badges;
}

function buildQuickPills(recipe: ExploreRecipeCard, badges: ExploreBadge[]): string[] {
  const pills: string[] = [];
  if (recipe.readyInMinutes > 0) {
    pills.push(recipe.readyInMinutes <= 30 ? `${recipe.readyInMinutes} Min` : `${recipe.readyInMinutes}m`);
  }
  for (const key of TRAIT_PILL_PRIORITY) {
    if (pills.length >= 3) break;
    if (!badges.includes(key)) continue;
    const label = BADGE_LABELS[key];
    if (!pills.includes(label)) pills.push(label);
  }
  return pills.slice(0, 3);
}

function buildHookLine(
  recipe: ExploreRecipeCard,
  protein?: string,
  comfort?: string,
  macros?: { protein_g?: number },
  crewSize?: number,
): string {
  const servings = crewSize && crewSize > 0 ? crewSize : recipe.servings;
  if (macros?.protein_g && macros.protein_g > 0 && servings > 0) {
    const perServing = Math.round(macros.protein_g / Math.max(servings, 1));
    if (perServing >= 20) {
      return `${perServing}g protein · feeds ${servings}`;
    }
  }

  if (comfort === "Comfort Food") return "Stick-to-your-ribs comfort";
  if (comfort === "BBQ") return "Smoky hall favorite";
  if (protein) return `${protein} · crew-sized portions`;
  if (recipe.readyInMinutes > 0 && recipe.readyInMinutes <= 30) {
    return `Ready in ${recipe.readyInMinutes} min`;
  }
  if (recipe.summary) {
    const plain = recipe.summary.replace(/<[^>]*>/g, "").trim();
    if (plain.length > 0) return plain.slice(0, 72) + (plain.length > 72 ? "…" : "");
  }
  return "Built for the hall kitchen";
}

/** Cards that should appear in photo-first discover/search grids */
export function isDisplayableExploreCard(card: ExploreRecipeCard): boolean {
  if (card._firehallFallback) return false;
  if (!card.id || card.id <= 0) return false;
  if (isSoftHeldExploreCard(card)) return true;
  return Boolean(card.image?.trim());
}

export function computeCardPresentation(
  recipe: ExploreRecipeCard,
  options?: {
    crewSize?: number;
    macros?: { protein_g?: number };
    isCurated?: boolean;
    extraBadges?: string[];
  },
): ExploreCardPresentation {
  const primaryProtein = recipe.primaryProtein || detectProtein(recipe.title);
  const comfortLabel =
    recipe.comfortLabel || detectComfort(recipe.title, recipe.summary || "", recipe._pool);
  const badges = recipe.badges?.length
    ? recipe.badges
    : collectBadges(recipe, primaryProtein, comfortLabel);

  if (options?.isCurated && !badges.includes("crew_favorite")) {
    badges.unshift("crew_favorite");
  }

  const displayBadges: string[] = [];
  const pushLabel = (label: string) => {
    if (displayBadges.length >= 2) return;
    if (!displayBadges.includes(label)) displayBadges.push(label);
  };

  if (primaryProtein) pushLabel(primaryProtein);
  if (comfortLabel) pushLabel(comfortLabel);
  for (const b of badges) {
    if (displayBadges.length >= 2) break;
    const label = BADGE_LABELS[b];
    if (label !== primaryProtein && label !== comfortLabel) pushLabel(label);
  }
  for (const extra of options?.extraBadges || []) {
    pushLabel(extra);
  }

  const hookLine =
    recipe.hookLine ||
    buildHookLine(recipe, primaryProtein, comfortLabel, options?.macros, options?.crewSize);

  const quickPills = buildQuickPills(recipe, badges);

  return {
    primaryProtein,
    comfortLabel,
    badges,
    displayBadges,
    quickPills,
    hookLine,
  };
}

export function exploreImageSrcSet(recipeId: number): string | undefined {
  if (recipeId <= 0 || recipeId >= 500_000) return undefined;
  const base = "https://img.spoonacular.com/recipes";
  return [
    `${base}/${recipeId}-312x231.jpg 312w`,
    `${base}/${recipeId}-556x370.jpg 556w`,
    `${base}/${recipeId}-636x393.jpg 636w`,
  ].join(", ");
}
