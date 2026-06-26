import { Flame } from "lucide-react";
import { Link } from "wouter";
import { BRAND_NAME } from "@/lib/brand-copy";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { resolveAppTab } from "@/lib/app-nav";
import { useLocation } from "wouter";

const TAB_TITLES = {
  home: "Home",
  tonight: "Tonight",
  explore: "Explore",
  hall: "Hall",
  me: "Me",
} as const;

interface AppTopBarProps {
  title?: string;
  className?: string;
}

export function AppTopBar({ title, className }: AppTopBarProps) {
  const [location] = useLocation();
  const tab = resolveAppTab(location);
  const heading = title ?? (tab ? TAB_TITLES[tab] : BRAND_NAME);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/30 bg-background/85 pt-safe backdrop-blur-xl",
        className,
      )}
      data-testid="app-top-bar"
    >
      <div className={cn(app.main, "flex h-12 items-center justify-between gap-3 sm:h-14")}>
        <Link href="/home" className="flex min-h-10 shrink-0 items-center gap-2" data-testid="app-top-logo">
          <Flame className="h-5 w-5 text-primary" aria-hidden />
          <span className="font-heading text-base tracking-wide sm:text-lg">{heading}</span>
        </Link>
      </div>
    </header>
  );
}
