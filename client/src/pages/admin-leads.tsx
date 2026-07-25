import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowDown,
  ArrowUp,
  ClipboardCopy,
  Download,
  Loader2,
  Mail,
  Search,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { LeadDetailDrawer } from "@/components/admin/lead-detail-drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/admin-api";
import type {
  FounderLeadAnalytics,
  FounderLeadListResponse,
  FounderLeadRow,
  FounderLeadSortKey,
  FounderLeadStatus,
} from "@shared/admin-users/types";

const SOURCE_OPTIONS = [
  { id: "", label: "Any source" },
  { id: "homepage", label: "Homepage" },
  { id: "magic_link", label: "Magic link" },
  { id: "email_modal", label: "Email modal" },
  { id: "waitlist", label: "Waitlist" },
  { id: "hall_create", label: "Hall creation" },
  { id: "hall_invite", label: "Hall invite" },
  { id: "newsletter", label: "Newsletter" },
  { id: "beta", label: "Beta" },
  { id: "contact", label: "Contact" },
  { id: "generator", label: "Generator" },
  { id: "red_lead", label: "Red Lead" },
  { id: "shopping_list", label: "Shopping list" },
  { id: "pilot", label: "Pilot" },
  { id: "pricing", label: "Pricing" },
];

const PLAN_OPTIONS = [
  { id: "", label: "Any plan" },
  { id: "free", label: "Free" },
  { id: "firefighter_plus", label: "Firefighter Plus" },
  { id: "hall_pro", label: "Hall Pro" },
];

const STATUS_OPTIONS: Array<{ id: "" | FounderLeadStatus; label: string }> = [
  { id: "", label: "Any status" },
  { id: "New", label: "New" },
  { id: "Active", label: "Active" },
  { id: "Dormant", label: "Dormant" },
];

type SortState = { key: FounderLeadSortKey; dir: "asc" | "desc" };

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

function AnalyticsCards({ analytics }: { analytics: FounderLeadAnalytics }) {
  const cards: Array<{ label: string; value: string }> = [
    { label: "Total emails", value: String(analytics.total_emails) },
    { label: "Registered users", value: String(analytics.total_registered_users) },
    { label: "Conversion rate", value: `${analytics.conversion_rate}%` },
    { label: "Active (30d)", value: String(analytics.active_users_30d) },
    { label: "Hall members", value: String(analytics.hall_members) },
    { label: "Hall Pro", value: String(analytics.hall_pro_users) },
    { label: "Firefighter Plus", value: String(analytics.firefighter_plus_users) },
    { label: "Today's signups", value: String(analytics.todays_signups) },
    { label: "This week", value: String(analytics.this_weeks_signups) },
    { label: "Monthly growth", value: `${analytics.monthly_growth}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-border/40 bg-muted/15 px-3 py-2.5"
        >
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function SortableTh({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: FounderLeadSortKey;
  sort: SortState;
  onSort: (key: FounderLeadSortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === sortKey;
  return (
    <th className={`p-3 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => onSort(sortKey)}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    </th>
  );
}

