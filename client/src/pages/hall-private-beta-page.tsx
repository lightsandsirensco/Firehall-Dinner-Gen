import { useLocation } from "wouter";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { SiteFooter } from "@/components/site-footer";
import { HallPrivateBetaNotice } from "@/components/hall/hall-private-beta-notice";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useNoIndex } from "@/lib/seo/use-noindex";

/**
 * Every /hall* route lands here. Deliberately a dead end — no sub-navigation,
 * no feature previews — so it can't leak anything about the in-progress build.
 */
export default function HallPrivateBetaPage() {
  useNoIndex();
  const [, navigate] = useLocation();

  return (
    <div className={cn(app.page, "bg-background")} data-testid="hall-private-beta-page">
      <AppTopBar title="Hall Operations" />
      <main className={cn(app.main, app.mobileScreen, "flex min-h-[70vh] items-center justify-center")}>
        <HallPrivateBetaNotice
          className="w-full max-w-md"
          onSecondaryAction={() => navigate("/tonight")}
          secondaryLabel="Back to Meal Planning"
        />
      </main>
      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
