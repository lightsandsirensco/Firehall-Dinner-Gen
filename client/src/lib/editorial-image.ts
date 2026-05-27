/**
 * Client editorial image delivery — WebP preference, srcSet, LQIP, lazy-friendly URLs.
 */

import type { EditorialImageMetadata } from "@shared/editorial-image-metadata";
import { cacheSafeImageUrl } from "@shared/editorial-image-delivery";
import type { EditorialVariantRole } from "@shared/mobile-crop-rules";
import { normalizeMediaUrl } from "@/lib/media-url";

export type EditorialImageUse = "hero" | "mobile" | "thumb" | "rail" | "explore-rail" | "explore-grid";

const USE_TO_ROLE: Record<EditorialImageUse, EditorialVariantRole> = {
  hero: "hero",
  mobile: "mobile",
  thumb: "thumb",
  rail: "rail",
  "explore-rail": "mobile",
  "explore-grid": "mobile",
};

export interface ResolvedEditorialImage {
  src: string;
  srcSet?: string;
  sizes?: string;
  blurDataUrl?: string;
  webpSrc?: string;
}

function pathForRole(meta: EditorialImageMetadata, role: EditorialVariantRole): string {
  switch (role) {
    case "hero":
      return meta.heroImage;
    case "mobile":
      return meta.mobileHeroImage;
    case "thumb":
      return meta.thumbnailImage;
    case "rail":
      return meta.railPreviewImage || meta.mobileHeroImage;
    default:
      return meta.heroImage;
  }
}

function webpForRole(meta: EditorialImageMetadata, role: EditorialVariantRole): string | undefined {
  const d = meta.delivery?.paths;
  if (!d) return undefined;
  switch (role) {
    case "hero":
      return d.heroWebp;
    case "mobile":
      return d.mobileWebp;
    case "thumb":
      return d.thumbWebp;
    case "rail":
      return d.railWebp;
    default:
      return undefined;
  }
}

export function resolveEditorialImage(
  meta: EditorialImageMetadata | null | undefined,
  use: EditorialImageUse = "mobile",
): ResolvedEditorialImage | null {
  if (!meta?.heroImage) return null;

  const role = USE_TO_ROLE[use];
  const version = meta.imageVersion || 0;
  const cdn =
    meta.delivery?.cdnBaseUrl ??
    (import.meta.env.VITE_EDITORIAL_CDN_BASE_URL as string | undefined) ??
    null;
  const primary = pathForRole(meta, role);
  const webp = webpForRole(meta, role);

  const src = normalizeMediaUrl(
    cacheSafeImageUrl(primary, version, cdn),
  );

  const srcSet =
    use === "explore-rail" || use === "mobile"
      ? meta.delivery?.mobileSrcSet
      : use === "hero"
        ? meta.delivery?.heroSrcSet
        : undefined;

  const sizes =
    use === "explore-rail" || use === "mobile"
      ? meta.delivery?.mobileSizes
      : use === "hero"
        ? meta.delivery?.heroSizes
        : undefined;

  return {
    src: webp ? normalizeMediaUrl(cacheSafeImageUrl(webp, version, cdn)) : src,
    srcSet: srcSet
      ? srcSet
          .split(",")
          .map((part) => {
            const [url, descriptor] = part.trim().split(/\s+/);
            return `${normalizeMediaUrl(url)} ${descriptor || ""}`.trim();
          })
          .join(", ")
      : undefined,
    sizes,
    blurDataUrl: meta.lqip,
    webpSrc: webp ? normalizeMediaUrl(cacheSafeImageUrl(webp, version, cdn)) : undefined,
  };
}

/** Prefer editorial mobile hero when metadata present on explore cards */
export function resolveExploreCardImage(
  image: string,
  editorial?: EditorialImageMetadata | null,
  layout: "rail" | "grid" = "rail",
): ResolvedEditorialImage {
  const editorialResolved = resolveEditorialImage(
    editorial,
    layout === "rail" ? "explore-rail" : "explore-grid",
  );
  if (editorialResolved) return editorialResolved;
  return { src: normalizeMediaUrl(image) };
}
