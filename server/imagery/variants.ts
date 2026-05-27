/**
 * Hero → mobile, thumb, rail + WebP + LQIP variants.
 */

import { buildEditorialDelivery, resolveCdnBaseUrl } from "../../shared/editorial-image-delivery.js";
import { getMobileCropRule } from "../../shared/mobile-crop-rules.js";
import type { ImageStylePresetId } from "../../shared/image-style-presets.js";
import { generateLqipDataUrl } from "./lqip.js";
import {
  mirrorEditorialImageFile,
  golden100HeroPath,
  mobileHeroPath,
  thumbImagePath,
  railPreviewPath,
} from "./paths.js";
import { loadSharp } from "./sharp-utils.js";

export interface EditorialImageVariantResult {
  hero: string;
  mobile: string;
  thumb: string;
  rail: string;
  heroWebp?: string;
  mobileWebp?: string;
  thumbWebp?: string;
  railWebp?: string;
  lqip: string | null;
  delivery: ReturnType<typeof buildEditorialDelivery>;
}

async function resizeVariant(
  buffer: Buffer,
  width: number,
  height: number,
  position: string,
  format: "jpeg" | "webp",
): Promise<Buffer | null> {
  const sharp = await loadSharp();
  if (!sharp) return null;

  try {
    const pipeline = sharp(buffer).resize(width, height, { fit: "cover", position });
    if (format === "webp") {
      return await pipeline.webp({ quality: 82 }).toBuffer();
    }
    return await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  } catch {
    return null;
  }
}

/**
 * Write all editorial variants + optional WebP + LQIP.
 */
export async function writeEditorialImageVariants(
  slug: string,
  heroBuffer: Buffer,
  stylePreset: ImageStylePresetId,
  imageVersion: number,
): Promise<EditorialImageVariantResult> {
  const cropRule = getMobileCropRule(stylePreset);
  const specs = cropRule.variants;

  const heroWrite = mirrorEditorialImageFile("golden100", slug, heroBuffer);

  const mobileBuf =
    (await resizeVariant(
      heroBuffer,
      specs.mobile.width,
      specs.mobile.height,
      specs.mobile.cropPosition,
      "jpeg",
    )) ?? heroBuffer;

  const thumbBuf =
    (await resizeVariant(
      heroBuffer,
      specs.thumb.width,
      specs.thumb.height,
      specs.thumb.cropPosition,
      "jpeg",
    )) ?? heroBuffer;

  const railBuf =
    (await resizeVariant(
      heroBuffer,
      specs.rail.width,
      specs.rail.height,
      specs.rail.cropPosition,
      "jpeg",
    )) ?? heroBuffer;

  mirrorEditorialImageFile("mobile", slug, mobileBuf);
  mirrorEditorialImageFile("thumbs", slug, thumbBuf);
  mirrorEditorialImageFile("rails", slug, railBuf);

  let heroWebp: string | undefined;
  let mobileWebp: string | undefined;
  let thumbWebp: string | undefined;
  let railWebp: string | undefined;

  const heroWebpBuf = await resizeVariant(
    heroBuffer,
    specs.hero.width,
    specs.hero.height,
    specs.hero.cropPosition,
    "webp",
  );
  if (heroWebpBuf) {
    heroWebp = mirrorEditorialImageFile("golden100", slug, heroWebpBuf, "webp").publicPath;
  }

  const mobileWebpBuf = await resizeVariant(
    heroBuffer,
    specs.mobile.width,
    specs.mobile.height,
    specs.mobile.cropPosition,
    "webp",
  );
  if (mobileWebpBuf) {
    mobileWebp = mirrorEditorialImageFile("mobile", slug, mobileWebpBuf, "webp").publicPath;
  }

  const thumbWebpBuf = await resizeVariant(
    heroBuffer,
    specs.thumb.width,
    specs.thumb.height,
    specs.thumb.cropPosition,
    "webp",
  );
  if (thumbWebpBuf) {
    thumbWebp = mirrorEditorialImageFile("thumbs", slug, thumbWebpBuf, "webp").publicPath;
  }

  const railWebpBuf = await resizeVariant(
    heroBuffer,
    specs.rail.width,
    specs.rail.height,
    specs.rail.cropPosition,
    "webp",
  );
  if (railWebpBuf) {
    railWebp = mirrorEditorialImageFile("rails", slug, railWebpBuf, "webp").publicPath;
  }

  const lqip = await generateLqipDataUrl(heroBuffer);
  const delivery = buildEditorialDelivery(slug, imageVersion, resolveCdnBaseUrl());
  if (heroWebp) delivery.paths.heroWebp = heroWebp;
  if (mobileWebp) delivery.paths.mobileWebp = mobileWebp;
  if (thumbWebp) delivery.paths.thumbWebp = thumbWebp;
  if (railWebp) delivery.paths.railWebp = railWebp;

  return {
    hero: heroWrite.publicPath || golden100HeroPath(slug),
    mobile: mobileHeroPath(slug),
    thumb: thumbImagePath(slug),
    rail: railPreviewPath(slug),
    heroWebp,
    mobileWebp,
    thumbWebp,
    railWebp,
    lqip,
    delivery,
  };
}
