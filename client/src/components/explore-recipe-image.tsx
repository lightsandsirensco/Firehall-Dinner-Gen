import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { exploreImageSrcSet, spoonacularImageUrl } from "@/lib/explore-recipe";
import type { ExploreRecipeCard } from "@/lib/explore-recipe";

interface ExploreRecipeImageProps {
  recipe: Pick<ExploreRecipeCard, "id" | "title" | "image" | "imageAlt">;
  className?: string;
  imgClassName?: string;
  /** Cinematic card vs detail hero */
  variant?: "card" | "detail";
  /** Apply warm cinematic grade + vignette (card thumbnails) */
  cinematic?: boolean;
}

export function ExploreRecipeImage({
  recipe,
  className,
  imgClassName,
  variant = "card",
  cinematic = false,
}: ExploreRecipeImageProps) {
  const [src, setSrc] = useState(recipe.image);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(recipe.image);
    setLoaded(false);
    setFailed(false);
  }, [recipe.id, recipe.image]);

  const canSpoonacularFallback =
    recipe.id > 0 &&
    recipe.id < 500_000 &&
    (recipe.image?.includes("spoonacular.com") || !recipe.image);
  const fallbackSrc = canSpoonacularFallback ? spoonacularImageUrl(recipe.id) : "";
  const srcSet = canSpoonacularFallback ? exploreImageSrcSet(recipe.id) : undefined;
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-zinc-950 to-black",
        variant === "card" ? "w-full h-full" : "w-full min-h-[220px] sm:min-h-[320px]",
        className,
      )}
    >
      {!loaded && showImage && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-800/80 via-zinc-900/40 to-zinc-800/80"
          aria-hidden
        />
      )}
      {showImage ? (
        <img
          key={`explore-img-${recipe.id}`}
          src={src}
          srcSet={srcSet}
          sizes={variant === "card" ? "(max-width: 640px) 50vw, 33vw" : "100vw"}
          alt={recipe.imageAlt || recipe.title}
          className={cn(
            "w-full h-full object-cover object-center transition-opacity duration-300",
            cinematic && "saturate-[1.08] contrast-[1.05] brightness-[0.92]",
            loaded ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (fallbackSrc && src !== fallbackSrc) {
              setSrc(fallbackSrc);
              return;
            }
            setFailed(true);
            setLoaded(true);
          }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center bg-gradient-to-br from-zinc-900 to-zinc-950">
          <Flame className="w-10 h-10 text-primary/30" />
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium line-clamp-2">
            {recipe.title}
          </p>
        </div>
      )}

      {cinematic && showImage && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-500/[0.07] via-transparent to-black/30 mix-blend-soft-light"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.45)]"
            aria-hidden
          />
        </>
      )}

      {!cinematic && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"
          aria-hidden
        />
      )}
    </div>
  );
}
