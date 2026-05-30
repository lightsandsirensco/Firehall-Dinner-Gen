/**
 * Classics Wheel reveal imagery guard — real heroes only, never emoji substitutes.
 */

import type { ClassicWheelImagery } from "./classic-wheel-imagery.js";
import { isOwnedCatalogHeroPath, isSpoonacularOrExternalHeroUrl } from "./classic-wheel-imagery.js";

export interface WheelClassicImageInput {
  slug: string;
  title: string;
  heroImage: string;
  imageApproved: boolean;
  imageryStatus: ClassicWheelImagery["imageryStatus"];
}

export interface WheelClassicImageValidation {
  ok: boolean;
  reason?: string;
}

export function validateWheelClassicImage(
  classic: WheelClassicImageInput,
): WheelClassicImageValidation {
  const hero = (classic.heroImage || "").trim();
  if (!hero) {
    return { ok: false, reason: "missing_hero_image" };
  }
  if (isSpoonacularOrExternalHeroUrl(hero)) {
    return { ok: false, reason: "forbidden_external_hero" };
  }
  if (!isOwnedCatalogHeroPath(hero)) {
    return { ok: false, reason: "hero_not_owned_path" };
  }
  if (!classic.imageApproved || classic.imageryStatus !== "approved") {
    return { ok: false, reason: "imagery_not_approved" };
  }
  return { ok: true };
}

/** Dev/runtime guard — logs failures; never substitutes emoji. */
export function assertWheelClassicImage(
  classic: WheelClassicImageInput,
  context: string,
): WheelClassicImageValidation {
  const result = validateWheelClassicImage(classic);
  if (!result.ok && typeof console !== "undefined") {
    console.error(
      `[classics-wheel] image validation failed (${context}): slug=${classic.slug} reason=${result.reason}`,
    );
  }
  return result;
}

/** Decorative emojis for the spinning wheel animation only — not recipe imagery. */
export const CLASSICS_WHEEL_SPIN_EMOJIS = [
  "🍝",
  "🍔",
  "🌮",
  "🍗",
  "🥩",
  "🍕",
  "🥞",
  "🥪",
  "🌶️",
  "🔥",
] as const;
