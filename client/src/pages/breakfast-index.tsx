import { useMemo } from "react";
import { Link } from "wouter";
import { Sunrise } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { getSavedCount } from "@/lib/saved-meals";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { buildBreakfastIndexSeo } from "@shared/seo/fuel-metadata";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildBreadcrumbListSchema } from "@shared/seo/schema";
import { fetchBreakfastCatalogIndex } from "@/lib/breakfast-api";
import { FoodImage } from "@/components/mobile/food-image";
import { cn } from "@/lib/utils";
import { LightsAndSirensCredit } from "@/components/brand/lights-and-sirens-credit";
import { SiteFooter } from "@/components/site-footer";

const FILTERS = [
  { id: "quick_breakfasts", label: "Quick" },
  { id: "feed_a_crew", label: "Feed a Crew" },
  { id: "high_protein", label: "High Protein" },
  { id: "breakfast_sandwiches", label: "Sandwiches" },
  { id: "skillets", label: "Skillets" },
  { id: "bbq_breakfast", label: "BBQ Breakfast" },
  { id: "healthy_breakfasts", label: "Healthy" },
] as const;

export default function BreakfastIndexPage() {
  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();
  const seoConfig = useMemo(() => buildBreakfastIndexSeo(), []);

  const { data: catalog } = useQuery({
    queryKey: ["breakfast-catalog-index"],
    queryFn: fetchBreakfastCatalogIndex,
    staleTime: 5 * 60 * 1000,
  });

  usePageSeo(
    seoConfig,
    useMemo(
      () => [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Breakfast", path: "/breakfast" },
        ]),
      ],
      [origin],
    ),
  );

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <SiteHeader activePage="breakfast" favCount={favCount} />
      <main className="max-w-[1100px] mx-auto px-page py-10 sm:py-14 flex-1" id="main-content">
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Breakfast", path: "/breakfast" },
          ]}
          className="mb-4"
        />

        <div className="flex items-center gap-2 text-amber-400/90">
          <Sunrise className="w-4 h-4" aria-hidden />
          <span className="text-xs uppercase tracking-widest">Shift fuel</span>
        </div>
        <h1 className="mt-3 font-heading tracking-tight text-3xl sm:text-4xl">
          Firehall breakfast
        </h1>
        <LightsAndSirensCredit variant="block" className="mt-4 max-w-lg" showFirefighterOwned />

        <p className="mt-4 text-muted-foreground leading-relaxed max-w-3xl">
          Built for station mornings: hearty, practical, and written for interruptions. Breakfast lives here on purpose —
          it does not appear in the dinner generator, dinner Explore feed, or dinner category rails.
        </p>

        <div className="mt-8 flex flex-wrap gap-2.5">
          {FILTERS.map((f) => (
            <a
              key={f.id}
              href={`#filter-${f.id}`}
              className="inline-flex items-center rounded-full border border-border/25 bg-card/15 px-3.5 py-2 text-sm font-medium hover:bg-card/25 transition-colors"
            >
              {f.label}
            </a>
          ))}
        </div>

        <section className="mt-10" aria-labelledby="recipes-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="recipes-heading" className="font-heading text-xl">
                Recipes
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {catalog?.recipeCount ?? 0} station breakfasts.
              </p>
            </div>
            <Link href="/generator" className="text-sm font-medium text-primary hover:underline">
              Find a Meal →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(catalog?.recipes ?? []).slice(0, 18).map((r) => (
              <Link
                key={r.slug}
                href={`/breakfast/${r.slug}`}
                className="group rounded-2xl border border-border/20 bg-card/15 hover:bg-card/25 transition-colors overflow-hidden"
              >
                <div className="relative aspect-[16/11]">
                  <FoodImage
                    src={r.thumbImage || r.heroImage}
                    alt={r.title}
                    layout="card-fill"
                    fit="cover"
                    focal="food-plate"
                    overlay="card-cinematic"
                    cinematicGrade
                    rounded="none"
                  />
                </div>
                <div className="p-4">
                  <h3 className={cn("font-medium leading-snug", "group-hover:text-foreground")}>{r.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.subtitle}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{r.totalTime} min</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-10 text-sm text-muted-foreground border-t border-border/20 pt-6">
          Crew dinner is separate. When it is meal time, use{" "}
          <Link href="/generator" className="text-primary hover:underline">
            Find a Meal
          </Link>{" "}
          or{" "}
          <Link href="/recipes" className="text-primary hover:underline">
            Explore Meals
          </Link>
          .
        </p>
      </main>
      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
