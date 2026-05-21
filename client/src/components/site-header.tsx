import { Flame, Heart } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

interface SiteHeaderProps {
  activePage: "generator" | "pizza" | "explore" | "wheel" | "favorites";
  favCount?: number;
}

export function SiteHeader({ activePage, favCount = 0 }: SiteHeaderProps) {
  const navItems = [
    { key: "generator" as const, label: "Meal Generator", href: "/" },
    { key: "wheel" as const, label: "Classics Wheel", href: "/wheel" },
    { key: "pizza" as const, label: "Pizza Night", href: "/pizza" },
    { key: "explore" as const, label: "Explore", href: "/explore" },
  ];

  return (
    <header
      className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/30"
      data-testid="site-header"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <nav
          className="flex items-center justify-between h-14 sm:h-16"
          data-testid="nav-links"
        >
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group" data-testid="nav-logo">
            <Flame className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-200 group-hover:scale-110" style={{ color: "#C62828" }} />
            <span
              className="font-heading text-[20px] sm:text-[24px] leading-none tracking-[0.5px] text-foreground hidden sm:inline"
              style={{ letterSpacing: "0.5px" }}
            >
              FIREHALL MEALS
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {navItems.map((item) => {
              const isActive = activePage === item.key;
              return isActive ? (
                <span
                  key={item.key}
                  className="text-[13px] sm:text-[14px] uppercase tracking-wider text-foreground font-semibold px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20"
                  data-testid={`nav-link-${item.key}-active`}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  key={item.key}
                  href={item.href}
                  className="text-[13px] sm:text-[14px] uppercase tracking-wider text-muted-foreground font-medium px-3 py-1.5 rounded-md hover:text-foreground hover:bg-white/[0.04] transition-all duration-200"
                  data-testid={`nav-link-${item.key}`}
                >
                  {item.label}
                </Link>
              );
            })}

            {activePage === "favorites" ? (
              <span
                className="text-[13px] sm:text-[14px] uppercase tracking-wider text-foreground font-semibold px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 flex items-center gap-1.5"
                data-testid="nav-link-favorites-active"
              >
                <Heart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Favorites</span>
              </span>
            ) : (
              <Link
                href="/favorites"
                className="text-[13px] sm:text-[14px] uppercase tracking-wider text-muted-foreground font-medium px-3 py-1.5 rounded-md hover:text-foreground hover:bg-white/[0.04] transition-all duration-200 flex items-center gap-1.5"
                data-testid="nav-link-favorites"
              >
                <Heart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Favorites</span>
                {favCount > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 min-w-[16px] leading-none" data-testid="badge-fav-count">
                    {favCount}
                  </Badge>
                )}
              </Link>
            )}

            <span className="text-border/40 mx-1 sm:mx-1.5 hidden sm:inline select-none">·</span>
            <a
              href="https://www.lightsandsirensco.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] sm:text-[12px] tracking-wide text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors duration-200 font-normal px-1.5 py-1 inline-flex items-center gap-1 whitespace-nowrap leading-none"
              data-testid="nav-link-brand"
            >
              <Flame className="w-2.5 h-2.5 shrink-0" style={{ color: "#C62828" }} />
              <span className="hidden sm:inline">Lights & Sirens Co.</span>
              <span className="sm:hidden">L&S Co.</span>
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
