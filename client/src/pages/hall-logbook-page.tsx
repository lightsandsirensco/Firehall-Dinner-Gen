import { HallShell } from "@/components/hall/hall-shell";
import { HallPermissionGate } from "@/components/hall-membership/hall-permission-gate";
import { HallLogbookPanel } from "@/components/hall-logbook/hall-logbook-panel";
import { useHallMembership } from "@/lib/hall-membership/context";
import { Link } from "wouter";
import { HALL_LINKED } from "@/lib/brand-copy";

export default function HallLogbookPage() {
  const { activeHallId } = useHallMembership();

  return (
    <HallShell title="Log" testId="hall-logbook-page">
      <HallPermissionGate
        permission="view_hall_dashboard"
        allowGuest={false}
        fallback={
          <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            {HALL_LINKED.connect} to open the Logbook.{" "}
            <Link href="/hall/join" className="font-medium text-primary hover:underline">
              {HALL_LINKED.join}
            </Link>
          </div>
        }
      >
        {activeHallId ? <HallLogbookPanel hallId={activeHallId} /> : null}
      </HallPermissionGate>
    </HallShell>
  );
}
