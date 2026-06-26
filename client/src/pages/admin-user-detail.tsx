import { useCallback, useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  User,
  Loader2,
  Shield,
  Copy,
  Mail,
  Building2,
  ChefHat,
  CreditCard,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { adminFetch } from "@/lib/admin-api";
import type { AdminUserDetail } from "@shared/admin-users/types";
import type { PlanId } from "@shared/billing/types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminUserDetailPage() {
  const [, params] = useRoute("/admin/users/:userId");
  const userId = params?.userId ?? "";

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [pilot, setPilot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("User not found");
      const body = (await res.json()) as AdminUserDetail;
      setDetail(body);
      setNotes(body.internal_notes);
      setPilot(body.is_pilot_lead);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMeta = async () => {
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internal_notes: notes, is_pilot_lead: pilot }),
      });
      if (!res.ok) throw new Error("Save failed");
      setDetail(await res.json());
      setActionMsg("Saved");
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const grantPlan = async (planId: PlanId) => {
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      if (!res.ok) throw new Error("Grant failed");
      setDetail(await res.json());
      setActionMsg(`Granted ${planId}`);
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Grant failed");
    } finally {
      setBusy(false);
    }
  };

  const addToKlaviyo = async () => {
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(userId)}/klaviyo`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Klaviyo failed");
      setActionMsg("Added to Klaviyo");
      void load();
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Klaviyo failed");
    } finally {
      setBusy(false);
    }
  };

  const resendInvite = async () => {
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(userId)}/resend-invite`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Invite failed");
      const body = await res.json();
      setInviteUrl(body.invite_url ?? null);
      setActionMsg("Invite link created");
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  };

  const copyEmail = () => {
    if (!detail?.user.email) return;
    void navigator.clipboard.writeText(detail.user.email);
    setActionMsg("Email copied");
  };

  if (loading && !detail) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-background p-6">
        <p className="text-destructive">{error ?? "User not found"}</p>
        <Link href="/admin/users">
          <Button variant="outline" className="mt-4">
            Back to users
          </Button>
        </Link>
      </div>
    );
  }

  const { user } = detail;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <User className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-2xl tracking-wide">{user.name}</h1>
          <Badge variant="outline">{user.plan}</Badge>
          {user.hall_pro && <Badge variant="secondary">Hall Pro</Badge>}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/users">
            <Button variant="ghost" size="sm">
              <Shield className="w-4 h-4 mr-1.5" />
              All users
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={copyEmail} disabled={!user.email}>
            <Copy className="w-4 h-4 mr-1.5" />
            Copy email
          </Button>
          <Button variant="outline" size="sm" onClick={() => void addToKlaviyo()} disabled={busy || !user.email}>
            <Mail className="w-4 h-4 mr-1.5" />
            Add to Klaviyo
          </Button>
          {detail.memberships.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => void resendInvite()} disabled={busy}>
              <Link2 className="w-4 h-4 mr-1.5" />
              Hall invite link
            </Button>
          )}
        </div>

        {actionMsg && <p className="text-sm text-muted-foreground">{actionMsg}</p>}
        {inviteUrl && (
          <p className="text-xs font-mono break-all bg-muted/40 p-2 rounded">{inviteUrl}</p>
        )}

        <section className="rounded-xl border border-border/40 p-4 space-y-2">
          <h2 className="font-medium">Account</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{user.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Signed up</dt>
              <dd>{formatDate(user.signup_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last active</dt>
              <dd>{formatDate(user.last_active)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Auth</dt>
              <dd>{user.auth_provider}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Lead source</dt>
              <dd>{user.email_capture_source ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Klaviyo</dt>
              <dd>{detail.klaviyo.on_list ? "On list" : "Not synced"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-border/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <h2 className="font-medium">Billing</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Personal: {detail.billing.personal_plan}
            {detail.billing.personal_status ? ` (${detail.billing.personal_status})` : ""}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void grantPlan("personal")}>
              Grant Personal
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void grantPlan("guest")}>
              Set Guest
            </Button>
          </div>
        </section>

        {detail.memberships.length > 0 && (
          <section className="rounded-xl border border-border/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <h2 className="font-medium">Hall memberships</h2>
            </div>
            <ul className="space-y-2 text-sm">
              {detail.memberships.map((m) => (
                <li key={m.hall_id} className="flex items-center justify-between gap-2">
                  <span>
                    <Link href={`/halls/${m.hall_id}`} className="text-primary hover:underline">
                      {m.hall_name}
                    </Link>
                    {" · "}
                    {m.role}
                    {m.shift_name ? ` · ${m.shift_name}` : ""}
                  </span>
                  {m.hall_pro_active && <Badge variant="secondary">Hall Pro</Badge>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-border/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4" />
            <h2 className="font-medium">Activity</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {user.meals_generated} meals · {user.votes_created} votes · {user.saved_recipes} saved recipes
          </p>
          {detail.activity.length > 0 ? (
            <ul className="space-y-1 text-sm max-h-48 overflow-y-auto">
              {detail.activity.slice(0, 20).map((a, i) => (
                <li key={`${a.occurred_at}-${i}`} className="flex justify-between gap-2">
                  <span>{a.label}{a.detail ? `: ${a.detail}` : ""}</span>
                  <span className="text-muted-foreground text-xs shrink-0">{formatDate(a.occurred_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet</p>
          )}
        </section>

        {detail.saved_recipes.length > 0 && (
          <section className="rounded-xl border border-border/40 p-4 space-y-2">
            <h2 className="font-medium">Saved recipes</h2>
            <ul className="text-sm space-y-1">
              {detail.saved_recipes.slice(0, 10).map((r) => (
                <li key={r.recipe_slug}>
                  <Link href={`/recipes/${r.recipe_slug}`} className="text-primary hover:underline">
                    {r.recipe_title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-border/40 p-4 space-y-3">
          <h2 className="font-medium">Internal notes</h2>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          <div className="flex items-center gap-3">
            <Switch id="pilot" checked={pilot} onCheckedChange={setPilot} />
            <Label htmlFor="pilot">Pilot lead</Label>
          </div>
          <Button onClick={() => void saveMeta()} disabled={busy}>
            Save notes
          </Button>
        </section>
      </div>
    </div>
  );
}
