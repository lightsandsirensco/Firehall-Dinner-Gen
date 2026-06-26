import { Link } from "wouter";
import { Flame, History } from "lucide-react";
import { HallDashboardSection } from "./hall-dashboard-section";
import { HallHistoryTimeline } from "@/components/hall-history/hall-history-timeline";
import { HallClassicCard } from "@/components/hall-favorites/hall-classic-card";
import { HallPermissionGate } from "@/components/hall-membership/hall-permission-gate";
import type { HallFavorite } from "@shared/hall-favorites/types";
import type { HallHistoryEntry } from "@shared/hall-profile/types";
import { HALL_DASHBOARD, HALL_FAVORITES, HALL_HISTORY, HALL_LINKED } from "@/lib/brand-copy";

interface HallLastMealsSectionProps {
  activeHallId: string | null;
  recentlyCooked: HallHistoryEntry[];
  favorites: HallFavorite[];
  onRemoveFavorite: (slug: string) => void;
}

function HallFeatureLocked({ feature }: { feature: string }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-4">
      {HALL_LINKED.connect} to use shared {feature}.
    </p>
  );
}

export function HallLastMealsSection({
  activeHallId,
  recentlyCooked,
  favorites,
  onRemoveFavorite,
}: HallLastMealsSectionProps) {
  const cooked = recentlyCooked.slice(0, 5);
  const hasContent = cooked.length > 0 || favorites.length > 0;

  return (
    <HallDashboardSection
      id="hall-last-meals"
      title={HALL_DASHBOARD.lastMeals}
      icon={<History className="w-4 h-4" />}
      action={{ label: HALL_HISTORY.seeAll, href: "/hall/history" }}
      testId="hall-last-meals-section"
    >
      {!hasContent ? (
        <p className="text-sm text-muted-foreground text-center py-6 leading-relaxed">
          {HALL_DASHBOARD.emptyLastMeals}
        </p>
      ) : (
        <div className="space-y-6">
          {cooked.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
                {HALL_DASHBOARD.lastMealsCooked}
              </h3>
              <HallHistoryTimeline entries={cooked} emptyMessage={HALL_HISTORY.empty} />
            </div>
          ) : null}

          <HallPermissionGate
            permission="save_hall_favorites"
            allowGuest
            fallback={<HallFeatureLocked feature="favorites" />}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" aria-hidden />
                  {HALL_DASHBOARD.hallFavorites}
                </h3>
                {favorites.length > 0 ? (
                  <Link
                    href="/me/saved"
                    className="text-xs font-medium text-primary hover:underline min-h-11 inline-flex items-center px-2"
                  >
                    {HALL_DASHBOARD.manageFavorites}
                  </Link>
                ) : null}
              </div>
              {favorites.length === 0 ? (
                <p className="text-sm text-muted-foreground">{HALL_FAVORITES.emptyClassics}</p>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {favorites.slice(0, 4).map((favorite) => (
                    <HallClassicCard
                      key={favorite.slug}
                      favorite={favorite}
                      onRemove={() => onRemoveFavorite(favorite.slug)}
                    />
                  ))}
                </div>
              )}
            </div>
          </HallPermissionGate>
        </div>
      )}
    </HallDashboardSection>
  );
}
