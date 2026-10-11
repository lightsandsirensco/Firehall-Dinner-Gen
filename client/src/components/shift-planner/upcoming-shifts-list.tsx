import { CheckCircle2, ChevronRight, Lock } from "lucide-react";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { formatShiftTimes, shiftDayParts } from "@/lib/schedule-format";
import { formatHours } from "@shared/schedule/setup";
import { SHIFT_PLAN_STATUS_LABEL } from "@shared/shift-plan/plan-ahead";
import type { UpcomingShift, UpcomingShiftsView } from "@shared/shift-plan/types";

function StatusLine({ row }: { row: UpcomingShift }) {
  if (row.mealCount === 0) return <span className="text-muted-foreground">No meals in this shift</span>;
  const label = SHIFT_PLAN_STATUS_LABEL[row.status];
  if (row.status === "planned") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        {label}
      </span>
    );
  }
  if (row.status === "partial") {
    return (
      <span className="text-amber-300">
        {label} · {row.plannedCount}/{row.mealCount}
      </span>
    );
  }
  return <span className="text-muted-foreground">{label}</span>;
}

function UpcomingShiftRow({
  row,
  selected,
  onOpen,
  onLocked,
}: {
  row: UpcomingShift;
  selected: boolean;
  onOpen: (row: UpcomingShift) => void;
  onLocked: (row: UpcomingShift) => void;
}) {
  const { shift } = row;
  const day = shiftDayParts(shift.startLocal);
  const locked = !row.actionable;
  const badge = row.isNext
    ? Date.parse(shift.start) <= Date.now()
      ? "On shift"
      : "Next"
    : shift.source === "extra"
      ? "Extra"
      : shift.status === "modified"
        ? "Changed"
        : null;

  return (
    <li>
      <button
        type="button"
        onClick={() => (locked ? onLocked(row) : onOpen(row))}
        aria-current={selected ? "true" : undefined}
        aria-label={locked ? `${day.weekday} ${day.month} ${day.day} — Pro: plan ahead` : undefined}
        className={cn(
          app.cardSurface,
          "flex w-full items-center gap-3 px-3 py-2.5 text-left hover-elevate touch-manipulation min-h-11",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected && "ring-1 ring-primary/60",
        )}
        data-testid={`upcoming-shift-${shift.key}`}
        data-locked={locked ? "true" : undefined}
      >
        <span
          className={cn(
            "flex w-12 shrink-0 flex-col items-center rounded-xl py-1",
            locked ? "bg-muted/40 text-muted-foreground" : "bg-primary/10 text-primary",
          )}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide">{day.weekday}</span>
          <span className="text-lg font-bold leading-none tabular-nums">{day.day}</span>
          <span className="text-[10px]">{day.month}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm font-medium tabular-nums", locked && "text-muted-foreground")}>
            {formatShiftTimes(shift.startLocal, shift.endLocal)}
            <span className="font-normal text-muted-foreground"> · {formatHours(shift.scheduledMinutes)}</span>
          </span>
          <span className="block text-xs" data-testid={`upcoming-shift-status-${shift.key}`}>
            <StatusLine row={row} />
          </span>
        </span>
        {badge ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
              row.isNext ? "bg-primary/15 text-primary" : "bg-amber-400/15 text-amber-300",
            )}
          >
            {badge}
          </span>
        ) : null}
        {locked ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            data-testid={`upcoming-shift-lock-${shift.key}`}
          >
            <Lock className="h-2.5 w-2.5" aria-hidden />
            Pro
          </span>
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </button>
    </li>
  );
}

/** Real calculated shifts for the next 30 days with their plan status — not a calendar. */
export function UpcomingShiftsList({
  view,
  selectedKey,
  onOpen,
  onLocked,
}: {
  view: UpcomingShiftsView;
  selectedKey: string | null;
  onOpen: (row: UpcomingShift) => void;
  onLocked: (row: UpcomingShift) => void;
}) {
  if (view.shifts.length <= 1) return null;

  return (
    <section className="space-y-3" data-testid="upcoming-shifts">
      <div className="px-0.5">
        <h2 className="font-heading text-lg tracking-tight">Upcoming shifts</h2>
        <p className={cn(app.caption, "mt-0.5")}>
          {view.canPlanAhead
            ? `Plan any shift in the next ${view.windowDays} days.`
            : "Your next shift is free to plan. Plan further ahead with Pro."}
        </p>
      </div>
      <ul className={cn("space-y-1.5", app.stagger)}>
        {view.shifts.map((row) => (
          <UpcomingShiftRow
            key={row.shift.key}
            row={row}
            selected={row.shift.key === selectedKey}
            onOpen={onOpen}
            onLocked={onLocked}
          />
        ))}
      </ul>
    </section>
  );
}
