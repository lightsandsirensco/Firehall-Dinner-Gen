import { Building2, CalendarClock, Compass, ShoppingCart, User, UtensilsCrossed } from "lucide-react";
import { Link, useLocation } from "wouter";
import { isTabActive, primaryTabsFor, type AppTab } from "@/lib/app-nav";
import { useSignedInNav } from "@/hooks/use-signed-in-nav";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";

const TAB_ICONS: Record<AppTab, typeof UtensilsCrossed> = {
  tonight: UtensilsCrossed,
  shift: CalendarClock,
  explore: Compass,
  list: ShoppingCart,
  hall: Building2,
  me: User,
};

/**
 * Primary in-app destinations. Signed in: Shift · Explore · List · Me.
 * Signed out: Tonight · Explore · Me. Home (the logo) is the landing page.
 */
export function BottomTabBar() {
  const [location] = useLocation();
  const signedIn = useSignedInNav();
  const tabs = primaryTabsFor(signedIn);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/92 backdrop-blur-xl pb-safe"
      aria-label="Main navigation"
      data-testid="bottom-tab-bar"
      data-nav={signedIn ? "signed-in" : "signed-out"}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-0.5 pt-1">
        {tabs.map((tab) => {
          const Icon = TAB_ICONS[tab.id];
          const active = isTabActive(tab.id, location, signedIn);
          return (
            <Link
              key={tab.testId}
              href={tab.href}
              onClick={() => hapticLight()}
              className={cn(
                "flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-all duration-200 ease-out touch-manipulation sm:text-[11px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground",
              )}
              data-testid={tab.testId}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5 transition-transform duration-200 ease-out", active && "scale-110")} aria-hidden />
              <span className="truncate max-w-full">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
