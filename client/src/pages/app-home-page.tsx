import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ChefHat, Heart, RotateCw, Sparkles, Tag } from "lucide-react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { HubTile } from "@/components/app-shell/hub-tile";
import { SiteFooter } from "@/components/site-footer";
import { useHallHistory } from "@/hooks/use-hall-history";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { APP_HOME, CTA, NAV } from "@/lib/brand-copy";
import { app } from "@/lib/design-tokens";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { getSavedCount } from "@/lib/saved-meals";
import { HALL_HISTORY_CHANGED_EVENT } from "@/lib/hall-history-store";
import { cn } from "@/lib/utils";

export default function AppHomePage() {
  const { lastMealCooked } = useHallHistory();
  const [savedCount, setSavedCount] = useState(() => getSavedCount());
  const [recentVersion, setRecentVersion] = useState(0);

  useEffect(() => {
    const onHistory = () => setRecentVersion((v) => v + 1);
    const onSaves = () => setSavedCount(getSavedCount());
    window.addEventListener(HALL_HISTORY_CHANGED_EVENT, onHistory);
    window.addEventListener("favorites-changed", onSaves);
    return () => {
      window.removeEventListener(HALL_HISTORY_CHANGED_EVENT, onHistory);
      window.removeEventListener("favorites-changed", onSaves);
    };
  }, []);

  const recentlyViewed = useMemo(() => getRecentlyViewed(5), [recentVersion]);
  const cookHref = useMemo(() => {
    if (!lastMealCooked) return undefined;
    if (lastMealCooked.recipePath) return `${lastMealCooked.recipePath}?cook=1`;
    if (lastMealCooked.recipeSlug) {
      return `${approvedCatalogRecipePath(lastMealCooked.recipeSlug)}?cook=1`;
    }
    return undefined;
  }, [lastMealCooked]);

  return (
    <div className={cn(app.page, "bg-background")} data-testid="app-home-page">
      <AppTopBar title="Home" />

      <main className={cn(app.main, app.mobileScreen)}>
        <header className="space-y-1 px-0.5">
          <h1 className="font-heading text-2xl tracking-wide">Home</h1>
          <p className="text-sm text-muted-foreground">{APP_HOME.subtitle}</p>
        </header>

        {recentlyViewed.length > 0 ? (
          <section className="space-y-2" aria-labelledby="home-recently-viewed">
            <h2
              id="home-recently-viewed"
              className="px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {APP_HOME.recentlyViewed}
            </h2>
            <ul className="rounded-2xl border border-border/45 bg-card/40 divide-y divide-border/30">
              {recentlyViewed.map((entry) => {
                const href =
                  entry.recipePath ??
                  (entry.recipeSlug ? approvedCatalogRecipePath(entry.recipeSlug) : undefined);
                return (
                  <li key={entry.id}>
                    {href ? (
                      <Link
                        href={href}
                        className="flex min-h-[52px] items-center px-4 py-3 text-sm font-medium hover:bg-muted/30 touch-manipulation"
                      >
                        <span className="line-clamp-1">{entry.title}</span>
                      </Link>
                    ) : (
                      <span className="flex min-h-[52px] items-center px-4 py-3 text-sm font-medium">
                        {entry.title}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div className="space-y-2.5">
          {cookHref ? (
            <HubTile
              href={cookHref}
              icon={ChefHat}
              title={APP_HOME.continueCooking}
              description={lastMealCooked?.title ?? "Pick up where you left off"}
              testId="home-continue-cooking"
            />
          ) : null}

          <HubTile
            href="/me/saved"
            icon={Heart}
            title={APP_HOME.savedMeals}
            description={
              savedCount > 0
                ? APP_HOME.savedMealsCount(savedCount)
                : APP_HOME.savedMealsEmpty
            }
            testId="home-saved-meals"
          />

          <HubTile
            href="/generator"
            icon={Sparkles}
            title={CTA.pickTonight}
            description="Crew Match — sized for your shift"
            testId="home-generator"
          />

          <HubTile
            href="/wheel"
            icon={RotateCw}
            title={NAV.wheel}
            description="Let the classics wheel decide"
            testId="home-wheel"
          />

          <HubTile
            href="/hall/protein-deals"
            icon={Tag}
            title={NAV.proteinDeals}
            description={APP_HOME.proteinDealsHint}
            testId="home-protein-deals"
          />
        </div>
      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
