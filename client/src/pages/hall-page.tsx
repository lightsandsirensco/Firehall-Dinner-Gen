import { useEffect } from "react";

import { HallShell } from "@/components/hall/hall-shell";

import { HallDashboardV2 } from "@/components/hall-dashboard/v2/hall-dashboard-v2";

import { HallEmptyState } from "@/components/hall/hall-empty-state";

import { HallPermissionGate } from "@/components/hall-membership/hall-permission-gate";

import { AppTopBar } from "@/components/app-shell/app-top-bar";

import { SiteFooter } from "@/components/site-footer";

import { useHallDashboard } from "@/hooks/use-hall-dashboard";

import { useAuth } from "@/lib/auth/context";

import { useHallMembership } from "@/lib/hall-membership/context";

import { HALL_DASHBOARD } from "@/lib/brand-copy";
import { trackHallDashboardViewed } from "@/lib/analytics";

import { app } from "@/lib/design-tokens";

import { cn } from "@/lib/utils";



export default function HallPage() {

  const { authenticated, halls } = useAuth();

  const { activeHallId } = useHallMembership();

  const dashboard = useHallDashboard();

  const hasCrewHall = authenticated && halls.length > 0 && Boolean(activeHallId);



  useEffect(() => {

    if (!hasCrewHall) return;

    trackHallDashboardViewed({

      version: 2,

      entry_count: dashboard.stats.mealsCooked + dashboard.stats.votesCreated,

      favorite_count: dashboard.favoriteCount,

      hall_name_set: Boolean(dashboard.hallName && dashboard.hallName !== "Linked Hall"),

      meals_cooked: dashboard.stats.mealsCooked,

      votes_created: dashboard.stats.votesCreated,

      wheel_spins: dashboard.stats.wheelSpins,

      member_count: dashboard.memberCount,

    });

  }, [

    dashboard.favoriteCount,

    dashboard.hallName,

    dashboard.memberCount,

    dashboard.stats.mealsCooked,

    dashboard.stats.votesCreated,

    dashboard.stats.wheelSpins,

    hasCrewHall,

  ]);



  if (!hasCrewHall) {

    return (

      <div className={cn(app.page, "bg-background")} data-testid="hall-page">

        <AppTopBar title="Hall" />

        <main className={cn(app.main, app.mobileScreen)}>

          <HallEmptyState />

        </main>

        <SiteFooter variant="compact" pbSafe />

      </div>

    );

  }



  return (

    <HallShell title={HALL_DASHBOARD.myHall} data-testid="hall-page">

      <HallPermissionGate permission="view_hall_dashboard" allowGuest={false}>

        <HallDashboardV2 />

      </HallPermissionGate>

    </HallShell>

  );

}

