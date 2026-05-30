import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { HeroImage } from "@/components/hero-image";
import { cn } from "@/lib/utils";
import { BRAND_MISSION, BRAND_NAME, BRAND_TAGLINE, CTA, HOME } from "@/lib/brand-copy";
import { LightsAndSirensCredit } from "@/components/brand/lights-and-sirens-credit";
import { HOME_HERO_IMAGE } from "./home-constants";
import {
  APPROVED_CATALOG_TOTAL,
  marketingRecipeCountPhrase,
} from "@shared/meal-catalog/curated-count";

interface HomeHeroProps {
  recipeCount?: number;
}

/**
 * Homepage brand hero — blurred firetruck (not food photography).
 * Mobile: contain + blurred fill so the rig stays recognizable.
 * Desktop: cover with right-weighted focal so text on the left stays clear.
 */
export function HomeHero({ recipeCount = APPROVED_CATALOG_TOTAL }: HomeHeroProps) {
  return (
    <section
      className="relative w-full min-h-[min(88dvh,720px)] sm:min-h-[min(82vh,680px)] md:min-h-[min(78vh,760px)] flex flex-col justify-end overflow-hidden bg-black"
      data-testid="home-hero"
      aria-label={BRAND_NAME}
    >
      <div className="absolute inset-0">
        <HeroImage
          src={HOME_HERO_IMAGE}
          alt=""
          layout="card-fill"
          focal="banner"
          fit="contain-blur"
          overlay="none"
          priority
          className="h-full w-full"
          imgClassName={cn(
            "object-contain object-[center_42%]",
            "sm:object-cover sm:object-[62%_38%] md:object-[58%_36%] lg:object-[55%_34%]",
          )}
        />

        <div
          className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/15"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent sm:via-background/45"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-black/25"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 78% 42%, hsl(0 72% 32% / 0.45), transparent 60%)",
          }}
          aria-hidden
        />
        <div className="home-film-grain absolute inset-0 pointer-events-none opacity-80" aria-hidden />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-page w-full pb-10 sm:pb-14 pt-28 sm:pt-32">
        <p
          className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground/60"
          data-testid="home-hero-eyebrow"
        >
          {HOME.heroEyebrow}
        </p>
        <h1
          className="mt-4 font-heading text-[2.35rem] sm:text-5xl md:text-[3.75rem] leading-[0.95] tracking-tight text-foreground max-w-[14ch] sm:max-w-[18ch] drop-shadow-[0_2px_24px_rgba(0,0,0,0.85)]"
          data-testid="home-hero-title"
        >
          {HOME.h1}
        </h1>
        <p
          className={cn(
            "mt-3 font-heading uppercase",
            "text-primary/95 drop-shadow-[0_1px_16px_rgba(0,0,0,0.85)]",
            "text-sm sm:text-base tracking-[0.14em] sm:tracking-[0.18em]",
          )}
          data-testid="home-hero-catalog-count"
        >
          {marketingRecipeCountPhrase(recipeCount)}
        </p>
        <p
          className={cn(
            "mt-3 font-heading uppercase",
            "text-primary/95 drop-shadow-[0_1px_16px_rgba(0,0,0,0.85)]",
            "text-sm sm:text-base tracking-[0.18em] sm:tracking-[0.22em]",
          )}
          data-testid="home-hero-tagline"
        >
          {BRAND_TAGLINE}
        </p>
        <p
          className="mt-3 text-sm sm:text-base text-foreground/85 font-medium italic max-w-md sm:max-w-xl drop-shadow-[0_1px_12px_rgba(0,0,0,0.75)]"
          data-testid="home-hero-mission"
        >
          {BRAND_MISSION}
        </p>
        <p
          className="mt-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60 drop-shadow-[0_1px_12px_rgba(0,0,0,0.75)]"
          data-testid="home-hero-brand-name"
        >
          {BRAND_NAME}
        </p>
        <div className="mt-4 drop-shadow-[0_1px_12px_rgba(0,0,0,0.75)]">
          <LightsAndSirensCredit variant="hero" showFirefighterOwned />
        </div>
        <p
          className="mt-4 text-base sm:text-lg text-foreground/80 leading-relaxed max-w-md sm:max-w-lg font-normal drop-shadow-[0_1px_12px_rgba(0,0,0,0.75)]"
          data-testid="home-hero-subtitle"
        >
          {HOME.subline}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            asChild
            size="lg"
            className={cn(
              "h-12 sm:h-14 px-7 font-heading text-sm uppercase tracking-[0.12em]",
              "shadow-lg shadow-primary/25 hover:shadow-primary/35",
              "transition-[transform,box-shadow] duration-300 hover:scale-[1.02] active:scale-[0.98]",
            )}
          >
            <Link href="/recipes" data-testid="home-cta-recipes">
              {CTA.viewRecipes}
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className={cn(
              "h-12 sm:h-14 px-7 font-heading text-sm uppercase tracking-[0.12em]",
              "border-foreground/15 bg-background/40 backdrop-blur-sm",
              "hover:bg-foreground/[0.06] transition-[transform,background] duration-300 hover:scale-[1.01] active:scale-[0.98]",
            )}
          >
            <Link href="/generator" data-testid="home-cta-generator">
              {CTA.findDinner}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

