import { Link } from "wouter";
import { HallDashboardSection } from "@/components/hall-dashboard/v2/hall-dashboard-section";
import { Button } from "@/components/ui/button";
import { HALL_DASHBOARD, HALL_LINKED } from "@/lib/brand-copy";

interface HallShoppingListSectionProps {
  activeHallId: string | null;
  className?: string;
}

export function HallShoppingListSection({ activeHallId, className }: HallShoppingListSectionProps) {
  const href = activeHallId
    ? `/halls/${activeHallId}#hall-shared-shopping-list`
    : "/hall/join";

  return (
    <HallDashboardSection
      id="hall-shopping-list"
      title={HALL_DASHBOARD.actions.sharedList}
      className={className}
      testId="hall-shopping-list-section"
    >
      {!activeHallId ? (
        <p className="text-sm text-muted-foreground">
          {HALL_LINKED.connect} to use a shared grocery list with your crew.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground mb-3">
          One list for tonight&apos;s meal — separate from kitchen staples.
        </p>
      )}
      <Button asChild variant="outline" className="w-full min-h-11">
        <Link href={href}>{HALL_DASHBOARD.actions.sharedList}</Link>
      </Button>
    </HallDashboardSection>
  );
}
