import { Flame } from "lucide-react";
import heroTruckImg from "@assets/truck1_1773178049785.jpg";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export type HeroVariant = "full" | "compact" | "utility";

interface HeroHeaderProps {
  title?: string;
  subtitle?: string;
  headline?: string;
  supportingText?: string;
  showCTAs?: boolean;
  /** @deprecated Prefer `variant` */
  compact?: boolean;
  variant?: HeroVariant;
}

const IMAGE_HEIGHT: Record<HeroVariant, string> = {
  full: "h-[260px] sm:h-[320px] md:h-[380px]",
  compact: "h-[132px] sm:h-[168px]",
  utility: "h-[52px] sm:h-[64px]",
};

export function HeroHeader({
  title = "Firehall Meals",
  subtitle,
  headline,
  supportingText,
  showCTAs = false,
  compact = false,
  variant,
}: HeroHeaderProps) {
  const resolved: HeroVariant = variant ?? (compact ? "compact" : "full");
  const isUtility = resolved === "utility";
  const isFull = resolved === "full";

  return (
    <section
      className="relative w-full overflow-hidden bg-black transition-[height] duration-500 ease-out"
      data-testid="hero-header"
      data-hero-variant={resolved}
    >
      <img
        src={heroTruckImg}
        alt=""
        className={cn(
          "w-full object-cover object-[center_35%] block transition-[height] duration-500 ease-out",
          IMAGE_HEIGHT[resolved],
        )}
      />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b transition-opacity duration-500",
          isUtility
            ? "from-black/70 via-black/75 to-black/90"
            : "from-black/50 via-black/60 to-black/85",
        )}
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#141414] to-transparent transition-[height] duration-500",
          isUtility ? "h-8" : "h-24",
        )}
      />

      <div
        className={cn(
          "absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 transition-all duration-500 ease-out",
          isUtility ? "gap-0 py-1" : isFull ? "gap-3" : "gap-1.5",
        )}
      >
        <div className={cn("flex items-center", isUtility ? "gap-1.5" : "gap-2 mb-1")}>
          {!isUtility && (
            <Flame
              className={cn(
                "text-primary shrink-0 transition-all duration-500",
                isFull ? "w-5 h-5 sm:w-6 sm:h-6" : "w-4 h-4 sm:w-5 sm:h-5",
              )}
            />
          )}
          <h1
            className={cn(
              "font-heading leading-none tracking-[0.15em] uppercase text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] transition-all duration-500",
              isUtility
                ? "text-base sm:text-lg tracking-[0.12em]"
                : isFull
                  ? "text-3xl sm:text-4xl md:text-5xl"
                  : "text-xl sm:text-2xl",
            )}
            data-testid="text-page-title"
          >
            {title}
          </h1>
          {!isUtility && (
            <Flame
              className={cn(
                "text-primary shrink-0 transition-all duration-500",
                isFull ? "w-5 h-5 sm:w-6 sm:h-6" : "w-4 h-4 sm:w-5 sm:h-5",
              )}
            />
          )}
        </div>

        {headline && !isUtility && (
          <p
            className="text-primary/90 text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] transition-opacity duration-500"
            data-testid="text-hero-headline"
          >
            {headline}
          </p>
        )}

        {!isUtility && (
          <p
            className={cn(
              "text-white/60 uppercase font-medium transition-all duration-500",
              isFull
                ? "text-[10px] tracking-[0.2em]"
                : "text-[9px] tracking-[0.18em] hidden sm:block",
            )}
            data-testid="text-app-tagline"
          >
            Firefighter Built. Firehall Tested.
          </p>
        )}

        {subtitle && (
          <p
            className={cn(
              "text-[#c0c0c0] leading-snug transition-all duration-500",
              isUtility
                ? "text-[11px] sm:text-xs max-w-md text-white/70 mt-0"
                : isFull
                  ? "text-sm sm:text-base max-w-lg mt-1"
                  : "text-xs sm:text-sm max-w-md mt-0.5",
            )}
            data-testid="text-page-subtitle"
          >
            {subtitle}
          </p>
        )}

        {supportingText && !isUtility && (
          <p className="text-white/40 text-xs max-w-md mt-0.5 transition-opacity duration-500">
            {supportingText}
          </p>
        )}

        {showCTAs && isFull && (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
            <Link href="/">
              <button
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-heading text-xs tracking-wider uppercase hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                data-testid="button-hero-generate"
              >
                Generate Meal
              </button>
            </Link>
            <Link href="/explore">
              <button
                className="px-5 py-2.5 bg-white/10 text-white border border-white/20 rounded-lg font-heading text-xs tracking-wider uppercase hover:bg-white/15 transition-colors backdrop-blur-sm"
                data-testid="button-hero-explore"
              >
                Explore Recipes
              </button>
            </Link>
            <Link href="/favorites">
              <button
                className="px-5 py-2.5 bg-white/10 text-white border border-white/20 rounded-lg font-heading text-xs tracking-wider uppercase hover:bg-white/15 transition-colors backdrop-blur-sm"
                data-testid="button-hero-favorites"
              >
                Hall Favorites
              </button>
            </Link>
          </div>
        )}

        {!isUtility && (
          <a
            href="https://www.lightsandsirensco.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "text-white/30 uppercase tracking-[0.15em] hover:text-white/50 transition-colors",
              isFull ? "text-[9px] mt-2" : "text-[8px] mt-1 hidden sm:inline",
            )}
            data-testid="link-powered-by"
          >
            Powered by Lights & Sirens Co.
          </a>
        )}
      </div>
    </section>
  );
}
