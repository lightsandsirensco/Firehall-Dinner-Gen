import { Link } from "wouter";
import { CTA, HOME } from "@/lib/brand-copy";

const LINKS = [
  { href: "/firefighter-meals", label: "Firefighter meals" },
  { href: "/firefighter-recipes", label: "Firefighter recipes" },
  { href: "/firehouse-recipes", label: "Firehouse recipes" },
  { href: "/fire-station-meals", label: "Fire station meals" },
  { href: "/recipes", label: "All firefighter recipes" },
  { href: "/explore", label: "Browse recipe catalog" },
  { href: "/categories/quick_meals", label: "Quick shift meals" },
  { href: "/categories/healthy_options", label: "Healthy firefighter meals" },
  { href: "/categories/bbq_smoker", label: "BBQ firefighter recipes" },
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
              Firehall Meals is the largest collection of firefighter meals and firehall recipes online
              — sized for crews, written for station kitchens, and organized by how halls actually cook:
              quick shifts, BBQ nights, healthy options, and feeds for a crowd.
            </p>
            <p>
              Built by firefighters. Tested in the firehall. Browse firefighter recipes, explore station
              meals by category, or use Find a Meal when the crew wants a fast pick for tonight.
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
