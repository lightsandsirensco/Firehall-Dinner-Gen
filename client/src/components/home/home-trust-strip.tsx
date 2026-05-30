import { Clock, Globe, Shield, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { HOME } from "@/lib/brand-copy";
import { APPROVED_CATALOG_TOTAL } from "@shared/meal-catalog/curated-count";

interface HomeTrustStripProps {
  recipeCount?: number;
  categoryCount?: number;
}

export function HomeTrustStrip({
  recipeCount = APPROVED_CATALOG_TOTAL,
  categoryCount = 12,
}: HomeTrustStripProps) {
  const trustItems = [
    { label: `${recipeCount}+ Curated Recipes`, icon: UtensilsCrossed },
    { label: "Firefighter Built. Firehall Tested.", icon: Shield },
    { label: "Trusted by Firefighters Across North America", icon: Globe },
  ] as const;

  return (
    <section
      className="border-y border-border/25 bg-card/30 backdrop-blur-sm"
      aria-label="Firehall Meals at a glance"
      data-testid="home-trust-strip"
    >
      <div className="max-w-[1400px] mx-auto px-page py-6 sm:py-8">
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 sm:gap-x-10">
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
            "mt-6 pt-6 border-t border-border/20",
            "grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center",
          )}
        >
          <div>
            <dt className="sr-only">Recipes</dt>
            <dd className="font-heading text-2xl sm:text-3xl text-foreground tabular-nums">
              {recipeCount}+
            </dd>
            <dd className="mt-0.5 text-xs text-muted-foreground">{HOME.stats.recipes}</dd>
          </div>
          <div>
            <dt className="sr-only">Categories</dt>
            <dd className="font-heading text-2xl sm:text-3xl text-foreground tabular-nums">
              {categoryCount}
            </dd>
            <dd className="mt-0.5 text-xs text-muted-foreground">{HOME.stats.categories}</dd>
          </div>
          <div>
            <dt className="sr-only">Crew size</dt>
            <dd className="font-heading text-2xl sm:text-3xl text-foreground">2–12</dd>
            <dd className="mt-0.5 text-xs text-muted-foreground">{HOME.stats.crew}</dd>
          </div>
          <div>
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
