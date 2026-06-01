import { Link } from "wouter";
import type { GoldenCatalogIndexEntry } from "@shared/golden-100/recipe-page-schema";
import { cn } from "@/lib/utils";
import { HeroImage } from "@/components/hero-image";
import { CTA, HOME } from "@/lib/brand-copy";
import { HOME_FEATURED_SLUGS } from "./home-constants";

interface HomeFeaturedMealsProps {
  meals: GoldenCatalogIndexEntry[];
}

interface FeaturedRail {
  id: string;
  title: string;
  subtitle: string;
  meals: GoldenCatalogIndexEntry[];
  viewHref?: string;
}

function pickBySlugs(
  all: GoldenCatalogIndexEntry[],
  slugs: readonly string[],
  limit: number,
): GoldenCatalogIndexEntry[] {
  const bySlug = new Map(all.map((m) => [m.slug, m]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((m): m is GoldenCatalogIndexEntry => Boolean(m))
    .slice(0, limit);
}

function pickRecentlyAdded(all: GoldenCatalogIndexEntry[], limit: number): GoldenCatalogIndexEntry[] {
  return [...all].reverse().slice(0, limit);
}

function buildRails(all: GoldenCatalogIndexEntry[]): FeaturedRail[] {
  const hallFavorites = pickBySlugs(all, HOME_FEATURED_SLUGS, 8);
  const recentlyAdded = pickRecentlyAdded(all, 6).filter(
    (meal) => !HOME_FEATURED_SLUGS.includes(meal.slug as (typeof HOME_FEATURED_SLUGS)[number]),
  );

  const rails: FeaturedRail[] = [];
  if (hallFavorites.length >= 3) {
    rails.push({
      id: "hall_favorites",
      title: "Hall favorites",
      subtitle: "Popular firefighter recipes crews cook on shift.",
      meals: hallFavorites,
      viewHref: "/recipes",
    });
  }
  if (recentlyAdded.length >= 3) {
    rails.push({
      id: "recently_added",
      title: "Recently added",
      subtitle: "Fresh hall-tested meals in the catalog.",
      meals: recentlyAdded,
      viewHref: "/explore",
    });
  }
  return rails;
}

export function HomeFeaturedMeals({ meals }: HomeFeaturedMealsProps) {
  if (meals.length === 0) return null;

  const rails = buildRails(meals);
  if (rails.length === 0) return null;

  return (
    <section
      className="py-16 sm:py-24 border-y border-border/20 bg-[hsl(0_0%_6%)]"
      aria-labelledby="featured-meals-heading"
    >
      <div className="max-w-[1400px] mx-auto px-page mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2
            id="featured-meals-heading"
            className="font-heading text-2xl sm:text-4xl leading-[1.05] tracking-tight text-foreground"
          >
            {HOME.featuredTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">{HOME.featuredLead}</p>
        </div>
        <Link
          href="/recipes"
          className="text-sm font-medium text-primary hover:text-primary/90 transition-colors shrink-0"
        >
          {CTA.viewRecipes} →
        </Link>
      </div>

      <div className="space-y-10 sm:space-y-14">
        {rails.map((rail, sectionIndex) => (
          <div key={rail.id} aria-label={rail.title}>
            <div className="max-w-[1400px] mx-auto px-page mb-4 flex items-end justify-between gap-4">
              <div>
                <h3 className="font-heading text-xl sm:text-2xl tracking-tight">{rail.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{rail.subtitle}</p>
              </div>
              {rail.viewHref && (
                <Link
                  href={rail.viewHref}
                  className="text-sm font-medium text-primary hover:text-primary/90 transition-colors shrink-0"
                >
                  View →
                </Link>
              )}
            </div>

            <div
              className={cn(
                "flex gap-4 sm:gap-5 overflow-x-auto pb-2 -mx-page px-page",
                "scroll-momentum snap-x snap-mandatory",
                "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              )}
            >
              {rail.meals.map((meal, index) => (
                <article
                  key={meal.slug}
                  className="snap-start shrink-0 w-[min(78vw,300px)] sm:w-[340px] lg:w-[380px]"
                >
                  <Link
                    href={`/recipes/${meal.slug}`}
                    className="group block h-full"
                    data-testid={`featured-${rail.id}-${meal.slug}`}
                  >
                    <div
                      className={cn(
                        "relative aspect-[4/5] overflow-hidden rounded-2xl sm:rounded-3xl",
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
                        priority={sectionIndex === 0 && index < 2}
                        className="absolute inset-0 h-full w-full"
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent"
                        aria-hidden
                      />
                      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                        <h4 className="font-heading text-2xl sm:text-[1.65rem] leading-[1.05] text-white">
                          {meal.title}
                        </h4>
                        <p className="mt-2 text-sm text-white/50 tabular-nums">{meal.cookTime} min</p>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
