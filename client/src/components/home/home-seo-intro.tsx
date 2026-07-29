import { Link } from "wouter";
import { HOME } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

function buildIntroParagraphs(): string[] {
  return [
    `Firehall Meals is a meal app for firefighters — pick shift dinners in seconds, save recipes you love, and cook with crew-sized ingredients from ${HOME.curatedRecipesLabel}. Every recipe includes honest timing and steps written for station kitchens, not single-plate blogs.`,
    "Use the meal generator when you want a fast curated pick, spin the Classics Wheel when you cannot decide, or browse the full catalog when you know what you are craving. Sign in to sync saves and meal history across devices.",
    "Hall Operations — shared dinner votes, grocery lists, and crew meal history — is in private beta. Join the waitlist and we will reach out when your station is invited in.",
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
