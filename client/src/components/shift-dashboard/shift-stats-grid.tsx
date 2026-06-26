import type { LucideIcon } from "lucide-react";
import { ChefHat, Flame, Vote } from "lucide-react";
import { SHIFT_DASHBOARD } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

interface ShiftStatsGridProps {
  mealsThisMonth: number;
  votesThisMonth: number;
  longestMealStreak: number;
  className?: string;
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/60 px-3 py-3 min-h-[88px] flex flex-col justify-center">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
      {sub ? <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p> : null}
    </div>
  );
}

export function ShiftStatsGrid({
  mealsThisMonth,
  votesThisMonth,
  longestMealStreak,
  className,
}: ShiftStatsGridProps) {
  return (
    <section
      className={cn("space-y-2", className)}
      data-testid="shift-stats-grid"
      aria-label="Shift stats"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
        Stats
      </p>
      <div className="grid grid-cols-3 gap-2.5">
        <StatTile icon={ChefHat} label={SHIFT_DASHBOARD.stats.mealsThisMonth} value={mealsThisMonth} />
        <StatTile icon={Vote} label={SHIFT_DASHBOARD.stats.votesThisMonth} value={votesThisMonth} />
        <StatTile
          icon={Flame}
          label={SHIFT_DASHBOARD.stats.longestMealStreak}
          value={longestMealStreak}
          sub={SHIFT_DASHBOARD.streakDays(longestMealStreak)}
        />
      </div>
    </section>
  );
}
