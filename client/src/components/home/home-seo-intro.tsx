import { Link } from "wouter";
import { HOME } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

function buildIntroParagraphs(): string[] {
  return [
    `Firehall Meals is a meal app for firefighters — pick shift dinners in seconds, save recipes you love, and cook with crew-sized ingredients from ${HOME.curatedRecipesLabel}. Every recipe includes honest timing and steps written for station kitchens, not single-plate blogs.`,
    "Use Hall Match when you want a fast curated pick, spin the Classics Wheel when you cannot decide, or browse the full catalog when you know what you are craving. Sign in to sync saves and meal history across devices.",
    "When your crew wants to plan together, connect your account to your hall for shared dinner votes, grocery lists, and meal history — optional, free to join.",
  ];
}

export function HomeSeoIntro() {
  const introParagraphs = buildIntroParagraphs();

  return (
    <section
      className="max-w-[1400px] mx-auto px-page py-10 sm:py-12 border-b border-border/20"
      aria-labelledby="home-seo-intro-heading"
      data-testid="home-seo-intro"
    >
      <h2 id="home-seo-intro-heading" className={cn(app.titleSection, "max-w-2xl")}>
        {HOME.introTitle}
      </h2>

      <div className="mt-5 space-y-4 text-muted-foreground leading-relaxed max-w-3xl">
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
