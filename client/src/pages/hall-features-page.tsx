import { History, ListChecks, ShoppingCart, Store, Vote, Wallet } from "lucide-react";
import { HallShell } from "@/components/hall/hall-shell";
import { Button } from "@/components/ui/button";
import { HALL_FEATURES, HALL_PRO } from "@/lib/brand-copy";
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
    <HallShell title="Features" hideSubNav testId="hall-features-page">
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
        <p className="pt-1 text-center text-xs text-muted-foreground">
          Not ready?{" "}
          <Link href="/tonight" className="font-semibold text-primary hover:underline">
            Keep picking meals
          </Link>
          {" · "}
          <Link href="/plans" className="font-semibold text-muted-foreground hover:text-foreground hover:underline">
            Compare Hall Pro
          </Link>
        </p>
      </div>

      <nav
        className="space-y-2 border-t border-border/30 pt-4 text-sm"
        aria-label="Product overviews"
      >
        <p className="text-xs uppercase tracking-wide text-muted-foreground">How each tool works</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          <li>
            <Link href="/firefighter-dinner-vote" className="text-primary hover:underline">
              Dinner voting
            </Link>
          </li>
          <li>
            <Link href="/fire-hall-grocery-list" className="text-primary hover:underline">
              Crew shopping list
            </Link>
          </li>
          <li>
            <Link href="/canteen-manager" className="text-primary hover:underline">
              Canteen Manager
            </Link>
          </li>
          <li>
            <Link href="/hall-meal-planner" className="text-primary hover:underline">
              Hall meal planner
            </Link>
          </li>
          <li>
            <Link href="/crew-grocery-budget" className="text-primary hover:underline">
              Grocery budget
            </Link>
          </li>
        </ul>
      </nav>
    </HallShell>
  );
}
