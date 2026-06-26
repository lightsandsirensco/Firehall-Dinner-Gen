import { Link } from "wouter";
import { Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroImage } from "@/components/hero-image";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";
import { BRAND_NAME, CTA, HOME } from "@/lib/brand-copy";
import { HOME_HERO_IMAGE } from "./home-constants";

/**
 * Homepage hero — personal value first; hall connection lives lower on the page.
 */
export function HomeHero() {
  const { authenticated } = useAuth();

  return (
    <section
      className={cn(
        "relative w-full overflow-hidden bg-black",
        "min-h-[min(50dvh,400px)] sm:min-h-[min(56dvh,480px)] lg:min-h-[min(60vh,560px)]",
        "flex flex-col justify-end",
      )}
      data-testid="home-hero"
      aria-label={BRAND_NAME}
    >
      <div className="absolute inset-0">
        <HeroImage
          src={HOME_HERO_IMAGE}
          alt="Firefighter preparing a crew meal on shift"
          layout="card-fill"
          focal="banner"
          fit="contain-blur"
          overlay="none"
          priority
          className="h-full w-full"
          imgClassName={cn(
            "object-contain object-[center_42%] opacity-90",
            "sm:object-cover sm:object-[62%_38%] md:object-[58%_36%]",
          )}
        />

        <div
          className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/20"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-transparent sm:via-background/50"
          aria-hidden
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-page w-full pb-8 sm:pb-10 pt-[calc(3.25rem+env(safe-area-inset-top,0px))] sm:pt-24">
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-primary/90 mb-2">
          {HOME.heroEyebrow}
        </p>

        <h1
          className={cn(
            "font-heading font-bold text-foreground",
            "text-[2rem] leading-[1.05] tracking-tight",
            "sm:text-[2.75rem] md:text-5xl lg:text-[3.25rem]",
            "max-w-[16ch] sm:max-w-[18ch]",
            "drop-shadow-[0_2px_20px_rgba(0,0,0,0.85)]",
          )}
          data-testid="home-hero-title"
        >
          {HOME.heroHeadline}
        </h1>

        <p
          className={cn(
            "mt-3 sm:mt-4 text-base sm:text-lg text-foreground/90 leading-snug",
            "max-w-[32ch] sm:max-w-lg font-medium",
            "drop-shadow-[0_1px_12px_rgba(0,0,0,0.75)]",
          )}
          data-testid="home-hero-subtitle"
        >
          {HOME.heroSubheadline}
        </p>

        <div className="mt-6 sm:mt-7 flex flex-col gap-3 w-full max-w-md sm:flex-row sm:flex-wrap">
          <Button
            asChild
            size="lg"
            className={cn(
              "h-12 sm:h-14 w-full sm:w-auto sm:min-w-[240px] px-8",
              "font-heading text-sm sm:text-base font-semibold tracking-wide",
              "shadow-lg shadow-primary/30 hover:shadow-primary/40",
              "transition-[transform,box-shadow] duration-200 hover:scale-[1.01] active:scale-[0.99]",
            )}
          >
            <Link href="/generator" data-testid="home-cta-generator">
              {CTA.pickTonight}
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className={cn(
              "h-12 sm:h-14 w-full sm:w-auto sm:min-w-[200px] px-8",
              "font-heading text-sm sm:text-base font-semibold tracking-wide",
              "border-foreground/20 bg-background/50 backdrop-blur-sm",
            )}
          >
            <Link href="/wheel" data-testid="home-cta-wheel">
              {CTA.spinWheel}
            </Link>
          </Button>

          {authenticated ? (
            <Button
              asChild
              size="lg"
              variant="ghost"
              className={cn(
                "h-11 sm:h-12 w-full sm:w-auto px-6",
                "text-sm font-medium text-foreground/80 hover:text-foreground",
              )}
            >
              <Link href="/home" data-testid="home-cta-app">
                <Sparkles className="w-4 h-4 mr-2 inline" aria-hidden />
                Open app
              </Link>
            </Button>
          ) : null}
        </div>

        <p
          className={cn(
            "mt-4 sm:mt-5 flex items-start gap-2.5 text-xs sm:text-sm text-foreground/70 leading-relaxed",
            "max-w-lg drop-shadow-[0_1px_10px_rgba(0,0,0,0.65)]",
          )}
          data-testid="home-hero-trust"
        >
          <Shield className="h-4 w-4 shrink-0 mt-0.5 text-primary/80" aria-hidden />
          <span>{HOME.heroTrustLine}</span>
        </p>
      </div>
    </section>
  );
}
