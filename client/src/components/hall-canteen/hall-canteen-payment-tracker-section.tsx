import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Loader2, Users, Wallet } from "lucide-react";
import { PaywallGate } from "@/components/billing/paywall-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { HALL_CANTEEN_PAYMENTS } from "@/lib/brand-copy";
import {
  enrollAllCanteenPayments,
  fetchCanteenPayments,
  markCanteenPaymentPaid,
  updateCanteenPaymentFrequency,
} from "@/lib/hall-canteen-payments/api";
import type {
  CanteenDuesMemberView,
  CanteenPaymentFrequency,
  CanteenPaymentStatusFilter,
  CanteenPaymentsPayload,
} from "@shared/hall-canteen-payments/types";
import {
  CANTEEN_PAYMENT_FREQUENCIES,
  CANTEEN_PAYMENT_FREQUENCY_LABELS,
  filterMembersByStatus,
} from "@shared/hall-canteen-payments/types";
import { cn } from "@/lib/utils";

interface HallCanteenPaymentTrackerSectionProps {
  activeHallId: string | null;
}

const STATUS_FILTERS: { id: CanteenPaymentStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "due", label: "Due" },
  { id: "overdue", label: "Overdue" },
];

function formatDueDate(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusBadgeClass(status: CanteenDuesMemberView["status"]): string {
  switch (status) {
    case "paid":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "due":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400";
    case "overdue":
      return "border-destructive/30 bg-destructive/10 text-destructive";
  }
}

export function HallCanteenPaymentTrackerSection({ activeHallId }: HallCanteenPaymentTrackerSectionProps) {
  if (!activeHallId) return null;

  return (
    <PaywallGate feature="canteen_payment_tracker" hallId={activeHallId} surface="hall_canteen">
      <PaymentTrackerContent hallId={activeHallId} />
    </PaywallGate>
  );
}

function PaymentTrackerContent({ hallId }: { hallId: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<CanteenPaymentsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CanteenPaymentStatusFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchCanteenPayments(hallId);
      setData(payload);
    } catch {
      setData(null);
      toast({ title: "Could not load payment tracker", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [hallId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredMembers = useMemo(
    () => (data ? filterMembersByStatus(data.members, statusFilter) : []),
    [data, statusFilter],
  );

  const handleEnrollAll = async () => {
    setEnrolling(true);
    try {
      const next = await enrollAllCanteenPayments(hallId);
      setData(next);
      toast({ title: HALL_CANTEEN_PAYMENTS.enrolledToast });
    } catch {
      toast({ title: "Could not enroll members", variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  const handleFrequencyChange = async (userId: string, frequency: CanteenPaymentFrequency) => {
    setBusyUserId(userId);
    try {
      const next = await updateCanteenPaymentFrequency(hallId, userId, frequency);
      setData(next);
    } catch {
      toast({ title: "Could not update monthly dues", variant: "destructive" });
    } finally {
      setBusyUserId(null);
    }
  };

  const handleMarkPaid = async (userId: string) => {
    setBusyUserId(userId);
    try {
      const next = await markCanteenPaymentPaid(hallId, userId);
      setData(next);
      toast({ title: HALL_CANTEEN_PAYMENTS.markedPaidToast });
    } catch {
      toast({ title: "Could not mark as paid", variant: "destructive" });
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <section
      className="rounded-2xl border border-border/50 bg-card/40 px-4 py-5 sm:px-5 sm:py-6 space-y-5"
      data-testid="hall-canteen-payment-tracker"
      aria-labelledby="canteen-payment-tracker-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" aria-hidden />
            </div>
            <h2 id="canteen-payment-tracker-heading" className="text-base font-semibold sm:text-lg">
              {HALL_CANTEEN_PAYMENTS.title}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            {HALL_CANTEEN_PAYMENTS.subtitle}
          </p>
        </div>
        {data?.can_manage && data.enrolled_count < data.hall_member_count ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 shrink-0 touch-manipulation"
            disabled={enrolling}
            onClick={() => void handleEnrollAll()}
          >
            {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : HALL_CANTEEN_PAYMENTS.enrollAll}
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading canteen members…</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">{HALL_CANTEEN_PAYMENTS.loadError}</p>
      ) : data.enrolled_count === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-6 text-center space-y-3">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground leading-relaxed">{HALL_CANTEEN_PAYMENTS.empty}</p>
          {data.can_manage ? (
            <Button
              type="button"
              className="min-h-11 touch-manipulation"
              disabled={enrolling}
              onClick={() => void handleEnrollAll()}
            >
              {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : HALL_CANTEEN_PAYMENTS.enrollAll}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryStat label="Paid" value={data.summary.paid} tone="paid" />
            <SummaryStat label="Outstanding" value={data.summary.outstanding} tone="due" />
            <SummaryStat label="Overdue" value={data.summary.overdue} tone="overdue" />
            <SummaryStat label="Total members" value={data.summary.total_members} tone="neutral" />
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map(({ id, label }) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={statusFilter === id ? "default" : "outline"}
                className="min-h-9 touch-manipulation"
                onClick={() => setStatusFilter(id)}
              >
                {label}
              </Button>
            ))}
          </div>

          <ul className="space-y-2">
            {filteredMembers.length === 0 ? (
              <li className="rounded-xl border border-dashed border-border/50 px-4 py-5 text-center text-sm text-muted-foreground">
                {HALL_CANTEEN_PAYMENTS.noFilterResults}
              </li>
            ) : (
              filteredMembers.map((member) => (
                <MemberRow
                  key={member.enrollment_id}
                  member={member}
                  canManage={data.can_manage}
                  busy={busyUserId === member.user_id}
                  onFrequencyChange={(frequency) => void handleFrequencyChange(member.user_id, frequency)}
                  onMarkPaid={() => void handleMarkPaid(member.user_id)}
                />
              ))
            )}
          </ul>

          {data.recent_history.length > 0 ? (
            <div className="space-y-2 border-t border-border/30 pt-4">
              <h3 className="text-sm font-semibold">{HALL_CANTEEN_PAYMENTS.paymentHistory}</h3>
              <ul className="space-y-2">
                {data.recent_history.map((entry) => (
                  <li
                    key={entry.history_id}
                    className="flex flex-col gap-0.5 rounded-lg bg-muted/20 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      <span className="font-medium">{entry.display_name}</span>
                      <span className="text-muted-foreground"> — marked paid by {entry.marked_by_display_name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.paid_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "paid" | "due" | "overdue" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3 text-center",
        tone === "paid" && "border-emerald-500/20 bg-emerald-500/5",
        tone === "due" && "border-amber-500/20 bg-amber-500/5",
        tone === "overdue" && "border-destructive/20 bg-destructive/5",
        tone === "neutral" && "border-border/50 bg-muted/20",
      )}
    >
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MemberRow({
  member,
  canManage,
  busy,
  onFrequencyChange,
  onMarkPaid,
}: {
  member: CanteenDuesMemberView;
  canManage: boolean;
  busy: boolean;
  onFrequencyChange: (frequency: CanteenPaymentFrequency) => void;
  onMarkPaid: () => void;
}) {
  return (
    <li
      className="rounded-xl border border-border/40 bg-background/60 px-3 py-3 sm:px-4"
      data-testid={`canteen-payment-member-${member.user_id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium truncate">{member.display_name}</p>
            <Badge variant="outline" className={cn("text-xs", statusBadgeClass(member.status))}>
              {member.status_label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {HALL_CANTEEN_PAYMENTS.nextPaymentDue}: {formatDueDate(member.next_due_date)}
            </span>
            <span>{HALL_CANTEEN_PAYMENTS.monthlyDues}: {member.frequency_label}</span>
            {member.shift_name ? <span>{member.shift_name}</span> : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {canManage ? (
            <select
              className="min-h-10 rounded-md border border-input bg-background px-3 text-sm touch-manipulation"
              value={member.frequency}
              disabled={busy}
              aria-label={`Payment frequency for ${member.display_name}`}
              onChange={(e) => onFrequencyChange(e.target.value as CanteenPaymentFrequency)}
            >
              {CANTEEN_PAYMENT_FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {CANTEEN_PAYMENT_FREQUENCY_LABELS[frequency]}
                </option>
              ))}
            </select>
          ) : null}

          {canManage && member.status !== "paid" ? (
            <Button
              type="button"
              size="sm"
              className="min-h-10 touch-manipulation"
              disabled={busy}
              onClick={onMarkPaid}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  {HALL_CANTEEN_PAYMENTS.markAsPaid}
                </>
              )}
            </Button>
          ) : member.status === "paid" ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {HALL_CANTEEN_PAYMENTS.currentOnDues}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" aria-hidden />
              {HALL_CANTEEN_PAYMENTS.awaitingPayment}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
