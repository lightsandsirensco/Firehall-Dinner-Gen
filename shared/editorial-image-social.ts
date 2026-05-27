/**
 * Future social content architecture — reels, stories, Pinterest (metadata only).
 */

import type { ImageStylePresetId } from "./image-style-presets.js";

export type SocialCropAspect = "9:16" | "4:5" | "1:1" | "2:3";

export interface SocialCropSlot {
  aspect: SocialCropAspect;
  /** Planned public path when generated */
  path: string;
  safeZone: "center" | "top" | "bottom";
  generated: boolean;
}

export interface SocialOverlaySlots {
  categoryBadge: boolean;
  cta: boolean;
  brandMark: boolean;
  hookLine: boolean;
}

export interface SocialAnimationHints {
  kenBurns?: "in" | "out" | "none";
  panDirection?: "left" | "right" | "up" | "down" | "none";
  durationSec?: number;
}

/** Metadata stub — video generation not implemented */
export interface EditorialSocialPack {
  version: "1.0";
  stylePreset: ImageStylePresetId;
  /** Hooks for future auto-caption */
  captionHooks: string[];
  /** Planned crop slots */
  crops: {
    instagramStory?: SocialCropSlot;
    tiktokReel?: SocialCropSlot;
    pinterestCard?: SocialCropSlot;
    exploreStory?: SocialCropSlot;
  };
  overlaySlots: SocialOverlaySlots;
  animationHints: SocialAnimationHints;
  /** Brand hashtag bundle for export */
  hashtags: string[];
}

export function buildSocialPackStub(input: {
  slug: string;
  title: string;
  stylePreset: ImageStylePresetId;
  hookLine?: string;
  categoryLabel?: string;
}): EditorialSocialPack {
  const base = `/images/social/${input.slug}`;
  return {
    version: "1.0",
    stylePreset: input.stylePreset,
    captionHooks: [
      input.hookLine?.trim() || `${input.title} — hall-tested tonight`,
      input.categoryLabel ? `${input.categoryLabel} at the firehall` : "Firehall Meals",
      "Crew-sized comfort. Real portions.",
    ].filter(Boolean),
    crops: {
      instagramStory: {
        aspect: "9:16",
        path: `${base}-story.jpg`,
        safeZone: "center",
        generated: false,
      },
      tiktokReel: {
        aspect: "9:16",
        path: `${base}-reel.jpg`,
        safeZone: "center",
        generated: false,
      },
      pinterestCard: {
        aspect: "2:3",
        path: `${base}-pinterest.jpg`,
        safeZone: "top",
        generated: false,
      },
      exploreStory: {
        aspect: "9:16",
        path: `${base}-explore-story.jpg`,
        safeZone: "center",
        generated: false,
      },
    },
    overlaySlots: {
      categoryBadge: true,
      cta: true,
      brandMark: true,
      hookLine: Boolean(input.hookLine?.trim()),
    },
    animationHints: {
      kenBurns: "in",
      panDirection: "none",
      durationSec: 4,
    },
    hashtags: ["#FirehallMeals", "#HallFood", "#CrewDinner"],
  };
}
