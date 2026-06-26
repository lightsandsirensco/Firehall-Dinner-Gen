import { useEffect } from "react";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";
import { useHallMembership } from "@/lib/hall-membership/context";

/** Legacy `/hall/shopping-list` → hall settings shopping panel or join flow. */
export default function HallShoppingListRedirect() {
  const { activeHallId } = useHallMembership();

  useEffect(() => {
    const target = activeHallId
      ? `/halls/${activeHallId}#hall-shared-shopping-list`
      : "/hall/join";
    window.location.replace(target);
  }, [activeHallId]);

  return <RouteLoadingFallback />;
}
