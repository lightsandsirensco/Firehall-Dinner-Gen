import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KlaviyoSyncStatus, MarketingConsentStatus } from "@shared/admin-users/types";

const CONSENT_LABEL: Record<MarketingConsentStatus, string> = {
  subscribed: "Opted in",
  unsubscribed: "Unsubscribed",
  not_consented: "No consent",
};

export function ConsentBadge({ consent }: { consent: MarketingConsentStatus }) {
  return (
    <Badge
      variant={consent === "subscribed" ? "default" : "outline"}
      className={consent === "unsubscribed" ? "border-destructive/50 text-destructive" : undefined}
    >
      {CONSENT_LABEL[consent]}
    </Badge>
  );
}

export function KlaviyoSyncLabel({ status }: { status: KlaviyoSyncStatus }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const label = status === "sent" ? "Synced" : status === "pending" ? "Queued" : status === "failed" ? "Failed" : "Cancelled";
  return <span className={status === "failed" ? "text-destructive" : "text-muted-foreground"}>{label}</span>;
}

export function formatAdminDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const lastPage = Math.max(Math.ceil(total / Math.max(pageSize, 1)), 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span className="tabular-nums">
          Page {page} of {lastPage}
        </span>
        <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
