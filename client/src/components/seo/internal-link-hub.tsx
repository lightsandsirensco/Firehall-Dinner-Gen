import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { CTA } from "@/lib/brand-copy";

export type InternalLink = { href: string; label: string; description?: string };

const HUB_LINKS: InternalLink[] = [
  { href: "/recipes", label: "Firefighter recipes", description: "Full catalog — 150+ crew dinners" },
  { href: "/explore", label: "Browse recipes", description: "Search by protein, time & category" },
  { href: "/categories/crew_favorites", label: "Hall favorites", description: "Popular firehouse meals" },
  { href: "/categories/quick_meals", label: "Quick shift meals", description: "Under 45 minutes" },
  { href: "/categories/healthy_options", label: "Healthy meals", description: "High-protein hall picks" },
  { href: "/categories/bbq_smoker", label: "BBQ & grill", description: "Smoker and grill nights" },
  { href: "/generator", label: CTA.findDinner, description: "Optional meal picker tool" },
  { href: "/guides", label: "Cooking guides", description: "Shift & nutrition notes" },
];

const POPULAR_RECIPES: InternalLink[] = [
  { href: "/recipes/chicken-parm", label: "Chicken Parm" },
  { href: "/recipes/smash-burgers", label: "Smash Burgers" },
  { href: "/recipes/pulled-pork", label: "Pulled Pork" },
  { href: "/recipes/bbq-chicken-bowls", label: "BBQ Chicken Bowls" },
  { href: "/recipes/steak-tacos", label: "Steak Tacos" },
  { href: "/recipes/big-chili", label: "Big Chili" },
];

interface InternalLinkHubProps {
  title?: string;
  showPopular?: boolean;
  className?: string;
}

export function InternalLinkHub({
  title = "Explore",
  showPopular = true,
  className,
}: InternalLinkHubProps) {
  return (
    <aside
      className={cn("rounded-2xl border border-border/30 bg-muted/15 p-5 sm:p-6", className)}
      aria-labelledby="internal-link-hub-heading"
    >
      <h2 id="internal-link-hub-heading" className="font-heading text-lg sm:text-xl">
        {title}
      </h2>
      <nav aria-label="Site sections" className="mt-4">
        <ul className="grid gap-2 sm:grid-cols-2">
          {HUB_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                <span className="text-sm font-medium text-primary">{link.label}</span>
                {link.description && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {link.description}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {showPopular && (
        <div className="mt-6 pt-5 border-t border-border/20">
          <h3 className="text-sm font-semibold text-foreground">Popular</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {POPULAR_RECIPES.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 text-foreground hover:bg-muted transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
