import { useCallback, useState } from "react";
import { Link } from "wouter";
import {
  Shield,
  RefreshCw,
  Users,
  Eye,
  ChefHat,
  CircleDot,
  Mail,
  TrendingUp,
  Globe,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/admin-api";
import type { AnalyticsDashboardPayload, AnalyticsPeriod } from "@shared/analytics/events";

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "all", label: "All Time" },
];

function formatTrafficLabel(key: string): string {
  const map: Record<string, string> = {
    google: "Google",
    direct: "Direct",
    instagram: "Instagram",
    facebook: "Facebook",
    reddit: "Reddit",
    twitter: "Twitter/X",
  };
  return map[key] ?? key.replace(/^\w/, (c) => c.toUpperCase());
}

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-heading tabular-nums mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <Icon className="w-5 h-5 text-primary/70 shrink-0" aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
}

function RankedList({
  title,
  rows,
  empty = "No data yet",
}: {
  title: string;
  rows: Array<{ key: string; label: string; count: number }>;
  empty?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h2 className="font-heading text-sm uppercase tracking-wide text-foreground">{title}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, i) => (
              <li key={`${row.key}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">
                  <span className="text-muted-foreground mr-2 tabular-nums">{i + 1}.</span>
                  {row.label}
                </span>
                <Badge variant="secondary" className="tabular-nums shrink-0">
                  {row.count}
                </Badge>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [data, setData] = useState<AnalyticsDashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const load = useCallback(async (p: AnalyticsPeriod = period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/analytics/dashboard?period=${p}`);
      if (res.status === 401) throw new Error("Unauthorized — enter admin key when prompted");
      if (!res.ok) throw new Error(`Dashboard ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [period]);

  const seedTestEvents = async () => {
    setTestMsg(null);
    try {
      const res = await adminFetch("/api/admin/analytics/test-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitor_id: `test-${Date.now()}` }),
      });
      if (!res.ok) throw new Error(`Test events ${res.status}`);
      const body = await res.json();
      setTestMsg(`Inserted ${body.inserted} test events — refresh dashboard`);
      await load(period);
    } catch (e: unknown) {
      setTestMsg(e instanceof Error ? e.message : "Test events failed");
    }
  };

  const summary = data?.summary;
  const emailRate =
    summary && summary.unique_visitors > 0
      ? `${((summary.email_captures / summary.unique_visitors) * 100).toFixed(1)}%`
      : "—";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-3xl tracking-wide">Product Analytics</h1>
          <Link href="/admin" className="text-sm text-primary hover:underline ml-auto">
            ← Admin
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.id}
              variant={period === p.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPeriod(p.id);
                void load(p.id);
              }}
              data-testid={`analytics-period-${p.id}`}
            >
              {p.label}
            </Button>
          ))}
          <Button onClick={() => load(period)} disabled={loading} className="ml-auto" data-testid="button-load-analytics">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading…" : data ? "Refresh" : "Load dashboard"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void seedTestEvents()} data-testid="button-seed-analytics">
            <FlaskConical className="w-4 h-4 mr-2" />
            Seed test events
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {testMsg && <p className="text-sm text-muted-foreground">{testMsg}</p>}

        {summary && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard label="Visitors" value={summary.visitors} sub={`${summary.sessions} sessions`} icon={Users} />
              <SummaryCard label="Unique visitors" value={summary.unique_visitors} sub={`${summary.returning_visitors} returning`} icon={Users} />
              <SummaryCard label="Recipe views" value={summary.recipe_views} sub={`${summary.page_views} page views`} icon={Eye} />
              <SummaryCard label="Meal generations" value={summary.meal_generations} icon={ChefHat} />
              <SummaryCard label="Wheel spins" value={summary.wheel_spins} icon={CircleDot} />
              <SummaryCard label="Email captures" value={summary.email_captures} sub={`${emailRate} visitor → email`} icon={Mail} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pages / session</p>
                  <p className="text-xl font-heading tabular-nums mt-1">{summary.avg_pages_per_session}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Generator success</p>
                  <p className="text-xl font-heading tabular-nums mt-1">{data.generation_success_rate}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Period</p>
                  <p className="text-xl font-heading mt-1 capitalize">{summary.period.replace("d", " days")}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <RankedList title="Most viewed recipes" rows={data.top_viewed_recipes} />
              <RankedList title="Most generated meals" rows={data.top_generated_meals} />
              <RankedList title="Most saved recipes" rows={data.top_saved_recipes} />
              <RankedList title="Most shared recipes" rows={data.top_shared_recipes} />
              <RankedList title="Wheel landings" rows={data.top_wheel_landings} />
              <RankedList title="Explore clicks" rows={data.top_explore_clicks} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <RankedList title="Top searches" rows={data.top_searches} />
              <RankedList title="Top filters" rows={data.top_explore_filters} />
              <RankedList title="Top categories" rows={data.top_explore_categories} />
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h2 className="font-heading text-sm uppercase tracking-wide flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Traffic sources
                  </h2>
                  {data.top_traffic_sources.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No page views yet</p>
                  ) : (
                    <ol className="space-y-2">
                      {data.top_traffic_sources.map((row, i) => (
                        <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
                          <span>
                            <span className="text-muted-foreground mr-2 tabular-nums">{i + 1}.</span>
                            {formatTrafficLabel(row.key)}
                          </span>
                          <Badge variant="secondary" className="tabular-nums">
                            {row.count}
                          </Badge>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h2 className="font-heading text-sm uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Never viewed (catalog sample)
                </h2>
                {data.never_viewed_recipes_sample.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All catalog recipes have at least one view</p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2 text-sm">
                    {data.never_viewed_recipes_sample.map((row) => (
                      <li key={row.key} className="text-muted-foreground truncate">
                        {row.label}
                        <span className="text-xs ml-2 opacity-60">({row.key})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              Generated {new Date(summary.generated_at).toLocaleString()} · GA4 handles traffic; product events stored in SQLite
            </p>
          </>
        )}
      </div>
    </div>
  );
}
