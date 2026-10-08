import { useEffect, useMemo, useState } from "react";
import {
  getHallFavorites,
  isHallFavorite,
  HALL_FAVORITES_CHANGED_EVENT,
} from "@/lib/hall-favorites-store";
import { getMostCookedMeals } from "@/lib/hall-history-store";
import { HALL_HISTORY_CHANGED_EVENT } from "@/lib/hall-history-store";

export function useHallFavorites() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(HALL_FAVORITES_CHANGED_EVENT, bump);
    window.addEventListener(HALL_HISTORY_CHANGED_EVENT, bump);
    return () => {
      window.removeEventListener(HALL_FAVORITES_CHANGED_EVENT, bump);
      window.removeEventListener(HALL_HISTORY_CHANGED_EVENT, bump);
    };
  }, []);

  return useMemo(() => {
    const favorites = getHallFavorites();
    return {
      favorites,
      count: favorites.length,
      isFavorite: isHallFavorite,
      mostCooked: getMostCookedMeals(),
    };
  }, [version]);
}
