import { Link } from "wouter";
import { History, ListChecks, ShoppingCart, Store, Vote } from "lucide-react";
import { HALL_DASHBOARD } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

interface HallDashboardActionsProps {
  activeHallId: string | null;
  className?: string;
}

function ActionTile({
  href,
  icon: Icon,
  label,
  testId,
}: {
  href: string;
  icon: typeof Vote;
  label: string;
  testId: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/45 bg-card/50",
        "px-3 py-4 min-h-[92px] text-center transition-colors active:scale-[0.98]",
        "hover:border-primary/30 hover:bg-primary/5 touch-manipulation",
      )}
      data-testid={testId}
    >
      <Icon className="w-6 h-6 text-primary" aria-hidden />
      <span className="text-xs font-semibold leading-tight">{label}</span>
    </Link>
  );
}

export function HallDashboardActions({ activeHallId, className }: HallDashboardActionsProps) {
  const shoppingHref = activeHallId
    ? `/halls/${activeHallId}#hall-shared-shopping-list`
    : "/hall/join";
  const groceryHref = activeHallId ? "/hall/protein-deals" : "/hall/join";

  return (
    <section
      className={cn("space-y-2", className)}
      aria-label={HALL_DASHBOARD.quickActions}
      data-testid="hall-dashboard-actions"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
        {HALL_DASHBOARD.quickActions}
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        <ActionTile
          href="/hall"
          icon={Vote}
          label={HALL_DASHBOARD.actions.hallVote}
          testId="hall-action-vote"
        />
        <ActionTile
          href={shoppingHref}
          icon={ShoppingCart}
          label={HALL_DASHBOARD.actions.sharedList}
          testId="hall-action-shopping-list"
        />
        <ActionTile
          href="/hall/history"
          icon={History}
          label={HALL_DASHBOARD.actions.mealHistory}
          testId="hall-action-meal-history"
        />
        <ActionTile
          href="/hall/canteen"
          icon={ListChecks}
          label={HALL_DASHBOARD.actions.staples}
          testId="hall-action-staples"
        />
        <ActionTile
          href={groceryHref}
          icon={Store}
          label={HALL_DASHBOARD.actions.groceryPlanning}
          testId="hall-action-grocery-planning"
        />
      </div>
    </section>
  );
}
