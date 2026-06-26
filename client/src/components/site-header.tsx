import { useState, useEffect } from "react";
import { Flame, Heart, Menu, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { hapticLight } from "@/lib/haptics";
import { BRAND_NAME, CTA, HALL_LINKED, NAV } from "@/lib/brand-copy";
import { LightsAndSirensMobilePanel } from "@/components/brand/lights-and-sirens-mobile-panel";
import { LightsAndSirensLink } from "@/components/brand/lights-and-sirens-link";
import {
  getHallFavoritesCount,
  HALL_FAVORITES_CHANGED_EVENT,
} from "@/lib/hall-favorites-store";
import { useAuth } from "@/lib/auth/context";

export type SiteHeaderActivePage =
  | "home"
  | "generator"
  | "explore"
  | "smoothies"
  | "breakfast"
  | "performance"
  | "guides"
  | "faq"
  | "wheel"
  | "pizza"
  | "favorites"
  | "hall";

interface SiteHeaderProps {
  activePage: SiteHeaderActivePage;
  favCount?: number;
}

export function SiteHeader({ activePage, favCount }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [, navigate] = useLocation();
  const { authenticated, openSignIn } = useAuth();
  const [badgeCount, setBadgeCount] = useState(() => favCount ?? getHallFavoritesCount());

  useEffect(() => {
    const sync = () => setBadgeCount(getHallFavoritesCount());
    sync();
    window.addEventListener(HALL_FAVORITES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(HALL_FAVORITES_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (favCount != null) setBadgeCount(favCount);
  }, [favCount]);

  const navItems: Array<{ key: SiteHeaderActivePage; label: string; href: string }> = [
    { key: "home", label: NAV.home, href: "/" },
    { key: "generator", label: NAV.generator, href: "/generator" },
    { key: "explore", label: NAV.explore, href: "/explore" },
    { key: "wheel", label: NAV.wheel, href: "/wheel" },
    { key: "pizza", label: NAV.pizza, href: "/pizza" },
    { key: "guides", label: NAV.ideas, href: "/guides" },
  ];

  const go = (href: string) => {
    hapticLight();
    setMenuOpen(false);
    navigate(href);
  };

  const linkClass = (active: boolean) =>
    cn(
      "text-sm font-medium px-3 py-2 rounded-lg min-h-10 inline-flex items-center transition-colors",
      active
        ? "text-foreground bg-muted/50"
        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
    );

  const brand = (
    <>
      <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-primary transition-transform group-active:scale-95 shrink-0" />
      <span className="font-heading text-base sm:text-lg leading-none tracking-wide text-foreground whitespace-nowrap">
        {BRAND_NAME}
      </span>
    </>
  );

  return (
    <header
      className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border/30 pt-safe"
      data-testid="site-header"
    >
      <div className={app.main}>
        <nav
          className="flex items-center justify-between h-12 sm:h-14 gap-2"
          data-testid="nav-links"
        >
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 group min-h-10 min-w-0"
            data-testid="nav-logo"
          >
            {brand}
          </Link>

          <div className="hidden lg:flex items-center gap-2 shrink-0 mr-2">
            <LightsAndSirensLink variant="badge" className="hidden xl:inline-flex">
              L&amp;S Co.
            </LightsAndSirensLink>
          </div>

          <div className="hidden xl:flex items-center gap-0.5 flex-1 justify-center min-w-0">
            {navItems.map((item) => {
              const isActive = activePage === item.key;
              return isActive ? (
                <span
                  key={item.key}
                  className={linkClass(true)}
                  data-testid={`nav-link-${item.key}-active`}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  key={item.key}
                  href={item.href}
                  className={linkClass(false)}
                  data-testid={`nav-link-${item.key}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => (authenticated ? navigate("/account") : openSignIn())}
              className={cn(linkClass(false), "gap-1.5")}
              data-testid="nav-link-account"
              aria-label={authenticated ? "Your account" : "Sign in"}
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{authenticated ? "Account" : "Sign in"}</span>
            </button>

            {activePage === "hall" || activePage === "favorites" ? (
              <span
                className={cn(linkClass(true), "gap-1.5")}
                data-testid="nav-link-hall-active"
              >
                <Heart className="w-3.5 h-3.5" />
                {NAV.hall}
              </span>
            ) : (
              <Link
                href="/hall"
                className={cn(linkClass(false), "gap-1.5")}
                data-testid="nav-link-hall"
              >
                <Heart className="w-3.5 h-3.5" />
                {NAV.hall}
                {badgeCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 h-4 min-w-[16px] leading-none"
                    data-testid="badge-fav-count"
                  >
                    {badgeCount}
                  </Badge>
                )}
              </Link>
            )}

            {activePage !== "generator" && (
              <Button asChild size="sm" className="font-heading tracking-wide text-xs uppercase">
                <Link href="/generator" data-testid="nav-cta-generator">
                  {CTA.findDinner}
                </Link>
              </Button>
            )}
          </div>

          <div className="flex md:hidden items-center gap-0.5 shrink-0">
            {activePage !== "generator" && (
              <Button asChild size="sm" className="h-9 px-3 text-[11px] font-heading uppercase tracking-wide">
                <Link href="/generator" data-testid="nav-cta-generator-mobile">
                  {CTA.findDinner}
                </Link>
              </Button>
            )}

            {activePage !== "hall" && activePage !== "favorites" && (
              <Link
                href="/hall"
                className="relative flex items-center justify-center min-h-11 min-w-11 rounded-lg hover:bg-muted/40 touch-manipulation"
                data-testid="nav-link-hall-mobile"
                aria-label={HALL_LINKED.linked}
              >
                <Heart className="w-5 h-5 text-muted-foreground" />
                {badgeCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-1">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </Link>
            )}

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11 touch-manipulation"
                  aria-label="Open menu"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(100vw-2rem,300px)] pb-safe scroll-momentum">
                <SheetHeader>
                  <SheetTitle className="font-heading text-left text-xl tracking-wide flex items-center gap-2">
                    <Flame className="w-5 h-5 text-primary" />
                    {BRAND_NAME}
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 mt-6" aria-label="Mobile navigation">
                  {navItems.map((item) => {
                    const isActive = activePage === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => go(item.href)}
                        className={cn(
                          "w-full text-left rounded-xl px-4 py-3.5 text-base font-medium min-h-[52px] touch-manipulation",
                          isActive
                            ? "bg-primary/12 text-foreground"
                            : "text-foreground hover:bg-muted/50",
                        )}
                        data-testid={`nav-mobile-${item.key}`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setMenuOpen(false);
                      if (authenticated) navigate("/account");
                      else openSignIn();
                    }}
                    className={cn(
                      "w-full text-left rounded-xl px-4 py-3.5 text-base font-medium min-h-[52px] touch-manipulation flex items-center gap-2",
                      "text-foreground hover:bg-muted/50",
                    )}
                    data-testid="nav-mobile-account"
                  >
                    <User className="w-4 h-4" />
                    {authenticated ? "Account" : "Sign in"}
                  </button>
                  <button
                    type="button"
                    onClick={() => go("/hall")}
                    className={cn(
                      "w-full text-left rounded-xl px-4 py-3.5 text-base font-medium min-h-[52px] touch-manipulation flex items-center gap-2",
                      activePage === "hall" || activePage === "favorites"
                        ? "bg-primary/12 text-foreground"
                        : "text-foreground hover:bg-muted/50",
                    )}
                    data-testid="nav-mobile-hall"
                  >
                    <Heart className="w-4 h-4" />
                    {NAV.hall}
                    {badgeCount > 0 && (
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        {badgeCount}
                      </Badge>
                    )}
                  </button>
                  {activePage !== "generator" && (
                    <Button
                      className="mt-4 w-full font-heading uppercase tracking-wide"
                      onClick={() => go("/generator")}
                      data-testid="nav-mobile-cta-generator"
                    >
                      {CTA.findDinner}
                    </Button>
                  )}
                  <LightsAndSirensMobilePanel />
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
}
