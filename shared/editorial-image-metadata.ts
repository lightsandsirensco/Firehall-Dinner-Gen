/**

 * Editorial imagery metadata — heroes, variants, approval, delivery, quality, social.

 */



import type { ImageStylePresetId } from "./image-style-presets.js";

import {

  buildEditorialDelivery,

  buildEditorialDeliveryPaths,

  type EditorialImageDelivery,

} from "./editorial-image-delivery.js";

import type { EditorialImageQualityScore } from "./editorial-image-quality.js";

import { buildSocialPackStub, type EditorialSocialPack } from "./editorial-image-social.js";



export const EDITORIAL_IMAGE_SCHEMA_VERSION = 2 as const;



export interface EditorialImageMetadata {

  schemaVersion?: typeof EDITORIAL_IMAGE_SCHEMA_VERSION;

  /** Full hero — /images/golden-100/<slug>.jpg */

  heroImage: string;

  /** Card thumb — /images/thumbs/<slug>.jpg */

  thumbnailImage: string;

  /** 4:5 mobile Explore crop — /images/mobile/<slug>.jpg */

  mobileHeroImage: string;

  /** 16:9 horizontal rail — /images/rails/<slug>.jpg */

  railPreviewImage: string;

  stylePreset: ImageStylePresetId;

  imageVersion: number;

  imageApproved: boolean;

  /** Stable seed for prompt reproducibility / regeneration */

  imagePromptSeed: string;

  promptHash?: string;

  generatedAt?: string;

  model?: string;

  manualOverridePath?: string | null;

  regenerationCount?: number;

  /** Tiny blur preview — data:image/jpeg;base64,... */

  lqip?: string;

  /** CDN-ready paths, srcSet, cache version */

  delivery?: EditorialImageDelivery;

  /** Automated QA score */

  quality?: EditorialImageQualityScore;

  /** Future social exports (metadata only) */

  social?: EditorialSocialPack;

}



export function createEmptyEditorialImageMetadata(

  slug: string,

  preset: ImageStylePresetId,

  promptSeed: string,

  imageVersion = 0,

): EditorialImageMetadata {

  const paths = buildEditorialDeliveryPaths(slug);

  return {

    schemaVersion: EDITORIAL_IMAGE_SCHEMA_VERSION,

    heroImage: paths.hero,

    thumbnailImage: paths.thumb,

    mobileHeroImage: paths.mobile,

    railPreviewImage: paths.rail,

    stylePreset: preset,

    imageVersion,

    imageApproved: false,

    imagePromptSeed: promptSeed,

    regenerationCount: 0,

    delivery: buildEditorialDelivery(slug, imageVersion),

    social: buildSocialPackStub({ slug, title: slug, stylePreset: preset }),

  };

}



function parseQuality(raw: unknown): EditorialImageQualityScore | undefined {

  if (!raw || typeof raw !== "object") return undefined;

  const o = raw as Record<string, unknown>;

  if (typeof o.composite !== "number") return undefined;

  return {

    version: "1.0",

    realism: Number(o.realism) || 0,

    lightingQuality: Number(o.lightingQuality) || 0,

    foodClarity: Number(o.foodClarity) || 0,

    appetiteAppeal: Number(o.appetiteAppeal) || 0,

    framingConsistency: Number(o.framingConsistency) || 0,

    textureRealism: Number(o.textureRealism) || 0,

    visualCleanliness: Number(o.visualCleanliness) || 0,

    mobileReadability: Number(o.mobileReadability) || 0,

    composite: Number(o.composite) || 0,

    pass: Boolean(o.pass),

    needsRegeneration: Boolean(o.needsRegeneration),

    flags: Array.isArray(o.flags) ? o.flags.map(String) : [],

    scoredAt: String(o.scoredAt || ""),

    method: (o.method as EditorialImageQualityScore["method"]) || "heuristic",

  };

}



export function parseEditorialImageMetadata(raw: unknown): EditorialImageMetadata | null {

  if (!raw) return null;

  if (typeof raw === "string") {

    try {

      return parseEditorialImageMetadata(JSON.parse(raw));

    } catch {

      return null;

    }

  }

  if (typeof raw !== "object") return null;

  const o = raw as Record<string, unknown>;

  if (typeof o.heroImage !== "string" || typeof o.stylePreset !== "string") return null;



  const slugFromPath =

    o.heroImage.match(/\/([^/]+)\.(jpg|webp)$/i)?.[1]?.replace(/\.[^.]+$/, "") || "unknown";

  const version = Number(o.imageVersion) || 0;



  return {

    schemaVersion: (Number(o.schemaVersion) as typeof EDITORIAL_IMAGE_SCHEMA_VERSION) || 1,

    heroImage: o.heroImage,

    thumbnailImage: typeof o.thumbnailImage === "string" ? o.thumbnailImage : o.heroImage,

    mobileHeroImage: typeof o.mobileHeroImage === "string" ? o.mobileHeroImage : o.heroImage,

    railPreviewImage:

      typeof o.railPreviewImage === "string"

        ? o.railPreviewImage

        : `/images/rails/${slugFromPath}.jpg`,

    stylePreset: o.stylePreset as ImageStylePresetId,

    imageVersion: version,

    imageApproved: Boolean(o.imageApproved),

    imagePromptSeed: String(o.imagePromptSeed || ""),

    promptHash: o.promptHash != null ? String(o.promptHash) : undefined,

    generatedAt: o.generatedAt != null ? String(o.generatedAt) : undefined,

    model: o.model != null ? String(o.model) : undefined,

    manualOverridePath: o.manualOverridePath != null ? String(o.manualOverridePath) : null,

    regenerationCount: Number(o.regenerationCount) || 0,

    lqip: o.lqip != null ? String(o.lqip) : undefined,

    delivery:

      o.delivery && typeof o.delivery === "object"

        ? (o.delivery as EditorialImageDelivery)

        : buildEditorialDelivery(slugFromPath, version),

    quality: parseQuality(o.quality),

    social:

      o.social && typeof o.social === "object"

        ? (o.social as EditorialSocialPack)

        : undefined,

  };

}


