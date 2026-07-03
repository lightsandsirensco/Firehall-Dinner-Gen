import { FoodImage, type FoodImageProps } from "@/components/mobile/food-image";
import { MissingRecipeImagePlaceholder } from "@/components/missing-recipe-image-placeholder";
import { RECIPE_PAGE_HERO_FRAME } from "@/lib/hero-image";
import { cn } from "@/lib/utils";

interface RecipePageHeroImageProps {
  src: string;
  alt: string;
  title?: string;
  className?: string;
  bleed?: boolean;
  priority?: boolean;
  debugId?: FoodImageProps["debugId"];
}

/**
 * Catalog recipe hero — food-first crop, title lives below the image (not on it).
 */
export function RecipePageHeroImage({
  src,
  alt,
  title,
  className,
  bleed = false,
  priority = true,
  debugId,
}: RecipePageHeroImageProps) {
  if (!src?.trim()) {
    return (
      <MissingRecipeImagePlaceholder
        title={title || alt}
        variant="detail"
        className={cn(RECIPE_PAGE_HERO_FRAME, className)}
      />
    );
  }

  return (
    <FoodImage
      src={src}
      alt={alt}
      layout="card-fill"
      fit="cover"
      focal="food"
      overlay="minimal"
      priority={priority}
      cinematicGrade
      rounded="none"
      bleed={bleed}
      className={cn(RECIPE_PAGE_HERO_FRAME, className)}
      debugId={debugId}
    />
  );
}