export default function AdminLeadsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [plan, setPlan] = useState("");
  const [hall, setHall] = useState("");
  const [verified, setVerified] = useState("");
  const [status, setStatus] = useState("");
  const [account, setAccount] = useState("");
  const [signupFrom, setSignupFrom] = useState("");
  const [signupTo, setSignupTo] = useState("");
  const [lastLoginFrom, setLastLoginFrom] = useState("");
  const [lastLoginTo, setLastLoginTo] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "signup_date", dir: "desc" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<(FounderLeadListResponse & { halls?: string[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FounderLeadRow | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (source) params.set("source", source);
    if (plan) params.set("plan", plan);
    if (hall) params.set("hall", hall);
    if (verified) params.set("verified", verified);
    if (status) params.set("status", status);
    if (account) params.set("account", account);
    if (signupFrom) params.set("signup_from", signupFrom);
    if (signupTo) params.set("signup_to", signupTo);
    if (lastLoginFrom) params.set("last_login_from", lastLoginFrom);
    if (lastLoginTo) params.set("last_login_to", lastLoginTo);
    params.set("sort", sort.key);
    params.set("sort_dir", sort.dir);
    params.set("page", String(page));
    params.set("page_size", "50");
    return params;
  }, [
    query,
    source,
    plan,
    hall,
    verified,
    status,
    account,
    signupFrom,
    signupTo,
    lastLoginFrom,
    lastLoginTo,
    sort,
    page,
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const res = await adminFetch(`/api/admin/leads?${queryParams.toString()}`);
      if (res.status === 403 || res.status === 401) {
        setForbidden(true);
        throw new Error("Forbidden — admin only");
      }
      if (res.status === 503) throw new Error("Admin API disabled — set ADMIN_SECRET on the server");
      if (!res.ok) throw new Error("Failed to load leads");
      setData(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSort = (key: FounderLeadSortKey) => {
    setPage(1);
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "email" || key === "name" ? "asc" : "desc" },
    );
  };

  const exportFile = async (format: "csv" | "excel") => {
    const params = new URLSearchParams(queryParams);
    params.set("format", format);
    params.delete("page");
    params.set("page_size", "5000");
    const res = await adminFetch(`/api/admin/leads/export?${params.toString()}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "excel" ? "founder-leads.xls" : "founder-leads.csv";
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

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  if (forbidden) {
    return (
      <AdminPageShell title="Forbidden">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <h1 className="font-heading text-2xl tracking-wide">403 — Forbidden</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This Founder Leads dashboard is private. Admin access required.
          </p>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title="Founder Leads">
      <div className="flex flex-wrap items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">Founder Leads</h1>
          <p className="text-sm text-muted-foreground">
            Every email collected on the platform — merged, searchable, exportable.
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
            Signups
          </Button>
        </Link>
        <Link href="/admin/users">
          <Button variant="outline" size="sm">
            <Users className="mr-1.5 h-4 w-4" />
            Users
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => void exportFile("csv")}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => void exportFile("excel")}>
          <Download className="mr-1.5 h-4 w-4" />
          Export Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => void backfill()}>
          Backfill analytics
        </Button>
      </div>

      {data?.analytics ? <AnalyticsCards analytics={data.analytics} /> : null}

      <div className="sticky top-0 z-20 space-y-3 rounded-xl border border-border/40 bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(searchInput.trim());
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search email, name, hall, source…"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={source}
            onChange={(e) => {
              setPage(1);
              setSource(e.target.value);
            }}
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.id || "any"} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={plan}
            onChange={(e) => {
              setPage(1);
              setPlan(e.target.value);
            }}
          >
            {PLAN_OPTIONS.map((o) => (
              <option key={o.id || "any-plan"} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={verified}
            onChange={(e) => {
              setPage(1);
              setVerified(e.target.value);
            }}
          >
            <option value="">Verified: any</option>
            <option value="yes">Verified</option>
            <option value="no">Not verified</option>
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.id || "any-status"} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={account}
            onChange={(e) => {
              setPage(1);
              setAccount(e.target.value);
            }}
          >
            <option value="">Account: any</option>
            <option value="yes">Has account</option>
            <option value="no">Lead only</option>
          </select>
          <Input
            list="founder-halls"
            value={hall}
            onChange={(e) => {
              setPage(1);
              setHall(e.target.value);
            }}
            placeholder="Filter hall…"
            className="h-9 w-40"
          />
          <datalist id="founder-halls">
            {(data?.halls ?? []).map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Signup</span>
          <Input
            type="date"
            value={signupFrom}
            onChange={(e) => {
              setPage(1);
              setSignupFrom(e.target.value);
            }}
            className="h-9 w-36"
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="date"
            value={signupTo}
            onChange={(e) => {
              setPage(1);
              setSignupTo(e.target.value);
            }}
            className="h-9 w-36"
          />
          <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">Last login</span>
          <Input
            type="date"
            value={lastLoginFrom}
            onChange={(e) => {
              setPage(1);
              setLastLoginFrom(e.target.value);
            }}
            className="h-9 w-36"
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="date"
            value={lastLoginTo}
            onChange={(e) => {
              setPage(1);
              setLastLoginTo(e.target.value);
            }}
            className="h-9 w-36"
          />
        </div>
      </div>

      {backfillMsg ? <p className="text-sm text-muted-foreground">{backfillMsg}</p> : null}
      {copyMsg ? <p className="text-sm text-muted-foreground">{copyMsg}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {data ? (
        <p className="text-sm text-muted-foreground">
          Showing {data.leads.length} of {data.total} leads
          {data.query ? ` matching “${data.query}”` : ""} · page {data.page}/{totalPages}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full min-w-[96rem] text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <SortableTh label="Email" sortKey="email" sort={sort} onSort={onSort} />
              <SortableTh label="Name" sortKey="name" sort={sort} onSort={onSort} />
              <SortableTh label="Signup" sortKey="signup_date" sort={sort} onSort={onSort} />
              <SortableTh label="Last seen" sortKey="last_seen" sort={sort} onSort={onSort} />
              <SortableTh label="Source" sortKey="source" sort={sort} onSort={onSort} />
              <th className="p-3 text-left font-medium">Account</th>
              <th className="p-3 text-left font-medium">Hall</th>
              <th className="p-3 text-left font-medium">Role</th>
              <th className="p-3 text-left font-medium">Hall name</th>
              <SortableTh label="Plan" sortKey="plan" sort={sort} onSort={onSort} />
              <th className="p-3 text-left font-medium">Verified</th>
              <SortableTh label="Logins" sortKey="login_count" sort={sort} onSort={onSort} align="right" />
              <SortableTh label="Last login" sortKey="last_login" sort={sort} onSort={onSort} />
              <SortableTh label="Saved" sortKey="recipes_saved" sort={sort} onSort={onSort} align="right" />
              <SortableTh label="Meals" sortKey="meals_generated" sort={sort} onSort={onSort} align="right" />
              <SortableTh label="Votes" sortKey="votes_cast" sort={sort} onSort={onSort} align="right" />
              <SortableTh
                label="Lists"
                sortKey="shopping_lists_created"
                sort={sort}
                onSort={onSort}
                align="right"
              />
              <SortableTh label="Status" sortKey="status" sort={sort} onSort={onSort} />
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.leads.map((lead) => (
              <tr key={lead.lead_key} className="border-b border-border/20 hover:bg-muted/20">
                <td className="p-3">
                  <button
                    type="button"
                    className="text-left text-primary hover:underline"
                    onClick={() => setSelected(lead)}
                  >
                    {lead.email}
                  </button>
                  {lead.is_test_account ? (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      Test
                    </Badge>
                  ) : null}
                </td>
                <td className="p-3">{lead.name}</td>
                <td className="p-3 text-muted-foreground">{formatDate(lead.signup_date)}</td>
                <td className="p-3 text-muted-foreground">{formatDate(lead.last_seen)}</td>
                <td className="p-3">
                  <Badge variant="outline">{lead.source.replace(/_/g, " ")}</Badge>
                </td>
                <td className="p-3">{lead.account_created ? "Yes" : "No"}</td>
                <td className="p-3 font-mono text-xs text-muted-foreground">
                  {lead.hall_id ? lead.hall_id.slice(0, 8) : "—"}
                </td>
                <td className="p-3">{lead.hall_role?.replace(/_/g, " ") ?? "—"}</td>
                <td className="p-3">{lead.hall_name ?? "—"}</td>
                <td className="p-3">{lead.plan}</td>
                <td className="p-3">{lead.email_verified ? "Yes" : "No"}</td>
                <td className="p-3 text-right tabular-nums">{lead.login_count}</td>
                <td className="p-3 text-muted-foreground">{formatDate(lead.last_login)}</td>
                <td className="p-3 text-right tabular-nums">{lead.recipes_saved}</td>
                <td className="p-3 text-right tabular-nums">{lead.meals_generated}</td>
                <td className="p-3 text-right tabular-nums">{lead.votes_cast}</td>
                <td className="p-3 text-right tabular-nums">{lead.shopping_lists_created}</td>
                <td className="p-3">
                  <Badge
                    variant={
                      lead.status === "Active"
                        ? "default"
                        : lead.status === "New"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {lead.status}
                  </Badge>
                </td>
                <td className="p-3 text-right">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Copy email"
                    onClick={() => void copyEmail(lead.email)}
                  >
                    <ClipboardCopy className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {data?.leads.length === 0 ? (
              <tr>
                <td colSpan={19} className="p-8 text-center text-muted-foreground">
                  No leads match these filters
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      <LeadDetailDrawer
        lead={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => void load()}
      />
    </AdminPageShell>
  );
}
