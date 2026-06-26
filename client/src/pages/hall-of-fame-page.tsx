import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Award, CircleDot, ChefHat, Vote } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SeoBreadcrumbs } from "@/components/seo/breadcrumbs";
import { HallOfFameRankedList } from "@/components/hall-of-fame/hall-of-fame-ranked-list";
import { Button } from "@/components/ui/button";
import { getSavedCount } from "@/lib/saved-meals";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { getSiteOrigin } from "@/lib/seo/site-origin";
import { buildHallOfFameSeo } from "@shared/seo/metadata";
import { buildBreadcrumbListSchema, buildWebSiteSchema } from "@shared/seo/schema";
import { fetchHallOfFame, hallOfFameQueryKey } from "@/lib/hall-of-fame-api";
import { trackHallOfFameViewed } from "@/lib/analytics";
import { HALL_OF_FAME } from "@/lib/brand-copy";
import type { AnalyticsPeriod } from "@shared/analytics/events";
import { hallOfFameHeadline } from "@shared/hall-of-fame/types";
import { CTA } from "@/lib/brand-copy";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: "30d", label: "Month" },
  { id: "7d", label: "Week" },
  { id: "today", label: "Today" },
  { id: "all", label: "All time" },
];

export default function HallOfFamePage() {
  const favCount = useMemo(() => getSavedCount(), []);
  const origin = getSiteOrigin();
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const seoConfig = useMemo(() => buildHallOfFameSeo(), []);
  const seoJsonLd = useMemo(
    () => [
      buildWebSiteSchema(origin),
      buildBreadcrumbListSchema(origin, [
        { name: "Home", path: "/" },
        { name: "Hall of Fame", path: "/hall-of-fame" },
      ]),
    ],
    [origin],
  );
  usePageSeo(seoConfig, seoJsonLd);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: hallOfFameQueryKey(period),
    queryFn: () => fetchHallOfFame(period),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!data) return;
    trackHallOfFameViewed({
      period: data.period,
      cooked_count: data.most_cooked.length,
      voted_count: data.most_voted.length,
      wheel_count: data.most_wheel.length,
    });
  }, [data]);

  const headline = hallOfFameHeadline(period);

  return (
    <div className={cn(app.page, "flex flex-col min-h-screen min-h-[100dvh]")}>
      <SiteHeader activePage="explore" favCount={favCount} />

      <main className={cn(app.main, "flex-1 pb-10")}>
        <SeoBreadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Hall of Fame", path: "/hall-of-fame" },
          ]}
        />

        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Award className="w-5 h-5 shrink-0" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-widest">{HALL_OF_FAME.eyebrow}</p>
          </div>
          <h1 className={cn(app.titlePage, "text-balance")}>{HALL_OF_FAME.title}</h1>
          <p className={cn(app.lead, "max-w-xl text-pretty")}>{HALL_OF_FAME.subtitle}</p>
        </div>

        <div
          className="mt-6 -mx-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none"
          role="tablist"
          aria-label="Time period"
        >
          {PERIODS.map((p) => (
            <Button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={period === p.id}
              variant={period === p.id ? "default" : "outline"}
              size="sm"
              className="shrink-0 min-h-10 touch-manipulation"
              onClick={() => setPeriod(p.id)}
              data-testid={`hof-period-${p.id}`}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <p className="mt-4 text-sm font-medium text-foreground">{headline}</p>
        <p className="mt-1 text-xs text-muted-foreground">{HALL_OF_FAME.aggregateNote}</p>

        {isLoading ? (
          <div className="mt-8 space-y-4" aria-busy="true" aria-label="Loading rankings">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
            <p className="text-sm text-foreground">{HALL_OF_FAME.loadError}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <HallOfFameRankedList
              title={HALL_OF_FAME.mostCooked}
              rows={data?.most_cooked ?? []}
              countLabel={(n) => HALL_OF_FAME.cookedCount(n)}
              empty={HALL_OF_FAME.emptyCooked}
              testId="hof-most-cooked"
            />
            <HallOfFameRankedList
              title={HALL_OF_FAME.mostVoted}
              rows={data?.most_voted ?? []}
              countLabel={(n) => HALL_OF_FAME.voteCount(n)}
              empty={HALL_OF_FAME.emptyVoted}
              testId="hof-most-voted"
            />
            <HallOfFameRankedList
              title={HALL_OF_FAME.mostWheel}
              rows={data?.most_wheel ?? []}
              countLabel={(n) => HALL_OF_FAME.wheelCount(n)}
              empty={HALL_OF_FAME.emptyWheel}
              testId="hof-most-wheel"
            />
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-border/50 bg-muted/20 px-4 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">{HALL_OF_FAME.ctaLead}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button asChild className="min-h-11 touch-manipulation">
              <Link href="/wheel">
                <CircleDot className="w-4 h-4 mr-2 shrink-0" aria-hidden />
                {CTA.spinWheel}
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11 touch-manipulation">
              <Link href="/explore">
                <ChefHat className="w-4 h-4 mr-2 shrink-0" aria-hidden />
                {CTA.exploreMeals}
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11 touch-manipulation">
              <Link href="/hall">
                <Vote className="w-4 h-4 mr-2 shrink-0" aria-hidden />
                {HALL_OF_FAME.myHallCta}
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
