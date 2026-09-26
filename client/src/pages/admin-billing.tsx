import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, Search, Shield, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { adminFetch, describeAdminError } from "@/lib/admin-api";
import type { PlanCatalogEntry, PlanFeatureFlagRow, PlanId } from "@shared/billing/types";
import { PLAN_IDS } from "@shared/billing/types";

interface StripeConfigStatus {
  secret_key_configured: boolean;
  webhook_secret_configured: boolean;
  price_monthly_configured: boolean;
  price_annual_configured: boolean;
  public_site_url_configured: boolean;
}

interface ProSubscriberBreakdown {
  stripe_active: number;
  stripe_past_due: number;
  admin_grants: number;
  cancelled: number;
}

interface AdminBillingDashboard {
  catalog: PlanCatalogEntry[];
  feature_flags: PlanFeatureFlagRow[];
  global_flags: Array<{ flag_key: string; enabled: boolean; description: string | null }>;
  subscription_counts: Record<PlanId, number>;
  hall_pro_hall_count: number;
  pro_subscriber_breakdown: ProSubscriberBreakdown;
  stripe_config: StripeConfigStatus;
}

interface UserLookupResult {
  user_id: string;
  email: string | null;
  created_at: string;
  last_login_at: string | null;
  effective_plan_id: PlanId;
  subscription: {
    plan_id: PlanId;
    status: string;
    source: string;
    cancel_at_period_end: boolean | null;
    current_period_end: string | null;
  } | null;
  manage_billing_available: boolean;
}

const STRIPE_CONFIG_LABELS: Array<{ key: keyof StripeConfigStatus; label: string }> = [
  { key: "secret_key_configured", label: "STRIPE_SECRET_KEY" },
  { key: "webhook_secret_configured", label: "STRIPE_WEBHOOK_SECRET" },
  { key: "price_monthly_configured", label: "STRIPE_PRICE_ID_MONTHLY" },
  { key: "price_annual_configured", label: "STRIPE_PRICE_ID_ANNUAL" },
  { key: "public_site_url_configured", label: "PUBLIC_SITE_URL" },
];

function ConfigRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-destructive shrink-0" />
      )}
      <span className="font-mono text-xs">{label}</span>
    </div>
  );
}

