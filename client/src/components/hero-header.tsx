import { Flame } from "lucide-react";
import heroTruckImg from "@assets/truck1_1773178049785.jpg";
import { Link } from "wouter";

interface HeroHeaderProps {
  title?: string;
  subtitle?: string;
  headline?: string;
  supportingText?: string;
  showCTAs?: boolean;
  compact?: boolean;
}

export function HeroHeader({
  title = "Firehall Meals",
  subtitle,
  headline,
  supportingText,
  showCTAs = false,
  compact = false,
}: HeroHeaderProps) {
  return (
    <section
      className="relative w-full overflow-hidden bg-black"
      data-testid="hero-header"
    >
      <img
        src={heroTruckImg}
        alt=""
        className={`w-full object-cover block ${compact ? "h-[180px] sm:h-[220px]" : "h-[280px] sm:h-[340px] md:h-[400px]"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/85" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#141414] to-transparent" />

      <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-5 ${compact ? "gap-1" : "gap-3"}`}>
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          <h1
            className={`font-heading leading-none tracking-[0.15em] uppercase text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] ${compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl md:text-5xl"}`}
            data-testid="text-page-title"
          >
            {title}
          </h1>
          <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        </div>

        {headline && (
          <p
            className="text-primary/90 text-xs sm:text-sm font-semibold uppercase tracking-[0.25em]"
            data-testid="text-hero-headline"
          >
            {headline}
          </p>
        )}

        <p
          className="text-white/60 text-[10px] uppercase tracking-[0.2em] font-medium"
          data-testid="text-app-tagline"
        >
          Firefighter Built. Firehall Tested.
        </p>

        {subtitle && (
          <p
            className="text-[#c0c0c0] text-sm sm:text-base max-w-lg leading-relaxed mt-1"
            data-testid="text-page-subtitle"
          >
            {subtitle}
          </p>
        )}

        {supportingText && (
          <p className="text-white/40 text-xs max-w-md mt-0.5">
            {supportingText}
          </p>
        )}

        {showCTAs && (
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

        <a
          href="https://www.lightsandsirensco.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/30 text-[9px] uppercase tracking-[0.15em] hover:text-white/50 transition-colors mt-2"
          data-testid="link-powered-by"
        >
          Powered by Lights & Sirens Co.
        </a>
      </div>
    </section>
  );
}
