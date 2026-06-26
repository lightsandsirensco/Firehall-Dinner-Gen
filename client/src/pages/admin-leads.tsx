import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { ClipboardCopy, Mail, Loader2, Shield, Download, Users, UserPlus } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/admin-api";
import type { AdminLeadFilter, AdminLeadListResponse } from "@shared/admin-users/types";

const FILTERS: { id: AdminLeadFilter; label: string }[] = [
  { id: "all", label: "All leads" },
  { id: "homepage", label: "Homepage" },
  { id: "generator", label: "Generator" },
  { id: "red_lead", label: "Red Lead PDF" },
  { id: "shopping_list", label: "Shopping list" },
  { id: "hall_program", label: "Founding hall" },
  { id: "pricing", label: "Pricing / plans" },
  { id: "pilot", label: "Pilot" },
  { id: "klaviyo_only", label: "Klaviyo synced" },
  { id: "converted", label: "Converted to account" },
  { id: "not_converted", label: "Not converted" },
  { id: "hall_created", label: "Joined hall" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function AdminLeadsPage() {
  const [filter, setFilter] = useState<AdminLeadFilter>("all");
  const [data, setData] = useState<AdminLeadListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/leads?filter=${encodeURIComponent(filter)}`);
      if (!res.ok) throw new Error("Failed to load leads");
      setData(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = async () => {
    const res = await adminFetch(`/api/admin/leads/export?filter=${encodeURIComponent(filter)}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const backfill = async () => {
    setBackfillMsg(null);
    const res = await adminFetch("/api/admin/leads/backfill", { method: "POST" });
    if (!res.ok) {
      setBackfillMsg("Backfill failed");
      return;
    }
    const body = await res.json();
    setBackfillMsg(`Imported ${body.inserted ?? 0} leads from analytics`);
    void load();
  };

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopyMsg(`Copied ${email}`);
      setTimeout(() => setCopyMsg(null), 2000);
    } catch {
      setCopyMsg("Copy failed");
    }
  };

  return (
    <AdminPageShell title="Email Leads">
      <div className="flex flex-wrap items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">Email Leads</h1>
          <p className="text-sm text-muted-foreground">
            Homepage forms, generator captures, PDF downloads, and Klaviyo-only leads.
          </p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <Shield className="mr-1.5 h-4 w-4" />
            Admin home
          </Button>
        </Link>
        <Link href="/admin/signups">
          <Button variant="outline" size="sm">
            <UserPlus className="mr-1.5 h-4 w-4" />
            Signup dashboard
          </Button>
        </Link>
        <Link href="/admin/users">
          <Button variant="outline" size="sm">
            <Users className="mr-1.5 h-4 w-4" />
            Users
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => void exportCsv()}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => void backfill()}>
          Backfill from analytics
        </Button>
      </div>

      {backfillMsg ? <p className="text-sm text-muted-foreground">{backfillMsg}</p> : null}
      {copyMsg ? <p className="text-sm text-muted-foreground">{copyMsg}</p> : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            variant={filter === f.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {data && (
        <p className="text-sm text-muted-foreground">
          Showing {data.leads.length} of {data.total} leads
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="p-3 text-left font-medium">Email</th>
              <th className="p-3 text-left font-medium">Source</th>
              <th className="p-3 text-left font-medium">Captured</th>
              <th className="p-3 text-left font-medium">Converted</th>
              <th className="p-3 text-left font-medium">Joined hall</th>
              <th className="p-3 text-left font-medium">Klaviyo</th>
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.leads.map((l) => (
              <tr key={l.lead_id} className="border-b border-border/20 hover:bg-muted/20">
                <td className="p-3">{l.email}</td>
                <td className="p-3">
                  <Badge variant="outline">{l.source}</Badge>
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(l.captured_at)}</td>
                <td className="p-3">
                  {l.converted_to_user ? (
                    l.converted_user_id ? (
                      <Link href={`/admin/users/${l.converted_user_id}`} className="text-primary hover:underline">
                        Yes
                      </Link>
                    ) : (
                      "Yes"
                    )
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </td>
                <td className="p-3">{l.hall_created ? "Yes" : "—"}</td>
                <td className="p-3">{l.klaviyo_synced ? "Synced" : "—"}</td>
                <td className="p-3">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Copy email"
                    onClick={() => void copyEmail(l.email)}
                  >
                    <ClipboardCopy className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {data?.leads.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No leads match this filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
