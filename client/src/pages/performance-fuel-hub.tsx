import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getSavedCount } from "@/lib/saved-meals";
import {
  fetchPerformanceCatalogIndex,
  fetchSmoothieCatalogIndex,
} from "@/lib/fuel-recipe-api";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { buildPerformanceFuelSeo } from "@shared/seo/fuel-metadata";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildBreadcrumbListSchema } from "@shared/seo/schema";
import { performanceFuelRecipePath, smoothiesIndexPath } from "@shared/fuel-catalog/paths";

export default function PerformanceFuelHubPage() {
  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();

  const { data: smoothies } = useQuery({
    queryKey: ["smoothie-catalog-index"],
    queryFn: fetchSmoothieCatalogIndex,
    staleTime: Infinity,
  });
  const { data: meals, isLoading } = useQuery({
    queryKey: ["performance-catalog-index"],
    queryFn: fetchPerformanceCatalogIndex,
    staleTime: Infinity,
  });

  const seoConfig = useMemo(
    () => buildPerformanceFuelSeo(meals?.recipeCount ?? 50, smoothies?.recipeCount ?? 10),
    [meals?.recipeCount, smoothies?.recipeCount],
  );
  usePageSeo(
    seoConfig,
    useMemo(
      () => [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Performance Fuel", path: "/performance-fuel" },
        ]),
      ],
      [origin],
    ),
  );

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background">
      <SiteHeader activePage="performance" favCount={favCount} />
      <main className="max-w-[960px] mx-auto px-page py-10 sm:py-14" id="main-content">
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Performance Fuel", path: "/performance-fuel" },
          ]}
          className="mb-4"
        />

        <div className="flex items-center gap-2 text-sky-400/90">
          <Activity className="w-4 h-4" aria-hidden />
          <span className="text-xs uppercase tracking-widest">Nutrition</span>
        </div>
        <h1 className="mt-3 font-heading tracking-tight text-3xl sm:text-4xl">
          Performance fuel
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl">
          Performance dinners and hall smoothies — kept separate from Find a Meal and the Classics Wheel on
          purpose. Pick the lane you need.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href={smoothiesIndexPath()}
            className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-6 hover:border-emerald-500/40 transition-colors"
          >
            <h2 className="font-heading text-lg">Smoothies</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {smoothies?.recipeCount ?? 10} blends — protein, recovery, breakfast, green.
            </p>
          </Link>
          <div className="rounded-2xl border border-border/25 bg-card/30 p-6">
            <h2 className="font-heading text-lg">Performance meals</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {meals?.recipeCount ?? 50} adapted healthy dinners — their own lane, not mixed into hall dinner picks.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <section className="mt-10" aria-labelledby="meals-heading">
            <h2 id="meals-heading" className="font-heading text-xl">
              Performance meals
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(meals?.recipes ?? []).slice(0, 12).map((r) => (
                <li key={r.slug}>
                  <Link
                    href={performanceFuelRecipePath(r.slug)}
                    className="block rounded-xl border border-border/25 p-3 text-sm font-medium hover:border-primary/30 transition-colors line-clamp-2"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
            {(meals?.recipes.length ?? 0) > 12 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Showing 12 of {meals?.recipeCount} — browse the full list above.
              </p>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}
