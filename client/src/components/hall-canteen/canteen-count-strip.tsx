import type { HallCanteenPayload } from "@shared/hall-canteen/types";
import { HALL_CANTEEN_STATUS_ICONS, HALL_CANTEEN_STATUS_LABELS } from "@shared/hall-canteen/types";
import { cn } from "@/lib/utils";

export function CanteenCountStrip({ data }: { data: HallCanteenPayload }) {
  const cells = [
    { key: "out", label: "Out", value: data.counts.out, icon: HALL_CANTEEN_STATUS_ICONS.out },
    {
      key: "low",
      label: "Running Low",
      value: data.counts.running_low,
      icon: HALL_CANTEEN_STATUS_ICONS.running_low,
    },
    {
      key: "req",
      label: "Requested",
      value: data.counts.requested,
      icon: HALL_CANTEEN_STATUS_ICONS.requested,
    },
    {
      key: "order",
      label: "In This Week’s Order",
      value: data.counts.in_weeks_order,
      icon: "📋",
    },
  ] as const;

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      data-testid="canteen-count-strip"
      role="group"
      aria-label="Canteen status counts"
    >
      {cells.map((cell) => (
        <div
          key={cell.key}
          className={cn(
            "rounded-2xl border border-border/40 bg-card/50 px-3 py-3 text-center",
            cell.value > 0 && cell.key === "out" && "border-red-500/35 bg-red-500/5",
            cell.value > 0 && cell.key === "low" && "border-amber-500/35 bg-amber-500/5",
          )}
        >
          <p className="text-xl font-heading tabular-nums leading-none">
            <span className="sr-only">{HALL_CANTEEN_STATUS_LABELS.out} count </span>
            <span aria-hidden className="mr-1 text-base">
              {cell.icon}
            </span>
            {cell.value}
          </p>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {cell.label}
          </p>
        </div>
      ))}
    </div>
  );
}
