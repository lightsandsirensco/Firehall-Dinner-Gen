import { Flame } from "lucide-react";
import heroTruckImg from "@assets/truck1_1773178049785.jpg";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { HeroImage } from "@/components/hero-image";
import type { HeroImageLayout } from "@/lib/hero-image";

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

const BANNER_LAYOUT: Record<HeroVariant, HeroImageLayout> = {
  full: "banner-full",
  compact: "banner-compact",
  utility: "banner-utility",
};

const BANNER_OVERLAY: Record<HeroVariant, "banner-full" | "banner-compact" | "banner-utility"> = {
  full: "banner-full",
  compact: "banner-compact",
  utility: "banner-utility",
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
      <HeroImage
        src={heroTruckImg}
        alt=""
        layout={BANNER_LAYOUT[resolved]}
        focal="banner"
        overlay={BANNER_OVERLAY[resolved]}
        priority
        className="transition-[height] duration-500 ease-out"
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
              "font-heading leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] transition-all duration-500",
              isUtility
                ? "text-sm sm:text-lg tracking-wide"
                : isFull
                  ? "text-2xl tracking-tight sm:text-4xl sm:tracking-[0.08em] md:text-5xl"
                  : "text-xl tracking-tight sm:text-2xl",
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
            className="text-primary/95 text-sm sm:text-base font-semibold tracking-tight transition-opacity duration-500 max-w-[20rem] sm:max-w-lg"
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
          <div className="hidden lg:flex flex-wrap items-center justify-center gap-3 mt-3">
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
