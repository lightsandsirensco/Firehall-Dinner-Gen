import type { ReactNode } from "react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { SiteFooter } from "@/components/site-footer";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface MeSubpageShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  testId?: string;
  centeredHeader?: boolean;
}

/** Profile sub-pages — matches Me tab shell for native continuity. */
export function MeSubpageShell({
  title,
  subtitle,
  children,
  testId,
  centeredHeader,
}: MeSubpageShellProps) {
  return (
    <div className={cn(app.page, "bg-background")} data-testid={testId}>
      <AppTopBar title={title} />
      <main className={cn(app.main, app.mobileScreen)}>
        <header className={cn("space-y-2 px-0.5", centeredHeader && "text-center mx-auto max-w-2xl")}>
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-muted-foreground leading-relaxed sm:text-base">{subtitle}</p>
          ) : null}
        </header>
        {children}
      </main>
      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
