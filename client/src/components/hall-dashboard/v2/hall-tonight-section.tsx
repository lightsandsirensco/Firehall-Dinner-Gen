import { Link } from "wouter";
import { HallDashboardSection } from "@/components/hall-dashboard/v2/hall-dashboard-section";
import { Button } from "@/components/ui/button";
import { HALL_DASHBOARD, TONIGHT_HUB } from "@/lib/brand-copy";

export function HallTonightSection({ className }: { className?: string }) {
  return (
    <HallDashboardSection
      id="hall-tonight"
      title={HALL_DASHBOARD.tonight}
      className={className}
      testId="hall-tonight-section"
    >
      <p className="text-sm text-muted-foreground mb-3">{TONIGHT_HUB.tagline}</p>
      <Button asChild className="w-full min-h-11">
        <Link href="/tonight">{TONIGHT_HUB.actions.pickMeal}</Link>
      </Button>
    </HallDashboardSection>
  );
}
