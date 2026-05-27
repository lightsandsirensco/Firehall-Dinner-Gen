/**
 * Mobile-first crop rules — portrait heroes, text-safe zones, feed cards.
 */

import type { ImageCropPreference, ImageStylePresetId } from "./image-style-presets.js";

export type EditorialVariantRole = "hero" | "mobile" | "thumb" | "rail";

export interface EditorialVariantSpec {
  role: EditorialVariantRole;
  width: number;
  height: number;
  aspectLabel: string;
  /** Sharp/smart crop position */
  cropPosition: "centre" | "top" | "bottom" | "attention";
  safeMarginPct: number;
  /** Zone reserved for gradient text overlays (from bottom) */
  textOverlayZonePct: number;
}

export interface MobileCropRule {
  presetId: ImageStylePresetId;
  focalPreference: ImageCropPreference;
  primaryAspect: "4:5";
  safeMarginPct: number;
  textOverlayZonePct: number;
  /** Keep hero food out of edge bleed on narrow screens */
  edgeCutoffAvoidance: string;
  immersiveFeedNotes: string;
  variants: Record<EditorialVariantRole, EditorialVariantSpec>;
}

const BASE_VARIANTS: Record<EditorialVariantRole, Omit<EditorialVariantSpec, "role">> = {
  hero: {
    width: 1536,
    height: 1536,
    aspectLabel: "1:1 master",
    cropPosition: "centre",
    safeMarginPct: 10,
    textOverlayZonePct: 28,
  },
  mobile: {
    width: 1080,
    height: 1350,
    aspectLabel: "4:5 portrait",
    cropPosition: "centre",
    safeMarginPct: 12,
    textOverlayZonePct: 32,
  },
  thumb: {
    width: 480,
    height: 480,
    aspectLabel: "1:1 thumb",
    cropPosition: "centre",
    safeMarginPct: 8,
    textOverlayZonePct: 0,
  },
  rail: {
    width: 768,
    height: 432,
    aspectLabel: "16:9 rail",
    cropPosition: "centre",
    safeMarginPct: 10,
    textOverlayZonePct: 35,
  },
};

function withRole(
  role: EditorialVariantRole,
  spec: Omit<EditorialVariantSpec, "role">,
): EditorialVariantSpec {
  return { role, ...spec };
}

const MOBILE_CROP_BY_PRESET: Record<ImageStylePresetId, Partial<Record<EditorialVariantRole, Partial<EditorialVariantSpec>>>> = {
  hall_bbq_dark: {
    mobile: { cropPosition: "centre", safeMarginPct: 14 },
    rail: { cropPosition: "centre" },
  },
  comfort_firehall: {
    mobile: { cropPosition: "centre", textOverlayZonePct: 34 },
  },
  healthy_performance: {
    mobile: { cropPosition: "top", safeMarginPct: 12 },
    hero: { cropPosition: "top" },
  },
  breakfast_shift: {
    mobile: { cropPosition: "top", safeMarginPct: 12 },
  },
  pizza_night: {
    mobile: { cropPosition: "centre", safeMarginPct: 12 },
    rail: { cropPosition: "centre" },
  },
  post_call_comfort: {
    mobile: { cropPosition: "centre", safeMarginPct: 14 },
  },
};

export function getMobileCropRule(presetId: ImageStylePresetId): MobileCropRule {
  const overrides = MOBILE_CROP_BY_PRESET[presetId] || {};
  const variants = (["hero", "mobile", "thumb", "rail"] as const).reduce(
    (acc, role) => {
      const base = BASE_VARIANTS[role];
      const o = overrides[role] || {};
      acc[role] = withRole(role, { ...base, ...o });
      return acc;
    },
    {} as Record<EditorialVariantRole, EditorialVariantSpec>,
  );

  const mobile = variants.mobile;
  const focalMap: Record<ImageCropPreference, EditorialVariantSpec["cropPosition"]> = {
    center: "centre",
    top: "top",
    left: "centre",
    right: "centre",
  };

  return {
    presetId,
    focalPreference: presetId === "healthy_performance" || presetId === "breakfast_shift" ? "top" : "center",
    primaryAspect: "4:5",
    safeMarginPct: mobile.safeMarginPct,
    textOverlayZonePct: mobile.textOverlayZonePct,
    edgeCutoffAvoidance:
      "Keep protein and hero garnish inside center 76% frame — no critical food at outer 12% edges",
    immersiveFeedNotes:
      "Optimize for vertical Explore rail cards — appetite peak in upper-center, readable behind bottom gradient",
    variants,
  };
}

export function getMobileCropPromptLines(presetId: ImageStylePresetId): string[] {
  const rule = getMobileCropRule(presetId);
  const m = rule.variants.mobile;
  return [
    `Mobile-first crop: ${m.aspectLabel} (${m.width}x${m.height}), ${rule.safeMarginPct}% safe margin`,
    rule.edgeCutoffAvoidance,
    `Text overlay safe zone: bottom ${rule.textOverlayZonePct}% may be covered by UI gradient — keep food above`,
    rule.immersiveFeedNotes,
    `Focal: ${rule.focalPreference}-weighted hero dish`,
  ];
}
