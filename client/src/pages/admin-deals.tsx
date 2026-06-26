import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminFetch } from "@/lib/admin-api";

interface HallRow {
  hall_id: string;
  hall_name: string;
  postal_code: string | null;
  store_count: number;
  deal_count: number;
  last_refresh: string | null;
}

interface FetchLogRow {
  log_id: number;
  postal_code: string | null;
  provider: string;
  status: string;
  error_message: string | null;
  deals_found: number | null;
  protein_matches: number | null;
  created_at: string;
}

interface AdminDealsPayload {
  mode: string;
  mode_label: string;
  halls: HallRow[];
  total_deals: number;
  protein_deals: number;
  fetch_logs?: FetchLogRow[];
}

export default function AdminDealsPage() {
  const [data, setData] = useState<AdminDealsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionHall, setActionHall] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/deals");
      if (!res.ok) throw new Error("Failed to load grocery deals admin");
      setData(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const runAction = async (path: string, hallId?: string) => {
    setActionHall(hallId ?? "global");
    try {
      const res = await adminFetch(path, { method: "POST" });
      if (!res.ok) throw new Error("Action failed");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionHall(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Admin
            </Button>
          </Link>
          <Tag className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-2xl tracking-wide">Protein Deals</h1>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => void load()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Provider mode</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">{data.mode_label}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{data.mode}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Hall deals</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{data.total_deals}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Protein deals</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{data.protein_deals}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionHall === "global"}
                    onClick={() => void runAction("/api/admin/deals/clear-stale")}
                  >
                    Clear stale
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Halls with grocery setup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="pb-2 pr-4">Hall</th>
                        <th className="pb-2 pr-4">Postal</th>
                        <th className="pb-2 pr-4">Stores</th>
                        <th className="pb-2 pr-4">Deals</th>
                        <th className="pb-2 pr-4">Last refresh</th>
                        <th className="pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.halls.map((hall) => (
                        <tr key={hall.hall_id} className="border-b border-border/30">
                          <td className="py-2 pr-4">{hall.hall_name}</td>
                          <td className="py-2 pr-4">{hall.postal_code ?? "—"}</td>
                          <td className="py-2 pr-4">{hall.store_count}</td>
                          <td className="py-2 pr-4">{hall.deal_count}</td>
                          <td className="py-2 pr-4 whitespace-nowrap">{hall.last_refresh ?? "—"}</td>
                          <td className="py-2 flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionHall === hall.hall_id}
                              onClick={() =>
                                void runAction(`/api/admin/deals/seed/${hall.hall_id}`, hall.hall_id)
                              }
                            >
                              Seed
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionHall === hall.hall_id}
                              onClick={() =>
                                void runAction(`/api/admin/deals/refresh/${hall.hall_id}`, hall.hall_id)
                              }
                            >
                              Force refresh
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {data.fetch_logs && data.fetch_logs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent fetch logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="pb-2 pr-4">Time</th>
                        <th className="pb-2 pr-4">Provider</th>
                        <th className="pb-2 pr-4">Postal</th>
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2 pr-4">Deals</th>
                        <th className="pb-2">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.fetch_logs.map((log) => (
                        <tr key={log.log_id} className="border-b border-border/30">
                          <td className="py-2 pr-4 whitespace-nowrap">{log.created_at}</td>
                          <td className="py-2 pr-4">{log.provider}</td>
                          <td className="py-2 pr-4">{log.postal_code ?? "—"}</td>
                          <td className="py-2 pr-4">{log.status}</td>
                          <td className="py-2 pr-4">{log.deals_found ?? "—"}</td>
                          <td className="py-2 text-muted-foreground max-w-xs truncate">
                            {log.error_message ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
