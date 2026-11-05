import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Shield,
  RefreshCw,
  Users,
  Eye,
  ChefHat,
  CircleDot,
  Mail,
  Globe,
  UserPlus,
  Bookmark,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Activity,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/admin-api";
import type {
  AnalyticsDailyPoint,
  AnalyticsDashboardPayload,
  AnalyticsPeriod,
  AnalyticsSectionStatus,
  MetricValue,
} from "@shared/analytics/events";

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "all", label: "All Time" },
];

function formatTrafficLabel(key: string): string {
  const map: Record<string, string> = {
    google: "Google",
    direct: "Direct / unknown",
    instagram: "Instagram",
    facebook: "Facebook",
    reddit: "Reddit",
    twitter: "Twitter/X",
  };
  return map[key] ?? key.replace(/^\w/, (c) => c.toUpperCase());
}

function fmt(value: MetricValue | undefined, suffix = ""): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString()}${suffix}`;
}

function fmtMoney(cents: MetricValue, currency: string | null): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: (currency ?? "usd").toUpperCase() }).format(
    cents / 100,
  );
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
  format = (key: string, label: string) => label,
  unit,
}: {
  title: string;
  rows: Array<{ key: string; label: string; count: number }>;
  empty?: string;
  format?: (key: string, label: string) => string;
  unit?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-heading text-sm uppercase tracking-wide text-foreground">{title}</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, i) => (
              <li key={`${row.key}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">
                  <span className="text-muted-foreground mr-2 tabular-nums">{i + 1}.</span>
                  {format(row.key, row.label)}
                </span>
                <Badge variant="secondary" className="tabular-nums shrink-0">
                  {row.count.toLocaleString()}
                  {unit ? ` ${unit}` : ""}
                </Badge>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  title,
  icon: Icon,
  status,
}: {
  title: string;
  icon: typeof Users;
  status: AnalyticsSectionStatus;
}) {
  return (
    <div className="space-y-1 pt-2">
      <h2 className="font-heading text-xl tracking-wide flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" aria-hidden />
        {title}
        {!status.available && (
          <Badge variant="outline" className="text-xs font-normal">
            Unavailable
          </Badge>
        )}
      </h2>
      <p className="text-xs text-muted-foreground">Source: {status.source}</p>
      {status.note && (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden />
          {status.note}
        </p>
      )}
    </div>
  );
}

