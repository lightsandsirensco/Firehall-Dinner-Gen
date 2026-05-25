import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Shield, RefreshCw, Check, X, Upload, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/admin-api";

interface StagingRow {
  fingerprint: string;
  status: string;
  qualityScore: number;
  trendScore: number;
  rejectionReason?: string;
  draft: {
    title: string;
    heroImage: string;
    protein: string;
    totalMinutes: number;
    source: string;
  };
}

interface IngestionStatus {
  summary: { stagingPending: number; stagingValidated: number; stagingPromoted: number };
  lastRun?: { id: string; status: string; stats: Record<string, number> };
}

export default function AdminIngestionPage() {
  const [status, setStatus] = useState<IngestionStatus | null>(null);
  const [rows, setRows] = useState<StagingRow[]>([]);
  const [filter, setFilter] = useState<"validated" | "rejected" | "pending">("validated");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, stagingRes] = await Promise.all([
        adminFetch("/api/admin/ingestion/status"),
        adminFetch(`/api/admin/ingestion/staging?status=${filter}&limit=30`),
      ]);
      if (statusRes.status === 401 || stagingRes.status === 401) {
        throw new Error("Unauthorized — set ADMIN_SECRET and enter the key when prompted");
      }
      if (statusRes.status === 503 || stagingRes.status === 503) {
        throw new Error("Admin API disabled — set ADMIN_SECRET on the server");
      }
      if (!statusRes.ok || !stagingRes.ok) throw new Error("Failed to load ingestion data");
      setStatus(await statusRes.json());
      const staging = await stagingRes.json();
      setRows(staging.rows || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const action = async (fingerprint: string, type: "approve" | "reject" | "promote") => {
    const res = await adminFetch(`/api/admin/ingestion/staging/${encodeURIComponent(fingerprint)}/${type}`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert((err as { message?: string }).message || "Action failed");
      return;
    }
    load();
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="w-4 h-4" />
              Admin
            </Button>
          </Link>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="font-heading text-2xl tracking-wide">Recipe ingestion</h1>
        </div>

        {status && (
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">Validated: {status.summary.stagingValidated}</Badge>
            <Badge variant="outline">Pending: {status.summary.stagingPending}</Badge>
            <Badge variant="outline">Promoted: {status.summary.stagingPromoted}</Badge>
            {status.lastRun && (
              <Badge variant="secondary">Last run: {status.lastRun.status}</Badge>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(["validated", "pending", "rejected"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.fingerprint}>
              <CardContent className="p-4 flex gap-4">
                {row.draft.heroImage && (
                  <img
                    src={row.draft.heroImage}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover shrink-0 bg-muted"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{row.draft.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Q{row.qualityScore} · trend {Math.round(row.trendScore)} · {row.draft.protein} ·{" "}
                    {row.draft.totalMinutes}m · {row.status}
                  </p>
                  {row.rejectionReason && (
                    <p className="text-xs text-destructive mt-1">{row.rejectionReason}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {row.status === "validated" && (
                    <>
                      <Button size="sm" className="gap-1" onClick={() => action(row.fingerprint, "promote")}>
                        <Upload className="w-3 h-3" />
                        Promote
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => action(row.fingerprint, "reject")}
                      >
                        <X className="w-3 h-3" />
                        Reject
                      </Button>
                    </>
                  )}
                  {row.status === "pending" && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => action(row.fingerprint, "approve")}>
                      <Check className="w-3 h-3" />
                      Approve
                    </Button>
                  )}
                  {row.status === "rejected" && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => action(row.fingerprint, "approve")}>
                      <Check className="w-3 h-3" />
                      Re-approve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-8">No staging rows for this filter.</p>
          )}
        </div>
      </div>
    </div>
  );
}
