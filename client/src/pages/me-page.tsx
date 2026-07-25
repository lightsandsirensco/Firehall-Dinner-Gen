import { CreditCard, Heart, History, Settings, User } from "lucide-react";
import { Link } from "wouter";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { HubTile } from "@/components/app-shell/hub-tile";
import { WorkflowExit } from "@/components/app-shell/workflow-exit";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth/context";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useNoIndex } from "@/lib/seo/use-noindex";

/** Personal account — fourth destination, not a competing command center. */
export default function MePage() {
  useNoIndex();
  const { authenticated, openSignIn } = useAuth();

  return (
    <div className={cn(app.page, "bg-background")} data-testid="me-page">
      <AppTopBar title="Me" />

      <main className={cn(app.main, app.mobileScreen)}>
        <header className="space-y-1 px-0.5">
          <h1 className="font-heading text-2xl tracking-wide">Me</h1>
          <p className="text-sm text-muted-foreground">
            Your profile, saves, and preferences — the shift still starts on Tonight.
          </p>
        </header>

        <WorkflowExit
          href="/tonight"
          label="← Back to Tonight"
          hint="Ready for tonight?"
          testId="me-back-tonight"
        />

        {!authenticated ? (
          <button
            type="button"
            onClick={() => openSignIn()}
            className="w-full rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 min-h-[52px] text-left text-sm font-semibold hover:bg-primary/15 touch-manipulation"
            data-testid="me-sign-in"
          >
            Sign in to Firehall Meals
          </button>
        ) : null}

        <section className="space-y-2" aria-labelledby="me-cook">
          <h2
            id="me-cook"
            className="px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Cooking
          </h2>
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
        </section>

        <section className="space-y-2" aria-labelledby="me-account">
          <h2
            id="me-account"
            className="px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Account
          </h2>
          <HubTile
            href="/me/profile"
            icon={User}
            title="Profile"
            description="Name, shift reminders, and halls"
            secondary
            testId="me-profile"
          />
          <HubTile
            href="/me/settings"
            icon={Settings}
            title="Settings"
            description="Measurements and app preferences"
            secondary
            testId="me-settings"
          />
          <HubTile
            href="/me/subscription"
            icon={CreditCard}
            title="Subscription"
            description="Plans and Hall Pro"
            secondary
            testId="me-subscription"
          />
        </section>

        <p className="px-0.5 text-center text-xs text-muted-foreground">
          <Link href="/tonight" className="font-semibold text-primary hover:underline">
            Start of shift → Tonight
          </Link>
        </p>
      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
