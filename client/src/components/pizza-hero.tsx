import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";
import { HeroImage } from "@/components/hero-image";

interface PizzaHeroProps {
  title?: string;
  subtitle?: string;
  emoji?: string;
  gradient?: string;
  badges?: string[];
  heroImage?: string;
  heroImageAlt?: string;
  className?: string;
}

/**
 * Cinematic pizza page hero — warm ember aesthetic, no external image required.
 */
export function PizzaHero({
  title = "Pizza Night at the Hall",
  subtitle = "Crew-sized pies · oven-tested · beginner-friendly steps",
  emoji = "🍕",
  gradient = "from-orange-950 via-red-950 to-zinc-950",
  badges = ["Feeds 4–8", "Quick Shift Meal"],
  heroImage,
  heroImageAlt,
  className,
}: PizzaHeroProps) {
  return (
    <section
      className={cn(
        "relative w-full overflow-hidden border-b border-primary/20",
        className,
      )}
      data-testid="pizza-hero"
    >
      {heroImage ? (
        <HeroImage
          src={heroImage}
          alt={heroImageAlt || title}
          layout="banner-compact"
          focal="food-plate"
          overlay="banner-compact"
          priority
          className="absolute inset-0"
        />
      ) : (
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br",
          gradient,
        )}
        aria-hidden
      />
      )}
      {!heroImage && (
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_120%,rgba(234,88,12,0.35),transparent)]"
        aria-hidden
      />
      )}
      <div
        className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-primary/20 blur-3xl animate-pulse"
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-1/4 w-40 h-40 rounded-full bg-orange-600/15 blur-3xl"
        aria-hidden
      />

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
                Firehall Pizza Night
              </span>
            </div>
            <h1
              className="font-heading text-3xl sm:text-4xl md:text-5xl tracking-wide text-white drop-shadow-lg"
              data-testid="pizza-hero-title"
            >
              {title}
            </h1>
            <p className="text-sm sm:text-base text-white/75 mt-3 max-w-xl leading-relaxed">
              {subtitle}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {badges.map((b) => (
                <span
                  key={b}
                  className="inline-flex text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/40 border border-white/15 text-white/90 backdrop-blur-sm"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
          <div
            className="text-[5rem] sm:text-[6rem] leading-none drop-shadow-2xl select-none"
            aria-hidden
          >
            {emoji}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
