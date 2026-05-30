/**
 * Hero → mobile, thumb, rail + WebP + LQIP variants.
 */

import fs from "node:fs";
import path from "node:path";
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
  heroSubdir: "golden100" | "smoothies" = "golden100",
): Promise<EditorialImageVariantResult> {
  const cropRule = getMobileCropRule(stylePreset);
  const specs = cropRule.variants;

  const heroWrite = mirrorEditorialImageFile(heroSubdir, slug, heroBuffer);

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
    heroWebp = mirrorEditorialImageFile(heroSubdir, slug, heroWebpBuf, "webp").publicPath;
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
    hero: heroWrite.publicPath || (heroSubdir === "smoothies" ? `/images/smoothies/${slug}.jpg` : golden100HeroPath(slug)),
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

/** Smoothie catalog — hero in /images/smoothies/, shared mobile/thumb/rail by slug. */
export async function writeSmoothieCatalogImageVariants(
  slug: string,
  heroBuffer: Buffer,
  imageVersion: number,
): Promise<EditorialImageVariantResult> {
  return writeEditorialImageVariants(slug, heroBuffer, "healthy_performance", imageVersion, "smoothies");
}

export interface BreakfastCatalogImageVariantResult {
  hero: string;
  thumb: string;
  mobile: string;
  rail: string;
}

function mirrorBreakfastImageFile(
  subdir: "breakfast" | "thumbs/breakfast" | "mobile/breakfast" | "rails/breakfast",
  slug: string,
  buffer: Buffer,
  format: "jpeg" | "webp" = "jpeg",
): string {
  const ext = format === "webp" ? "webp" : "jpg";
  const filename = `${slug}.${ext}`;
  const dir = path.join(process.cwd(), "client", "public", "images", subdir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/images/${subdir}/${filename}`;
}

/** Breakfast catalog — hero/thumb/mobile/rail under breakfast subfolders. */
export async function writeBreakfastCatalogImageVariants(
  slug: string,
  heroBuffer: Buffer,
  imageVersion: number,
): Promise<BreakfastCatalogImageVariantResult> {
  const stylePreset: ImageStylePresetId = "breakfast_shift";
  const cropRule = getMobileCropRule(stylePreset);
  const specs = cropRule.variants;

  const hero = mirrorBreakfastImageFile("breakfast", slug, heroBuffer);

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

  const mobile = mirrorBreakfastImageFile("mobile/breakfast", slug, mobileBuf);
  const thumb = mirrorBreakfastImageFile("thumbs/breakfast", slug, thumbBuf);
  const rail = mirrorBreakfastImageFile("rails/breakfast", slug, railBuf);

  const heroWebpBuf = await resizeVariant(
    heroBuffer,
    specs.hero.width,
    specs.hero.height,
    specs.hero.cropPosition,
    "webp",
  );
  if (heroWebpBuf) mirrorBreakfastImageFile("breakfast", slug, heroWebpBuf, "webp");

  const mobileWebpBuf = await resizeVariant(
    heroBuffer,
    specs.mobile.width,
    specs.mobile.height,
    specs.mobile.cropPosition,
    "webp",
  );
  if (mobileWebpBuf) mirrorBreakfastImageFile("mobile/breakfast", slug, mobileWebpBuf, "webp");

  const thumbWebpBuf = await resizeVariant(
    heroBuffer,
    specs.thumb.width,
    specs.thumb.height,
    specs.thumb.cropPosition,
    "webp",
  );
  if (thumbWebpBuf) mirrorBreakfastImageFile("thumbs/breakfast", slug, thumbWebpBuf, "webp");

  const railWebpBuf = await resizeVariant(
    heroBuffer,
    specs.rail.width,
    specs.rail.height,
    specs.rail.cropPosition,
    "webp",
  );
  if (railWebpBuf) mirrorBreakfastImageFile("rails/breakfast", slug, railWebpBuf, "webp");

  void imageVersion;
  return { hero, thumb, mobile, rail };
}
