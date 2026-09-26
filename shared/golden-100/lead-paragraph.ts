import type { GoldenRecipePage } from "./recipe-page-schema.js";

/**
 * The lead paragraph shown just under a golden-shaped recipe's subtitle
 * (Golden 100, Hall Expansion, Performance, BBQ, Pizza Night all share this
 * `GoldenRecipePage` shape). `shortDescription` is optional editorial copy
 * that, on some recipes, is an exact (case-insensitive) restatement of
 * `subtitle` — which is already shown immediately above in the hero. Rather
 * than repeat that sentence twice on the page, fall back to the longer,
 * always-distinct `description` field whenever `shortDescription` doesn't
 * add anything new.
 *
 * This is the single source of truth for that choice: both
 * `client/src/pages/golden-recipe-page.tsx` (post-hydration render) and
 * `server/seo/content-snapshot.ts` (pre-hydration crawler snapshot) call
 * this exact function, so the lead copy a user sees and the lead copy a
 * crawler sees can never drift apart.
 */
export function goldenRecipeLeadParagraph(
  page: Pick<GoldenRecipePage, "shortDescription" | "subtitle" | "description">,
): string {
  const shortDescription = page.shortDescription?.trim();
  const subtitleNormalized = page.subtitle?.trim().toLowerCase();
  if (shortDescription && shortDescription.toLowerCase() !== subtitleNormalized) {
    return shortDescription;
  }
  return page.description;
}
