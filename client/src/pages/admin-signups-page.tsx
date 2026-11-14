import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { ClipboardCopy, Download, Loader2, Search, Shield, UserPlus, Users } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ConsentBadge, KlaviyoSyncLabel, Pager, formatAdminDate } from "@/components/admin/email-status";
import { ExternalContactsPanel } from "@/components/admin/external-contacts-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/admin-api";
import type {
  EmailCategory,
  EmailDirectoryFilter,
  EmailDirectoryListResponse,
} from "@shared/admin-users/types";

const FILTERS: { id: EmailDirectoryFilter; label: string }[] = [
  { id: "all", label: "All emails" },
  { id: "registered_users", label: "Registered users" },
  { id: "marketing_subscribers", label: "Marketing subscribers" },
  { id: "other_emails", label: "Other collected emails" },
  { id: "unsubscribed", label: "Unsubscribed" },
  { id: "pro_waitlist", label: "Pro waitlist" },
];

const CATEGORY_LABEL: Record<EmailCategory, string> = {
  registered_user: "Registered user",
  marketing_subscriber: "Subscriber (no account)",
  other: "Collected email",
};

const PAGE_SIZE = 50;

function formatSource(source: string): string {
  return source.replace(/^account_/, "account: ").replace(/^opt_in_/, "opt-in: ").replace(/_/g, " ");
}

export default function AdminSignupsPage() {
  const [filter, setFilter] = useState<EmailDirectoryFilter>("all");
  const [sourceFilter, setSourceFilter] = useState("");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EmailDirectoryListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const params = useCallback(() => {
    const p = new URLSearchParams({ filter });
    if (query) p.set("q", query);
    if (sourceFilter) p.set("source", sourceFilter);
    return p;
  }, [filter, query, sourceFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = params();
      p.set("page", String(page));
      p.set("page_size", String(PAGE_SIZE));
      const res = await adminFetch(`/api/admin/signups?${p.toString()}`);
      if (res.status === 401) throw new Error("Unauthorized — enter ADMIN_SECRET when prompted");
      if (res.status === 503) throw new Error("Admin API disabled — set ADMIN_SECRET on the server");
      if (!res.ok) throw new Error("Failed to load emails");
      setData(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = async () => {
    const res = await adminFetch(`/api/admin/signups/export?${params().toString()}`);
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `emails-${filter}.csv`;
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

  const summary = data?.summary;

  return (
    <AdminPageShell title="Collected Emails">
      <div className="flex flex-wrap items-center gap-3">
        <UserPlus className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">Collected emails</h1>
          <p className="text-sm text-muted-foreground">
            Every unique email from accounts, sign-in requests, opt-ins and capture forms (Postgres). Marketing
            consent comes only from recorded opt-ins — Klaviyo sync status is shown separately and is not consent.
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
        <Link href="/admin/users">
          <Button variant="outline" size="sm">
            <Users className="mr-1.5 h-4 w-4" />
            Registered users
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => void exportCsv()}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {(
            [
              ["Unique emails", summary.total_unique_emails],
              ["Registered users", summary.registered_users],
              ["Marketing subscribers", summary.marketing_subscribers],
              ["…of which registered", summary.registered_and_subscribed],
              ["Other collected", summary.other_emails],
              ["Pro waitlist", summary.pro_waitlist],
              ["Unsubscribed", summary.unsubscribed],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <form
        className="flex flex-col gap-3 sm:flex-row"
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
            placeholder="Search email or name…"
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
            onClick={() => {
              setPage(1);
              setFilter(f.id);
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {data && data.sources_available.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</span>
          {["", ...data.sources_available].map((s) => (
            <Button
              key={s || "any"}
              variant={sourceFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPage(1);
                setSourceFilter(s);
              }}
            >
              {s ? formatSource(s) : "Any source"}
            </Button>
          ))}
        </div>
      ) : null}

      {copyMsg ? <p className="text-sm text-muted-foreground">{copyMsg}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {data?.magic_link_funnel ? (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
          <h2 className="font-heading text-lg tracking-wide">Magic link funnel (30 days)</h2>
          <p className="mb-4 mt-1 text-xs text-muted-foreground">
            Requested → sent → opened → completed. Completion rate uses sent as the denominator.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {(
              [
                ["Requested", data.magic_link_funnel.requested],
                ["Sent", data.magic_link_funnel.sent],
                ["Failed", data.magic_link_funnel.failed],
                ["Opened", data.magic_link_funnel.opened],
                ["Completed", data.magic_link_funnel.completed],
                ["Expired", data.magic_link_funnel.expired],
                ["Rate", `${data.magic_link_funnel.completion_rate}%`],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border/30 bg-background/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full min-w-[64rem] text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="p-3 text-left font-medium">Email</th>
              <th className="p-3 text-left font-medium">Type</th>
              <th className="p-3 text-left font-medium">Name</th>
              <th className="p-3 text-left font-medium">First seen</th>
              <th className="p-3 text-left font-medium">Last seen</th>
              <th className="p-3 text-left font-medium">Sources</th>
              <th className="p-3 text-left font-medium">Marketing consent</th>
              <th className="p-3 text-left font-medium">Klaviyo sync</th>
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.emails.map((row) => (
              <tr key={row.email} className="border-b border-border/20 hover:bg-muted/20">
                <td className="p-3">
                  {row.user_id ? (
                    <Link href={`/admin/users/${row.user_id}`} className="text-primary hover:underline">
                      {row.email}
                    </Link>
                  ) : (
                    row.email
                  )}
                </td>
                <td className="p-3">
                  <Badge variant={row.category === "registered_user" ? "default" : "secondary"}>
                    {CATEGORY_LABEL[row.category]}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">{row.name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{formatAdminDate(row.first_seen)}</td>
                <td className="p-3 text-muted-foreground">{formatAdminDate(row.last_seen)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {row.sources.map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px]">
                        {formatSource(s)}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3" title={row.consent_captured_at ? `Opted in ${formatAdminDate(row.consent_captured_at)}` : undefined}>
                  <ConsentBadge consent={row.consent} />
                </td>
                <td className="p-3">
                  <KlaviyoSyncLabel status={row.klaviyo_sync} />
                </td>
                <td className="p-3 text-right">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Copy ${row.email}`}
                    onClick={() => void copyEmail(row.email)}
                  >
                    <ClipboardCopy className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {data?.emails.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                  No emails match this filter
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {data ? <Pager page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} /> : null}

      <ExternalContactsPanel />
    </AdminPageShell>
  );
}
