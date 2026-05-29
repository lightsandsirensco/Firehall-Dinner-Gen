import { cn } from "@/lib/utils";
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
}: MealHeroImageProps) {
  const frameClass =
    variant === "cinematic"
      ? "w-full aspect-[5/4] max-h-[min(48vh,440px)] sm:aspect-[16/9] sm:max-h-[min(400px,52vh)]"
      : "w-full aspect-[16/10]";

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
      bleed={variant === "cinematic"}
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
