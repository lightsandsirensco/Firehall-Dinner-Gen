import { CLASSIC_HALL_MEALS } from "@shared/classic-hall-meals";
import { buildMinimalClientRecipe } from "@shared/minimal-client-recipe";
import type { GoldenRecipePage } from "@shared/golden-100/recipe-page-schema";
import type { ClientRecipeResponse } from "@shared/schema";
import { catalogPageToClientRecipe } from "@/lib/catalog-recipe-save";
import { WHEEL_CLASSICS, type WheelClassic } from "@/lib/firehall-classics-wheel";

export function classicMealToVoteRecipe(meal: {
  shortLabel: string;
  slug: string;
  tagline: string;
}): ClientRecipeResponse {
  return {
    ...buildMinimalClientRecipe(meal.shortLabel),
    why_it_fits_tonight: meal.tagline,
    _signature: `hall-vote:${meal.slug}`,
    _id: `hall-vote-${meal.slug}`,
  };
}

export function wheelClassicToVoteRecipe(classic: WheelClassic): ClientRecipeResponse {
  return classicMealToVoteRecipe({
    shortLabel: classic.shortLabel || classic.title,
    slug: classic.slug,
    tagline: classic.tagline || classic.crewLine,
  });
}

export function catalogPageToVoteRecipe(page: GoldenRecipePage, slug: string): ClientRecipeResponse {
  return catalogPageToClientRecipe(page, slug);
}

export function relatedSlugToVoteRecipe(related: { slug: string; title: string }): ClientRecipeResponse {
  return {
    ...buildMinimalClientRecipe(related.title),
    why_it_fits_tonight: `Another hall favorite — ${related.title}`,
    _signature: `hall-vote-related:${related.slug}`,
    _id: `hall-vote-related-${related.slug}`,
  };
}

/** Current catalog recipe plus related slugs for a multi-option vote. */
export function catalogVoteOptions(
  page: GoldenRecipePage,
  related: Array<{ slug: string; title: string }> = [],
): ClientRecipeResponse[] {
  const main = catalogPageToVoteRecipe(page, page.slug);
  const alts = related
    .filter((r) => r.slug !== page.slug)
    .slice(0, 4)
    .map(relatedSlugToVoteRecipe);
  return [main, ...alts].slice(0, 5);
}

/** Default homepage / fallback options — four hall classics. */
export function buildDefaultHallVoteRecipes(): ClientRecipeResponse[] {
  return CLASSIC_HALL_MEALS.slice(0, 4).map((meal) => classicMealToVoteRecipe(meal));
}

/** Canonical recipe page for a hall-vote option payload, when one exists. */
export function resolveHallVoteRecipeHref(recipe: ClientRecipeResponse): string | null {
  const r = recipe as ClientRecipeResponse & { _id?: string; _signature?: string; _slug?: string };

  if (r._id === "hall-vote-try-another") return null;

  const slug = r._slug?.trim();
  if (slug) return `/recipes/${encodeURIComponent(slug)}`;

  const signature = r._signature?.trim();
  if (signature) {
    for (const prefix of ["hall-vote-related:", "hall-vote:"] as const) {
      if (signature.startsWith(prefix)) {
        const fromSig = signature.slice(prefix.length).trim();
        if (fromSig) return `/recipes/${encodeURIComponent(fromSig)}`;
      }
    }
  }

  const id = r._id?.trim();
  if (id?.startsWith("hall-vote-related-")) {
    const fromId = id.slice("hall-vote-related-".length).trim();
    if (fromId) return `/recipes/${encodeURIComponent(fromId)}`;
  }
  if (id?.startsWith("hall-vote-") && id !== "hall-vote-try-another") {
    const fromId = id.slice("hall-vote-".length).trim();
    if (fromId) return `/recipes/${encodeURIComponent(fromId)}`;
  }

  return null;
}

/** Winner plus one alternate classic for a quick two-option wheel vote. */
export function wheelVotePair(winner: WheelClassic): ClientRecipeResponse[] {
  const alternate = WHEEL_CLASSICS.find((c) => c.slug !== winner.slug);
  if (!alternate) {
    return [wheelClassicToVoteRecipe(winner), classicMealToVoteRecipe(CLASSIC_HALL_MEALS[1]!)];
  }
  return [wheelClassicToVoteRecipe(winner), wheelClassicToVoteRecipe(alternate)];
}
