import { Link } from "wouter";
import { CTA, HOME } from "@/lib/brand-copy";
import { BROWSE_CANONICAL_PATH, firehallCategoryExplorePath } from "@shared/browse-canonical";

const LINKS = [
  { href: "/firefighter-meals", label: "Firefighter meals" },
  { href: "/firefighter-recipes", label: "Firefighter recipes" },
  { href: "/firehouse-recipes", label: "Firehouse recipes" },
  { href: "/fire-station-meals", label: "Fire station meals" },
  { href: BROWSE_CANONICAL_PATH, label: "All firefighter recipes" },
  { href: firehallCategoryExplorePath("quick_meals"), label: "Quick shift meals" },
  { href: firehallCategoryExplorePath("healthy_options"), label: "Healthy firefighter meals" },
  { href: firehallCategoryExplorePath("bbq_smoker"), label: "BBQ firefighter recipes" },
  { href: "/firefighter-breakfast-recipes", label: "Firefighter breakfast recipes" },
  { href: "/wheel", label: "Classics Wheel" },
  { href: "/guides", label: "Firehouse cooking guides" },
  { href: "/generator", label: CTA.findDinner },
] as const;

export function HomeSeoEditorial() {
  return (
    <section className="border-t border-border/20 bg-card/15" aria-labelledby="home-seo-heading">
      <div className="max-w-[1400px] mx-auto px-page py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2
            id="home-seo-heading"
            className="font-heading text-2xl sm:text-3xl leading-tight tracking-tight text-foreground"
          >
            {HOME.seoTitle}
          </h2>
          <div className="mt-5 space-y-4 text-[15px] sm:text-base text-muted-foreground leading-[1.75] max-w-prose">
            <p>
              Firehall Meals helps individual firefighters pick shift dinners, save meals they love,
              and cook with crew-sized portions from hundreds of firefighter-tested recipes. It is
              free to use on your own — no hall membership required.
            </p>
            <p>
              When your station wants shared planning, connect your account to your hall for crew
              votes, grocery lists, and meal history. Built by firefighters. Tested on real shifts.
            </p>
          </div>
          <nav aria-label="Explore firefighter meals" className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-primary hover:text-primary/85 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
