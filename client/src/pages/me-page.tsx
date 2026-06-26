import { CreditCard, Heart, History, Settings, User } from "lucide-react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { HubTile } from "@/components/app-shell/hub-tile";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth/context";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function MePage() {
  const { authenticated, openSignIn } = useAuth();

  return (
    <div className={cn(app.page, "bg-background")} data-testid="me-page">
      <AppTopBar title="Me" />

      <main className={cn(app.main, app.mobileScreen)}>
        <header className="space-y-1 px-0.5">
          <h1 className="font-heading text-2xl tracking-wide">Me</h1>
          <p className="text-sm text-muted-foreground">
            {authenticated ? "Your profile, history, and preferences." : "Sign in to sync across devices."}
          </p>
        </header>

        {!authenticated ? (
          <button
            type="button"
            onClick={openSignIn}
            className="w-full rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 min-h-[52px] text-left text-sm font-semibold hover:bg-primary/15 touch-manipulation"
            data-testid="me-sign-in"
          >
            Sign in to Firehall Meals
          </button>
        ) : null}

        <div className="space-y-2.5">
          <HubTile
            href="/me/profile"
            icon={User}
            title="Profile"
            description="Name, shift reminders, and halls"
            testId="me-profile"
          />
          <HubTile
            href="/me/history"
            icon={History}
            title="Meal History"
            description="Meals you cooked, generated, and spun"
            testId="me-history"
          />
          <HubTile
            href="/me/saved"
            icon={Heart}
            title="Saved Meals"
            description="Recipes you want to cook again"
            testId="me-saved"
          />
          <HubTile
            href="/me/settings"
            icon={Settings}
            title="Settings"
            description="Measurements and app preferences"
            testId="me-settings"
          />
          <HubTile
            href="/me/subscription"
            icon={CreditCard}
            title="Subscription"
            description="Plans and Hall Pro"
            testId="me-subscription"
          />
        </div>
      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
