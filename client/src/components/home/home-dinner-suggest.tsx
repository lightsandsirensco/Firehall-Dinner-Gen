import { Link } from "wouter";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import type { HallHistoryEntry } from "@shared/hall-profile/types";
import type { SavedMeal } from "@/lib/saved-meals";
import { cn } from "@/lib/utils";

export type DinnerSuggestItem = {
  id: string;
  title: string;
  href: string;
  source: "saved" | "recent";
};

export function buildDinnerSuggestions(
  saved: SavedMeal[],
  recent: HallHistoryEntry[],
  limit = 3,
): DinnerSuggestItem[] {
  const items: DinnerSuggestItem[] = [];
  const seen = new Set<string>();

  for (const meal of saved) {
    const slug = (meal.recipe as { _slug?: string })._slug;
    const href = slug
      ? `${approvedCatalogRecipePath(slug)}?cook=1`
      : undefined;
    if (!href) continue;
    const key = slug ?? meal.id;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: meal.id,
      title: meal.recipe.title,
      href,
      source: "saved",
    });
    if (items.length >= limit) return items;
  }

  for (const entry of recent) {
    const href = entry.recipePath
      ? `${entry.recipePath}${entry.recipePath.includes("?") ? "&" : "?"}cook=1`
      : entry.recipeSlug
        ? `${approvedCatalogRecipePath(entry.recipeSlug)}?cook=1`
        : undefined;
    if (!href) continue;
    const key = entry.recipeSlug ?? entry.recipePath ?? entry.id;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: entry.id,
      title: entry.title,
      href,
      source: "recent",
    });
    if (items.length >= limit) break;
  }

  return items;
}

/**
 * Real suggestions from saved + recent — only when dinner isn't locked.
 */
export function HomeDinnerSuggest({
  items,
  className,
}: {
  items: DinnerSuggestItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section
      id="home-suggest"
      className={cn("space-y-2", className)}
      aria-labelledby="home-suggest-heading"
      data-testid="home-dinner-suggest"
    >
      <h2
        id="home-suggest-heading"
        className="px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Cook these tonight
      </h2>
      <ul className="rounded-2xl border border-border/45 bg-card/40 divide-y divide-border/30">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex min-h-[48px] items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium hover:bg-muted/30 touch-manipulation"
            >
              <span className="line-clamp-1">{item.title}</span>
              <span className="shrink-0 text-xs font-semibold text-primary">
                {item.source === "saved" ? "Favorite" : "Cook"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
