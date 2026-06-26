import { useEffect } from "react";
import { Link } from "wouter";
import { Flame, History, RotateCw, Trophy, Vote } from "lucide-react";
import { HallDashboardSection } from "@/components/hall-dashboard/v2/hall-dashboard-section";
import { ShiftDashboardHeader } from "./shift-dashboard-header";
import { ShiftDashboardActions } from "./shift-dashboard-actions";
import { ShiftStatsGrid } from "./shift-stats-grid";
import { ShiftShoppingListCard } from "./shift-shopping-list-card";
import { ShiftMealTimeline } from "./shift-meal-timeline";
import { HallClassicCard } from "@/components/hall-favorites/hall-classic-card";
import { HallPermissionGate } from "@/components/hall-membership/hall-permission-gate";
import { useShiftDashboard } from "@/hooks/use-shift-dashboard";
import {
  getHallFavoritesCount,
  removeHallFavorite,
} from "@/lib/hall-favorites-store";
import { trackHallFavoriteRemoved, trackShiftDashboardViewed, trackShiftMealSelected } from "@/lib/analytics";
import { HALL_LINKED, SHIFT_DASHBOARD } from "@/lib/brand-copy";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { cn } from "@/lib/utils";

function HallFeatureLocked({ feature }: { feature: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
      {HALL_LINKED.connect} to use shared {feature}.{" "}
      <Link href="/hall/join" className="text-primary hover:underline font-medium">
        {HALL_LINKED.join}
      </Link>
    </div>
  );
}

interface ShiftDashboardProps {
  hallId: string;
  shiftId: string;
  className?: string;
}

