import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Users, Loader2, Shield, Download, Mail, Search } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ConsentBadge, KlaviyoSyncLabel, Pager, formatAdminDate } from "@/components/admin/email-status";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/admin-api";
import type { RegisteredUserFilter, RegisteredUserListResponse } from "@shared/admin-users/types";

const FILTERS: { id: RegisteredUserFilter; label: string }[] = [
  { id: "all", label: "All users" },
  { id: "new_7d", label: "New (7d)" },
  { id: "active_30d", label: "Signed in (30d)" },
  { id: "pro", label: "Pro" },
  { id: "free", label: "Free" },
  { id: "subscribed", label: "Opted in to marketing" },
  { id: "not_subscribed", label: "Not opted in" },
];

const PAGE_SIZE = 50;

export default function AdminUsersPage() {
  const [filter, setFilter] = useState<RegisteredUserFilter>("all");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RegisteredUserListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useCallback(() => {
    const p = new URLSearchParams({ filter });
    if (query) p.set("q", query);
    return p;
  }, [filter, query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = params();
      p.set("page", String(page));
      p.set("page_size", String(PAGE_SIZE));
      const res = await adminFetch(`/api/admin/users?${p.toString()}`);
      if (res.status === 401) throw new Error("Unauthorized — enter ADMIN_SECRET when prompted");
      if (!res.ok) throw new Error("Failed to load users");
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
    const res = await adminFetch(`/api/admin/users/export?${params().toString()}`);
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `registered-users-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = data?.summary;

  return (
    <AdminPageShell title="Registered Users">
      <div className="flex flex-wrap items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">Registered users</h1>
          <p className="text-sm text-muted-foreground">Accounts from the production database (Postgres).</p>
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
            <Mail className="mr-1.5 h-4 w-4" />
            All collected emails
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => void exportCsv()}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            [
              ["Registered", summary.total],
              ["New (7d)", summary.new_7d],
              ["Signed in (30d)", summary.active_30d],
              ["Pro (paid or trial)", summary.pro],
              ["Opted in to marketing", summary.subscribed],
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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full min-w-[60rem] text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="p-3 text-left font-medium">Email</th>
              <th className="p-3 text-left font-medium">Name</th>
              <th className="p-3 text-left font-medium">Sign-in</th>
              <th className="p-3 text-left font-medium">Signed up</th>
              <th className="p-3 text-left font-medium">Last sign-in</th>
              <th className="p-3 text-left font-medium">Plan</th>
              <th className="p-3 text-left font-medium">Marketing consent</th>
              <th className="p-3 text-left font-medium">Klaviyo sync</th>
              <th className="p-3 text-right font-medium">Meals cooked</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.user_id} className="border-b border-border/20 hover:bg-muted/20">
                <td className="p-3">
                  <Link href={`/admin/users/${u.user_id}`} className="font-medium text-primary hover:underline">
                    {u.email ?? u.user_id}
                  </Link>
                </td>
                <td className="p-3 text-muted-foreground">{u.name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{u.auth_provider}</td>
                <td className="p-3 text-muted-foreground">{formatAdminDate(u.signup_date)}</td>
                <td className="p-3 text-muted-foreground">{formatAdminDate(u.last_login)}</td>
                <td className="p-3">
                  <Badge variant={u.plan === "pro" ? "default" : "outline"} title={u.plan_detail}>
                    {u.plan_detail}
                  </Badge>
                </td>
                <td className="p-3">
                  <ConsentBadge consent={u.consent} />
                </td>
                <td className="p-3">
                  <KlaviyoSyncLabel status={u.klaviyo_sync} />
                </td>
                <td className="p-3 text-right tabular-nums">{u.meals_cooked}</td>
              </tr>
            ))}
            {data?.users.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                  No users match this filter
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {data ? <Pager page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} /> : null}
    </AdminPageShell>
  );
}