export default function AdminBillingPage() {
  const [data, setData] = useState<AdminBillingDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // --- User billing lookup + grant (one combined flow keyed on email) ---
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<UserLookupResult | null>(null);

  const [grantPlan, setGrantPlan] = useState<PlanId>("personal");
  const [grantStatus, setGrantStatus] = useState<"active" | "trialing" | "cancelled">("active");
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [grantOk, setGrantOk] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/billing");
      if (!res.ok) throw new Error(await describeAdminError(res, "Failed to load billing admin"));
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
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/billing/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(await describeAdminError(res, "Toggle failed"));
      const body = await res.json();
      setData(body.dashboard);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleGlobalFlag = async (flagKey: string, enabled: boolean) => {
    // payments_enabled is the real-money kill switch — warn before flipping
    // it on if Stripe isn't fully configured yet (it will simply fail closed
    // at checkout time either way, but the operator should know up front).
    if (flagKey === "payments_enabled" && enabled && data) {
      const allConfigured = STRIPE_CONFIG_LABELS.every(({ key }) => data.stripe_config[key]);
      if (!allConfigured) {
        const proceed = window.confirm(
          "Stripe configuration is INCOMPLETE (see Stripe configuration below). " +
            "Turning payments on now will not let anyone actually pay until every value is set — " +
            "checkout will fail closed. Continue anyway?",
        );
        if (!proceed) return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/billing/flags/${encodeURIComponent(flagKey)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(await describeAdminError(res, "Toggle failed"));
      const body = await res.json();
      setData(body.dashboard);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setBusy(false);
    }
  };

  const runLookup = async () => {
    const email = lookupEmail.trim();
    if (!email) return;
    setLookupLoading(true);
    setLookupError(null);
    setGrantError(null);
    setGrantOk(null);
    try {
      const res = await adminFetch(`/api/admin/billing/users/lookup?email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error(await describeAdminError(res, "Lookup failed"));
      const result: UserLookupResult = await res.json();
      setLookupResult(result);
      // Pre-fill the grant form with the user's current plan/status so
      // "Apply" defaults to a no-op instead of silently defaulting to
      // "personal" / "active" regardless of what they already have.
      setGrantPlan(result.effective_plan_id);
      if (result.subscription?.status === "trialing" || result.subscription?.status === "cancelled") {
        setGrantStatus(result.subscription.status);
      } else {
        setGrantStatus("active");
      }
    } catch (err: unknown) {
      setLookupResult(null);
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  };

  const applyGrant = async () => {
    if (!lookupResult) return;
    setGrantBusy(true);
    setGrantError(null);
    setGrantOk(null);
    try {
      const res = await adminFetch(`/api/admin/billing/users/${encodeURIComponent(lookupResult.user_id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: grantPlan, status: grantStatus }),
      });
      if (!res.ok) throw new Error(await describeAdminError(res, "Grant failed"));
      setGrantOk("Saved.");
      // Re-fetch server truth for this user rather than trusting the PATCH
      // body optimistically — the displayed state must always be what the
      // server actually has, not what we asked it to set.
      await runLookup();
      await load();
    } catch (err: unknown) {
      setGrantError(err instanceof Error ? err.message : "Grant failed");
    } finally {
      setGrantBusy(false);
    }
  };

  const monetizationFlag = data?.global_flags.find((f) => f.flag_key === "monetization_enabled");
  const paymentsFlag = data?.global_flags.find((f) => f.flag_key === "payments_enabled");
  const stripeFullyConfigured = data ? STRIPE_CONFIG_LABELS.every(({ key }) => data.stripe_config[key]) : false;

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

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!data && !loading && !error && (
          <p className="text-sm text-muted-foreground">Click Refresh to load — you may be prompted for the admin key.</p>
        )}

        {data && (
          <>
            {/* 1. SYSTEM STATUS — the truth about what's live right now */}
            <section className="rounded-xl border border-border/40 p-4 space-y-4">
              <h2 className="font-medium">System status</h2>

              <div className="flex items-center justify-between gap-4 py-2 border-b border-border/20">
                <div>
                  <p className="font-medium text-sm">Monetization</p>
                  <p className="text-xs text-muted-foreground">Master switch for the plan-selection UI on /plans.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={monetizationFlag?.enabled ? "default" : "secondary"}>
                    {monetizationFlag?.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Switch
                    checked={Boolean(monetizationFlag?.enabled)}
                    disabled={busy || !monetizationFlag}
                    onCheckedChange={(v) => void toggleGlobalFlag("monetization_enabled", v)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-2 border-b border-border/20">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    Stripe checkout (payments_enabled)
                    <Badge variant="destructive" className="text-[10px]">
                      LAUNCH CRITICAL
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Real money. Controls whether /api/billing/checkout will start a Stripe Checkout session.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={paymentsFlag?.enabled ? "default" : "secondary"}>
                    {paymentsFlag?.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Switch
                    checked={Boolean(paymentsFlag?.enabled)}
                    disabled={busy || !paymentsFlag}
                    onCheckedChange={(v) => void toggleGlobalFlag("payments_enabled", v)}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Stripe configuration</p>
                  <Badge variant={stripeFullyConfigured ? "default" : "destructive"}>
                    {stripeFullyConfigured ? "Configured" : "Incomplete"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Presence only — never the actual secret/key values.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                  {STRIPE_CONFIG_LABELS.map(({ key, label }) => (
                    <ConfigRow key={key} ok={data.stripe_config[key]} label={label} />
                  ))}
                </div>
              </div>
            </section>

            {/* 2. PRO SUBSCRIBERS — truthful breakdown, not one blended number */}
            <section className="rounded-xl border border-border/40 p-4 space-y-3">
              <h2 className="font-medium">Firehall Meals Pro subscribers</h2>
              <p className="text-xs text-muted-foreground">
                Real paying customers are counted separately from free admin-granted preview accounts.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="rounded-md border border-border/30 p-3">
                  <p className="text-2xl font-semibold">{data.pro_subscriber_breakdown.stripe_active}</p>
                  <p className="text-xs text-muted-foreground">Stripe active</p>
                </div>
                <div className="rounded-md border border-border/30 p-3">
                  <p className="text-2xl font-semibold">{data.pro_subscriber_breakdown.stripe_past_due}</p>
                  <p className="text-xs text-muted-foreground">Stripe past_due</p>
                </div>
                <div className="rounded-md border border-border/30 p-3">
                  <p className="text-2xl font-semibold">{data.pro_subscriber_breakdown.admin_grants}</p>
                  <p className="text-xs text-muted-foreground">Admin grants</p>
                </div>
                <div className="rounded-md border border-border/30 p-3">
                  <p className="text-2xl font-semibold">{data.pro_subscriber_breakdown.cancelled}</p>
                  <p className="text-xs text-muted-foreground">Cancelled</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Hall Pro (separate, hall-scoped): {data.hall_pro_hall_count} hall
                {data.hall_pro_hall_count === 1 ? "" : "s"} currently active/trialing.
              </p>
            </section>

            {/* 3. USER BILLING LOOKUP + grant/change (combined — search finds a real user first) */}
            <section className="rounded-xl border border-border/40 p-4 space-y-3">
              <h2 className="font-medium">User billing lookup</h2>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1 flex-1 min-w-[240px]">
                  <Label htmlFor="lookup-email">Email</Label>
                  <Input
                    id="lookup-email"
                    type="email"
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void runLookup();
                    }}
                    placeholder="firefighter@example.com"
                  />
                </div>
                <Button type="button" disabled={lookupLoading || !lookupEmail.trim()} onClick={() => void runLookup()}>
                  {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
                  Look up
                </Button>
              </div>

              {lookupError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {lookupError}
                </div>
              )}

              {lookupResult && (
                <div className="rounded-md border border-border/30 p-3 space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    <p>
                      <span className="text-muted-foreground">Email:</span> {lookupResult.email}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Effective plan:</span>{" "}
                      <span className="font-medium">{lookupResult.effective_plan_id}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Billing source:</span>{" "}
                      {lookupResult.subscription?.source ?? "none"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      {lookupResult.subscription?.status ?? "none"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Cancel at period end:</span>{" "}
                      {lookupResult.subscription?.cancel_at_period_end === null ||
                      lookupResult.subscription?.cancel_at_period_end === undefined
                        ? "n/a"
                        : lookupResult.subscription.cancel_at_period_end
                          ? "Yes"
                          : "No"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Manage billing (Stripe portal):</span>{" "}
                      {lookupResult.manage_billing_available ? "Available" : "Not available"}
                    </p>
                  </div>

                  {lookupResult.subscription?.source === "stripe" && lookupResult.subscription.status !== "cancelled" && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        This user has a LIVE Stripe subscription. Plan changes are blocked here — overwriting the local
                        record would hide "Manage billing" while Stripe keeps charging them. Cancel their subscription
                        in Stripe first, then retry once it shows as cancelled.
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 items-end pt-2 border-t border-border/20">
                    <div className="space-y-1">
                      <Label htmlFor="grant-plan">Set plan</Label>
                      <select
                        id="grant-plan"
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={grantPlan}
                        onChange={(e) => setGrantPlan(e.target.value as PlanId)}
                      >
                        {PLAN_IDS.filter((p) => p !== "guest" && p !== "hall_pro").map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="grant-status">Status</Label>
                      <select
                        id="grant-status"
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={grantStatus}
                        onChange={(e) => setGrantStatus(e.target.value as "active" | "trialing" | "cancelled")}
                      >
                        <option value="active">active</option>
                        <option value="trialing">trialing</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </div>
                    <Button
                      type="button"
                      disabled={
                        grantBusy ||
                        (lookupResult.subscription?.source === "stripe" && lookupResult.subscription.status !== "cancelled")
                      }
                      onClick={() => void applyGrant()}
                    >
                      {grantBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>

                  {grantError && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                      {grantError}
                    </div>
                  )}
                  {grantOk && <p className="text-xs text-emerald-600">{grantOk}</p>}
                </div>
              )}
            </section>

            {/* 4. PLAN TOGGLES — visibility only, no misleading counts here */}
            <section className="rounded-xl border border-border/40 p-4 space-y-3">
              <h2 className="font-medium">Plan toggles</h2>
              <p className="text-xs text-muted-foreground">
                Disable a plan to hide it from /plans selection. Real subscriber counts are above, not here.
              </p>
              {data.catalog.map((plan) => (
                <div key={plan.plan_id} className="flex items-center justify-between gap-4 py-2 border-b border-border/20 last:border-0">
                  <p className="font-medium">{plan.display_name}</p>
                  <Switch
                    checked={plan.enabled}
                    disabled={busy || plan.plan_id === "guest"}
                    onCheckedChange={(v) => void togglePlan(plan.plan_id, v)}
                  />
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
