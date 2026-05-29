import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";
import { FoodImage } from "@/components/mobile/food-image";
import { app } from "@/lib/design-tokens";

interface PizzaHeroProps {
  title?: string;
  subtitle?: string;
  gradient?: string;
  badges?: string[];
  heroImage?: string;
  heroImageAlt?: string;
  className?: string;
}

/**
 * Pizza Night — restrained event hero.
 */
export function PizzaHero({
  title = "Pizza night at the hall",
  subtitle = "Crew-sized pies with oven temps and hall-friendly steps.",
  gradient = "from-red-950/90 via-zinc-950 to-background",
  badges = ["Feeds the crew", "Oven-ready"],
  heroImage,
  heroImageAlt,
  className,
}: PizzaHeroProps) {
  return (
    <section
      className={cn("relative w-full overflow-hidden border-b border-border/30", className)}
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
          className="absolute inset-0 min-h-[min(36vh,260px)] sm:min-h-0"
        />
      ) : (
        <div className={cn("absolute inset-0 bg-gradient-to-b min-h-[220px]", gradient)} aria-hidden />
      )}
      {!heroImage && (
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(0_72%_38%/0.2),transparent)]"
          aria-hidden
        />
      )}

      <div className={cn(app.main, "relative py-10 sm:py-14")}>
        <p className={cn(app.eyebrowMuted, "inline-flex items-center gap-1.5")}>
          <Flame className="w-3 h-3 text-primary/80" aria-hidden />
          Pizza night
        </p>
        <h1 className={cn(app.titlePage, "mt-3 text-white drop-shadow-md max-w-lg")} data-testid="pizza-hero-title">
          {title}
        </h1>
        <p className="text-base text-white/75 mt-3 max-w-md leading-relaxed">{subtitle}</p>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {badges.slice(0, 2).map((b) => (
              <span
                key={b}
                className="inline-flex text-xs font-medium px-3 py-1 rounded-full bg-black/40 border border-white/10 text-white/85 backdrop-blur-sm"
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none z-[5]" />
    </section>
  );
}
