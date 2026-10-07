import { cn } from "@/lib/utils";
import { HERO_LAYOUT_FRAME } from "@/lib/hero-image";
import { FoodImage } from "@/components/mobile/food-image";
import { ExploreHeldImageryPlaceholder } from "@/components/explore-held-imagery-placeholder";

interface MealHeroImageProps {
  src: string;
  alt: string;
  title?: string;
  /** Branded held label when hero is missing or fails to load */
  heldLabel?: string;
  className?: string;
  imgClassName?: string;
  /** Cinematic full-bleed vs contained card header */
  variant?: "cinematic" | "card";
  priority?: boolean;
  /** Edge-to-edge on mobile (cinematic default). Turn off when the hero sits inside a bordered card. */
  bleed?: boolean;
}

/**
 * Meal / wheel reveal hero — owned imagery or branded Firehall placeholder (no emoji).
 */
export function MealHeroImage({
  src,
  alt,
  title,
  heldLabel = "Hall Classic",
  className,
  imgClassName,
  variant = "cinematic",
  priority = true,
  bleed = variant === "cinematic",
}: MealHeroImageProps) {
  const frameClass = variant === "cinematic" ? HERO_LAYOUT_FRAME.cinematic : "w-full aspect-[16/10]";

  const brandedFallback = (
    <ExploreHeldImageryPlaceholder
      label={heldLabel}
      title={title || alt}
      variant={variant === "cinematic" ? "detail" : "card"}
      className={cn(frameClass, className)}
    />
  );

  if (!src?.trim()) {
    return brandedFallback;
  }

  return (
    <FoodImage
      src={src}
      alt={alt}
      layout={variant === "cinematic" ? "cinematic" : "card-fill"}
      focal="food-plate"
      overlay={variant === "cinematic" ? "minimal" : "minimal"}
      priority={priority}
      bleed={bleed}
      rounded={variant === "cinematic" ? "none" : "lg"}
      className={cn(
        variant === "cinematic" && "sm:rounded-2xl sm:ring-1 sm:ring-border/40 sm:shadow-xl sm:shadow-black/25",
        className,
      )}
      imgClassName={imgClassName}
      fallback={brandedFallback}
    />
  );
}
