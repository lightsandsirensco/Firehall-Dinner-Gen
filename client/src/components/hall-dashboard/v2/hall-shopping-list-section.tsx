import { Link } from "wouter";
import { HallDashboardSection } from "@/components/hall-dashboard/v2/hall-dashboard-section";
import { Button } from "@/components/ui/button";
import { useTonightHub } from "@/hooks/use-tonight-hub";
import { HALL_LINKED } from "@/lib/brand-copy";

/**
 * "What needs to be bought?" — status on Hall Home; full list is a deep page.
 */
export function HallShoppingListSection({
  activeHallId,
  className,
}: {
  activeHallId: string | null;
  className?: string;
}) {
  const hub = useTonightHub();
  const href = activeHallId
    ? `/halls/${activeHallId}#hall-shared-shopping-list`
    : "/hall/join";

  const hint = !activeHallId
    ? `${HALL_LINKED.connect} for a shared grocery list.`
    : hub.shoppingLoading
      ? "Loading list…"
      : hub.pendingItems > 0
        ? `${hub.pendingItems} item${hub.pendingItems === 1 ? "" : "s"} on the list`
        : hub.runnerName
          ? `List clear · runner: ${hub.runnerName}`
          : "List is clear — open it to add items or assign a runner.";

  return (
    <HallDashboardSection
      id="hall-shopping-list"
      title="What needs to be bought?"
      className={className}
      testId="hall-shopping-list-section"
    >
      <p className="text-sm text-muted-foreground mb-3">{hint}</p>
      <Button asChild variant="outline" className="w-full min-h-11">
        <Link href={href}>{activeHallId ? "Open shopping list" : HALL_LINKED.join}</Link>
      </Button>
    </HallDashboardSection>
  );
}
