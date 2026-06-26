import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CreditCard, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch } from "@/lib/admin-api";
import type { PlanCatalogEntry, PlanFeatureFlagRow, PlanId } from "@shared/billing/types";
import { PLAN_IDS } from "@shared/billing/types";

interface AdminBillingDashboard {
  catalog: PlanCatalogEntry[];
  feature_flags: PlanFeatureFlagRow[];
  global_flags: Array<{ flag_key: string; enabled: boolean; description: string | null }>;
  subscription_counts: Record<PlanId, number>;
}

export default function AdminBillingPage() {
  const [data, setData] = useState<AdminBillingDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [userPlan, setUserPlan] = useState<PlanId>("personal");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/billing");
      if (!res.ok) throw new Error("Failed to load billing admin");
      setData(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const togglePlan = async (planId: PlanId, enabled: boolean) => {
    setBusy(true);
    try {
      const res = await adminFetch(`/api/admin/billing/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      const body = await res.json();
      setData(body.dashboard);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setBusy(false);
    }
  };

  const grantUserPlan = async () => {
    if (!userId.trim()) return;
    setBusy(true);
    try {
      const res = await adminFetch(`/api/admin/billing/users/${encodeURIComponent(userId.trim())}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: userPlan, status: "active" }),
      });
      if (!res.ok) throw new Error("Grant failed");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Grant failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <CreditCard className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-3xl tracking-wide">BILLING & PLANS</h1>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <Shield className="w-4 h-4 mr-1.5" />
              Admin home
            </Button>
          </Link>
          <Link href="/plans">
            <Button variant="outline" size="sm">
              View plans page
            </Button>
          </Link>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {data && (
          <>
            <section className="rounded-xl border border-border/40 p-4 space-y-3">
              <h2 className="font-medium">Plan toggles</h2>
              <p className="text-xs text-muted-foreground">Disable plans to hide them from selection. No payments yet.</p>
              {data.catalog.map((plan) => (
                <div key={plan.plan_id} className="flex items-center justify-between gap-4 py-2 border-b border-border/20 last:border-0">
                  <div>
                    <p className="font-medium">{plan.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {data.subscription_counts[plan.plan_id]} active subscriptions
                    </p>
                  </div>
                  <Switch
                    checked={plan.enabled}
                    disabled={busy || plan.plan_id === "guest"}
                    onCheckedChange={(v) => void togglePlan(plan.plan_id, v)}
                  />
                </div>
              ))}
            </section>

            <section className="rounded-xl border border-border/40 p-4 space-y-3">
              <h2 className="font-medium">Grant user plan</h2>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <Label htmlFor="admin-user-id">User ID</Label>
                  <Input id="admin-user-id" value={userId} onChange={(e) => setUserId(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="admin-plan">Plan</Label>
                  <select
                    id="admin-plan"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={userPlan}
                    onChange={(e) => setUserPlan(e.target.value as PlanId)}
                  >
                    {PLAN_IDS.filter((p) => p !== "guest").map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" disabled={busy || !userId.trim()} onClick={() => void grantUserPlan()}>
                  Grant
                </Button>
              </div>
            </section>

            <section className="rounded-xl border border-border/40 p-4">
              <h2 className="font-medium mb-2">Global flags</h2>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {data.global_flags.map((f) => (
                  <li key={f.flag_key}>
                    <span className="font-mono text-xs">{f.flag_key}</span>:{" "}
                    {f.enabled ? "on" : "off"}
                    {f.description ? ` — ${f.description}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
