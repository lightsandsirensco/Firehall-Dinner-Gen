import { cn } from "@/lib/utils";
import { HeroImage, type HeroImageProps } from "@/components/hero-image";
import { FoodImageSkeleton } from "@/components/mobile/loading-skeletons";

export type FoodImageProps = HeroImageProps & {
  /** Edge-to-edge on small screens (recipe hero) */
  bleed?: boolean;
  rounded?: "none" | "md" | "lg";
};

/**
 * Mobile-first food imagery — consistent aspect, skeleton, fade-in, fallbacks.
 */
export function FoodImage({
  bleed = false,
  rounded = "lg",
  className,
  fallback,
  cinematicGrade = true,
  layout = "cinematic",
  blurDataUrl,
  ...heroProps
}: FoodImageProps) {
  const roundedClass =
    rounded === "none"
      ? "rounded-none"
      : rounded === "md"
        ? "rounded-xl sm:rounded-2xl"
        : "rounded-2xl sm:rounded-[1.35rem]";

  return (
    <HeroImage
      {...heroProps}
      blurDataUrl={blurDataUrl}
      layout={layout}
      cinematicGrade={cinematicGrade}
      className={cn(
        "food-image-frame",
        roundedClass,
        bleed && "-mx-page w-[calc(100%+2rem)] max-w-none sm:mx-0 sm:w-full",
        className,
      )}
      imgClassName={cn("food-image-img", heroProps.imgClassName)}
      fallback={fallback ?? <FoodImageSkeleton layout={layout} />}
    />
  );
}
