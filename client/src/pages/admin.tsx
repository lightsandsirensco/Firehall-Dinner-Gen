import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { Shield, DollarSign, Database, Activity, RefreshCw, Users, Globe, ChefHat } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

interface UsageData {
  budget: {
    daily_limit_usd: number;
    spent_today_usd: number;
    remaining_usd: number;
    budget_exceeded: boolean;
  };
  cacheInfo: {
    total_recipes_cached: number;
    total_cache_hits: number;
  };
  today: {
    date: string;
    total_cost_usd: number;
    llm_calls: number;
    cache_hits: number;
  };
  last7Days: Array<{
    date: string;
    total_cost_usd: number;
    llm_calls: number;
    cache_hits: number;
  }>;
  recentLogs: Array<{
    id: number;
    timestamp: string;
    cache_key: string;
    template_id: number;
    cache_hit: number;
    tokens_in: number;
    tokens_out: number;
    estimated_cost_usd: number;
    latency_ms: number;
    ip_hash: string;
    session_id: string;
  }>;
  topIps: Array<{ ip_hash: string; request_count: number }>;
  topSessions: Array<{ session_id: string; request_count: number }>;
}

export default function AdminPage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/usage");
      if (res.status === 401) throw new Error("Unauthorized — set ADMIN_SECRET and enter the key when prompted");
      if (res.status === 503) throw new Error("Admin API disabled — set ADMIN_SECRET on the server");
      if (!res.ok) throw new Error("Failed to load usage data");
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading && !error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="font-heading text-3xl tracking-wide text-foreground">ADMIN USAGE</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={fetchUsage} data-testid="button-load-usage">
              <Activity className="w-4 h-4 mr-2" />
              Load Usage Data
            </Button>
            <Link href="/admin/ingestion">
              <Button variant="outline" data-testid="button-ingestion-admin">
                <ChefHat className="w-4 h-4 mr-2" />
                Recipe Ingestion
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-3xl tracking-wide text-foreground">ADMIN USAGE</h1>
          <Button onClick={fetchUsage} disabled={loading} className="ml-auto" data-testid="button-refresh-usage">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card>
            <CardContent className="p-4 text-destructive">{error}</CardContent>
          </Card>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <h3 className="font-heading text-sm uppercase tracking-wider text-muted-foreground">Budget</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-heading text-foreground" data-testid="text-spent-today">
                      ${data.budget.spent_today_usd.toFixed(4)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      of ${data.budget.daily_limit_usd.toFixed(2)} daily limit
                    </p>
                    {data.budget.budget_exceeded && (
                      <Badge variant="destructive" className="mt-1">Budget Exceeded</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-primary" />
                    <h3 className="font-heading text-sm uppercase tracking-wider text-muted-foreground">Cache</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-heading text-foreground" data-testid="text-cache-count">
                      {data.cacheInfo.total_recipes_cached}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      recipes cached, {data.cacheInfo.total_cache_hits} total hits
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <h3 className="font-heading text-sm uppercase tracking-wider text-muted-foreground">Today</h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-heading text-foreground" data-testid="text-llm-calls-today">
                      {data.today.llm_calls}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      LLM calls, {data.today.cache_hits} cache hits
                    </p>
                    {data.today.llm_calls + data.today.cache_hits > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Hit rate: {((data.today.cache_hits / (data.today.llm_calls + data.today.cache_hits)) * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {data.last7Days.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-3">Last 7 Days</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/40">
                          <th className="text-left py-2 text-muted-foreground font-medium">Date</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">LLM Calls</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">Cache Hits</th>
                          <th className="text-right py-2 text-muted-foreground font-medium">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.last7Days.map((day) => (
                          <tr key={day.date} className="border-b border-border/20">
                            <td className="py-2 text-foreground">{day.date}</td>
                            <td className="py-2 text-right text-foreground">{day.llm_calls}</td>
                            <td className="py-2 text-right text-foreground">{day.cache_hits}</td>
                            <td className="py-2 text-right text-primary">${day.total_cost_usd.toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.topIps.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-4 h-4 text-primary" />
                      <h3 className="font-heading text-sm uppercase tracking-wider text-muted-foreground">Top IPs (24h)</h3>
                    </div>
                    <div className="space-y-1">
                      {data.topIps.map((ip) => (
                        <div key={ip.ip_hash} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-muted-foreground font-mono text-xs truncate">{ip.ip_hash}</span>
                          <Badge variant="outline">{ip.request_count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {data.topSessions.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-primary" />
                      <h3 className="font-heading text-sm uppercase tracking-wider text-muted-foreground">Top Sessions (24h)</h3>
                    </div>
                    <div className="space-y-1">
                      {data.topSessions.map((s) => (
                        <div key={s.session_id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-muted-foreground font-mono text-xs truncate">{s.session_id.substring(0, 12)}...</span>
                          <Badge variant="outline">{s.request_count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {data.recentLogs.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-3">Recent Requests</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/40">
                          <th className="text-left py-2 text-muted-foreground">Time</th>
                          <th className="text-left py-2 text-muted-foreground">Template</th>
                          <th className="text-center py-2 text-muted-foreground">Cache</th>
                          <th className="text-right py-2 text-muted-foreground">Tokens</th>
                          <th className="text-right py-2 text-muted-foreground">Cost</th>
                          <th className="text-right py-2 text-muted-foreground">Latency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentLogs.slice(0, 20).map((log) => (
                          <tr key={log.id} className="border-b border-border/20">
                            <td className="py-1.5 text-muted-foreground">{log.timestamp}</td>
                            <td className="py-1.5 text-foreground">#{log.template_id}</td>
                            <td className="py-1.5 text-center">
                              <Badge variant={log.cache_hit ? "default" : "outline"} className="text-[10px]">
                                {log.cache_hit ? "HIT" : "MISS"}
                              </Badge>
                            </td>
                            <td className="py-1.5 text-right text-muted-foreground">
                              {log.cache_hit ? "—" : `${log.tokens_in}/${log.tokens_out}`}
                            </td>
                            <td className="py-1.5 text-right text-primary">
                              {log.cache_hit ? "—" : `$${log.estimated_cost_usd.toFixed(5)}`}
                            </td>
                            <td className="py-1.5 text-right text-muted-foreground">{log.latency_ms}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
