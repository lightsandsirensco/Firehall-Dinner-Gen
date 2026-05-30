import { Link } from "wouter";
import { BRAND_TAGLINE, CTA, HOME } from "@/lib/brand-copy";
import { SEO_MISSION, SEO_TAGLINE } from "@shared/seo/constants";
import {
  APPROVED_CATALOG_TOTAL,
  marketingRecipeCountCopy,
} from "@shared/meal-catalog/curated-count";

interface HomeSeoIntroProps {
  recipeCount?: number;
}

function buildIntroParagraphs(recipeCount: number): string[] {
  return [
    "Every hall knows the same argument before the tones drop: what's for dinner? Firefighter meals are not home-cooking scaled up — they are built for crews who eat together, cook between calls, and need food that still tastes good when someone gets back late. Firehall Meals exists to end that debate with real station dinners, not influencer food.",
    `Browse ${marketingRecipeCountCopy(recipeCount)} and firehall meals sized for the crew. From quick shift plates under forty-five minutes to BBQ feeds that fill the bay, every recipe includes crew scaling, honest timing, and steps written for station kitchens — not single-plate blogs.`,
    "Fire station meals here cover comfort classics, healthy performance picks, breakfast after night shift, and feeds for a crowd when the whole platoon eats together. Firehouse recipes like chicken parm, pulled pork, smash burgers, and big-batch chili show up in halls across North America because they work on shift.",
    "Whether you are a probationary on your first crew dinner or the senior who always ends up on the grill, these firefighter meals respect hall culture. Crew meals should taste like the station — practical, generous, and worth sitting down for after a run.",
    "Use Browse Recipes to explore the full catalog, spin the Classics Wheel when nobody can decide, or Find a Meal when you want a fast pick based on protein, time, and head count. Built by firefighters. Tested in the firehall.",
  ];
}

export function HomeSeoIntro({ recipeCount = APPROVED_CATALOG_TOTAL }: HomeSeoIntroProps) {
  const introParagraphs = buildIntroParagraphs(recipeCount);

  return (
    <section
      className="border-b border-border/20 bg-background"
      aria-labelledby="home-intro-heading"
      data-testid="home-seo-intro"
    >
      <div className="max-w-[1400px] mx-auto px-page py-10 sm:py-14">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/90">
            {SEO_TAGLINE}
          </p>
          <p className="mt-2 text-sm sm:text-base font-medium text-foreground/90 italic">
            {SEO_MISSION}
          </p>
          <h2
            id="home-intro-heading"
            className="mt-6 font-heading text-2xl sm:text-3xl leading-tight tracking-tight text-foreground"
          >
            {HOME.introTitle}
          </h2>
          <div className="mt-5 space-y-4 text-[15px] sm:text-base text-muted-foreground leading-[1.8] max-w-prose">
            {introParagraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
          <nav aria-label="Firefighter meal topics" className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/firefighter-meals" className="text-sm font-medium text-primary hover:text-primary/85">
              Firefighter meals
            </Link>
            <Link href="/firefighter-recipes" className="text-sm font-medium text-primary hover:text-primary/85">
              Firefighter recipes
            </Link>
            <Link href="/firehouse-recipes" className="text-sm font-medium text-primary hover:text-primary/85">
              Firehouse recipes
            </Link>
            <Link href="/fire-station-meals" className="text-sm font-medium text-primary hover:text-primary/85">
              Fire station meals
            </Link>
            <Link href="/healthy-firefighter-meals" className="text-sm font-medium text-primary hover:text-primary/85">
              Healthy firefighter meals
            </Link>
            <Link href="/recipes" className="text-sm font-medium text-primary hover:text-primary/85">
              {CTA.viewRecipes}
            </Link>
          </nav>
        </div>
      </div>
    </section>
  );
}
