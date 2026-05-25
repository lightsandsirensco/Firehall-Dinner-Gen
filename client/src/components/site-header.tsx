import { useState } from "react";
import { Flame, Heart, Menu } from "lucide-react";
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

interface SiteHeaderProps {
  activePage: "generator" | "pizza" | "explore" | "wheel" | "favorites";
  favCount?: number;
}

export function SiteHeader({ activePage, favCount = 0 }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [, navigate] = useLocation();

  const navItems = [
    { key: "generator" as const, label: "Generator", short: "Gen", href: "/" },
    { key: "wheel" as const, label: "Classics Wheel", short: "Wheel", href: "/wheel" },
    { key: "pizza" as const, label: "Pizza Night", short: "Pizza", href: "/pizza" },
    { key: "explore" as const, label: "Explore", short: "Explore", href: "/explore" },
  ];

  const go = (href: string) => {
    setMenuOpen(false);
    navigate(href);
  };

  return (
    <header
      className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/30 pt-safe"
      data-testid="site-header"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <nav
          className="flex items-center justify-between h-14 sm:h-16 gap-2"
          data-testid="nav-links"
        >
          <Link href="/" className="flex items-center gap-2 shrink-0 group min-h-11 min-w-11" data-testid="nav-logo">
            <Flame
              className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-200 group-hover:scale-110"
              style={{ color: "#C62828" }}
            />
            <span
              className="font-heading text-lg sm:text-[24px] leading-none tracking-[0.5px] text-foreground"
              style={{ letterSpacing: "0.5px" }}
            >
              <span className="sm:hidden">FIREHALL</span>
              <span className="hidden sm:inline">FIREHALL MEALS</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activePage === item.key;
              return isActive ? (
                <span
                  key={item.key}
                  className="text-[13px] sm:text-[14px] uppercase tracking-wider text-foreground font-semibold px-3 py-2 rounded-md bg-primary/10 border border-primary/20 min-h-10 inline-flex items-center"
                  data-testid={`nav-link-${item.key}-active`}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  key={item.key}
                  href={item.href}
                  className="text-[13px] sm:text-[14px] uppercase tracking-wider text-muted-foreground font-medium px-3 py-2 rounded-md hover:text-foreground hover:bg-white/[0.04] transition-all duration-200 min-h-10 inline-flex items-center"
                  data-testid={`nav-link-${item.key}`}
                >
                  {item.label}
                </Link>
              );
            })}

            {activePage === "favorites" ? (
              <span
                className="text-[13px] uppercase tracking-wider text-foreground font-semibold px-3 py-2 rounded-md bg-primary/10 border border-primary/20 flex items-center gap-1.5 min-h-10"
                data-testid="nav-link-favorites-active"
              >
                <Heart className="w-3.5 h-3.5" />
                Favorites
              </span>
            ) : (
              <Link
                href="/favorites"
                className="text-[13px] uppercase tracking-wider text-muted-foreground font-medium px-3 py-2 rounded-md hover:text-foreground hover:bg-white/[0.04] transition-all duration-200 flex items-center gap-1.5 min-h-10"
                data-testid="nav-link-favorites"
              >
                <Heart className="w-3.5 h-3.5" />
                Favorites
                {favCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1.5 py-0 h-4 min-w-[16px] leading-none"
                    data-testid="badge-fav-count"
                  >
                    {favCount}
                  </Badge>
                )}
              </Link>
            )}

            <span className="text-border/40 mx-1 select-none">·</span>
            <a
              href="https://www.lightsandsirensco.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] tracking-wide text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors px-1.5 py-1 inline-flex items-center gap-1 whitespace-nowrap"
              data-testid="nav-link-brand"
            >
              <Flame className="w-2.5 h-2.5 shrink-0" style={{ color: "#C62828" }} />
              Lights & Sirens Co.
            </a>
          </div>

          {/* Mobile: favorites + menu */}
          <div className="flex md:hidden items-center gap-1">
            {activePage !== "favorites" && (
              <Link
                href="/favorites"
                className="relative flex items-center justify-center min-h-11 min-w-11 rounded-lg hover:bg-white/[0.06] active:bg-white/[0.1] touch-manipulation"
                data-testid="nav-link-favorites-mobile"
                aria-label="Favorites"
              >
                <Heart className="w-5 h-5 text-muted-foreground" />
                {favCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-1">
                    {favCount > 9 ? "9+" : favCount}
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
              <SheetContent side="right" className="w-[min(100vw-2rem,320px)] pb-safe">
                <SheetHeader>
                  <SheetTitle className="font-heading text-left tracking-wide text-xl">
                    Firehall Meals
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
                          "w-full text-left rounded-xl px-4 py-3.5 text-sm font-semibold uppercase tracking-wider min-h-[52px] touch-manipulation transition-colors",
                          isActive
                            ? "bg-primary/15 text-primary border border-primary/25"
                            : "text-foreground hover:bg-muted/60 active:bg-muted",
                        )}
                        data-testid={`nav-mobile-${item.key}`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => go("/favorites")}
                    className={cn(
                      "w-full text-left rounded-xl px-4 py-3.5 text-sm font-semibold uppercase tracking-wider min-h-[52px] touch-manipulation flex items-center gap-2",
                      activePage === "favorites"
                        ? "bg-primary/15 text-primary border border-primary/25"
                        : "text-foreground hover:bg-muted/60",
                    )}
                    data-testid="nav-mobile-favorites"
                  >
                    <Heart className="w-4 h-4" />
                    Favorites
                    {favCount > 0 && (
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        {favCount}
                      </Badge>
                    )}
                  </button>
                </nav>
                <div className="mt-8 pt-6 border-t border-border/40">
                  <a
                    href="https://www.lightsandsirensco.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground flex items-center gap-2 min-h-11"
                  >
                    <Flame className="w-3 h-3 text-primary" />
                    Lights & Sirens Co.
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
}
