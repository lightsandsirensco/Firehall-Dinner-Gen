/**
 * Tiered Explore imagery governance — approved, soft-held, hard-held.
 * Strict on photography; soft-held preserves browse momentum without wrong heroes.
 */

import type { CuratedRecipeStatus } from "./curated-recipe/types.js";
import type { ExploreRecipeCard } from "./explore-recipe.js";

/** Tiered imagery state for Explore cards and detail. */
export type ExploreImageryStatus = "approved" | "soft_held" | "hard_held";

export type ExploreHeldImageryLabel =
  | "On Deck"
  | "Next Shift"
  | "Crew Favorite Incoming"
  | "Finalizing"
  | "Coming Up";

const SOFT_HELD_LABELS: ExploreHeldImageryLabel[] = [
  "On Deck",
  "Next Shift",
  "Crew Favorite Incoming",
  "Finalizing",
  "Coming Up",
];

const LEGACY_SOFT_STATUSES = new Set(["finalizing", "editorial_review", "coming_soon"]);

function hashSlug(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Normalize legacy API values to tiered statuses. */
export function migrateImageryStatus(
  status: string | undefined,
): ExploreImageryStatus | undefined {
  if (!status) return undefined;
  if (status === "approved" || status === "soft_held" || status === "hard_held") {
    return status;
  }
  if (LEGACY_SOFT_STATUSES.has(status)) {
    return status === "editorial_review" ? "hard_held" : "soft_held";
  }
  return undefined;
}

export function isApprovedExploreImagery(
  card: Pick<ExploreRecipeCard, "imageryStatus">,
): boolean {
  return !card.imageryStatus || card.imageryStatus === "approved";
}

export function isSoftHeldExploreCard(
  card: Pick<ExploreRecipeCard, "imageryStatus">,
): boolean {
  return card.imageryStatus === "soft_held";
}

export function isHardHeldExploreCard(
  card: Pick<ExploreRecipeCard, "imageryStatus">,
): boolean {
  return card.imageryStatus === "hard_held";
}

/** @deprecated Use isSoftHeldExploreCard — kept for gradual migration */
export function isHeldInReviewExploreCard(
  card: Pick<ExploreRecipeCard, "imageryStatus">,
): boolean {
  return isSoftHeldExploreCard(card);
}

export function isExploreImageryPlaceholder(
  card: Pick<ExploreRecipeCard, "imageryStatus">,
): boolean {
  return isSoftHeldExploreCard(card);
}

export function resolveImageryGovernanceTier(input: {
  status?: CuratedRecipeStatus;
  imageApproved?: boolean;
  hasApprovedHero: boolean;
}): ExploreImageryStatus {
  if (input.hasApprovedHero && input.imageApproved !== false) return "approved";

  if (input.status === "archived" || input.status === "draft") return "hard_held";
  if (input.status === "review") return "hard_held";
  if (input.imageApproved === false) return "hard_held";

  if (input.status === "published" || !input.status) return "soft_held";

  return "hard_held";
}

export function resolveSoftHeldImageryLabel(
  slugOrId?: string | number | null,
): ExploreHeldImageryLabel {
  const seed = String(slugOrId ?? "hall");
  return SOFT_HELD_LABELS[hashSlug(seed) % SOFT_HELD_LABELS.length]!;
}

/** @deprecated Use resolveSoftHeldImageryLabel */
export function resolveHeldImageryLabel(
  _status: ExploreImageryStatus,
  slugOrId?: string | number | null,
): ExploreHeldImageryLabel {
  return resolveSoftHeldImageryLabel(slugOrId);
}

export function applyImageryGovernanceToCard(
  card: ExploreRecipeCard,
  input: {
    status?: CuratedRecipeStatus;
    imageApproved?: boolean;
    hasApprovedHero: boolean;
    slug?: string | null;
  },
): ExploreRecipeCard {
  const imageryStatus = resolveImageryGovernanceTier({
    status: input.status,
    imageApproved: input.imageApproved,
    hasApprovedHero: input.hasApprovedHero,
  });

  if (imageryStatus === "approved") {
    return { ...card, imageryStatus: "approved", heldImageryLabel: undefined };
  }

  if (imageryStatus === "hard_held") {
    return {
      ...card,
      image: "",
      publisherMedia: false,
      imageryStatus: "hard_held",
      heldImageryLabel: undefined,
    };
  }

  return {
    ...card,
    image: "",
    publisherMedia: false,
    imageryStatus: "soft_held",
    heldImageryLabel: resolveSoftHeldImageryLabel(
      input.slug ?? card._curatedSlug ?? card.id,
    ),
  };
}

/** @deprecated Use applyImageryGovernanceToCard */
export const applyHeldImageryToCard = applyImageryGovernanceToCard;

/** @deprecated Use resolveImageryGovernanceTier */
export function resolveExploreImageryStatus(input: {
  status?: CuratedRecipeStatus;
  imageApproved?: boolean;
  hasApprovedHero: boolean;
}): ExploreImageryStatus {
  return resolveImageryGovernanceTier(input);
}
