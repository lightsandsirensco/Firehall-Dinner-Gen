import { CalendarDays, CreditCard, Heart, History, Package, Salad, Settings, ShoppingCart, User, Users } from "lucide-react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { HubTile } from "@/components/app-shell/hub-tile";
import { WorkflowExit } from "@/components/app-shell/workflow-exit";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth/context";
import { useSignedInNav } from "@/hooks/use-signed-in-nav";
import { appHomeFor, appHomeLabelFor } from "@/lib/app-nav";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useNoIndex } from "@/lib/seo/use-noindex";

/** Personal account — saves, history, schedule, preferences, subscription. Not a competing command center. */
export default function MePage() {
  useNoIndex();
  const { authenticated, loading, openSignIn } = useAuth();
  const signedInNav = useSignedInNav();
  const homeLabel = appHomeLabelFor(signedInNav);

  return (
    <div className={cn(app.page, "bg-background")} data-testid="me-page">
      <AppTopBar title="Me" />

      <main className={cn(app.main, app.mobileScreen, "page-enter motion-reduce:animate-none")}>
        <header className="space-y-1.5 px-0.5">
          <h1 className={app.titlePage}>Me</h1>
          <p className={app.subtitle}>
            Your saves, schedule, and preferences — the shift still starts on {homeLabel}.
          </p>
        </header>

        <WorkflowExit
          href={appHomeFor(signedInNav)}
          label={`← Back to ${homeLabel}`}
          hint={signedInNav ? "Ready for your shift?" : "Ready for tonight?"}
          testId="me-back-tonight"
        />

        {loading ? (
          <div className="h-[52px] rounded-2xl skeleton-shimmer" aria-hidden />
        ) : !authenticated ? (
          <button
            type="button"
            onClick={() => openSignIn()}
            className="w-full flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 min-h-[52px] text-left hover-elevate touch-manipulation fade-up"
            data-testid="me-sign-in"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12">
              <User className="h-4 w-4 text-primary" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Sign in to Firehall Meals</span>
              <span className="block text-xs text-muted-foreground">Plan every shift · sync saves</span>
            </span>
          </button>
        ) : null}

        <section className="space-y-2" aria-labelledby="me-shifts">
          <h2 id="me-shifts" className={cn(app.eyebrowMuted, "px-0.5")}>
            Shifts
          </h2>
          <HubTile
            href="/me/schedule"
            icon={CalendarDays}
            title="My Schedule"
            description="Your rotation and upcoming shifts"
            testId="me-schedule"
          />
        </section>

        <section className="space-y-2" aria-labelledby="me-meals">
          <h2 id="me-meals" className={cn(app.eyebrowMuted, "px-0.5")}>
            Meals
          </h2>
          <div className={cn("space-y-2", app.stagger)}>
            <HubTile
              href="/me/saved"
              icon={Heart}
              title="Saved Meals"
              description="Recipes you want to cook again"
              testId="me-saved"
            />
            <HubTile
              href="/me/history"
              icon={History}
              title="Meal History"
              description="Meals you cooked, generated, and spun"
              secondary
              testId="me-history"
            />
            {signedInNav ? null : (
              <HubTile
                href="/me/shopping-list"
                icon={ShoppingCart}
                title="Shopping List"
                description="Every recipe you've added, combined by aisle"
                testId="me-shopping-list"
              />
            )}
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="me-preferences">
          <h2 id="me-preferences" className={cn(app.eyebrowMuted, "px-0.5")}>
            Preferences
          </h2>
          <div className={cn("space-y-2", app.stagger)}>
            <HubTile
              href="/me/profile?edit=food"
              icon={Salad}
              title="Food & Nutrition Goals"
              description="Dietary needs, foods to avoid, and your nutrition goal"
              testId="me-food-preferences"
            />
            <HubTile
              href="/me/pantry"
              icon={Package}
              title="Pantry"
              description="What you always have — skipped automatically"
              secondary
              testId="me-pantry"
            />
            <HubTile
              href="/me/settings"
              icon={Settings}
              title="Settings"
              description="Measurements and app preferences"
              secondary
              testId="me-settings"
            />
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="me-account">
          <h2 id="me-account" className={cn(app.eyebrowMuted, "px-0.5")}>
            Account
          </h2>
          <div className={cn("space-y-2", app.stagger)}>
            <HubTile
              href="/me/profile"
              icon={User}
              title="Profile"
              description="Name, shift reminders, and halls"
              secondary
              testId="me-profile"
            />
            <HubTile
              href="/me/subscription"
              icon={CreditCard}
              title="Subscription"
              description="Plans and billing"
              secondary
              testId="me-subscription"
            />
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="me-crew">
          <h2 id="me-crew" className={cn(app.eyebrowMuted, "px-0.5")}>
            Crew
          </h2>
          <div
            className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-dashed border-border/40 px-4 py-3.5"
            aria-disabled="true"
            data-testid="me-crew-later"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/30 text-muted-foreground">
              <Users className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-muted-foreground">Crew</span>
              <span className="block text-xs text-muted-foreground/80">Plan and shop with your crew — coming later</span>
            </span>
          </div>
        </section>
      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
