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
import { assertJpegBuffer, encodeJpeg, JPEG_OUTPUT, requireSharp } from "./sharp-utils.js";

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
): Promise<Buffer> {
  const sharp = await requireSharp();
  const pipeline = sharp(buffer).resize(width, height, { fit: "cover", position });
  if (format === "webp") {
    return pipeline.webp({ quality: 82 }).toBuffer();
  }
  return pipeline.jpeg(JPEG_OUTPUT).toBuffer();
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

  const heroWrite = mirrorEditorialImageFile(heroSubdir, slug, await encodeJpeg(heroBuffer), "jpg");

  const mobileBuf = await resizeVariant(
    heroBuffer,
    specs.mobile.width,
    specs.mobile.height,
    specs.mobile.cropPosition,
    "jpeg",
  );

  const thumbBuf = await resizeVariant(
    heroBuffer,
    specs.thumb.width,
    specs.thumb.height,
    specs.thumb.cropPosition,
    "jpeg",
  );

  const railBuf = await resizeVariant(
    heroBuffer,
    specs.rail.width,
    specs.rail.height,
    specs.rail.cropPosition,
    "jpeg",
  );

  mirrorEditorialImageFile("mobile", slug, mobileBuf, "jpg");
  mirrorEditorialImageFile("thumbs", slug, thumbBuf, "jpg");
  mirrorEditorialImageFile("rails", slug, railBuf, "jpg");

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

function writeCatalogImageFile(subdir: string, slug: string, buffer: Buffer, format: "jpeg" | "webp"): string {
  const ext = format === "webp" ? "webp" : "jpg";
  const filename = `${slug}.${ext}`;
  if (ext === "jpg") assertJpegBuffer(buffer, `${subdir}/${filename}`);
  const dir = path.join(process.cwd(), "client", "public", "images", subdir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/images/${subdir}/${filename}`;
}

function mirrorBreakfastImageFile(
  subdir: "breakfast" | "thumbs/breakfast" | "mobile/breakfast" | "rails/breakfast",
  slug: string,
  buffer: Buffer,
  format: "jpeg" | "webp" = "jpeg",
): string {
  return writeCatalogImageFile(subdir, slug, buffer, format);
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

  const hero = mirrorBreakfastImageFile("breakfast", slug, await encodeJpeg(heroBuffer));

  const mobileBuf = await resizeVariant(
    heroBuffer,
    specs.mobile.width,
    specs.mobile.height,
    specs.mobile.cropPosition,
    "jpeg",
  );
  const thumbBuf = await resizeVariant(
    heroBuffer,
    specs.thumb.width,
    specs.thumb.height,
    specs.thumb.cropPosition,
    "jpeg",
  );
  const railBuf = await resizeVariant(
    heroBuffer,
    specs.rail.width,
    specs.rail.height,
    specs.rail.cropPosition,
    "jpeg",
  );

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

function mirrorBbqImageFile(
  subdir: "smoker-catalog" | "thumbs/smoker-catalog" | "mobile/smoker-catalog" | "rails/smoker-catalog",
  slug: string,
  buffer: Buffer,
  format: "jpeg" | "webp" = "jpeg",
): string {
  return writeCatalogImageFile(subdir, slug, buffer, format);
}

export interface BbqCatalogImageVariantResult {
  hero: string;
  thumb: string;
  mobile: string;
  rail: string;
}

/** BBQ catalog — hero/thumb/mobile/rail under bbq subfolders. */
export async function writeBbqCatalogImageVariants(
  slug: string,
  heroBuffer: Buffer,
  imageVersion: number,
): Promise<BbqCatalogImageVariantResult> {
  const stylePreset: ImageStylePresetId = "hall_bbq_dark";
  const cropRule = getMobileCropRule(stylePreset);
  const specs = cropRule.variants;

  const hero = mirrorBbqImageFile("smoker-catalog", slug, await encodeJpeg(heroBuffer));

  const mobileBuf = await resizeVariant(
    heroBuffer,
    specs.mobile.width,
    specs.mobile.height,
    specs.mobile.cropPosition,
    "jpeg",
  );
  const thumbBuf = await resizeVariant(
    heroBuffer,
    specs.thumb.width,
    specs.thumb.height,
    specs.thumb.cropPosition,
    "jpeg",
  );
  const railBuf = await resizeVariant(
    heroBuffer,
    specs.rail.width,
    specs.rail.height,
    specs.rail.cropPosition,
    "jpeg",
  );

  const mobile = mirrorBbqImageFile("mobile/smoker-catalog", slug, mobileBuf);
  const thumb = mirrorBbqImageFile("thumbs/smoker-catalog", slug, thumbBuf);
  const rail = mirrorBbqImageFile("rails/smoker-catalog", slug, railBuf);

  void imageVersion;
  return { hero, thumb, mobile, rail };
}

function mirrorHallExpansionImageFile(
  subdir:
    | "hall-expansion"
    | "thumbs/hall-expansion"
    | "mobile/hall-expansion"
    | "rails/hall-expansion",
  slug: string,
  buffer: Buffer,
  format: "jpeg" | "webp" = "jpeg",
): string {
  return writeCatalogImageFile(subdir, slug, buffer, format);
}

export interface HallExpansionCatalogImageVariantResult {
  hero: string;
  thumb: string;
  mobile: string;
  rail: string;
}

/** Hall expansion catalog — hero/thumb/mobile/rail under hall-expansion subfolders. */
export async function writeHallExpansionCatalogImageVariants(
  slug: string,
  heroBuffer: Buffer,
  imageVersion: number,
): Promise<HallExpansionCatalogImageVariantResult> {
  const stylePreset: ImageStylePresetId = "comfort_firehall";
  const cropRule = getMobileCropRule(stylePreset);
  const specs = cropRule.variants;

  const hero = mirrorHallExpansionImageFile("hall-expansion", slug, await encodeJpeg(heroBuffer));

  const mobileBuf = await resizeVariant(
    heroBuffer,
    specs.mobile.width,
    specs.mobile.height,
    specs.mobile.cropPosition,
    "jpeg",
  );
  const thumbBuf = await resizeVariant(
    heroBuffer,
    specs.thumb.width,
    specs.thumb.height,
    specs.thumb.cropPosition,
    "jpeg",
  );
  const railBuf = await resizeVariant(
    heroBuffer,
    specs.rail.width,
    specs.rail.height,
    specs.rail.cropPosition,
    "jpeg",
  );

  const mobile = mirrorHallExpansionImageFile("mobile/hall-expansion", slug, mobileBuf);
  const thumb = mirrorHallExpansionImageFile("thumbs/hall-expansion", slug, thumbBuf);
  const rail = mirrorHallExpansionImageFile("rails/hall-expansion", slug, railBuf);

  void imageVersion;
  return { hero, thumb, mobile, rail };
}
