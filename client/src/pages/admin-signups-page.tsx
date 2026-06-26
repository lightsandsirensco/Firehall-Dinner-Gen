import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ClipboardCopy,
  Download,
  Loader2,
  Mail,
  Search,
  Shield,
  UserPlus,
} from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { SignupDetailDrawer } from "@/components/admin/signup-detail-drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/admin-api";
import type { AdminSignupFilter, AdminSignupListResponse, AdminSignupRow } from "@shared/admin-users/types";

const FILTERS: { id: AdminSignupFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "registered_users", label: "Registered users" },
  { id: "email_leads_only", label: "Email leads only" },
  { id: "joined_hall", label: "Joined hall" },
  { id: "no_hall_yet", label: "No hall yet" },
  { id: "hall_admins", label: "Hall admins" },
  { id: "canteen_managers", label: "Canteen managers" },
  { id: "hall_pro_trial", label: "Hall Pro trial" },
  { id: "active_last_7_days", label: "Active last 7 days" },
  { id: "inactive", label: "Inactive" },
];

const SOURCE_FILTERS = [
  { id: "", label: "Any source" },
  { id: "homepage", label: "Homepage" },
  { id: "generator", label: "Generator" },
  { id: "red_lead", label: "Red Lead PDF" },
  { id: "shopping_list", label: "Shopping list" },
  { id: "magic_link", label: "Magic link" },
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatSource(source: string): string {
  return source.replace(/_/g, " ");
}

export default function AdminSignupsPage() {
  const [filter, setFilter] = useState<AdminSignupFilter>("all");
  const [sourceFilter, setSourceFilter] = useState("");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState<AdminSignupListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminSignupRow | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ filter });
      if (query) params.set("q", query);
      if (sourceFilter) params.set("source", sourceFilter);
      const res = await adminFetch(`/api/admin/signups?${params.toString()}`);
      if (res.status === 401) throw new Error("Unauthorized — enter ADMIN_SECRET when prompted");
      if (res.status === 503) throw new Error("Admin API disabled — set ADMIN_SECRET on the server");
      if (!res.ok) throw new Error("Failed to load signups");
      setData(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter, query, sourceFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = async () => {
    const params = new URLSearchParams({ filter });
    if (query) params.set("q", query);
    if (sourceFilter) params.set("source", sourceFilter);
    const res = await adminFetch(`/api/admin/signups/export?${params.toString()}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signups-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    <AdminPageShell title="Signup Dashboard">
      <div className="flex flex-wrap items-center gap-3">
        <UserPlus className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">Signup Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Founder-only view of accounts, leads, and hall members.
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
        <Link href="/admin/leads">
          <Button variant="outline" size="sm">
            <Mail className="mr-1.5 h-4 w-4" />
            Email leads
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => void exportCsv()}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(searchInput.trim());
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search email, name, or hall…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

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

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Signup source
        </span>
        {SOURCE_FILTERS.map((s) => (
          <Button
            key={s.id || "any"}
            variant={sourceFilter === s.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {copyMsg ? <p className="text-sm text-muted-foreground">{copyMsg}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {data ? (
        <p className="text-sm text-muted-foreground">
          Showing {data.signups.length} signups
          {data.query ? ` matching “${data.query}”` : ""}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full min-w-[72rem] text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="p-3 text-left font-medium">Email</th>
              <th className="p-3 text-left font-medium">Name</th>
              <th className="p-3 text-left font-medium">Signup date</th>
              <th className="p-3 text-left font-medium">Source</th>
              <th className="p-3 text-left font-medium">Account</th>
              <th className="p-3 text-left font-medium">Last active</th>
              <th className="p-3 text-left font-medium">Hall</th>
              <th className="p-3 text-left font-medium">Shift</th>
              <th className="p-3 text-left font-medium">Role</th>
              <th className="p-3 text-left font-medium">Plan</th>
              <th className="p-3 text-right font-medium">Meals</th>
              <th className="p-3 text-right font-medium">Votes</th>
              <th className="p-3 text-right font-medium">Saved</th>
              <th className="p-3 text-left font-medium">Klaviyo</th>
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.signups.map((row) => (
              <tr key={row.row_id} className="border-b border-border/20 hover:bg-muted/20">
                <td className="p-3">
                  <button
                    type="button"
                    className="text-left text-primary hover:underline"
                    onClick={() => setSelected(row)}
                  >
                    {row.email}
                  </button>
                </td>
                <td className="p-3">
                  {row.name}
                  {row.is_pilot_lead ? (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      Pilot
                    </Badge>
                  ) : null}
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(row.signup_date)}</td>
                <td className="p-3">
                  <Badge variant="outline">{formatSource(row.signup_source)}</Badge>
                </td>
                <td className="p-3">
                  {row.account_type === "registered" ? "Registered" : "Lead only"}
                </td>
                <td className="p-3 text-muted-foreground">{formatDate(row.last_active)}</td>
                <td className="p-3 text-muted-foreground">
                  {row.hall_linked ? row.hall_name ?? "Yes" : "—"}
                </td>
                <td className="p-3 text-muted-foreground">{row.shift ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{row.role ?? "—"}</td>
                <td className="p-3">
                  <Badge variant="outline">{row.plan}</Badge>
                  {row.hall_pro_trial ? (
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      Trial
                    </Badge>
                  ) : null}
                </td>
                <td className="p-3 text-right tabular-nums">{row.meals_generated}</td>
                <td className="p-3 text-right tabular-nums">{row.votes_created}</td>
                <td className="p-3 text-right tabular-nums">{row.recipes_saved}</td>
                <td className="p-3">{row.klaviyo_synced ? "Synced" : "—"}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label="Copy email"
                      onClick={() => void copyEmail(row.email)}
                    >
                      <ClipboardCopy className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelected(row)}>
                      Open
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {data?.signups.length === 0 ? (
              <tr>
                <td colSpan={15} className="p-8 text-center text-muted-foreground">
                  No signups match this filter
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <SignupDetailDrawer
        row={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => void load()}
      />
    </AdminPageShell>
  );
}
