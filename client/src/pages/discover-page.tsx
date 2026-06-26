import { BookOpen, Compass, RotateCw, Sparkles } from "lucide-react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { HubTile } from "@/components/app-shell/hub-tile";
import { SiteFooter } from "@/components/site-footer";
import { CTA, NAV } from "@/lib/brand-copy";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function DiscoverPage() {
  return (
    <div className={cn(app.page, "bg-background")} data-testid="discover-page">
      <AppTopBar title="Discover" />

      <main className={cn(app.main, "mx-auto max-w-lg space-y-4 px-4 py-4 pb-safe-nav sm:max-w-xl sm:py-5")}>
        <header className="space-y-1 px-0.5">
          <h1 className="font-heading text-2xl tracking-wide">Discover</h1>
          <p className="text-sm text-muted-foreground">Browse meals, spin the wheel, and find hall ideas.</p>
        </header>

        <div className="space-y-2.5">
          <HubTile
            href="/generator"
            icon={Sparkles}
            title={CTA.pickTonight}
            description="Hall Matcher — crew-sized picks in seconds"
            testId="discover-generator"
          />
          <HubTile
            href="/wheel"
            icon={RotateCw}
            title={NAV.wheel}
            description="Let the classics wheel decide"
            testId="discover-wheel"
          />
          <HubTile
            href="/explore"
            icon={Compass}
            title={NAV.explore}
            description="Search and filter the full catalog"
            testId="discover-explore"
          />
        </div>

        <section className="space-y-2 pt-2">
          <p className="px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Hall ideas
          </p>
          <HubTile
            href="/guides"
            icon={BookOpen}
            title={NAV.ideas}
            description="Shift-night guides and classics"
            secondary
            testId="discover-guides"
          />
        </section>
      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