export function ShiftDashboard({ hallId, shiftId, className }: ShiftDashboardProps) {
  const data = useShiftDashboard(hallId, shiftId);

  useEffect(() => {
    if (!hallId || !shiftId || data.loading || data.notFound) return;
    trackShiftDashboardViewed({
      hall_id: hallId,
      shift_id: shiftId,
      shift_name: data.shiftName,
      member_count: data.memberCount,
      meals_this_month: data.stats.mealsThisMonth,
      votes_this_month: data.stats.votesThisMonth,
      longest_meal_streak: data.stats.longestMealStreak,
    });
  }, [
    hallId,
    shiftId,
    data.loading,
    data.notFound,
    data.shiftName,
    data.memberCount,
    data.stats.mealsThisMonth,
    data.stats.votesThisMonth,
    data.stats.longestMealStreak,
  ]);

  if (data.loading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/30 px-4 py-12 text-center text-sm text-muted-foreground">
        Loading shift crew…
      </div>
    );
  }

  if (data.notFound) {
    return (
      <div
        className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-4 py-10 text-center"
        data-testid="shift-dashboard-not-found"
      >
        <p className="text-sm text-muted-foreground mb-4">This shift wasn&apos;t found in your linked hall.</p>
        <Link href="/hall" className="text-sm font-medium text-primary hover:underline">
          {HALL_LINKED.linked}
        </Link>
      </div>
    );
  }

  const mostCookedHref = data.mostCooked
    ? data.mostCooked.recipePath ??
      (data.mostCooked.slug ? approvedCatalogRecipePath(data.mostCooked.slug) : undefined)
    : undefined;

  return (
    <div className={cn("space-y-4 pb-2", className)} data-testid="shift-dashboard">
      <ShiftDashboardHeader
        hallName={data.hallName}
        shiftName={data.shiftName}
        crewSize={data.crewSize}
        members={data.shiftMembers}
        hallId={hallId}
      />

      <ShiftDashboardActions hallId={hallId} shiftId={shiftId} />

      <ShiftStatsGrid
        mealsThisMonth={data.stats.mealsThisMonth}
        votesThisMonth={data.stats.votesThisMonth}
        longestMealStreak={data.stats.longestMealStreak}
      />

      <HallDashboardSection
        id="shift-recently-cooked"
        title={SHIFT_DASHBOARD.recentlyCooked}
        icon={<History className="w-4 h-4" />}
        action={{ label: "Hall history", href: "/hall-history" }}
        testId="shift-recently-cooked-section"
      >
        <ShiftMealTimeline
          entries={data.recentlyCooked}
          hallId={hallId}
          shiftId={shiftId}
          emptyMessage={SHIFT_DASHBOARD.emptyRecentlyCooked}
        />
      </HallDashboardSection>

      <HallPermissionGate
        permission="save_hall_favorites"
        allowGuest
        fallback={<HallFeatureLocked feature="crew favorites" />}
      >
        <HallDashboardSection
          id="shift-favorites"
          title={SHIFT_DASHBOARD.favorites}
          icon={<Flame className="w-4 h-4" />}
          action={{ label: SHIFT_DASHBOARD.manageFavorites, href: "/favorites" }}
          testId="shift-favorites-section"
        >
          {data.favorites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {SHIFT_DASHBOARD.emptyFavorites}
            </p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {data.favorites.slice(0, 4).map((favorite) => (
                <HallClassicCard
                  key={favorite.slug}
                  favorite={favorite}
                  onRemove={() => {
                    if (removeHallFavorite(favorite.slug)) {
                      trackHallFavoriteRemoved({
                        recipe_slug: favorite.slug,
                        recipe_title: favorite.title,
                        source: "shift_dashboard",
                        favorite_count: getHallFavoritesCount(),
                      });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </HallDashboardSection>
      </HallPermissionGate>

      <HallDashboardSection
        id="shift-most-cooked"
        title={SHIFT_DASHBOARD.mostCookedMeal}
        icon={<Trophy className="w-4 h-4" />}
        testId="shift-most-cooked-section"
      >
        {data.mostCooked ? (
          <div className="space-y-1">
            {mostCookedHref ? (
              <Link
                href={mostCookedHref}
                className="font-medium text-foreground hover:text-primary line-clamp-2"
                onClick={() => {
                  trackShiftMealSelected({
                    hall_id: hallId,
                    shift_id: shiftId,
                    recipe_slug: data.mostCooked?.slug,
                    recipe_title: data.mostCooked!.title,
                    source: "most_cooked",
                  });
                }}
              >
                {data.mostCooked.title}
              </Link>
            ) : (
              <p className="font-medium text-foreground line-clamp-2">{data.mostCooked.title}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Cooked {data.mostCooked.cookCount} time{data.mostCooked.cookCount === 1 ? "" : "s"} on
              this shift
            </p>
            <p className="text-xs text-muted-foreground">
              Last cooked{" "}
              {new Date(data.mostCooked.lastCookedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{SHIFT_DASHBOARD.emptyMostCooked}</p>
        )}
      </HallDashboardSection>

      <HallDashboardSection
        id="shift-wheel-history"
        title={SHIFT_DASHBOARD.wheelHistory}
        icon={<RotateCw className="w-4 h-4" />}
        action={{ label: "Spin wheel", href: "/wheel" }}
        testId="shift-wheel-history-section"
      >
        {data.wheelResults.length === 0 ? (
          <p className="text-sm text-muted-foreground">{SHIFT_DASHBOARD.emptyWheelHistory}</p>
        ) : (
          <ul className="space-y-2">
            {data.wheelResults.map((entry) => {
              const href =
                entry.recipePath ??
                (entry.recipeSlug ? approvedCatalogRecipePath(entry.recipeSlug) : undefined);
              return (
                <li
                  key={entry.id}
                  className="rounded-xl border border-border/35 bg-background/40 px-3 py-2.5 text-sm"
                >
                  {href ? (
                    <Link href={href} className="font-medium hover:text-primary line-clamp-2">
                      {entry.title}
                    </Link>
                  ) : (
                    <p className="font-medium line-clamp-2">{entry.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(entry.at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </HallDashboardSection>

      <HallDashboardSection
        id="shift-recent-votes"
        title={SHIFT_DASHBOARD.recentVotes}
        icon={<Vote className="w-4 h-4" />}
        testId="shift-recent-votes-section"
      >
        {data.recentVotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{SHIFT_DASHBOARD.emptyRecentVotes}</p>
        ) : (
          <ul className="space-y-2">
            {data.recentVotes.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-border/35 bg-background/40 px-3 py-2.5 text-sm"
              >
                {entry.meta?.voteId ? (
                  <Link href={`/vote/${entry.meta.voteId}`} className="font-medium hover:text-primary">
                    {entry.title}
                  </Link>
                ) : (
                  <p className="font-medium">{entry.title}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {entry.meta?.optionCount
                    ? `${entry.meta.optionCount} options · `
                    : ""}
                  {new Date(entry.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </HallDashboardSection>

      <ShiftShoppingListCard hallId={hallId} />
    </div>
  );
}
