import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { getSavedCount } from "@/lib/saved-meals";
import { fetchEditorialIndex } from "@/lib/editorial-content-api";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildBreadcrumbListSchema, buildOrganizationSchema } from "@shared/seo/schema";
import { buildGuidesClusterSeo, type GuidesClusterId } from "@shared/seo/metadata";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { Loader2, Compass, Flame } from "lucide-react";

const CLUSTERS: Record<
  GuidesClusterId,
  {
    title: string;
    description: string;
    queryHints: RegExp;
  }
> = {
  "firefighter-meals": {
    title: "Firefighter meals",
    description:
      "Practical crew dinners built for station kitchens — no blog fluff, no influencer food, just meals that work on shift.",
    queryHints: /\b(firefighter|firehall|firehouse|station|crew|dinner)\b/i,
  },
  "firehall-dinners": {
    title: "Firehall dinner ideas",
    description:
      "Hall-tested dinner ideas crews actually run: comfort food, BBQ nights, big feeds, and quick shift plates.",
    queryHints: /\b(dinner|comfort|bbq|cook|crew|hall)\b/i,
  },
  "firefighter-nutrition": {
    title: "Firefighter nutrition",
    description:
      "Nutrition and performance guidance for the job — recovery, high-protein meals, and station habits that hold up.",
    queryHints: /\b(nutrition|protein|healthy|recovery|performance)\b/i,
  },
  "station-cooking": {
    title: "Station cooking",
    description:
      "How crews cook together: workflow, grocery strategy, and kitchen systems that survive interruptions.",
    queryHints: /\b(station cooking|workflow|grocer|kitchen|meal plan|prep)\b/i,
  },
};

function isClusterId(x: string): x is GuidesClusterId {
  return Object.prototype.hasOwnProperty.call(CLUSTERS, x);
}

export default function GuidesClusterPage() {
  const [, params] = useRoute("/guides/topic/:clusterId");
  const clusterIdRaw = params?.clusterId ?? "";
  const clusterId: GuidesClusterId | null = isClusterId(clusterIdRaw) ? clusterIdRaw : null;

  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();

  const { data: catalog, isLoading } = useQuery({
    queryKey: ["editorial-index"],
    queryFn: fetchEditorialIndex,
    staleTime: Infinity,
  });

  const cluster = clusterId ? CLUSTERS[clusterId] : null;
  const articles = useMemo(() => {
    const all = catalog?.articles ?? [];
    if (!cluster) return [];
    const re = cluster.queryHints;
    return [...all]
      .filter((a) => re.test(`${a.title} ${a.subtitle} ${a.description}`))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [catalog?.articles, cluster]);

  const seoConfig = useMemo(
    () => (clusterId && cluster ? buildGuidesClusterSeo(clusterId, articles.length) : null),
    [clusterId, cluster, articles.length],
  );

  const seoJsonLd = useMemo(() => {
    if (!clusterId || !cluster) return undefined;
    return [
      buildOrganizationSchema(origin),
      buildBreadcrumbListSchema(origin, [
        { name: "Home", path: "/" },
        { name: "Guides", path: "/guides" },
        { name: cluster.title, path: `/guides/topic/${clusterId}` },
      ]),
    ];
  }, [origin, clusterId, cluster]);

  usePageSeo(seoConfig, seoJsonLd);

  if (!clusterId || !cluster) {
    return (
      <div className={cn(app.page, "flex flex-col pb-safe-nav")}>
        <SiteHeader activePage="guides" favCount={favCount} />
        <main className={cn(app.mainDetail, "flex-1 py-12")} id="main-content">
          <p className="text-sm text-muted-foreground">Guide topic not found.</p>
          <Link href="/guides" className="mt-4 inline-block text-primary hover:underline">
            ← All guides
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className={cn(app.page, "flex flex-col pb-safe-nav")}>
      <SiteHeader activePage="guides" favCount={favCount} />

      <main className={cn(app.mainDetail, "flex-1 py-8 sm:py-12")} id="main-content">
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Guides", path: "/guides" },
            { name: cluster.title, path: `/guides/topic/${clusterId}` },
          ]}
          className="mb-6"
        />

        <header className="border-b border-border/20 pb-7">
          <p className={cn(app.eyebrowMuted, "inline-flex items-center gap-2")}>
            <Compass className="w-3.5 h-3.5 opacity-80" aria-hidden />
            Topic cluster
          </p>
          <h1 className={cn(app.titlePage, "mt-3")}>{cluster.title}</h1>
          <p className={cn(app.lead, "mt-3 max-w-2xl")}>{cluster.description}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold"
            >
              <Flame className="w-4 h-4" aria-hidden />
              Explore meals
            </Link>
            <Link
              href="/generator"
              className="inline-flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-4 py-2.5 text-sm font-semibold text-foreground"
            >
              Find a Meal
            </Link>
          </div>
        </header>

        {isLoading && (
          <div className="flex justify-center py-16" aria-busy="true">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (
          <section className="mt-10" aria-label="Guides in this topic">
            {articles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No guides matched this cluster yet. Check back soon.
              </p>
            ) : (
              <ul className="space-y-4">
                {articles.map((a) => (
                  <li key={a.slug}>
                    <article className="rounded-2xl border border-border/30 bg-card/30 p-5 sm:p-6 hover:border-primary/25 transition-colors">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {a.readMinutes} min read
                      </p>
                      <h2 className="mt-2 font-heading text-xl sm:text-2xl">
                        <Link href={`/guides/${a.slug}`} className="hover:text-primary transition-colors">
                          {a.title}
                        </Link>
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a.subtitle}</p>
                      <Link
                        href={`/guides/${a.slug}`}
                        className="inline-block mt-4 text-sm font-medium text-primary hover:underline"
                      >
                        Read guide →
                      </Link>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <p className="mt-12 text-sm text-muted-foreground">
          <Link href="/guides" className="text-primary hover:underline">
            ← All guides
          </Link>
        </p>
      </main>
    </div>
  );
}

