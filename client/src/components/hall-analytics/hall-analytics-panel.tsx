import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  CircleDot,
  Flame,
  Loader2,
  ShoppingCart,
  Trophy,
  Users,
  Vote,
} from "lucide-react";
import { PaywallGate } from "@/components/billing/paywall-gate";
import { fetchHallAnalytics, syncHallAnalytics } from "@/lib/hall-analytics/api";
import { buildHallAnalyticsSyncPayload } from "@/lib/hall-analytics/sync";
import { trackHallAnalyticsViewed } from "@/lib/analytics";
import type { HallAnalyticsPayload } from "@shared/hall-analytics/types";
import { cn } from "@/lib/utils";

interface HallAnalyticsPanelProps {
  hallId: string;
  className?: string;
}

function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Flame;
}) {
  return (
    <div className="rounded-xl border border-border/45 bg-card/40 px-3 py-3">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function HighlightCard({
  title,
  primary,
  secondary,
}: {
  title: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      <p className="font-heading text-lg tracking-wide">{primary}</p>
      {secondary ? <p className="text-sm text-muted-foreground mt-1">{secondary}</p> : null}
    </div>
  );
}

function HallAnalyticsContent({ hallId, className }: HallAnalyticsPanelProps) {
  const [data, setData] = useState<HallAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = buildHallAnalyticsSyncPayload();
      const analytics = await syncHallAnalytics(hallId, payload);
      setData(analytics);
      trackHallAnalyticsViewed(hallId);
    } catch {
      try {
        const analytics = await fetchHallAnalytics(hallId);
        setData(analytics);
        trackHallAnalyticsViewed(hallId);
      } catch {
        setData(null);
        setError("Could not load hall analytics");
      }
    } finally {
      setLoading(false);
    }
  }, [hallId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className={cn("flex justify-center py-12", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return <p className={cn("text-sm text-destructive", className)}>{error ?? "Unavailable"}</p>;
  }

  return (
    <section
      id="hall-analytics"
      className={cn("space-y-5", className)}
      data-testid="hall-analytics-panel"
      aria-labelledby="hall-analytics-heading"
    >
      <div>
        <h2
          id="hall-analytics-heading"
          className="font-heading text-lg tracking-wide flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4 text-primary" />
          Hall analytics
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Crew activity across meals, votes, wheel, and grocery runs.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <MetricTile label="Meals cooked" value={data.metrics.meals_cooked} icon={Flame} />
        <MetricTile label="Votes created" value={data.metrics.votes_created} icon={Vote} />
        <MetricTile label="Wheel spins" value={data.metrics.wheel_spins} icon={CircleDot} />
        <MetricTile label="Shopping lists" value={data.metrics.shopping_lists} icon={ShoppingCart} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricTile label="Meal streak" value={data.metrics.meal_streak} icon={Trophy} />
        <MetricTile
          label="Most active shift"
          value={data.metrics.most_active_shift ?? "—"}
          icon={Users}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <HighlightCard
          title="Top meal"
          primary={data.cards.top_meal?.label ?? "—"}
          secondary={data.cards.top_meal ? `${data.cards.top_meal.count} cooks` : "No meals logged yet"}
        />
        <HighlightCard
          title="Top cuisine"
          primary={data.cards.top_cuisine?.label ?? "—"}
          secondary={
            data.cards.top_cuisine ? `${data.cards.top_cuisine.count} meals` : "Add cuisine tags as you cook"
          }
        />
        <HighlightCard
          title="Most cooked meal"
          primary={data.cards.most_cooked_meal?.label ?? "—"}
          secondary={
            data.cards.most_cooked_meal
              ? `${data.cards.most_cooked_meal.count} times on the board`
              : undefined
          }
        />
        <HighlightCard
          title="Longest streak"
          primary={`${data.cards.longest_streak} day${data.cards.longest_streak === 1 ? "" : "s"}`}
          secondary="Consecutive days with a meal cooked"
        />
      </div>

      {data.top_meals.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Top meals
          </h3>
          <ul className="space-y-2">
            {data.top_meals.map((meal) => (
              <li
                key={`${meal.recipe_slug ?? meal.label}`}
                className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm"
              >
                <span className="font-medium truncate">{meal.label}</span>
                <span className="text-muted-foreground tabular-nums shrink-0 ml-3">{meal.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function HallAnalyticsPanel(props: HallAnalyticsPanelProps) {
  return (
    <PaywallGate feature="hall_analytics" hallId={props.hallId} surface="hall_analytics_panel">
      <HallAnalyticsContent {...props} />
    </PaywallGate>
  );
}
