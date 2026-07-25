import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import type { GoldenCatalogIndexEntry } from "@shared/golden-100/recipe-page-schema";
import { cn } from "@/lib/utils";
import { FoodImage } from "@/components/mobile/food-image";
import { RecipeGridSkeleton } from "@/components/mobile/loading-skeletons";
import { fetchPizzaNightCatalog, pizzaNightCatalogQueryKey } from "@/lib/pizza-night-api";

function PizzaCatalogCard({
  entry,
  onClick,
}: {
  entry: GoldenCatalogIndexEntry;
  onClick: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const imageSrc = entry.thumbImage || entry.heroImage;
  const showImage = Boolean(imageSrc) && !imgFailed;

  return (
    <article
      className={cn(
        "group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-card/30 ring-1 ring-border/15",
        "transition-all hover:ring-primary/25 hover:shadow-lg hover:shadow-black/10",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      data-testid={`pizza-night-card-${entry.slug}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950">
        {showImage ? (
          <FoodImage
            src={imageSrc}
            alt={entry.title}
            layout="card-fill"
            fit="cover"
            focal="center"
            overlay="none"
            cinematicGrade
            rounded="none"
            onError={() => {
              setImgFailed(true);
              return true;
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-950 px-3 text-center text-xs text-muted-foreground">
            {entry.title}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
          {entry.title}
        </h3>
        <p className="mt-auto flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
          <span>Pizza</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="h-3 w-3 opacity-70" aria-hidden />
            {entry.cookTime} min
          </span>
        </p>
      </div>
    </article>
  );
}

export function PizzaNightCatalog({
  onRecipeClick,
}: {
  onRecipeClick: (slug: string) => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: pizzaNightCatalogQueryKey,
    queryFn: fetchPizzaNightCatalog,
    staleTime: 30 * 60 * 1000,
  });

  const entries = useMemo(() => {
    if (!data?.recipes?.length) return [];
    return [...data.recipes].sort((a, b) => a.cookTime - b.cookTime || a.title.localeCompare(b.title, "en"));
  }, [data]);

  if (isLoading) {
    return (
      <div className="px-page">
        <RecipeGridSkeleton count={8} />
      </div>
    );
  }

  if (isError || entries.length === 0) {
    return (
      <div className="px-page py-12 text-center text-sm text-muted-foreground">
        Pizza catalog is unavailable. Try refreshing the page.
      </div>
    );
  }

  return (
    <div className="px-page">
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5"
        data-testid="pizza-night-grid"
      >
        {entries.map((entry) => (
          <PizzaCatalogCard key={entry.slug} entry={entry} onClick={() => onRecipeClick(entry.slug)} />
        ))}
      </div>
    </div>
  );
}
