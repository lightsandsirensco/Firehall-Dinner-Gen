import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * Compact, discoverable (not pushy) Firehall Meals Pro value callout.
 * Sits after the meal-discovery/generator content and before the lower
 * editorial/SEO sections — high enough to be seen, never above the hero.
 * Deliberately a small dark "premium card", not a full-bleed ad banner.
 */
export function HomeProCallout() {
  return (
    <section className={cn(app.main, "py-8 sm:py-12")} aria-label="Firehall Meals Pro">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-zinc-950 ring-1 ring-white/10">
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 70% at 85% 0%, hsl(var(--primary) / 0.35), transparent)",
          }}
          aria-hidden="true"
        />
        <div className="relative px-6 py-8 sm:px-10 sm:py-10 max-w-xl">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Firehall Meals Pro
          </p>
          <h2 className="mt-2 font-heading text-xl sm:text-2xl leading-tight tracking-tight text-white">
            Plan smarter every shift.
          </h2>
          <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-zinc-300">
            Personalized shift plans, smarter recommendations, grocery lists, meal history, goals,
            progress, and more — built around how your crew actually eats.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 h-11 px-6 font-heading font-semibold tracking-wide w-full sm:w-auto"
          >
            <Link href="/me/subscription" data-testid="home-pro-callout-cta">
              See Pro features
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
