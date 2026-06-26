import type { ReactNode } from "react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { HallSubNav } from "@/components/hall/hall-sub-nav";
import { SiteFooter } from "@/components/site-footer";
import { HALL_LINKED } from "@/lib/brand-copy";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface HallShellProps {
  children: ReactNode;
  title?: string;
  className?: string;
  testId?: string;
}

export function HallShell({ children, title = HALL_LINKED.linked, className, testId }: HallShellProps) {
  return (
    <div className={cn(app.page, "bg-background")} data-testid={testId}>
      <AppTopBar title={title} />
      <main
        className={cn(
          app.main,
          "mx-auto max-w-lg space-y-5 px-4 py-4 pb-safe-nav sm:max-w-xl sm:space-y-5 sm:py-5",
          className,
        )}
      >
        <HallSubNav />
        {children}
      </main>
      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
