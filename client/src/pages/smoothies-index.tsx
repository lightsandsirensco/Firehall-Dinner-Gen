import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Droplets } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getSavedCount } from "@/lib/saved-meals";
import { fetchSmoothieCatalogIndex } from "@/lib/fuel-recipe-api";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { buildSmoothiesIndexSeo } from "@shared/seo/fuel-metadata";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildBreadcrumbListSchema } from "@shared/seo/schema";
import { smoothieRecipePath } from "@shared/fuel-catalog/paths";
import { SMOOTHIE_TAXONOMY_LABELS, type SmoothieTaxonomy } from "@shared/fuel-catalog/constants";
import { cn } from "@/lib/utils";

export default function SmoothiesIndexPage() {
  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();

  const { data: catalog, isLoading } = useQuery({
    queryKey: ["smoothie-catalog-index"],
    queryFn: fetchSmoothieCatalogIndex,
    staleTime: Infinity,
  });

  const seoConfig = useMemo(
    () => buildSmoothiesIndexSeo(catalog?.recipeCount ?? 10),
    [catalog?.recipeCount],
  );
  usePageSeo(
    seoConfig,
    useMemo(
      () => [
        buildBreadcrumbListSchema(origin, [
          { name: "Home", path: "/" },
          { name: "Smoothies", path: "/smoothies" },
        ]),
      ],
      [origin],
    ),
  );

  const byCategory = useMemo(() => {
    const map = new Map<SmoothieTaxonomy, NonNullable<typeof catalog>["recipes"]>();
    for (const r of catalog?.recipes ?? []) {
      const cat = r.taxonomyCategory as SmoothieTaxonomy;
      const list = map.get(cat) ?? [];
      list.push(r);
      map.set(cat, list);
    }
    return map;
  }, [catalog?.recipes]);

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background">
      <SiteHeader activePage="smoothies" favCount={favCount} />
      <main className="max-w-[960px] mx-auto px-page py-10 sm:py-14" id="main-content">
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Smoothies", path: "/smoothies" },
          ]}
          className="mb-4"
        />

        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/15 bg-gradient-to-br from-emerald-950/50 via-background to-zinc-950/80 p-8 sm:p-10">
          <div className="flex items-center gap-2 text-emerald-400/90">
            <Droplets className="w-4 h-4" aria-hidden />
            <span className="text-xs uppercase tracking-widest">Station kitchen · Hall fuel</span>
          </div>
          <h1 className="mt-3 font-heading tracking-tight text-3xl sm:text-4xl max-w-xl">
            Hall smoothies crews actually finish
          </h1>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl text-[15px] sm:text-base">
            Protein, recovery, breakfast, and green blends for a station blender — not a wellness
            photo shoot. Separate from dinner: use between calls, after a workout, or when the
            board is quiet.
          </p>
          <p className="mt-4 text-sm text-muted-foreground/90">
            <Link href="/guides/healthy-smoothies-at-the-hall" className="text-primary hover:underline">
              Read the full hall guide
            </Link>
            {" · "}
            <Link href="/explore" className="text-primary hover:underline">
              All hall recipes
            </Link>
          </p>
        </div>

        {isLoading ? (
          <div className="mt-10 sm:mt-12 space-y-10" aria-busy aria-label="Loading smoothies">
            {Array.from({ length: 2 }).map((_, sectionIndex) => (
              <section key={sectionIndex}>
                <div className="h-5 w-40 rounded skeleton-shimmer" />
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <li
                      key={i}
                      className="flex gap-4 rounded-2xl border border-border/25 bg-card/30 p-4 min-h-[88px]"
                    >
                      <div className="w-20 h-20 shrink-0 rounded-xl skeleton-shimmer" />
                      <div className="min-w-0 flex-1 space-y-2 py-1">
                        <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                        <div className="h-3 w-full rounded skeleton-shimmer" />
                        <div className="h-3 w-1/3 rounded skeleton-shimmer" />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-10 sm:mt-12 space-y-10">
            {Array.from(byCategory.entries()).map(([cat, recipes]) => (
              <section key={cat} aria-labelledby={`cat-${cat}`}>
                <h2 id={`cat-${cat}`} className="font-heading text-lg sm:text-xl tracking-tight">
                  {SMOOTHIE_TAXONOMY_LABELS[cat]}
                </h2>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {recipes?.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={smoothieRecipePath(r.slug)}
                        className={cn(
                          "group flex gap-4 rounded-2xl border border-border/25 bg-card/30 p-4",
                          "hover:border-emerald-500/30 hover:bg-card/50 transition-colors min-h-[88px]",
                        )}
                      >
                        <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-900/30 to-muted/20">
                          {r.thumbImage ? (
                            <img
                              src={r.thumbImage}
                              alt={r.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-[15px] leading-snug group-hover:text-primary transition-colors">
                            {r.title}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {r.subtitle}
                          </p>
                          <p className="mt-2 text-xs text-emerald-400/80">
                            ~{r.calories} cal · {r.protein}g protein
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
