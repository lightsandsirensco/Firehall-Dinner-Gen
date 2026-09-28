/**
 * "Your Insights" preview for the Profile page.
 *
 * Pro (`meal_memory`) users: up to 3 highest-ranked real insights, linking to
 * the full /me/insights page. Renders nothing when entitled but there isn't
 * enough history yet -- no fake/empty metrics (same convention as
 * MealHistoryPreviewCard/ProgressPreviewCard).
 *
 * Free users: one subtle, non-blocking teaser card (never a modal, never
 * repeated) with an "Explore Pro" CTA -- insights are never computed for a
 * free session (the /api/insights response is `entitled: false` plus an
 * empty list; this component never tries to read/derive anything from it).
 */
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ChevronRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { useFeature, useRecordPaywallView } from "@/lib/billing/hooks";
import { fetchInsights } from "@/lib/insights-api";
import { trackInsightsProTeaserClicked, trackProFeatureClicked } from "@/lib/analytics";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export function InsightsPreviewCard() {
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

  if (!authenticated) return null;

  if (!hasMealMemory) {
    return (
      <button
        type="button"
        onClick={() => {
          trackInsightsProTeaserClicked({ surface: "profile_preview" });
          trackProFeatureClicked({ feature: "meal_memory", page: "/me/profile", logged_in: authenticated });
          void recordPaywall("meal_memory", "profile_insights_teaser");
          setLocation("/me/subscription?feature=meal_memory");
        }}
        className={cn(app.cardSurface, "block w-full p-5 text-left hover-elevate active-elevate-2 touch-manipulation")}
        data-testid="insights-teaser-card"
      >
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
          <h2 className={app.titleCard}>Turn your meal history into personalized trends.</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Pro learns what your crew likes, how your meal costs change, and how your nutrition choices evolve.
        </p>
        <span className="text-sm font-medium text-primary">Explore Pro</span>
      </button>
    );
  }

  const insights = insightsQuery.data?.insights ?? [];
  const preview = insights.slice(0, 3);

  if (preview.length === 0) return null;

  return (
    <Link
      href="/me/insights"
      className={cn(app.cardSurface, "block p-5 hover-elevate active-elevate-2 touch-manipulation")}
      data-testid="link-insights-entry"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className={app.titleCard}>Your Insights</h2>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      </div>
      <ul className="space-y-2.5 mt-3">
        {preview.map((insight) => (
          <li key={insight.id} className="space-y-0.5">
            <p className="text-sm text-foreground/90 leading-snug">{insight.title}</p>
            <p className="text-xs text-muted-foreground">{insight.supporting_text}</p>
          </li>
        ))}
      </ul>
      <span className="inline-block mt-3 text-sm font-medium text-primary">View all insights</span>
    </Link>
  );
}
