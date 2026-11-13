import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Search } from "lucide-react";
import { Pager, formatAdminDate } from "@/components/admin/email-status";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/admin-api";
import type {
  ExternalContactFilter,
  ExternalContactListResponse,
  FirehallEvidence,
  KlaviyoEmailConsent,
} from "@shared/admin-users/types";

const FILTERS: { id: ExternalContactFilter; label: string }[] = [
  { id: "all", label: "All external" },
  { id: "klaviyo_subscribed", label: "Klaviyo: subscribed" },
  { id: "not_klaviyo_subscribed", label: "Klaviyo: not subscribed" },
  { id: "also_lights_sirens", label: "Also Lights & Sirens" },
];

const EVIDENCE_LABEL: Record<FirehallEvidence, string> = {
  firehall_list: "Firehall leads list",
  firehall_app_properties: "App profile data",
  firehall_events: "Firehall events",
};

const CONSENT_LABEL: Record<Exclude<KlaviyoEmailConsent, null>, string> = {
  SUBSCRIBED: "Subscribed (Klaviyo record)",
  UNSUBSCRIBED: "Unsubscribed (Klaviyo record)",
  NEVER_SUBSCRIBED: "No consent recorded",
};

const PAGE_SIZE = 50;

export function ExternalContactsPanel() {
  const [filter, setFilter] = useState<ExternalContactFilter>("all");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ExternalContactListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const p = new URLSearchParams({ filter, page: String(page), page_size: String(PAGE_SIZE) });
        if (query) p.set("q", query);
        if (refresh) p.set("refresh", "1");
        const res = await adminFetch(`/api/admin/signups/external?${p.toString()}`);
        if (!res.ok) throw new Error("Failed to load external contacts");
        setData(await res.json());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [filter, query, page],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = async () => {
    const p = new URLSearchParams({ filter });
    if (query) p.set("q", query);
    const res = await adminFetch(`/api/admin/signups/external/export?${p.toString()}`);
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `external-klaviyo-contacts-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = data?.summary;

  return (
    <section className="space-y-4 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl tracking-wide">External contacts — Klaviyo only</h2>
            <Badge variant="outline" className="border-amber-500/60 text-amber-600">
              Not in Firehall Meals database
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Firehall Meals contacts that exist only in Klaviyo, read live and never imported. They are not included in the
            counts above. Lights &amp; Sirens Co. contacts are excluded. Consent shown here is Klaviyo&apos;s own record —
            being on a list is not consent.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh from Klaviyo"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => void exportCsv()} disabled={!data?.available}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {data && !data.available ? (
        <p className="text-sm text-muted-foreground">Klaviyo unavailable: {data.unavailable_reason}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {s ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ["Firehall, Klaviyo only", s.firehall_klaviyo_only],
                ["…Klaviyo-subscribed", s.firehall_klaviyo_only_subscribed],
                ["Already in database", s.already_in_postgres],
                ["Excluded: Lights & Sirens", s.excluded_lights_sirens],
                ["Excluded: unattributed", s.excluded_unattributed],
                ["Klaviyo profiles", s.klaviyo_profiles],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border/30 bg-background/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Combined Firehall reach: {data!.postgres_unique_emails} in database + {s.firehall_klaviyo_only} external ={" "}
            {data!.postgres_unique_emails + s.firehall_klaviyo_only} unique emails.
            {!data!.event_evidence_available
              ? " Event history is not readable with the current Klaviyo key, so profiles known only from Firehall events stay under “unattributed”."
              : ""}
            {data!.fetched_at ? ` Fetched ${formatAdminDate(data!.fetched_at)}.` : ""}
          </p>
        </>
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
            placeholder="Search external email or name…"
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

      <div className="overflow-x-auto rounded-xl border border-border/40 bg-background/60">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="p-3 text-left font-medium">Email</th>
              <th className="p-3 text-left font-medium">Record</th>
              <th className="p-3 text-left font-medium">Name</th>
              <th className="p-3 text-left font-medium">First seen</th>
              <th className="p-3 text-left font-medium">Firehall evidence</th>
              <th className="p-3 text-left font-medium">Klaviyo consent</th>
            </tr>
          </thead>
          <tbody>
            {data?.contacts.map((row) => (
              <tr key={row.klaviyo_profile_id} className="border-b border-border/20">
                <td className="p-3">{row.email}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="border-amber-500/60 text-amber-600">
                      External · Klaviyo
                    </Badge>
                    {row.also_lights_sirens ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Also Lights &amp; Sirens
                      </Badge>
                    ) : null}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{row.name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{formatAdminDate(row.first_seen)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {row.evidence.map((e) => (
                      <Badge key={e} variant="outline" className="text-[10px]">
                        {EVIDENCE_LABEL[e]}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td
                  className="p-3 text-muted-foreground"
                  title={row.klaviyo_consent_method ? `Method: ${row.klaviyo_consent_method}` : undefined}
                >
                  {row.klaviyo_suppressed
                    ? "Suppressed in Klaviyo"
                    : row.klaviyo_email_consent
                      ? CONSENT_LABEL[row.klaviyo_email_consent]
                      : "Unknown"}
                </td>
              </tr>
            ))}
            {data?.available && data.contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No external contacts match this filter
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {data?.available ? <Pager page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} /> : null}
    </section>
  );
}
