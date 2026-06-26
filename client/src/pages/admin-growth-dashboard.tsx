import { useCallback, useEffect, useState } from "react";

import { Link } from "wouter";

import {

  Shield,

  RefreshCw,

  Building2,

  Users,

  Vote,

  ChefHat,

  ShoppingCart,

  Sparkles,

  TrendingUp,

  Star,

} from "lucide-react";

import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { GrowthActivityChart } from "@/components/growth-dashboard/growth-activity-chart";

import { adminFetch } from "@/lib/admin-api";

import { trackGrowthDashboardViewed } from "@/lib/analytics";

import type { AnalyticsPeriod } from "@shared/analytics/events";

import type { GrowthChartRange, GrowthDashboardPayload } from "@shared/growth-dashboard/types";



const METRIC_PERIODS: { id: AnalyticsPeriod; label: string }[] = [

  { id: "7d", label: "7 Days" },

  { id: "30d", label: "30 Days" },

  { id: "all", label: "All Time" },

];



const CHART_RANGES: { id: GrowthChartRange; label: string }[] = [

  { id: "7d", label: "7 days" },

  { id: "30d", label: "30 days" },

  { id: "90d", label: "90 days" },

];



function MetricCard({

  label,

  value,

  icon: Icon,

}: {

  label: string;

  value: string | number;

  icon: typeof Building2;

}) {

  return (

    <Card>

      <CardContent className="p-4">

        <div className="flex items-start justify-between gap-2">

          <div>

            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>

            <p className="text-2xl font-heading tabular-nums mt-1">{value}</p>

          </div>

          <Icon className="w-5 h-5 text-primary/70 shrink-0" aria-hidden />

        </div>

      </CardContent>

    </Card>

  );

}