function DailyTraffic({ points }: { points: AnalyticsDailyPoint[] }) {
  const shown = points.slice(-90);
  const max = Math.max(1, ...shown.map((p) => p.page_views));
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-heading text-sm uppercase tracking-wide">Daily page views (UTC)</h3>
        {shown.every((p) => p.page_views === 0) ? (
          <p className="text-sm text-muted-foreground">No page views in this period</p>
        ) : (
          <div className="flex items-end gap-px h-28" role="img" aria-label="Daily page views">
            {shown.map((p) => (
              <div
                key={p.date}
                className="flex-1 bg-primary/70 rounded-t-sm min-w-[2px]"
                style={{ height: `${Math.max(2, (p.page_views / max) * 100)}%` }}
                title={`${p.date}: ${p.page_views} page views, ${p.visitors} visitors`}
              />
            ))}
          </div>
        )}
        {shown.length > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{shown[0].date}</span>
            <span>{shown[shown.length - 1].date}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [data, setData] = useState<AnalyticsDashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: AnalyticsPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/analytics/dashboard?period=${p}`);
      if (res.status === 401 || res.status === 403) throw new Error("Unauthorized — enter admin key when prompted");
      if (!res.ok) throw new Error(`Dashboard ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [load, period]);

  const a = data?.audience;
  const g = data?.growth;
  const e = data?.engagement;
  const r = data?.revenue;

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
              onClick={() => setPeriod(p.id)}
              data-testid={`analytics-period-${p.id}`}
            >
              {p.label}
            </Button>
          ))}
          <Button onClick={() => void load(period)} disabled={loading} className="ml-auto" data-testid="button-load-analytics">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {data && a && g && e && r && (
          <>
            <p className="text-xs text-muted-foreground">
              All dates are UTC.{" "}
              {data.tracking_since
                ? `Event tracking data available since ${new Date(data.tracking_since).toLocaleDateString()}.`
                : "No analytics events recorded yet."}
            </p>

            {/* Audience */}
            <section className="space-y-4" data-testid="section-audience">
              <SectionHeader title="Audience" icon={Users} status={a.status} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                  label="Unique visitors"
                  value={fmt(a.unique_visitors)}
                  sub={`${fmt(a.new_visitors)} new · ${fmt(a.returning_visitors)} returning`}
                  icon={Users}
                />
                <SummaryCard label="Sessions" value={fmt(a.sessions)} sub="New session after 30 min idle" icon={Activity} />
                <SummaryCard
                  label="Page views"
                  value={fmt(a.page_views)}
                  sub={`${a.pages_per_session} pages / session`}
                  icon={Eye}
                />
                <SummaryCard
                  label="Pizza Night views"
                  value={fmt(e.pizza_night_views)}
                  sub="Page views under /pizza"
                  icon={Eye}
                />
              </div>
              <DailyTraffic points={a.daily} />
              <div className="grid gap-4 md:grid-cols-3">
                <RankedList
                  title="Traffic sources (sessions)"
                  rows={a.traffic_sources}
                  format={(key) => formatTrafficLabel(key)}
                  empty="No page views yet"
                />
                <RankedList title="Most visited pages" rows={a.top_pages} empty="No page views yet" />
                <RankedList
                  title="Devices (page views)"
                  rows={a.devices}
                  format={(key) => (key === "unknown" ? "Unknown (before device tracking)" : key.replace(/^\w/, (c) => c.toUpperCase()))}
                  empty="No page views yet"
                />
              </div>
            </section>

            {/* Email & user growth */}
            <section className="space-y-4" data-testid="section-growth">
              <SectionHeader title="Email & User Growth" icon={Mail} status={g.status} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                  label="Newsletter subscribers"
                  value={fmt(g.newsletter_subscribers_total)}
                  sub={`${fmt(g.newsletter_unsubscribes)} unsubscribed this period`}
                  icon={Mail}
                />
                <SummaryCard
                  label="New newsletter signups"
                  value={fmt(g.newsletter_signups_new)}
                  sub={`${fmt(g.newsletter_conversion_rate, "%")} of unique visitors`}
                  icon={TrendingUp}
                />
                <SummaryCard
                  label="Registered accounts"
                  value={fmt(g.registered_users_total)}
                  sub={`${fmt(g.registered_users_new)} new · ${fmt(g.account_conversion_rate, "%")} of visitors`}
                  icon={UserPlus}
                />
                <SummaryCard
                  label="Known email addresses"
                  value={fmt(g.known_emails_total)}
                  sub={`Accounts + newsletter, deduplicated · ${g.test_accounts_excluded} test accounts excluded`}
                  icon={Users}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <RankedList title="New signups by source" rows={g.newsletter_signups_by_source} empty="No newsletter signups in this period" />
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-heading text-sm uppercase tracking-wide">Klaviyo list members</h3>
                    <p className="text-2xl font-heading tabular-nums">{fmt(g.klaviyo_list_members)}</p>
                    {g.klaviyo_note && <p className="text-xs text-muted-foreground">{g.klaviyo_note}</p>}
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Product engagement */}
            <section className="space-y-4" data-testid="section-engagement">
              <SectionHeader title="Product Engagement" icon={ChefHat} status={e.status} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                  label="Meals generated"
                  value={fmt(e.meals_generated)}
                  sub={`${fmt(e.meal_generation_success_rate, "%")} of generation attempts succeeded`}
                  icon={ChefHat}
                />
                <SummaryCard
                  label="Recipes saved"
                  value={fmt(e.recipes_saved)}
                  sub={`${fmt(e.recipes_saved_to_accounts)} saved to signed-in accounts`}
                  icon={Bookmark}
                />
                <SummaryCard label="Grocery lists created" value={fmt(e.grocery_lists_created)} icon={ShoppingCart} />
                <SummaryCard label="Classics Wheel spins" value={fmt(e.wheel_spins)} icon={CircleDot} />
                <SummaryCard label="Recipe views" value={fmt(e.recipe_views)} icon={Eye} />
                <SummaryCard label="Crew votes cast" value={fmt(e.crew_votes)} icon={Users} />
                <SummaryCard label="Crews created" value={fmt(e.crews_created)} icon={UserPlus} />
                <SummaryCard label="Checkout starts" value={fmt(e.checkout_starts)} sub="Stripe Checkout sessions created" icon={CreditCard} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <RankedList title="Most-used features" rows={e.feature_usage} unit="visitors" />
                <RankedList title="Most viewed recipes" rows={e.top_viewed_recipes} />
                <RankedList title="Most generated meals" rows={e.top_generated_meals} />
                <RankedList title="Most saved recipes" rows={e.top_saved_recipes} />
                <RankedList title="Wheel landings" rows={e.top_wheel_landings} />
                <RankedList title="Top searches" rows={e.top_searches} />
              </div>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-heading text-sm uppercase tracking-wide flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Never viewed (catalog sample, all time)
                  </h3>
                  {e.never_viewed_recipes_sample.length === 0 ? (
                    <p className="text-sm text-muted-foreground">All catalog recipes have at least one view</p>
                  ) : (
                    <ul className="grid gap-2 sm:grid-cols-2 text-sm">
                      {e.never_viewed_recipes_sample.map((row) => (
                        <li key={row.key} className="text-muted-foreground truncate">
                          {row.label}
                          <span className="text-xs ml-2 opacity-60">({row.key})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Revenue */}
            <section className="space-y-4" data-testid="section-revenue">
              <SectionHeader title="Revenue & Subscriptions" icon={CreditCard} status={r.status} />
              {r.payments_enabled === false && (
                <p className="text-sm text-muted-foreground">Payments are currently switched off (payments_enabled = off).</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                  label="Active paid subscribers"
                  value={fmt(r.active_paid_subscribers)}
                  sub={`${fmt(r.trialing_subscribers)} trialing in Stripe`}
                  icon={CreditCard}
                />
                <SummaryCard label="New paid subscriptions" value={fmt(r.new_paid_subscriptions)} icon={TrendingUp} />
                <SummaryCard label="Cancellations" value={fmt(r.cancellations)} icon={Activity} />
                <SummaryCard
                  label="Monthly recurring revenue"
                  value={fmtMoney(r.mrr_cents, r.currency)}
                  sub={`${fmtMoney(r.revenue_cents, r.currency)} collected this period`}
                  icon={CreditCard}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Complimentary / admin-granted Pro plans (not paid, not counted above): {fmt(r.complimentary_plans)}
              </p>
            </section>

            <p className="text-xs text-muted-foreground">
              Generated {new Date(data.generated_at).toLocaleString()} · GA4 (G-LYT598M5KT) is a separate, independent traffic report
            </p>
          </>
        )}
      </div>
    </div>
  );
}
