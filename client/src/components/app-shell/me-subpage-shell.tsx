import type { ReactNode } from "react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { WorkflowExit } from "@/components/app-shell/workflow-exit";
import { SiteFooter } from "@/components/site-footer";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useNoIndex } from "@/lib/seo/use-noindex";

interface MeSubpageShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  testId?: string;
  centeredHeader?: boolean;
}

/** Profile sub-pages — Me parent + always escape to Tonight. */
export function MeSubpageShell({
  title,
  subtitle,
  children,
  testId,
  centeredHeader,
}: MeSubpageShellProps) {
  useNoIndex();

  return (
    <div className={cn(app.page, "bg-background")} data-testid={testId}>
      <AppTopBar title={title} parentHref="/me" parentLabel="Me" />
      <main className={cn(app.main, app.mobileScreen)}>
        <header className={cn("space-y-2 px-0.5", centeredHeader && "text-center mx-auto max-w-2xl")}>
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-muted-foreground leading-relaxed sm:text-base">{subtitle}</p>
          ) : null}
        </header>
        {children}
        <WorkflowExit
          href="/tonight"
          label="← Back to Tonight"
          hint="Done here?"
          testId="me-subpage-exit"
        />
      </main>
      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
