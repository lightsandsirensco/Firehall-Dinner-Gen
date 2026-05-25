import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroImage } from "@/components/hero-image";
import { HERO_SIZES } from "@/lib/hero-image";
import {
  exploreImageSrcSet,
  spoonacularImageUrl,
  extractRecipeIdFromSpoonacularImage,
} from "@/lib/explore-recipe";
import type { ExploreRecipeCard } from "@/lib/explore-recipe";
import { normalizeMediaUrl } from "@/lib/media-url";

interface ExploreRecipeImageProps {
  recipe: Pick<ExploreRecipeCard, "id" | "title" | "image" | "imageAlt">;
  className?: string;
  imgClassName?: string;
  variant?: "card" | "detail";
  cinematic?: boolean;
  sizesHint?: "rail" | "grid" | "spotlight";
  priority?: boolean;
}

export function ExploreRecipeImage({
  recipe,
  className,
  imgClassName,
  variant = "card",
  cinematic = false,
  sizesHint = "grid",
  priority = false,
}: ExploreRecipeImageProps) {
  const [src, setSrc] = useState(() => normalizeMediaUrl(recipe.image));
  const [failed, setFailed] = useState(false);

  const imageRecipeId =
    extractRecipeIdFromSpoonacularImage(recipe.image) ??
    (recipe.image?.includes("spoonacular.com") && recipe.id > 0 && recipe.id < 500_000
      ? recipe.id
      : 0);

  useEffect(() => {
    setSrc(normalizeMediaUrl(recipe.image));
    setFailed(false);
  }, [recipe.id, recipe.image]);

  const canSpoonacularFallback =
    imageRecipeId > 0 &&
    imageRecipeId < 500_000 &&
    (recipe.image?.includes("spoonacular.com") || !recipe.image);
  const fallbackSrc = canSpoonacularFallback ? spoonacularImageUrl(imageRecipeId) : "";
  const srcSet = canSpoonacularFallback ? exploreImageSrcSet(imageRecipeId) : undefined;
  const showImage = Boolean(src) && !failed;

  const sizes =
    variant === "detail"
      ? HERO_SIZES.detail
      : sizesHint === "spotlight"
        ? HERO_SIZES.spotlight
        : sizesHint === "rail"
          ? HERO_SIZES.rail
          : HERO_SIZES.grid;

  const overlay = cinematic
    ? "card-cinematic"
    : variant === "detail"
      ? "detail"
      : "card";

  const fallback = (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950",
        variant === "card" ? "w-full h-full min-h-[200px]" : undefined,
        className,
      )}
    >
      <Flame className="w-10 h-10 text-primary/30" />
      <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium line-clamp-2 px-4 text-center">
        {recipe.title}
      </p>
    </div>
  );

  if (!showImage) {
    return fallback;
  }

  return (
    <HeroImage
      key={`explore-hero-${recipe.id}-${src}`}
      src={src}
      alt={recipe.imageAlt || recipe.title}
      layout={variant === "detail" ? "detail" : "card-fill"}
      focal="food-plate"
      overlay={overlay}
      cinematicGrade={cinematic}
      srcSet={srcSet}
      sizes={sizes}
      priority={priority}
      className={className}
      imgClassName={imgClassName}
      fallback={fallback}
      onError={() => {
        if (fallbackSrc && src !== fallbackSrc) {
          setSrc(fallbackSrc);
          return true;
        }
        setFailed(true);
        return false;
      }}
    />
  );
}
