import { Link } from "wouter";
import { HOME } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

function buildIntroParagraphs(): string[] {
  return [
    `Firehall Meals helps crews decide what to cook, scale recipes to the right number of firefighters, and get dinner on the table without overthinking it. Browse ${HOME.curatedRecipesLabel}, use the meal generator for a quick pick, or spin the Classics Wheel when nobody can decide.`,
    "Every recipe is built for station kitchens, with crew-sized ingredients, realistic timing, and straightforward instructions.",
    "Firehall Meals Pro goes further by learning how your crew eats. Save hall preferences, build personalized shift plans, create grocery lists, track meals and ratings, follow nutrition goals, and get recommendations that improve over time. Pro is also being built to help crews plan around local grocery deals and spend less per shift.",
    "Sign in to sync your saves, meal history, preferences, and progress across devices.",
  ];
}

export function HomeSeoIntro() {
  const introParagraphs = buildIntroParagraphs();

  return (
    <section
      className={cn("max-w-[1400px] mx-auto px-page border-b border-border/20", app.sectionY)}
      aria-labelledby="home-seo-intro-heading"
      data-testid="home-seo-intro"
    >
      <h2 id="home-seo-intro-heading" className={cn(app.titleSection, "max-w-2xl")}>
        {HOME.introTitle}
      </h2>

      <div className="mt-5 space-y-4 text-[15px] sm:text-base text-muted-foreground leading-[1.75] max-w-prose">
        {introParagraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </div>

      <nav
        className="mt-6 flex flex-wrap gap-x-4 gap-y-2"
        aria-label="Popular recipe hubs"
      >
        <Link href="/firefighter-recipes" className="text-sm font-medium text-primary hover:text-primary/85">
          Firefighter recipes
        </Link>
        <Link href="/firehouse-recipes" className="text-sm font-medium text-primary hover:text-primary/85">
          Firehouse recipes
        </Link>
        <Link href="/breakfast" className="text-sm font-medium text-primary hover:text-primary/85">
          Breakfast
        </Link>
        <Link href="/explore" className="text-sm font-medium text-primary hover:text-primary/85">
          All recipes
        </Link>
      </nav>
    </section>
  );
}
