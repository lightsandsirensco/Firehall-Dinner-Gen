import { Link } from "wouter";
import type { GoldenCatalogIndexEntry } from "@shared/golden-100/recipe-page-schema";
import { cn } from "@/lib/utils";
import { HeroImage } from "@/components/hero-image";
import { Skeleton } from "@/components/ui/skeleton";
import { CTA, HOME } from "@/lib/brand-copy";
import { HOME_FEATURED_SLUGS } from "./home-constants";

interface HomeFeaturedMealsProps {
  meals: GoldenCatalogIndexEntry[];
  loading?: boolean;
}

function pickHallFavorites(
  all: GoldenCatalogIndexEntry[],
  limit: number,
): GoldenCatalogIndexEntry[] {
  const bySlug = new Map(all.map((m) => [m.slug, m]));
  return HOME_FEATURED_SLUGS
    .map((slug) => bySlug.get(slug))
    .filter((m): m is GoldenCatalogIndexEntry => Boolean(m))
    .slice(0, limit);
}

function FeaturedMealsSkeleton() {
  return (
    <section
      className="py-10 sm:py-14 border-y border-border/20 bg-[hsl(0_0%_6%)]"
      aria-busy="true"
      aria-label="Loading featured meals"
    >
      <div className="max-w-[1400px] mx-auto px-page mb-5 sm:mb-6">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-2 -mx-page px-page">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="shrink-0 w-[min(72vw,280px)] sm:w-[300px] aspect-[4/5] rounded-2xl" />
        ))}
      </div>
    </section>
  );
}

export function HomeFeaturedMeals({ meals, loading }: HomeFeaturedMealsProps) {
  if (loading) return <FeaturedMealsSkeleton />;

  const hallFavorites = pickHallFavorites(meals, 8);
  if (hallFavorites.length < 3) return null;

  return (
    <section
      className="py-10 sm:py-14 border-y border-border/20 bg-[hsl(0_0%_6%)]"
      aria-labelledby="featured-meals-heading"
    >
      <div className="max-w-[1400px] mx-auto px-page mb-5 sm:mb-6 flex items-end justify-between gap-4">
        <div>
          <h2
            id="featured-meals-heading"
            className="font-heading text-xl sm:text-2xl leading-[1.05] tracking-tight text-foreground"
          >
            {HOME.featuredTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {HOME.featuredLead}
          </p>
        </div>
        <Link
          href="/explore"
          className="text-sm font-medium text-primary hover:text-primary/90 transition-colors shrink-0"
        >
          {CTA.exploreMeals} →
        </Link>
      </div>

      <div
        className={cn(
          "flex gap-4 sm:gap-5 overflow-x-auto pb-2 -mx-page px-page",
          "scroll-momentum snap-x snap-mandatory",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {hallFavorites.map((meal, index) => (
          <article
            key={meal.slug}
            className="snap-start shrink-0 w-[min(72vw,280px)] sm:w-[300px]"
          >
            <Link
              href={`/recipes/${meal.slug}`}
              className="group block h-full"
              data-testid={`featured-hall_favorites-${meal.slug}`}
            >
              <div
                className={cn(
                  "relative aspect-[4/5] overflow-hidden rounded-2xl",
                  "ring-1 ring-white/[0.08] shadow-2xl shadow-black/50",
                  "transition-[transform,box-shadow] duration-500 ease-out",
                  "group-hover:ring-primary/20 group-active:scale-[0.99]",
                )}
              >
                <HeroImage
                  src={meal.heroImage}
                  alt={meal.title}
                  layout="card-fill"
                  focal="food"
                  overlay="none"
                  cinematicGrade
                  priority={index < 2}
                  className="absolute inset-0 h-full w-full"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent"
                  aria-hidden
                />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <h3 className="font-heading text-xl sm:text-2xl leading-[1.05] text-white">
                    {meal.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-white/50 tabular-nums">{meal.cookTime} min</p>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
