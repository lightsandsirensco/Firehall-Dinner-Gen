import { cn } from "@/lib/utils";

/** Shared layout frames — mobile-first, consistent across app */
export type HeroImageLayout =
  | "detail"
  | "cinematic"
  | "card-fill"
  | "banner-full"
  | "banner-compact"
  | "banner-utility";

export type HeroFocalPoint = "food" | "food-plate" | "banner" | "center";

export type HeroOverlayPreset =
  | "none"
  | "minimal"
  | "detail"
  | "cinematic"
  | "card"
  | "card-cinematic"
  | "banner-full"
  | "banner-compact"
  | "banner-utility";

/** Outer frame: aspect ratio + max height caps (prevents giant mobile blobs) */
export const HERO_LAYOUT_FRAME: Record<HeroImageLayout, string> = {
  detail:
    "w-full aspect-[5/4] max-h-[min(48vh,440px)] sm:aspect-[16/9] sm:max-h-[min(400px,52vh)]",
  cinematic:
    "w-full aspect-[5/4] max-h-[min(48vh,440px)] sm:aspect-[16/9] sm:max-h-[min(400px,52vh)]",
  "card-fill": "w-full h-full min-h-0",
  "banner-full": "w-full h-[min(32vh,200px)] sm:h-[280px] md:h-[340px]",
  "banner-compact": "w-full h-[100px] sm:h-[152px]",
  "banner-utility": "w-full h-[52px] sm:h-[60px]",
};

/** Intentional crop — food focal point, responsive mobile vs desktop */
export const HERO_FOCAL_CLASS: Record<HeroFocalPoint, string> = {
  food: "object-cover object-[center_50%] sm:object-[center_42%]",
  "food-plate":
    "object-cover object-[center_56%] sm:object-[center_40%] md:object-[center_38%]",
  banner: "object-cover object-[center_40%] sm:object-[center_34%]",
  center: "object-cover object-center",
};

export const HERO_IMAGE_BASE =
  "absolute inset-0 w-full h-full transition-opacity duration-500 ease-out";

export const HERO_CINEMATIC_GRADE =
  "saturate-[1.08] contrast-[1.03] brightness-[1.02]";

export const HERO_ROUNDED = {
  none: "",
  md: "rounded-xl sm:rounded-2xl",
  lg: "rounded-2xl sm:rounded-[1.35rem]",
} as const;

export function heroOverlayClasses(preset: HeroOverlayPreset): string {
  switch (preset) {
    case "none":
      return "";
    case "minimal":
      return "bg-gradient-to-t from-black/50 via-transparent to-transparent";
    case "detail":
      return cn(
        "bg-gradient-to-t from-black/75 via-black/20 to-transparent",
        "sm:from-black/70 sm:via-black/15",
      );
    case "cinematic":
      return cn(
        "bg-gradient-to-b from-amber-500/[0.06] via-transparent to-black/35 mix-blend-soft-light",
        "shadow-[inset_0_0_72px_rgba(0,0,0,0.4)]",
      );
    case "card":
      return "bg-gradient-to-t from-black/75 via-black/20 to-transparent";
    case "card-cinematic":
      return "bg-gradient-to-t from-black/80 via-black/25 to-transparent";
    case "banner-full":
      return "bg-gradient-to-b from-black/45 via-black/55 to-black/88";
    case "banner-compact":
      return "bg-gradient-to-b from-black/50 via-black/60 to-black/85";
    case "banner-utility":
      return "bg-gradient-to-b from-black/70 via-black/75 to-black/90";
    default:
      return "";
  }
}

/** Bottom fade into page background (detail / curated content panels) */
export const HERO_CONTENT_FADE =
  "bg-gradient-to-t from-background via-background/25 to-transparent";

/** Explore card outer aspect — use on parent wrappers */
export const EXPLORE_CARD_ASPECT = {
  rail: "aspect-[4/5] min-h-[240px] sm:min-h-[260px]",
  grid: "aspect-[3/4] sm:aspect-[4/5]",
} as const;

export const HERO_SIZES = {
  detail: "100vw",
  cinematic: "100vw",
  rail: "(max-width: 640px) 88vw, 320px",
  grid: "(max-width: 640px) 50vw, 280px",
  spotlight: "100vw",
} as const;
