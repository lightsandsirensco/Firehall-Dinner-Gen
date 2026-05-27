/**
 * Feed-level rotation memory — global de-dupe across rails.
 */

import { dedupeExploreCards } from "../../../shared/explore-editorial.js";
import type { ExploreRecipeCard } from "../../../shared/explore-recipe.js";

export class FeedRotationMemory {
  readonly seenIds = new Set<number>();
  readonly seenTitleKeys = new Set<string>();
  readonly feedProteins = new Set<string>();
  readonly feedImageHosts = new Set<string>();

  constructor(seenRecipeIds: number[] = []) {
    for (const id of seenRecipeIds) {
      if (id > 0) this.seenIds.add(id);
    }
  }

  imageHostKey(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      return "";
    }
  }

  recordCards(cards: ExploreRecipeCard[]): void {
    for (const card of cards) {
      const pk = (card.primaryProtein || card.title).toLowerCase().slice(0, 20);
      this.feedProteins.add(pk);
      const host = this.imageHostKey(card.image);
      if (host) this.feedImageHosts.add(host);
    }
  }

  dedupe(cards: ExploreRecipeCard[]): ExploreRecipeCard[] {
    return dedupeExploreCards(cards, this.seenIds, this.seenTitleKeys);
  }
}
