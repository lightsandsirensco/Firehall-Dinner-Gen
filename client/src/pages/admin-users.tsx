import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Users, Loader2, Shield, Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/admin-api";
import type { AdminUserFilter, AdminUserListResponse } from "@shared/admin-users/types";

const FILTERS: { id: AdminUserFilter; label: string }[] = [
  { id: "all", label: "All users" },
  { id: "new_users", label: "New (7d)" },
  { id: "active_users", label: "Active (30d)" },
  { id: "hall_members", label: "Hall members" },
  { id: "hall_admins", label: "Hall captains" },
  { id: "personal_plan", label: "Personal plan" },
  { id: "hall_pro", label: "Hall Pro" },
  { id: "no_hall", label: "No hall" },
  { id: "email_leads_only", label: "Email leads" },
  { id: "pilot_leads", label: "Pilot leads" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function AdminUsersPage() {
  const [filter, setFilter] = useState<AdminUserFilter>("all");
  const [data, setData] = useState<AdminUserListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/users?filter=${encodeURIComponent(filter)}`);
      if (!res.ok) throw new Error("Failed to load users");
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
    const res = await adminFetch(`/api/admin/users/export?filter=${encodeURIComponent(filter)}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="font-heading text-3xl tracking-wide">USERS</h1>
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
          <Link href="/admin/leads">
            <Button variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-1.5" />
              Email leads
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => void exportCsv()}>
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
        </div>

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
            Showing {data.users.length} of {data.total} users
          </p>
        )}

        <div className="rounded-xl border border-border/40 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Signed up</th>
                <th className="text-left p-3 font-medium">Last active</th>
                <th className="text-left p-3 font-medium">Plan</th>
                <th className="text-left p-3 font-medium">Hall</th>
                <th className="text-right p-3 font-medium">Meals</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.user_id} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="p-3">
                    <Link href={`/admin/users/${u.user_id}`} className="text-primary hover:underline font-medium">
                      {u.name}
                    </Link>
                    {u.is_pilot_lead && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        Pilot
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(u.signup_date)}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(u.last_active)}</td>
                  <td className="p-3">
                    <Badge variant="outline">{u.plan}</Badge>
                    {u.hall_pro && (
                      <Badge variant="secondary" className="ml-1 text-[10px]">
                        Hall Pro
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {u.hall_name ? (
                      <>
                        {u.hall_name}
                        {u.shift ? ` · ${u.shift}` : ""}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums">{u.meals_generated}</td>
                </tr>
              ))}
              {data?.users.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No users match this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
