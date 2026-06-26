/**
 * Server-only cross-collection hero MD5 index for Explore eligibility.
 * Keeps node:fs trust-audit loaders out of the client bundle.
 */

import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";
import { loadTrustAuditTargets } from "../shared/curated-image-governance/trust-audit-targets.js";
import {
  buildExploreImageMappingContext,
  type ExploreImageMappingContext,
} from "../shared/explore-image-mapping.js";
import { normalizeCatalogSlug } from "../shared/hall-catalog/gate.js";

export function buildCrossCatalogHeroAuditContext(
  entries: ApprovedCatalogEntry[],
  publicRoot?: string,
): {
  context: ExploreImageMappingContext;
  peerLookup: Map<string, Pick<ApprovedCatalogEntry, "title" | "mealFormat">>;
} {
  const globalTargets = loadTrustAuditTargets();
  const indexBySlug = new Map<string, { slug: string; heroImage: string }>();
  for (const target of globalTargets) {
    indexBySlug.set(normalizeCatalogSlug(target.slug), {
      slug: target.slug,
      heroImage: target.heroImage,
    });
  }
  for (const entry of entries) {
    indexBySlug.set(normalizeCatalogSlug(entry.slug), {
      slug: entry.slug,
      heroImage: entry.heroImage,
    });
  }

  const peerLookup = new Map<string, Pick<ApprovedCatalogEntry, "title" | "mealFormat">>();
  for (const target of globalTargets) {
    peerLookup.set(normalizeCatalogSlug(target.slug), {
      title: target.title,
      mealFormat: target.mealFormat,
    });
  }
  for (const entry of entries) {
    peerLookup.set(normalizeCatalogSlug(entry.slug), {
      title: entry.title,
      mealFormat: entry.mealFormat,
    });
  }

  return {
    context: buildExploreImageMappingContext([...indexBySlug.values()], publicRoot),
    peerLookup,
  };
}
