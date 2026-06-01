import { Link } from "wouter";
import { HOME } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

function buildIntroParagraphs(): string[] {
  return [
    `Browse ${HOME.curatedRecipesLabel} sized for the crew. From quick shift plates under forty-five minutes to BBQ feeds that fill the bay, every recipe includes crew scaling, honest timing, and steps written for station kitchens — not single-plate blogs.`,
    "Fire station meals here cover comfort classics, healthy performance picks, breakfast after night shift, and feeds for a crowd when the whole platoon eats together. Firehouse recipes like chicken parm, pulled pork, smash burgers, and big-batch chili show up in halls across North America because they work on shift.",
    "Use Find a Meal when you want a fast pick, spin the Classics Wheel when the crew can't decide, or browse the full catalog when you know what you're craving.",
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
        <Link href="/recipes" className="text-sm font-medium text-primary hover:text-primary/85">
          All recipes
        </Link>
      </nav>
    </section>
  );
}
