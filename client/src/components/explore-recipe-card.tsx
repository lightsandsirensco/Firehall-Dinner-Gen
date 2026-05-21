import { Clock, Users, Flame } from "lucide-react";

interface ExploreRecipeCardProps {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  summary?: string;
  tags: string[];
  isFirehallFallback?: boolean;
  isCurated?: boolean;
  onClick: () => void;
}

function getHighResImage(url: string): string {
  if (!url) return "";
  if (url.includes("spoonacular.com")) {
    return url
      .replace(/\-312x231\./i, "-556x370.")
      .replace(/\-240x150\./i, "-556x370.")
      .replace(/\-480x360\./i, "-556x370.");
  }
  return url;
}

const TAG_ICONS: Record<string, string> = {
  "Quick & Easy": "\u26A1",
  "30-Minute Meal": "\u23F1",
  "High Protein": "\uD83D\uDD25",
  "One-Pot": "\uD83C\uDF72",
  "Sheet Pan": "\uD83C\uDF73",
  "Comfort Food": "\uD83C\uDF54",
  "Healthy": "\uD83E\uDD57",
  "Mediterranean": "\uD83C\uDF0E",
  "Mexican": "\uD83C\uDF2E",
  "Italian": "\uD83C\uDDEE\uD83C\uDDF9",
  "Asian": "\uD83E\uDD62",
  "BBQ": "\uD83D\uDD25",
  "Grilled": "\uD83D\uDD25",
  "Vegetarian": "\uD83C\uDF3F",
  "Vegan": "\uD83C\uDF31",
  "Gluten Free": "\uD83C\uDF3E",
  "Pasta": "\uD83C\uDF5D",
  "Curry": "\uD83C\uDF5B",
  "Cajun": "\uD83C\uDF36\uFE0F",
  "Hearty": "\uD83C\uDF72",
  "Slow Cooker": "\u23F3",
  "Stir Fry": "\uD83E\uDD62",
  "Burger": "\uD83C\uDF54",
};

export function ExploreRecipeCard({
  id,
  title,
  image,
  readyInMinutes,
  servings,
  summary,
  tags,
  isFirehallFallback,
  isCurated,
  onClick,
}: ExploreRecipeCardProps) {
  const hiResImage = getHighResImage(image);

  return (
    <article
      className="group relative rounded-2xl overflow-hidden bg-card border border-border/40 cursor-pointer transition-all duration-300 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1.5 active:translate-y-0"
      onClick={onClick}
      data-testid={`card-explore-result-${id}`}
    >
      <div className="aspect-[4/3] sm:aspect-[16/10] overflow-hidden relative bg-gradient-to-br from-muted to-muted/50">
        {hiResImage ? (
          <img
            src={hiResImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
            <Flame className="w-12 h-12 text-primary/25" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:hidden">
          <h3 className="font-heading text-sm tracking-wide text-white line-clamp-2 drop-shadow-md">{title}</h3>
        </div>

        {(isCurated || isFirehallFallback) && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 bg-primary/90 text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
              <Flame className="w-3 h-3" />
              {isCurated ? "Hall classic" : "Firehall AI"}
            </span>
          </div>
        )}

        {readyInMinutes > 0 && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              {readyInMinutes} min
            </span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 hidden sm:block">
        <h3
          className="font-heading text-[15px] sm:text-base tracking-wide text-foreground line-clamp-2 mb-2.5 leading-snug group-hover:text-primary transition-colors"
          data-testid={`text-result-title-${id}`}
        >
          {title}
        </h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {servings} servings
          </span>
          {readyInMinutes > 0 && (
            <>
              <span className="w-px h-3 bg-border/60 inline-block" />
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {readyInMinutes} min
              </span>
            </>
          )}
        </div>

        {summary && (
          <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-3 leading-relaxed">
            {summary}
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap" data-testid={`tags-${id}`}>
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/80 bg-muted/60 px-2 py-0.5 rounded-full border border-border/30"
              >
                {TAG_ICONS[tag] && <span className="text-[10px]">{TAG_ICONS[tag]}</span>}
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-border/20">
          <span className="text-[11px] font-medium text-primary/70 group-hover:text-primary transition-colors">
            View Recipe &rarr;
          </span>
        </div>
      </div>
    </article>
  );
}

export function ExploreRecipeCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border/40 animate-pulse" data-testid="skeleton-card">
      <div className="aspect-[4/3] sm:aspect-[16/10] bg-muted" />
      <div className="p-4 sm:p-5 space-y-3">
        <div className="h-5 bg-muted rounded-md w-3/4" />
        <div className="flex gap-3">
          <div className="h-3 bg-muted rounded w-16" />
          <div className="h-3 bg-muted rounded w-16" />
        </div>
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="flex gap-1.5">
          <div className="h-5 bg-muted rounded-full w-16" />
          <div className="h-5 bg-muted rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}
