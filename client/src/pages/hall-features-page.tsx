import { History, ListChecks, ShoppingCart, Store, Vote, Wallet } from "lucide-react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { HALL_FEATURES, HALL_PRO } from "@/lib/brand-copy";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const FEATURES = [
  { icon: Vote, title: HALL_FEATURES.voteTitle, body: HALL_FEATURES.voteBody },
  { icon: ShoppingCart, title: HALL_FEATURES.shoppingTitle, body: HALL_FEATURES.shoppingBody },
  { icon: History, title: HALL_FEATURES.historyTitle, body: HALL_FEATURES.historyBody },
  { icon: ListChecks, title: HALL_FEATURES.staplesTitle, body: HALL_FEATURES.staplesBody },
  { icon: Store, title: HALL_FEATURES.groceryTitle, body: HALL_FEATURES.groceryBody },
  { icon: Wallet, title: HALL_FEATURES.paymentTrackerTitle, body: HALL_FEATURES.paymentTrackerBody },
] as const;

export default function HallFeaturesPage() {
  return (
    <div className={cn(app.page, "bg-background")} data-testid="hall-features-page">
      <AppTopBar title={HALL_FEATURES.title} />

      <main className={cn(app.main, app.mobileScreen)}>
        <header className="space-y-1 px-0.5">
          <h1 className="font-heading text-2xl tracking-wide">{HALL_FEATURES.title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{HALL_FEATURES.subtitle}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{HALL_FEATURES.proTeaser}</p>
        </header>

        <section className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-semibold">{HALL_PRO.title}</p>
          <p className="text-muted-foreground mt-1">{HALL_PRO.excludesNote}</p>
        </section>

        <ul className="space-y-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="flex gap-3 rounded-2xl border border-border/40 bg-card/30 px-4 py-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 pt-2">
          <Button asChild className="min-h-11 w-full">
            <Link href="/hall/join">{HALL_FEATURES.ctaJoin}</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11 w-full">
            <Link href="/me/profile?create_hall=1">{HALL_FEATURES.ctaCreate}</Link>
          </Button>
          <Button asChild variant="ghost" className="min-h-11 w-full">
            <Link href="/plans">Compare Hall Pro</Link>
          </Button>
        </div>
      </main>

      <SiteFooter variant="compact" pbSafe />
    </div>
  );
}
