/** Resolved public origin for canonical URLs and schema (client). */

import { SEO_CANONICAL_ORIGIN } from "@shared/seo/constants";
import { normalizePublicSiteOrigin } from "@shared/seo/urls";

export function getSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined;
  if (fromEnv?.trim()) {
    const base = fromEnv.trim().replace(/\/+$/, "");
    const origin = /^https?:\/\//i.test(base) ? base : `https://${base}`;
    return normalizePublicSiteOrigin(origin);
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizePublicSiteOrigin(window.location.origin);
  }
  return SEO_CANONICAL_ORIGIN;
}
