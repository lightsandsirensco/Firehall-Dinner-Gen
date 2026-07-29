import { BookOpen, History, ListChecks, Settings, ShoppingCart, Tag, Wallet } from "lucide-react";
import { Link } from "wouter";
import { HallIdentityHeader } from "./hall-identity-header";
import { HallShoppingListSection } from "./hall-shopping-list-section";
import { HallNeedAnythingCard } from "./hall-need-anything-card";
import { HallLastMealsSection } from "./hall-last-meals-section";
import { HallWhiteboard } from "@/components/hall-board/hall-whiteboard";
import { HubTile } from "@/components/app-shell/hub-tile";
import { WorkflowExit } from "@/components/app-shell/workflow-exit";
import {
  getHallFavoritesCount,
  removeHallFavorite,
} from "@/lib/hall-favorites-store";
import { trackHallFavoriteRemoved } from "@/lib/analytics";
import { useHallDashboard } from "@/hooks/use-hall-dashboard";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

/**
 * Hall — deeper ops. Home answers "what needs attention?";
 * Hall answers "let's manage it."
 */
export function HallDashboardV2({ className }: { className?: string }) {
  const data = useHallDashboard();
  const settingsHref = data.activeHallId ? `/halls/${data.activeHallId}` : "/hall/settings";
  const shoppingHref = data.activeHallId
    ? `/halls/${data.activeHallId}#hall-shared-shopping-list`
    : "/hall/shopping-list";

  return (
    <div className={cn("space-y-5 pb-2", className)} data-testid="hall-dashboard">
      <WorkflowExit
        href="/tonight"
        label="← Back to Tonight"
        hint="Every shift starts on Tonight"
        testId="hall-back-tonight"
      />

      <header className="space-y-1.5 px-0.5">
        <h1 className={app.titlePage}>Manage the hall</h1>
        <p className={app.subtitle}>
          Board, shopping, canteen, and records — dinner decisions stay on Tonight.
        </p>
        <p className="text-xs text-muted-foreground">
          Need to pick dinner?{" "}
          <Link href="/tonight" className="font-semibold text-primary hover:underline">
            Go to Tonight
          </Link>
          {" · "}
          <Link href="/generator" className="font-semibold text-muted-foreground hover:text-foreground hover:underline">
            Pick a meal
          </Link>
        </p>
      </header>

      <HallIdentityHeader
        hallName={data.hallName}
        stationNumber={data.stationNumber}
        department={data.department}
        city={data.city}
        hallPhotoUrl={data.hallPhotoUrl}
        motto={data.motto}
        memberCount={data.memberCount}
        canteenManagerName={data.canteenManagerName}
        shiftName={data.shiftName}
        myShiftId={data.myShiftId}
        authenticated={data.authenticated}
        activeHallId={data.activeHallId}
        canManageSettings={data.canManageSettings}
        identityLoading={data.identityLoading}
      />

      {data.activeHallId ? <HallWhiteboard hallId={data.activeHallId} /> : null}

      <HallShoppingListSection activeHallId={data.activeHallId} />
      <HallNeedAnythingCard activeHallId={data.activeHallId} />

      <section className="space-y-2" aria-labelledby="hall-manage-jobs" id="hall-tools">
        <h2 id="hall-manage-jobs" className={cn(app.eyebrowMuted, "px-0.5")}>
          Manage
        </h2>
        <div className={cn("space-y-2", app.stagger)}>
          <HubTile
            href={shoppingHref}
            icon={ShoppingCart}
            title="Shopping list"
            description="Full list and grocery runner"
            testId="hall-manage-shop"
          />
          <HubTile
            href="/hall/canteen"
            icon={ListChecks}
            title="Canteen"
            description="What's low or out"
            testId="hall-manage-canteen"
          />
          <HubTile
            href="/hall/dues"
            icon={Wallet}
            title="Dues"
            description="Who's paid this month"
            secondary
            testId="hall-manage-dues"
          />
          <HubTile
            href="/hall/logbook"
            icon={BookOpen}
            title="Logbook"
            description="What happened in the hall"
            secondary
            testId="hall-manage-log"
          />
          <HubTile
            href="/hall/history"
            icon={History}
            title="Meal history"
            description="What the crew cooked"
            secondary
            testId="hall-manage-history"
          />
          <HubTile
            href="/hall/protein-deals"
            icon={Tag}
            title="Protein deals"
            description="Sales near your station"
            secondary
            testId="hall-manage-deals"
          />
          <HubTile
            href={settingsHref}
            icon={Settings}
            title="Hall settings"
            description="Members, invites, and hall profile"
            secondary
            testId="hall-manage-settings"
          />
        </div>
      </section>

      <HallLastMealsSection
        activeHallId={data.activeHallId}
        recentlyCooked={data.recentlyCooked}
        favorites={data.favorites}
        onRemoveFavorite={(slug) => {
          const favorite = data.favorites.find((item) => item.slug === slug);
          if (favorite && removeHallFavorite(slug)) {
            trackHallFavoriteRemoved({
              recipe_slug: favorite.slug,
              recipe_title: favorite.title,
              source: "hall_dashboard",
              favorite_count: getHallFavoritesCount(),
            });
          }
        }}
      />
    </div>
  );
}
