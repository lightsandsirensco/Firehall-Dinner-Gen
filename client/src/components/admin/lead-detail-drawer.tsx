import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Building2,
  ClipboardCopy,
  Loader2,
  Trash2,
  UserCheck,
  UserCog,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminFetch } from "@/lib/admin-api";
import type { FounderLeadDetail, FounderLeadRow } from "@shared/admin-users/types";

interface LeadDetailDrawerProps {
  lead: FounderLeadRow | null;
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

export function LeadDetailDrawer({ lead, onClose, onUpdated }: LeadDetailDrawerProps) {
  const [detail, setDetail] = useState<FounderLeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!lead?.email) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await adminFetch(
        `/api/admin/leads/detail?email=${encodeURIComponent(lead.email)}`,
      );
      if (!res.ok) throw new Error("Failed to load lead");
      setDetail((await res.json()) as FounderLeadDetail);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [lead?.email]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const copyEmail = async () => {
    if (!lead) return;
    try {
      await navigator.clipboard.writeText(lead.email);
      setMessage("Email copied");
    } catch {
      setMessage("Copy failed");
    }
  };

  const impersonate = async () => {
    if (!lead?.user_id) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(lead.user_id)}/impersonate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Impersonate failed");
      const body = (await res.json()) as { redirect?: string };
      window.location.href = body.redirect || "/me/profile";
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Impersonate failed");
      setBusy(false);
    }
  };

  const markTest = async (isTest: boolean) => {
    if (!lead?.user_id) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(lead.user_id)}/mark-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_test_account: isTest }),
      });
      if (!res.ok) throw new Error("Failed to update test flag");
      setMessage(isTest ? "Marked as test account" : "Unmarked test account");
      onUpdated();
      void loadDetail();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteTest = async () => {
    if (!lead?.user_id) return;
    if (!window.confirm(`Permanently delete test account ${lead.email}?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await adminFetch(
        `/api/admin/users/${encodeURIComponent(lead.user_id)}/test-account`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || "Delete failed");
      }
      setMessage("Test account deleted");
      onUpdated();
      onClose();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const row = detail?.lead ?? lead;

  return (
    <Sheet open={Boolean(lead)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="space-y-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="font-heading text-xl tracking-wide">
              {row?.email ?? "Lead"}
            </SheetTitle>
            <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {row ? (
            <p className="text-sm text-muted-foreground">
              {row.name} · {row.status} · {row.plan}
            </p>
          ) : null}
        </SheetHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading timeline…
          </div>
        ) : null}

        {row ? (
          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Signup</p>
                <p>{formatDateTime(row.signup_date)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Last seen</p>
                <p>{formatDateTime(row.last_seen)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Source</p>
                <p>{row.sources.join(", ") || row.source}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Account</p>
                <p>{row.account_created ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Hall</p>
                <p>{row.hall_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Verified</p>
                <p>{row.email_verified ? "Yes" : "No"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void copyEmail()}>
                <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
                Copy email
              </Button>
              {row.user_id ? (
                <Link href={`/admin/users/${row.user_id}`}>
                  <Button type="button" size="sm" variant="outline">
                    <UserCog className="mr-1.5 h-3.5 w-3.5" />
                    Open profile
                  </Button>
                </Link>
              ) : null}
              {row.hall_id ? (
                <Link href={`/halls/${row.hall_id}`}>
                  <Button type="button" size="sm" variant="outline">
                    <Building2 className="mr-1.5 h-3.5 w-3.5" />
                    View hall
                  </Button>
                </Link>
              ) : null}
              {row.user_id ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void impersonate()}
                >
                  <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                  Impersonate
                </Button>
              ) : null}
              {row.user_id && !row.is_test_account ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void markTest(true)}
                >
                  Mark test
                </Button>
              ) : null}
              {row.user_id && row.is_test_account ? (
                <>
                  <Badge variant="secondary">Test account</Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void markTest(false)}
                  >
                    Unmark test
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void deleteTest()}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete test
                  </Button>
                </>
              ) : null}
            </div>

            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

            <div>
              <h3 className="mb-3 font-heading text-lg tracking-wide">Timeline</h3>
              <ul className="space-y-3 border-l border-border/50 pl-4">
                {(detail?.timeline ?? []).map((item, idx) => (
                  <li key={`${item.occurred_at}-${item.event_type}-${idx}`} className="relative text-sm">
                    <span className="absolute -left-[1.15rem] top-1.5 h-2 w-2 rounded-full bg-primary/70" />
                    <p className="font-medium">{item.label}</p>
                    {item.detail ? (
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(item.occurred_at)}</p>
                  </li>
                ))}
                {!loading && (detail?.timeline.length ?? 0) === 0 ? (
                  <li className="text-sm text-muted-foreground">No timeline events yet</li>
                ) : null}
              </ul>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
