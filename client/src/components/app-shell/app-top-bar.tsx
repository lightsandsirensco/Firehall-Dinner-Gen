import { Flame, UtensilsCrossed } from "lucide-react";
import { Link, useLocation } from "wouter";
import { BRAND_NAME } from "@/lib/brand-copy";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { HOME, TONIGHT, resolveAppTab } from "@/lib/app-nav";

interface AppTopBarProps {
  title?: string;
  parentHref?: string;
  parentLabel?: string;
  className?: string;
  /** @deprecated Ignored — every shift starts at Home */
  experience?: string;
  /** @deprecated Ignored — every shift starts at Home */
  workspace?: string;
}

/**
 * One product chrome. The brand logo always returns to the one true Home
 * (the landing page at "/"); the Tonight chip returns to the dashboard.
 */
export function AppTopBar({
  title,
  parentHref,
  parentLabel,
  className,
}: AppTopBarProps) {
  const [location] = useLocation();
  const tab = resolveAppTab(location);
  const onTonight =
    location === TONIGHT || location.startsWith(`${TONIGHT}?`);

  const sectionTitle =
    title ??
    (tab === "explore"
      ? "Explore"
      : tab === "hall"
        ? "Hall"
        : tab === "me"
          ? "Me"
          : null);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/30 bg-background/85 pt-safe backdrop-blur-xl",
        className,
      )}
      data-testid="app-top-bar"
    >
      <div className={cn(app.main, "flex h-12 items-center justify-between gap-2 sm:h-14")}>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <Link
            href={HOME}
            className="group flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-1 py-1 touch-manipulation hover-elevate"
            data-testid="app-top-logo"
            aria-label={`${BRAND_NAME} — Home`}
          >
            <Flame className="h-5 w-5 text-primary transition-transform group-active:scale-95" aria-hidden />
            <span className="font-heading text-base tracking-wide sm:text-lg">{BRAND_NAME}</span>
          </Link>

          {parentHref && parentLabel ? (
            <>
              <span className="text-muted-foreground/50 select-none" aria-hidden>
                /
              </span>
              <Link
                href={parentHref}
                className="min-h-11 shrink-0 truncate rounded-lg px-1.5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground touch-manipulation"
                data-testid="app-top-parent"
              >
                {parentLabel}
              </Link>
            </>
          ) : null}

          {sectionTitle && !onTonight ? (
            <>
              <span className="text-muted-foreground/50 select-none" aria-hidden>
                /
              </span>
              <span
                className="truncate text-sm font-semibold text-primary sm:text-base"
                data-testid="app-top-section"
              >
                {sectionTitle}
              </span>
            </>
          ) : null}
        </div>

        {!onTonight ? (
          <Link
            href={TONIGHT}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-primary/35 bg-primary/10 px-3 text-xs font-semibold text-foreground touch-manipulation hover-elevate active-elevate-2"
            data-testid="app-top-tonight"
            aria-label="Go to Tonight — your shift's meal planning"
          >
            <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
            <span>Tonight</span>
          </Link>
        ) : null}
      </div>
    </header>
  );
}
