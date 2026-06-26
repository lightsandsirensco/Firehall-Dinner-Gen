import { HallIdentityHeader } from "./hall-identity-header";
import { HallTonightSection } from "./hall-tonight-section";
import { HallShoppingListSection } from "./hall-shopping-list-section";
import { HallNeedAnythingCard } from "./hall-need-anything-card";
import { HallLastMealsSection } from "./hall-last-meals-section";
import { HallNotesSection } from "@/components/hall-notes/hall-notes-section";
import {
  getHallFavoritesCount,
  removeHallFavorite,
} from "@/lib/hall-favorites-store";
import { trackHallFavoriteRemoved } from "@/lib/analytics";
import { useHallDashboard } from "@/hooks/use-hall-dashboard";
import { cn } from "@/lib/utils";

interface HallDashboardV2Props {
  className?: string;
}

export function HallDashboardV2({ className }: HallDashboardV2Props) {
  const data = useHallDashboard();

  return (
    <div className={cn("space-y-5 pb-2", className)} data-testid="hall-dashboard">
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

      <HallTonightSection />
      <HallShoppingListSection activeHallId={data.activeHallId} />
      <HallNeedAnythingCard activeHallId={data.activeHallId} />
      <HallNotesSection activeHallId={data.activeHallId} limit={3} showComposer={false} />
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
