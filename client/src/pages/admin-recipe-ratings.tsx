import { useState } from "react";
import { Link } from "wouter";
import { Shield, ThumbsDown, ThumbsUp, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminFetch } from "@/lib/admin-api";
import type { CrewRatingAnalytics } from "@/lib/recipe-crew-ratings-admin-types";

export default function AdminRecipeRatingsPage() {
  const [data, setData] = useState<CrewRatingAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/recipe-ratings/analytics");
      if (!res.ok) throw new Error(`Analytics ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-3xl tracking-wide">Crew Rating Analytics</h1>
          <Link href="/admin" className="text-sm text-primary hover:underline ml-auto">
            ← Admin
          </Link>
        </div>

        <Button onClick={load} disabled={loading} data-testid="button-load-rating-analytics">
          {loading ? "Loading…" : "Load analytics"}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {data && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total votes</p>
                  <p className="text-2xl font-heading tabular-nums">{data.totalVotes}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Rated recipes</p>
                  <p className="text-2xl font-heading tabular-nums">{data.totalRatedRecipes}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Badge rate</p>
                  <p className="text-2xl font-heading tabular-nums">
                    {(data.badgeRate * 100).toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <AnalyticsList title="Most liked" icon={ThumbsUp} rows={data.mostLiked.map((r) => `${r.slug} — ${r.thumbsUp} up / ${r.totalVotes} votes`)} />
            <AnalyticsList title="Most disliked" icon={ThumbsDown} rows={data.mostDisliked.map((r) => `${r.slug} — ${r.thumbsDown} down / ${r.totalVotes} votes`)} />
            <AnalyticsList title="Highest approval" icon={ThumbsUp} rows={data.highestApproval.map((r) => `${r.slug} — ${Math.round(r.approvalScore * 100)}% (${r.totalVotes} votes)`)} />
            <AnalyticsList title="Lowest approval" icon={ThumbsDown} rows={data.lowestApproval.map((r) => `${r.slug} — ${Math.round(r.approvalScore * 100)}% (${r.totalVotes} votes)`)} />
            <AnalyticsList title="Most voted" icon={ThumbsUp} rows={data.mostVoted.map((r) => `${r.slug} — ${r.totalVotes} votes`)} />
            <AnalyticsList title="Fastest growing (7d)" icon={TrendingUp} rows={data.fastestGrowing.map((r) => `${r.slug} — ${r.votesLast7Days} this week / ${r.votesLast30Days} in 30d`)} />
            <AnalyticsList
              title="Complaint breakdown"
              icon={ThumbsDown}
              rows={data.complaintBreakdown.map((c) => `${c.category}: ${c.count}`)}
            />
            <AnalyticsList
              title="Badge distribution"
              icon={TrendingUp}
              rows={Object.entries(data.badgeDistribution).map(([k, v]) => `${k}: ${v}`)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsList({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: typeof ThumbsUp;
  rows: string[];
}) {
  if (!rows.length) return null;
  return (
    <section>
      <h2 className="flex items-center gap-2 font-heading text-lg mb-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </h2>
      <ul className="text-sm space-y-1 text-muted-foreground font-mono">
        {rows.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
    </section>
  );
}
