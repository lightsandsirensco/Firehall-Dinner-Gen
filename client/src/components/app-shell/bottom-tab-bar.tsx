import { Building2, Flame, Home, User, UtensilsCrossed } from "lucide-react";
import { Link, useLocation } from "wouter";
import { APP_TABS, isTabActive, type AppTab } from "@/lib/app-nav";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";

const TAB_ICONS: Record<AppTab, typeof Home> = {
  home: Home,
  tonight: UtensilsCrossed,
  explore: Flame,
  hall: Building2,
  me: User,
};

export function BottomTabBar() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/92 backdrop-blur-xl pb-safe"
      aria-label="Main navigation"
      data-testid="bottom-tab-bar"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-0.5 pt-1">
        {APP_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.id];
          const active = isTabActive(tab.id, location);
          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={() => hapticLight()}
              className={cn(
                "flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors touch-manipulation sm:text-[11px]",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              data-testid={tab.testId}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5", active && "scale-105")} aria-hidden />
              <span className="truncate max-w-full">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
