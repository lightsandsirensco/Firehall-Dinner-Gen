/**
 * Resolve Pinterest / trend signals → publisher recipe pages via JSON-LD extraction.
 * True recipe source = external publisher URL (not Pinterest).
 */

import { log } from "../../logger.js";
import type { IngestRecipeDraft, TrendSignal } from "../../../shared/ingestion/recipe-ingest-schema.js";
import {
  isTrustedPublisherUrl,
  isBlockedRecipeUrl,
} from "../../../shared/ingestion/trusted-publishers.js";
import { normalizeExtractedToDraft } from "../../../shared/ingestion/normalize-extracted.js";
import { fetchRecipePageHtml } from "../extraction/fetch-recipe-page.js";
import { extractRecipeFromHtml } from "../extraction/json-ld-recipe.js";
import { pickBestHeroImage } from "../extraction/image-validator.js";
import type { RecipeResolutionSource } from "./types.js";

function resolvePublisherUrl(signal: TrendSignal): string | null {
  const candidates = [signal.destinationUrl, signal.pinUrl].filter(Boolean) as string[];
  for (const url of candidates) {
    if (isBlockedRecipeUrl(url)) continue;
    if (isTrustedPublisherUrl(url)) return url;
  }
  return null;
}

export class PublisherUrlResolveSource implements RecipeResolutionSource {
  readonly name = "publisher_jsonld";

  constructor(private delayMs = 800) {}

  async resolve(signals: TrendSignal[]): Promise<IngestRecipeDraft[]> {
    const drafts: IngestRecipeDraft[] = [];

    for (const signal of signals) {
      const publisherUrl = resolvePublisherUrl(signal);
      if (!publisherUrl) continue;

      try {
        const html = await fetchRecipePageHtml(publisherUrl);
        if (!html) continue;

        const extracted = extractRecipeFromHtml(html, publisherUrl);
        if (!extracted || extracted.ingredients.length < 3) {
          log(`[ingestion] JSON-LD miss ${publisherUrl.slice(0, 70)}`, "ingestion");
          continue;
        }

        const heroPick = await pickBestHeroImage(extracted.heroImage, signal.imageUrl);
        extracted.heroImage = heroPick.url;

        const draft = normalizeExtractedToDraft(extracted, {
          trendScore: signal.trendScore,
          pinImageUrl: signal.imageUrl,
        });

        if (!heroPick.valid && !signal.imageUrl) {
          log(`[ingestion] weak image "${draft.title.slice(0, 40)}"`, "ingestion");
          draft.qualityScore = Math.max(0, draft.qualityScore - 15);
        }

        drafts.push(draft);
        await new Promise((r) => setTimeout(r, this.delayMs));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`[ingestion] publisher resolve failed: ${msg}`, "ingestion");
      }
    }

    return drafts;
  }
}
