import type { ExploreRecipeCard } from "@/lib/explore-recipe";

const FALLBACK = [
  "Hall-tested for crew nights",
  "Built for the station table",
  "Practical spread — not food-blog fluff",
  "Crew-ready after a long shift",
] as const;

function stableIndex(key: string, len: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return Math.abs(h) % len;
}

/** Firefighter-context trust line for Explore cards (social proof without fake stats). */
export function buildExploreTrustLine(recipe: ExploreRecipeCard): string {
  if (recipe.hookLine?.trim()) return recipe.hookLine.trim();
  if (recipe.fromCuratedDb && recipe.publisherMedia && recipe.publisherName?.trim()) {
    return `Curated from ${recipe.publisherName.trim()}`;
  }
  if (recipe.fromCuratedDb && recipe.publisherName?.trim()) {
    return `Via ${recipe.publisherName.trim()}`;
  }
  if (recipe._curatedSlug) return "Crew-tested hall classic";

  const text = `${recipe.title} ${recipe.summary || ""} ${recipe._pool || ""}`.toLowerCase();

  if (/chili|stew|soup/.test(text)) return "Big pot — feeds the whole hall";
  if (/bbq|grill|smoked|ribs/.test(text)) return "Grill night at the station";
  if (/pasta|spaghetti|lasagna/.test(text)) return "Hall pasta night energy";
  if (/taco|burrito|fajita/.test(text)) return "Build-your-own crew spread";
  if (/sandwich|burger|wrap|slider/.test(text)) return "Handheld line for hungry crews";
  if (/slow cooker|crockpot|pot roast/.test(text)) return "Set it during downtime";
  if (/one pot|sheet pan|skillet/.test(text)) return "Less cleanup after the call";
  if (recipe.readyInMinutes > 0 && recipe.readyInMinutes <= 30) return "Quick turn before the next run";
  if (/healthy|salmon|grilled chicken/.test(text)) return "Lighter plate — still satisfying";

  return FALLBACK[stableIndex(`${recipe.id}-${recipe.title}`, FALLBACK.length)];
}
