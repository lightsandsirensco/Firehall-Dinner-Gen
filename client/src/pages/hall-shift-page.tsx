import { Link, useRoute } from "wouter";
import { HallShell } from "@/components/hall/hall-shell";
import { ShiftDashboard } from "@/components/shift-dashboard/shift-dashboard";
import { HallPermissionGate } from "@/components/hall-membership/hall-permission-gate";
import { useAuth } from "@/lib/auth/context";
import { HALL_LINKED } from "@/lib/brand-copy";

function ShiftFeatureLocked() {
  return (
    <div
      className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground"
      data-testid="shift-dashboard-locked"
    >
      {HALL_LINKED.connect} to view shift dashboards.{" "}
      <Link href="/hall/join" className="text-primary hover:underline font-medium">
        {HALL_LINKED.join}
      </Link>
    </div>
  );
}

export default function HallShiftPage() {
  const [, params] = useRoute("/hall/:hallId/shift/:shiftId");
  const hallId = params?.hallId ?? "";
  const shiftId = params?.shiftId ?? "";
  const { authenticated } = useAuth();

  return (
    <HallShell title="Shift" testId="hall-shift-page">
      <HallPermissionGate
        permission="view_hall_dashboard"
        allowGuest
        fallback={authenticated ? <ShiftFeatureLocked /> : null}
      >
        {hallId && shiftId ? (
          <ShiftDashboard hallId={hallId} shiftId={shiftId} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Invalid shift link.</p>
        )}
      </HallPermissionGate>
    </HallShell>
  );
}
