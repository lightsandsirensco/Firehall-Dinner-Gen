import { Clock, Shield, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { HOME } from "@/lib/brand-copy";

export function HomeTrustStrip() {
  const mobileTrustLine = `${HOME.curatedRecipesCount} recipes · Crew-sized · Shift-tested`;

  const trustItems = [
    { label: HOME.curatedRecipesLabel, icon: UtensilsCrossed },
    { label: "Firefighter Built. Firehall Tested.", icon: Shield },
    { label: "Shift-tested for station kitchens", icon: Clock },
  ] as const;

  return (
    <section
      className="border-y border-border/25 bg-card/30 backdrop-blur-sm"
      aria-label="Firehall Meals at a glance"
      data-testid="home-trust-strip"
    >
      <div className="max-w-[1400px] mx-auto px-page py-5 sm:py-8">
        <p
          className="md:hidden text-center text-sm font-medium text-foreground/80"
          data-testid="home-trust-mobile-line"
        >
          {mobileTrustLine}
        </p>

        <ul className="hidden md:flex flex-wrap justify-center gap-x-6 gap-y-3 sm:gap-x-10">
          {trustItems.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="flex items-center gap-2 text-sm text-foreground/80 max-w-[20rem] sm:max-w-none text-center sm:text-left"
            >
              <Icon className="w-4 h-4 text-primary/80 shrink-0" aria-hidden />
              <span className="font-medium">{label}</span>
            </li>
          ))}
        </ul>

        <dl
          className={cn(
            "hidden md:grid mt-6 pt-6 border-t border-border/20",
            "grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 text-center",
          )}
        >
          <div>
            <dt className="sr-only">Recipes</dt>
            <dd className="font-heading text-2xl sm:text-3xl text-foreground tabular-nums">
              {HOME.curatedRecipesCount}
            </dd>
            <dd className="mt-0.5 text-xs text-muted-foreground">{HOME.stats.recipes}</dd>
          </div>
          <div>
            <dt className="sr-only">Crew size</dt>
            <dd className="font-heading text-2xl sm:text-3xl text-foreground">2–12</dd>
            <dd className="mt-0.5 text-xs text-muted-foreground">{HOME.stats.crew}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="sr-only">Time</dt>
            <dd className="font-heading text-2xl sm:text-3xl text-foreground">
              <span className="inline-flex items-center gap-1 justify-center">
                <Clock className="w-4 h-4 text-primary/70 sm:hidden" aria-hidden />
                15–90
              </span>
            </dd>
            <dd className="mt-0.5 text-xs text-muted-foreground">{HOME.stats.time}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
