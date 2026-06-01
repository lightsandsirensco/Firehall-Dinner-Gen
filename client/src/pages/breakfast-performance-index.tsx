import { useMemo } from "react";
import { Link } from "wouter";
import { Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { getSavedCount } from "@/lib/saved-meals";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildBreadcrumbListSchema } from "@shared/seo/schema";
import { fetchBreakfastPerformanceCatalogIndex } from "@/lib/breakfast-api";
import { FoodImage } from "@/components/mobile/food-image";
import { cn } from "@/lib/utils";
import { SiteFooter } from "@/components/site-footer";
import {
  breakfastIndexPath,
  breakfastPerformanceIndexPath,
  breakfastPerformanceRecipePath,
} from "@shared/fuel-catalog/paths";
import { buildBreakfastPerformanceIndexSeo } from "@shared/seo/fuel-metadata";

export default function BreakfastPerformanceIndexPage() {
  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();

  const { data: catalog } = useQuery({
    queryKey: ["breakfast-performance-catalog-index"],
    queryFn: fetchBreakfastPerformanceCatalogIndex,
    staleTime: 5 * 60 * 1000,
  });

  const seoConfig = useMemo(
    () => buildBreakfastPerformanceIndexSeo(catalog?.recipeCount ?? 0),
    [catalog?.recipeCount],
  );

  usePageSeo(
    seoConfig,
    useMemo(
      () => [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Breakfast", path: breakfastIndexPath() },
          { name: "Performance Breakfasts", path: breakfastPerformanceIndexPath() },
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
            { name: "Breakfast", path: breakfastIndexPath() },
            { name: "Performance Breakfasts", path: breakfastPerformanceIndexPath() },
          ]}
          className="mb-4"
        />

        <div className="flex items-center gap-2 text-sky-400/90">
          <Activity className="w-4 h-4" aria-hidden />
          <span className="text-xs uppercase tracking-widest">Training fuel</span>
        </div>
        <h1 className="mt-3 font-heading tracking-tight text-3xl sm:text-4xl">
          Performance breakfasts
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed max-w-3xl">
          Macro-forward morning meals for training days — kept separate from the main firehall breakfast
          line so classics stay front and center. Still crew-sized, still practical, just not what you lead
          with after a busy night.
        </p>

        <p className="mt-6 text-sm">
          <Link href={breakfastIndexPath()} className="text-primary hover:underline font-medium">
            ← Back to firehall breakfasts
          </Link>
        </p>

        <section className="mt-10" aria-labelledby="performance-recipes-heading">
          <h2 id="performance-recipes-heading" className="font-heading text-xl">
            Performance recipes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {catalog?.recipeCount ?? 0} training-day breakfasts.
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(catalog?.recipes ?? []).map((r) => (
              <Link
                key={r.slug}
                href={breakfastPerformanceRecipePath(r.slug)}
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
      </main>
      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
