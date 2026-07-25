import { HallShell } from "@/components/hall/hall-shell";
import { HallPermissionGate } from "@/components/hall-membership/hall-permission-gate";
import { HallCanteenPaymentTrackerSection } from "@/components/hall-canteen/hall-canteen-payment-tracker-section";
import { useHallMembership } from "@/lib/hall-membership/context";
import { Link } from "wouter";
import { HALL_LINKED } from "@/lib/brand-copy";

/** Hall Dues — spreadsheet killer (v2 IA: dedicated route, Mark Paid hero). */
export default function HallDuesPage() {
  const { activeHallId } = useHallMembership();

  return (
    <HallShell title="Dues" testId="hall-dues-page">
      <HallPermissionGate
        permission="view_hall_dashboard"
        allowGuest={false}
        fallback={
          <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            {HALL_LINKED.connect} to track dues.{" "}
            <Link href="/hall/join" className="font-medium text-primary hover:underline">
              {HALL_LINKED.join}
            </Link>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Hall Dues</h1>
            <p className="text-sm text-muted-foreground">
              Who has paid, who hasn’t — Mark Paid in seconds.
            </p>
          </div>
          <HallCanteenPaymentTrackerSection activeHallId={activeHallId} />
        </div>
      </HallPermissionGate>
    </HallShell>
  );
}
