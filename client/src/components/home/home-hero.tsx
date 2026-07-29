import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import { MalteseCross } from "@/components/icons/maltese-cross";
import { Button } from "@/components/ui/button";
import { HeroImage } from "@/components/hero-image";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { BRAND_NAME, HOME } from "@/lib/brand-copy";
import { HOME_HERO_IMAGE } from "./home-constants";

/**
 * Homepage hero — names the shift problem, offers the fix. Kitchen-table voice.
 */
export function HomeHero() {
  const { authenticated } = useAuth();

  return (
    <section
      className={cn(
        "relative w-full overflow-hidden bg-black",
        "min-h-[min(52dvh,420px)] sm:min-h-[min(58dvh,500px)] lg:min-h-[min(62vh,580px)]",
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
          className="absolute inset-0 bg-gradient-to-t from-background via-background/92 to-background/25"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/65 to-transparent sm:via-background/55"
          aria-hidden
        />
        <div className="home-film-grain absolute inset-0" aria-hidden />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-page w-full pb-10 sm:pb-12 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:pt-28 fade-up motion-reduce:animate-none">
        <p className={cn(app.eyebrowAccent, "mb-4 sm:mb-5")}>
          {HOME.heroEyebrow}
        </p>

        <h1
          className={cn(
            "font-heading font-bold text-foreground uppercase",
            "text-[2.125rem] leading-[1.02] tracking-[0.02em]",
            "sm:text-[3rem] md:text-[3.375rem] lg:text-[3.75rem]",
            "max-w-[14ch] sm:max-w-[16ch]",
            "drop-shadow-[0_2px_24px_rgba(0,0,0,0.9)]",
          )}
          data-testid="home-hero-title"
        >
          {HOME.heroHeadline}
        </h1>

        <div
          className="mt-5 sm:mt-7 space-y-3 sm:space-y-3.5 max-w-md"
          data-testid="home-hero-subtitle"
        >
          <p className="text-base sm:text-lg text-foreground/95 leading-snug font-normal">
            {HOME.heroLead}
          </p>
          <ul className="space-y-1 text-sm sm:text-base text-foreground/75 leading-snug" aria-label="What you skip">
            {HOME.heroPunchlines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="mt-8 sm:mt-10 flex flex-col gap-3 w-full max-w-md sm:flex-row sm:flex-wrap">
          <Button
            asChild
            size="lg"
            className={cn(
              "h-12 sm:h-14 w-full sm:w-auto sm:min-w-[240px] px-8",
              "font-heading text-sm sm:text-base font-semibold tracking-wide uppercase",
              "shadow-lg shadow-primary/30 hover:shadow-primary/40",
              "transition-[transform,box-shadow] duration-200 hover:scale-[1.01] active:scale-[0.99]",
            )}
          >
            <Link href="/generator" data-testid="home-cta-generator">
              {HOME.heroPrimaryCta}
            </Link>
          </Button>

          <Button
            asChild
            size="default"
            variant="outline"
            className={cn(
              "h-11 sm:h-12 w-full sm:w-auto sm:min-w-[190px] px-6",
              "font-heading text-sm font-medium tracking-wide",
              "border-foreground/15 bg-background/40 backdrop-blur-sm",
            )}
          >
            <Link href="/wheel" data-testid="home-cta-wheel">
              {HOME.heroSecondaryCta}
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
              <Link href="/tonight" data-testid="home-cta-app">
                <Sparkles className="w-4 h-4 mr-2 inline" aria-hidden />
                Open app
              </Link>
            </Button>
          ) : null}
        </div>

        <p
          className={cn(
            "mt-5 sm:mt-6 flex items-start gap-2.5 text-xs sm:text-sm text-foreground/65 leading-relaxed",
            "max-w-sm drop-shadow-[0_1px_10px_rgba(0,0,0,0.65)]",
          )}
          data-testid="home-hero-trust"
        >
          <MalteseCross className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 mt-0.5 text-primary" strokeWidth={2} aria-hidden />
          <span>{HOME.heroTrustLine}</span>
        </p>
      </div>
    </section>
  );
}