export default function AdminGrowthDashboardPage() {

  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");

  const [chartRange, setChartRange] = useState<GrowthChartRange>("30d");

  const [data, setData] = useState<GrowthDashboardPayload | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);



  const load = useCallback(

    async (p: AnalyticsPeriod = period, chart: GrowthChartRange = chartRange) => {

      setLoading(true);

      setError(null);

      try {

        const res = await adminFetch(

          `/api/admin/growth-dashboard?period=${p}&chart_range=${chart}`,

        );

        if (res.status === 401) throw new Error("Unauthorized — enter admin key when prompted");

        if (!res.ok) throw new Error(`Growth dashboard ${res.status}`);

        setData(await res.json());

      } catch (e: unknown) {

        setError(e instanceof Error ? e.message : "Failed to load growth dashboard");

      } finally {

        setLoading(false);

      }

    },

    [period, chartRange],

  );



  useEffect(() => {

    trackGrowthDashboardViewed();

  }, []);



  useEffect(() => {

    void load(period, chartRange);

  }, [period, chartRange, load]);



  const metrics = data?.metrics;

  const northStar = data?.north_star;



  return (

    <div className="min-h-screen bg-background p-6">

      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex flex-wrap items-center gap-3">

          <Shield className="w-6 h-6 text-primary" />

          <div>

            <h1 className="font-heading text-3xl tracking-wide">Hall Growth Dashboard</h1>

            <p className="text-sm text-muted-foreground mt-1">

              Primary KPI: halls active every shift for four consecutive weeks

            </p>

          </div>

          <Link href="/admin" className="text-sm text-primary hover:underline ml-auto">

            ← Admin

          </Link>

        </div>



        <div className="flex flex-wrap items-center gap-2">

          <span className="text-xs text-muted-foreground uppercase tracking-wide mr-1">Metrics</span>

          {METRIC_PERIODS.map((p) => (

            <Button

              key={p.id}

              variant={period === p.id ? "default" : "outline"}

              size="sm"

              onClick={() => setPeriod(p.id)}

              disabled={loading}

            >

              {p.label}

            </Button>

          ))}

          <Button

            variant="ghost"

            size="sm"

            onClick={() => void load(period, chartRange)}

            disabled={loading}

            className="ml-auto"

          >

            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />

            Refresh

          </Button>

        </div>



        {error && (

          <Card className="border-destructive/50">

            <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>

          </Card>

        )}



        {northStar && (

          <Card className="border-primary/40 bg-primary/5" data-testid="growth-north-star">

            <CardContent className="p-6 space-y-2">

              <div className="flex items-center gap-2">

                <Star className="w-5 h-5 text-primary" aria-hidden />

                <p className="text-xs uppercase tracking-wide text-primary font-medium">North Star</p>

              </div>

              <p className="font-heading text-xl">{northStar.label}</p>

              <p className="text-4xl font-heading tabular-nums">{northStar.count}</p>

              <p className="text-sm text-muted-foreground">{northStar.description}</p>

              {northStar.cohort_halls > 0 && (

                <p className="text-xs text-muted-foreground">

                  {northStar.count} of {northStar.cohort_halls} eligible halls (

                  {((northStar.count / northStar.cohort_halls) * 100).toFixed(1)}%)

                </p>

              )}

            </CardContent>

          </Card>

        )}



        {metrics && (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <MetricCard label="Active halls" value={metrics.active_halls} icon={Building2} />

            <MetricCard label="Active shifts" value={metrics.active_shifts} icon={Users} />

            <MetricCard label="Hall votes" value={metrics.hall_votes} icon={Vote} />

            <MetricCard label="Meals generated" value={metrics.meals_generated} icon={ChefHat} />

            <MetricCard label="Shopping lists" value={metrics.shopping_lists} icon={ShoppingCart} />

            <MetricCard label="Hall Pro trials" value={metrics.hall_pro_trials} icon={Sparkles} />

            <MetricCard

              label="Hall Pro conversions"

              value={metrics.hall_pro_conversions}

              icon={TrendingUp}

            />

          </div>

        )}



        {data?.chart && (

          <Card>

            <CardContent className="p-4 space-y-4">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <h2 className="font-heading text-sm uppercase tracking-wide">Activity chart</h2>

                <div className="flex flex-wrap gap-2">

                  {CHART_RANGES.map((range) => (

                    <Button

                      key={range.id}

                      variant={chartRange === range.id ? "default" : "outline"}

                      size="sm"

                      onClick={() => setChartRange(range.id)}

                      disabled={loading}

                    >

                      {range.label}

                    </Button>

                  ))}

                </div>

              </div>

              <GrowthActivityChart data={data.chart} />

            </CardContent>

          </Card>

        )}



        {data?.cohorts && (

          <Card>

            <CardContent className="p-4 space-y-4">

              <h2 className="font-heading text-sm uppercase tracking-wide">Retention</h2>

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead>

                    <tr className="text-left text-muted-foreground border-b">

                      <th className="pb-2 pr-4 font-medium">Week</th>

                      <th className="pb-2 pr-4 font-medium tabular-nums">Active halls</th>

                      <th className="pb-2 font-medium tabular-nums">Retention</th>

                    </tr>

                  </thead>

                  <tbody>

                    {data.cohorts.map((row) => (

                      <tr key={row.week} className="border-b border-border/50 last:border-0">

                        <td className="py-2 pr-4">{row.label}</td>

                        <td className="py-2 pr-4 tabular-nums">{row.active_halls}</td>

                        <td className="py-2">

                          <Badge variant="secondary" className="tabular-nums">

                            {row.retention_pct}%

                          </Badge>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

              <p className="text-xs text-muted-foreground">

                Week 1–4 hall activity after creation for halls in the selected metrics window.

              </p>

            </CardContent>

          </Card>

        )}



        {data?.generated_at && (

          <p className="text-xs text-muted-foreground text-center">

            Generated {new Date(data.generated_at).toLocaleString()}

          </p>

        )}

      </div>

    </div>

  );

}


