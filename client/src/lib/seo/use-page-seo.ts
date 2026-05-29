import { useEffect } from "react";
import type { PageSeoConfig } from "@shared/seo/metadata";
import { applyPageSeoWithSchema } from "./apply-page-seo";

/**
 * Applies document head metadata, canonical, Open Graph, Twitter cards, and JSON-LD.
 * Cleans up managed tags on unmount or when config changes.
 */
export function usePageSeo(
  config: PageSeoConfig | null | undefined,
  jsonLd?: unknown | unknown[],
): void {
  useEffect(() => {
    if (!config) return;
    return applyPageSeoWithSchema(config, jsonLd);
  }, [config, jsonLd]);
}
