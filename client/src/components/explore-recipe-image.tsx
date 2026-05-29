import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { FoodImage } from "@/components/mobile/food-image";
import { HERO_SIZES } from "@/lib/hero-image";
import type { ExploreRecipeCard } from "@/lib/explore-recipe";
import { normalizeMediaUrl } from "@/lib/media-url";
import { isSoftHeldExploreCard } from "@shared/explore-imagery-status";
import { ExploreHeldImageryPlaceholder } from "@/components/explore-held-imagery-placeholder";

interface ExploreRecipeImageProps {
  recipe: Pick<
    ExploreRecipeCard,
    "id" | "title" | "image" | "imageAlt" | "imageryStatus" | "heldImageryLabel"
  >;
  className?: string;
  imgClassName?: string;
  variant?: "card" | "detail";
  cinematic?: boolean;
  sizesHint?: "rail" | "grid" | "spotlight";
  priority?: boolean;
  bleed?: boolean;
}

export function ExploreRecipeImage({
  recipe,
  className,
  imgClassName,
  variant = "card",
  cinematic = false,
  sizesHint = "grid",
  priority = false,
  bleed = variant === "detail",
}: ExploreRecipeImageProps) {
  const held = isSoftHeldExploreCard(recipe);

  const [src, setSrc] = useState(() => normalizeMediaUrl(recipe.image));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(normalizeMediaUrl(recipe.image));
    setFailed(false);
  }, [recipe.id, recipe.image]);

  const showImage = Boolean(src) && !failed && !held;

  const sizes =
    variant === "detail"
      ? HERO_SIZES.detail
      : sizesHint === "spotlight"
        ? HERO_SIZES.spotlight
        : sizesHint === "rail"
          ? HERO_SIZES.rail
          : HERO_SIZES.grid;

  const overlay = cinematic ? "card-cinematic" : variant === "detail" ? "detail" : "card";

  if (held) {
    return (
      <ExploreHeldImageryPlaceholder
        label={recipe.heldImageryLabel || "Finalizing"}
        title={recipe.title}
        variant={variant}
        className={className}
      />
    );
  }

  const brokenFallback = (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950",
        variant === "card" ? "w-full h-full min-h-[200px]" : undefined,
        className,
      )}
    >
      <Flame className="w-10 h-10 text-primary/30" />
      <p className="text-[11px] font-medium text-white/50 line-clamp-2 px-4 text-center">
        {recipe.title}
      </p>
    </div>
  );

  if (!showImage) {
    return brokenFallback;
  }

  return (
    <FoodImage
      key={`explore-hero-${recipe.id}-${src}`}
      src={src}
      alt={recipe.imageAlt || recipe.title}
      layout={variant === "detail" ? "detail" : "card-fill"}
      focal="food-plate"
      fit="cover"
      overlay={overlay}
      cinematicGrade={cinematic || variant === "detail"}
      sizes={sizes}
      priority={priority}
      bleed={bleed}
      rounded={variant === "detail" ? "none" : "lg"}
      className={cn(variant === "detail" && "sm:rounded-2xl", className)}
      imgClassName={imgClassName}
      fallback={brokenFallback}
      debugId={{ context: `explore-${variant}`, title: recipe.title, slug: String(recipe.id) }}
      onError={() => {
        setFailed(true);
        return false;
      }}
    />
  );
}
