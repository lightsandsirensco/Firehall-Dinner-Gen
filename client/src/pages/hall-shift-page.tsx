import { Link, useRoute } from "wouter";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ShiftDashboard } from "@/components/shift-dashboard/shift-dashboard";
import { HallPermissionGate } from "@/components/hall-membership/hall-permission-gate";
import { useHallFavorites } from "@/hooks/use-hall-favorites";
import { useAuth } from "@/lib/auth/context";
import { HALL_LINKED } from "@/lib/brand-copy";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

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
  const { count: favoriteCount } = useHallFavorites();

  return (
    <div className={cn(app.page, "bg-background")}>
      <SiteHeader activePage="hall" favCount={favoriteCount} />

      <main className={cn(app.main, "py-3 sm:py-5 pb-safe-nav max-w-lg mx-auto px-4 sm:max-w-xl")}>
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
      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
