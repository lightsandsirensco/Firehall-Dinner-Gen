import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { getSavedCount } from "@/lib/saved-meals";
import { fetchEditorialIndex } from "@/lib/editorial-content-api";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { buildGuidesIndexSeo } from "@shared/seo/metadata";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildBreadcrumbListSchema } from "@shared/seo/schema";
import { guidePath } from "@shared/editorial/content-schema";
import { PILLAR_LABELS, type EditorialPillar } from "@shared/editorial/content-pillar";
import { Loader2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const TOPIC_LABEL: Record<string, string> = {
  shift_operations: "Shift operations",
  meal_planning: "Meal planning",
  station_cooking: "Station cooking",
  crew_culture: "Crew culture",
  nutrition_performance: "Nutrition",
  station_lifestyle: "Station life",
};

export default function GuidesIndexPage() {
  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();

  const { data: catalog, isLoading } = useQuery({
    queryKey: ["editorial-index"],
    queryFn: fetchEditorialIndex,
    staleTime: Infinity,
  });

  const seoConfig = useMemo(
    () => buildGuidesIndexSeo(catalog?.articleCount ?? 8),
    [catalog?.articleCount],
  );
  const seoJsonLd = useMemo(
    () => [
      buildBreadcrumbListSchema(origin, [
        { name: "Home", path: "/" },
        { name: "Guides", path: "/guides" },
      ]),
    ],
    [origin],
  );
  usePageSeo(seoConfig, seoJsonLd);

  const articles = useMemo(
    () => [...(catalog?.articles ?? [])].sort((a, b) => a.title.localeCompare(b.title)),
    [catalog?.articles],
  );

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background">
      <SiteHeader activePage="guides" favCount={favCount} />
      <main className="max-w-[900px] mx-auto px-page py-10 sm:py-14" id="main-content">
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Guides", path: "/guides" },
          ]}
          className="mb-4"
        />

        <div className="flex items-center gap-2 text-muted-foreground">
          <BookOpen className="w-4 h-4 text-primary" aria-hidden />
          <span className="text-xs uppercase tracking-widest">Hall guides</span>
        </div>

        <h1 className="mt-3 font-heading tracking-tight text-3xl sm:text-4xl">
          Firefighter Meal Guides
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed max-w-2xl text-[15px] sm:text-base">
          Shift nutrition, station culture, and kitchen how-tos — written for crews, not algorithms.
          Each guide links to real meals you can cook tonight.
        </p>

        {isLoading && (
          <div className="flex justify-center py-16" aria-busy="true">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (
          <ul className="mt-10 space-y-4">
            {articles.map((a) => (
              <li key={a.slug}>
                <article
                  className={cn(
                    "rounded-2xl border border-border/30 bg-card/30 p-5 sm:p-6",
                    "hover:border-primary/25 transition-colors",
                  )}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {TOPIC_LABEL[a.topic] ?? a.topic} · {a.readMinutes} min read
                  </p>
                  <h2 className="mt-2 font-heading text-xl sm:text-2xl">
                    <Link href={guidePath(a.slug)} className="hover:text-primary transition-colors">
                      {a.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a.subtitle}</p>
                  <Link
                    href={guidePath(a.slug)}
                    className="inline-block mt-4 text-sm font-medium text-primary hover:underline"
                  >
                    Read guide →
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-sm text-muted-foreground">
          <Link href="/recipes" className="text-primary hover:underline font-medium">
            Browse all firefighter meals
          </Link>
          {" · "}
          <Link href="/explore" className="text-primary hover:underline">
            Browse all recipes
          </Link>
        </p>
      </main>
    </div>
  );
}
