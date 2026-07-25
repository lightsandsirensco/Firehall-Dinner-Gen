import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { WorkflowExit } from "@/components/app-shell/workflow-exit";
import { hallSectionTitle } from "@/components/hall/hall-sub-nav";
import { SiteFooter } from "@/components/site-footer";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useNoIndex } from "@/lib/seo/use-noindex";

interface HallShellProps {
  children: ReactNode;
  title?: string;
  hideSubNav?: boolean;
  className?: string;
  testId?: string;
}

/**
 * Hall chrome — the brand logo returns to Home (the landing page).
 * Deep pages parent to Hall; exit always offers Tonight.
 */
export function HallShell({
  children,
  title,
  hideSubNav = false,
  className,
  testId,
}: HallShellProps) {
  useNoIndex();
  const [location] = useLocation();
  const section = title ?? hallSectionTitle(location);
  const onHallRoot = location === "/hall" || location.startsWith("/hall?");

  return (
    <div className={cn(app.page, "bg-background")} data-testid={testId ?? "hall-shell"}>
      <AppTopBar
        title={onHallRoot ? "Hall" : section}
        parentHref={onHallRoot ? undefined : "/hall"}
        parentLabel={onHallRoot ? undefined : "Hall"}
      />
      <main
        className={cn(
          app.main,
          "mx-auto max-w-lg space-y-5 px-4 py-4 pb-safe-nav sm:max-w-xl sm:space-y-5 sm:py-5",
          className,
        )}
      >
        {!hideSubNav && !onHallRoot ? (
          <div className="flex items-center justify-between gap-2 px-0.5">
            <Link
              href="/hall"
              className="text-xs font-semibold text-primary hover:underline touch-manipulation min-h-8 inline-flex items-center"
              data-testid="hall-back-manage"
            >
              ← Hall
            </Link>
            <Link
              href="/tonight"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline touch-manipulation min-h-8 inline-flex items-center"
              data-testid="hall-back-tonight"
            >
              Tonight
            </Link>
          </div>
        ) : null}
        {children}
        {!hideSubNav && !onHallRoot ? (
          <WorkflowExit
            href="/tonight"
            label="← Back to Tonight"
            hint="Finished managing? Return to tonight's plan."
            testId="hall-deep-exit"
          />
        ) : null}
      </main>
      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
