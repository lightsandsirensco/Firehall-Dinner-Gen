/**
 * Firehall Meals Personalized Insights -- dedicated page (Pro-only).
 *
 * Groups the server-ranked insight list by category and only renders
 * categories that actually contain a valid insight for this user -- no
 * placeholder/empty categories. Every insight shown here is a deterministic
 * aggregate of the signed-in user's own user_meal_history rows; nothing is
 * computed client-side, and free users never reach the data-fetching path.
 */
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Lock, Sparkles } from "lucide-react";
import { MeSubpageShell } from "@/components/app-shell/me-subpage-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { useFeature, useRecordPaywallView } from "@/lib/billing/hooks";
import { fetchInsights } from "@/lib/insights-api";
import { trackInsightViewed, trackInsightsPageViewed, trackProFeatureClicked } from "@/lib/analytics";
import { ME_INSIGHTS } from "@/lib/brand-copy";
import {
  INSIGHT_CATEGORIES,
  INSIGHT_CATEGORY_LABELS,
  type Insight,
  type InsightCategory,
} from "@shared/insights/types";

function InsightRow({ insight }: { insight: Insight }) {
  return (
    <li
      className="rounded-xl border border-border/30 bg-background/40 px-4 py-3 space-y-1"
      data-testid={`insight-${insight.id}`}
    >
      <p className="text-sm font-medium text-foreground leading-snug">{insight.title}</p>
      <p className="text-xs text-muted-foreground">{insight.supporting_text}</p>
    </li>
  );
}

export default function MeInsightsPage() {
  const { authenticated } = useAuth();
  const hasMealMemory = useFeature("meal_memory");
  const [, setLocation] = useLocation();
  const recordPaywall = useRecordPaywallView();

  const insightsQuery = useQuery({
    queryKey: ["/api/insights"],
    queryFn: fetchInsights,
    enabled: authenticated && hasMealMemory,
    staleTime: 60_000,
  });

  const insights = insightsQuery.data?.insights ?? [];
  const insightIds = insights.map((i) => i.id).join(",");
  const hasData = !!insightsQuery.data;

  // insights_page_viewed -- once real data has loaded.
  useEffect(() => {
    if (hasData) trackInsightsPageViewed({ insight_count: insights.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData]);

  // insight_viewed -- once per insight, for the initial ranked list shown.
  useEffect(() => {
    for (const insight of insights) {
      trackInsightViewed({
        insight_type: insight.type,
        category: insight.category,
        sample_size: insight.sample_count,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insightIds]);

  const byCategory = new Map<InsightCategory, Insight[]>();
  for (const insight of insights) {
    if (!byCategory.has(insight.category)) byCategory.set(insight.category, []);
    byCategory.get(insight.category)!.push(insight);
  }
  const nonEmptyCategories = INSIGHT_CATEGORIES.filter((c) => (byCategory.get(c)?.length ?? 0) > 0);

  return (
    <MeSubpageShell title={ME_INSIGHTS.title} subtitle={ME_INSIGHTS.subtitle} testId="me-insights-page">
      <div className="space-y-6">
        {!authenticated ? null : !hasMealMemory ? (
          <section
            className="rounded-2xl border border-border/40 bg-card/25 p-4 space-y-2"
            data-testid="insights-locked-section"
          >
            <div className="flex items-center gap-1.5">
              <h2 className="font-heading text-sm tracking-wide">Personalized Insights</h2>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                <Lock className="h-2.5 w-2.5" aria-hidden />
                Pro
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pro learns what your crew likes, how your meal costs change, and how your nutrition choices evolve.
            </p>
            <button
              type="button"
              onClick={() => {
                trackProFeatureClicked({ feature: "meal_memory", page: "/me/insights", logged_in: authenticated });
                void recordPaywall("meal_memory", "me_insights");
                setLocation("/me/subscription?feature=meal_memory");
              }}
              className="w-full rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-left text-xs text-muted-foreground"
              data-testid="insights-locked"
            >
              Upgrade to Firehall Meals Pro to unlock Personalized Insights.
            </button>
          </section>
        ) : insightsQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : insights.length === 0 ? (
          <div className="text-center py-8 space-y-2" data-testid="insights-sparse-empty">
            <Sparkles className="h-6 w-6 mx-auto text-muted-foreground/50" aria-hidden />
            <p className="text-sm font-medium text-foreground">Not enough history yet.</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Log a few more meals -- rate them and mark whether you'd make them again -- and your personalized
              trends will start showing up here.
            </p>
            <Button asChild size="sm" className="min-h-10 touch-manipulation">
              <Link href="/generator">Find a meal</Link>
            </Button>
          </div>
        ) : (
          nonEmptyCategories.map((category) => (
            <section key={category} className="space-y-3" data-testid={`insights-category-${category}`}>
              <h2 className="font-heading text-sm tracking-wide">{INSIGHT_CATEGORY_LABELS[category]}</h2>
              <ul className="space-y-2">
                {byCategory.get(category)!.map((insight) => (
                  <InsightRow key={insight.id} insight={insight} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </MeSubpageShell>
  );
}
