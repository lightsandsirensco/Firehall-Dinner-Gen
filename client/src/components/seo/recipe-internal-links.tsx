import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { RecipeLinkCluster } from "@shared/golden-100/internal-link-clusters";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";

interface RecipeInternalLinksProps {
  clusters: RecipeLinkCluster[];
  className?: string;
}

/**
 * Editorial internal link clusters — compact text links grouped by topical relevance.
 */
export function RecipeInternalLinks({ clusters, className }: RecipeInternalLinksProps) {
  if (clusters.length === 0) return null;

  return (
    <section
      className={cn("space-y-8", className)}
      aria-labelledby="recipe-internal-links-heading"
    >
      <div>
        <h2 id="recipe-internal-links-heading" className="font-heading text-xl sm:text-2xl">
          More meals like this
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Hand-picked from the hall catalog — same proteins, cooking styles, and shift-night themes.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {clusters.map((group) => (
          <nav
            key={group.id}
            aria-labelledby={`cluster-${group.id}`}
            className="rounded-2xl border border-border/25 bg-muted/10 p-4 sm:p-5"
          >
            <h3 id={`cluster-${group.id}`} className="text-sm font-semibold text-foreground">
              {group.heading}
            </h3>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.slug}>
                  <Link
                    href={approvedCatalogRecipePath(link.slug)}
                    className="text-sm text-primary hover:underline underline-offset-2 leading-snug"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        <Link href="/recipes" className="text-primary hover:underline">
          Browse all firefighter meals
        </Link>
        {" · "}
        <Link href="/explore" className="text-primary hover:underline">
          Explore by category
        </Link>
      </p>
    </section>
  );
}
