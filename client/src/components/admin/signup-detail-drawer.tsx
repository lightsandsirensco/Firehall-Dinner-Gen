import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Building2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminFetch } from "@/lib/admin-api";
import type { AdminSignupRow } from "@shared/admin-users/types";
import type { AdminUserDetail } from "@shared/admin-users/types";

interface SignupDetailDrawerProps {
  row: AdminSignupRow | null;
  onClose: () => void;
  onUpdated: () => void;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SignupDetailDrawer({ row, onClose, onUpdated }: SignupDetailDrawerProps) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [pilot, setPilot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!row?.user_id) {
      setDetail(null);
      return;
    }
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(row.user_id)}`);
      if (!res.ok) throw new Error("Failed to load user");
      const body = (await res.json()) as AdminUserDetail;
      setDetail(body);
      setNotes(body.internal_notes);
      setPilot(body.is_pilot_lead);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [row?.user_id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!row) return;
    void adminFetch("/api/admin/signups/opened", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: row.email,
        user_id: row.user_id ?? undefined,
        row_id: row.row_id,
      }),
    });
  }, [row?.row_id]);

  const saveMeta = async () => {
    if (!row?.user_id) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(row.user_id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internal_notes: notes, is_pilot_lead: pilot }),
      });
      if (!res.ok) throw new Error("Save failed");
      setDetail(await res.json());
      setMessage("Saved");
      onUpdated();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const grantHallProTrial = async () => {
    if (!row?.user_id) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(row.user_id)}/hall-pro-trial`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Could not start Hall Pro trial");
      const body = await res.json();
      setDetail(body.detail);
      setMessage("Hall Pro trial started");
      onUpdated();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Trial failed");
    } finally {
      setBusy(false);
    }
  };

  const addToKlaviyo = async () => {
    if (!row?.user_id) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(row.user_id)}/klaviyo`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Klaviyo failed");
      setMessage("Added to Klaviyo");
      void loadDetail();
      onUpdated();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Klaviyo failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-heading tracking-wide">Signup detail</SheetTitle>
        </SheetHeader>

        {!row ? null : (
          <div className="mt-6 space-y-6">
            <div className="space-y-1">
              <p className="text-lg font-semibold">{row.name}</p>
              <p className="text-sm text-muted-foreground">{row.email}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline">{row.account_type === "registered" ? "Registered" : "Lead only"}</Badge>
                <Badge variant="outline">{row.signup_source}</Badge>
                {row.is_pilot_lead ? <Badge variant="secondary">Pilot lead</Badge> : null}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Signup date</dt>
                <dd>{formatDateTime(row.signup_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last active</dt>
                <dd>{formatDateTime(row.last_active)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Plan</dt>
                <dd>{row.plan}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Klaviyo</dt>
                <dd>{row.klaviyo_synced ? "Synced" : "Not synced"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Meals generated</dt>
                <dd>{row.meals_generated}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Votes created</dt>
                <dd>{row.votes_created}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Recipes saved</dt>
                <dd>{row.recipes_saved}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hall linked</dt>
                <dd>{row.hall_linked ? row.hall_name ?? "Yes" : "No"}</dd>
              </div>
            </dl>

            {row.user_id ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/admin/users/${row.user_id}`}>Full user page</Link>
                </Button>
                {row.hall_id ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/halls/${row.hall_id}`}>
                      <Building2 className="mr-1.5 h-4 w-4" />
                      Open hall
                    </Link>
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void grantHallProTrial()}>
                  Grant Hall Pro trial
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void addToKlaviyo()}>
                  Add to Klaviyo
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Email lead only — no account yet. View in{" "}
                <Link href="/admin/leads" className="text-primary hover:underline">
                  Email leads
                </Link>
                .
              </p>
            )}

            {row.user_id ? (
              loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading profile…
                </div>
              ) : detail ? (
                <div className="space-y-4 border-t border-border/40 pt-4">
                  {detail.memberships.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Hall memberships</p>
                      <ul className="space-y-2 text-sm">
                        {detail.memberships.map((m) => (
                          <li key={m.hall_id} className="rounded-lg border border-border/40 px-3 py-2">
                            <p className="font-medium">{m.hall_name}</p>
                            <p className="text-muted-foreground">
                              {m.role}
                              {m.shift_name ? ` · ${m.shift_name}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {detail.activity.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Activity timeline</p>
                      <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                        {detail.activity.slice(0, 12).map((item, index) => (
                          <li key={`${item.occurred_at}-${index}`} className="text-muted-foreground">
                            <span className="text-foreground">{item.label}</span>
                            <span className="mx-1">·</span>
                            {formatDateTime(item.occurred_at)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="pilot-lead">Mark as pilot lead</Label>
                      <Switch id="pilot-lead" checked={pilot} onCheckedChange={setPilot} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-notes">Admin notes</Label>
                      <Textarea
                        id="admin-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        placeholder="Founder notes — outreach, pilot interest, etc."
                      />
                    </div>
                    <Button size="sm" disabled={busy} onClick={() => void saveMeta()}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save notes"}
                    </Button>
                  </div>
                </div>
              ) : null
            ) : null}

            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              <X className="mr-1.5 h-4 w-4" />
              Close
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
