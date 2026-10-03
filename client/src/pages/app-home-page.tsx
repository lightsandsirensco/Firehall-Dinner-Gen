import { Link } from "wouter";
import { ChevronRight, ShoppingCart, Vote } from "lucide-react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { TonightEmptyState } from "@/components/tonight/tonight-empty-state";
import { TonightMeal } from "@/components/tonight/tonight-meal";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth/context";
import { useTonightHub } from "@/hooks/use-tonight-hub";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * Tonight (/tonight) — the in-app decision screen (Home is the landing page at "/").
 * Three states: nothing chosen → tonight's meal → cooking. Only a meal the user
 * deliberately picked for this shift is ever shown.
 */
export default function AppHomePage() {
  const { authenticated, openSignIn } = useAuth();
  const hub = useTonightHub();
  const selection = hub.tonightPick;

  const hallLoops = [
    hub.hallId && hub.voteOpen && hub.voteHref
      ? { id: "vote", href: hub.voteHref, icon: Vote, label: "Crew vote is open", detail: hub.voteStatusText }
      : null,
    hub.hallId && hub.pendingItems > 0
      ? {
          id: "shop",
          href: hub.shoppingHref,
          icon: ShoppingCart,
          label: hub.pendingItems === 1 ? "1 item left to buy" : `${hub.pendingItems} items left to buy`,
          detail: hub.runnerName ? `Runner: ${hub.runnerName}` : "Hall shopping list",
        }
      : null,
  ].filter((loop): loop is NonNullable<typeof loop> => Boolean(loop));

  return (
    <div className={cn(app.page, "bg-background")} data-testid="app-home-page">
      <AppTopBar title="Tonight" />

      {/* pb-safe-tabs-cta: the last control must scroll clear of the floating Hall Feedback button. */}
      <main className="mx-auto w-full max-w-lg space-y-8 px-4 pt-4 pb-safe-tabs-cta sm:max-w-xl sm:pt-6">
        {selection ? <TonightMeal selection={selection} /> : <TonightEmptyState />}

        {hallLoops.length > 0 ? (
          <section className="space-y-2.5" aria-labelledby="tonight-hall">
            <h2 id="tonight-hall" className={cn(app.sectionLabel, "px-0.5")}>
              {hub.hallName || "Your hall"}
            </h2>
            <ul className="overflow-hidden rounded-2xl border border-border/40 bg-card/30 divide-y divide-border/30">
              {hallLoops.map(({ id, href, icon: Icon, label, detail }) => (
                <li key={id}>
                  <Link
                    href={href}
                    className="flex min-h-[56px] items-center gap-3 px-4 py-3 touch-manipulation hover:bg-muted/25"
                    data-testid={`tonight-hall-${id}`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{label}</span>
                      {detail ? (
                        <span className="block text-xs text-muted-foreground line-clamp-1">{detail}</span>
                      ) : null}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!authenticated ? (
          <p className="text-center">
            <button
              type="button"
              onClick={() => openSignIn("/tonight")}
              className="inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline touch-manipulation"
              data-testid="home-sign-in"
            >
              Sign in to sync saves across devices
            </button>
          </p>
        ) : null}
      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
