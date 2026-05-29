import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

interface TonightHeroProps {
  /** Primary question — default matches product north star */
  headline?: string;
  /** One line under headline */
  subline?: string;
  className?: string;
}

/**
 * Home L1 hero — no banner image; chrome stays out of the way.
 */
export function TonightHero({
  headline = "What's for dinner tonight?",
  subline = "Crew-sized meals for real station kitchens.",
  className,
}: TonightHeroProps) {
  return (
    <section
      className={cn(
        "relative border-b border-border/20 overflow-hidden",
        className,
      )}
      data-testid="tonight-hero"
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-zinc-900/80 via-background to-background pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% -10%, hsl(0 72% 38% / 0.2), transparent 55%)",
        }}
        aria-hidden
      />
      <div className={cn(app.main, "relative py-8 sm:py-12 md:py-14")}>
        <p className={app.eyebrowMuted} data-testid="text-app-tagline">
          Firefighter Built · Firehall Tested
        </p>
        <h1
          className={cn(app.display, "mt-4 max-w-[14ch] sm:max-w-none")}
          data-testid="text-hero-headline"
        >
          {headline}
        </h1>
        <p className={cn(app.lead, "mt-3 max-w-md")} data-testid="text-hero-subline">
          {subline}
        </p>
      </div>
    </section>
  );
}
