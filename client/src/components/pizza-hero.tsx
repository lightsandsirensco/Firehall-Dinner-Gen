import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";
import { FoodImage } from "@/components/mobile/food-image";
import { app } from "@/lib/design-tokens";

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
 * Pizza Night — event-mode hero (ember + optional food imagery).
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
        <FoodImage
          src={heroImage}
          alt={heroImageAlt || title}
          layout="banner-full"
          focal="food-plate"
          overlay="banner-full"
          priority
          bleed
          rounded="none"
          cinematicGrade
          className="absolute inset-0 min-h-[min(38vh,280px)] sm:min-h-0"
        />
      ) : (
        <div className={cn("absolute inset-0 bg-gradient-to-br min-h-[200px]", gradient)} aria-hidden />
      )}
      {!heroImage && (
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_120%,rgba(234,88,12,0.35),transparent)]"
          aria-hidden
        />
      )}

      <div className={cn(app.main, "relative py-8 sm:py-12")}>
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-primary shrink-0" />
              <span className={app.eyebrow}>Pizza Night</span>
            </div>
            <h1
              className={cn(app.titlePage, "text-white drop-shadow-lg")}
              data-testid="pizza-hero-title"
            >
              {title}
            </h1>
            <p className="text-sm text-white/80 mt-2 max-w-xl leading-relaxed">{subtitle}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {badges.map((b) => (
                <span
                  key={b}
                  className="inline-flex text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-full bg-black/40 border border-white/15 text-white/90 backdrop-blur-sm"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
          <div className="text-[4rem] sm:text-[5.5rem] leading-none drop-shadow-2xl select-none shrink-0" aria-hidden>
            {emoji}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none z-[5]" />
    </section>
  );
}
