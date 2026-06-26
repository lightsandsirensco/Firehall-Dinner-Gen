import { Link } from "wouter";
import { History, ChevronRight } from "lucide-react";
import { HALL_HISTORY } from "@/lib/brand-copy";
import { useHallHistory } from "@/hooks/use-hall-history";
import { formatLastCookedMessage, daysSinceCooked } from "@shared/hall-profile/history-format";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { trackHallRecentMealClicked } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface RecentlyCookedStripProps {
  className?: string;
  limit?: number;
  showSeeAll?: boolean;
  source?: string;
}

export function RecentlyCookedStrip({
  className,
  limit = 4,
  showSeeAll = true,
  source = "recently_cooked_strip",
}: RecentlyCookedStripProps) {
  const { recentlyCooked } = useHallHistory();
  const meals = recentlyCooked.slice(0, limit);

  if (meals.length === 0) return null;

  return (
    <section
      className={cn("rounded-xl border border-border/40 bg-card/30 px-4 py-4", className)}
      aria-labelledby="recently-cooked-heading"
      data-testid="recently-cooked-strip"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary shrink-0" aria-hidden />
          <h2 id="recently-cooked-heading" className="text-sm font-semibold text-foreground">
            {HALL_HISTORY.recentlyCooked}
          </h2>
        </div>
        {showSeeAll && (
          <Link
            href="/me/history"
            className="text-xs font-medium text-primary hover:text-primary/85 inline-flex items-center gap-0.5"
          >
            {HALL_HISTORY.seeAll}
            <ChevronRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <ul className="space-y-2">
        {meals.map((entry) => {
          const href =
            entry.recipePath ??
            (entry.recipeSlug ? approvedCatalogRecipePath(entry.recipeSlug) : undefined);
          const line = formatLastCookedMessage(entry);
          const content = (
            <>
              <span className="font-medium text-foreground line-clamp-1">{entry.title}</span>
              {line ? (
                <span className="text-xs text-muted-foreground mt-0.5 block">{line}</span>
              ) : null}
            </>
          );
          return (
            <li key={entry.id}>
              {href ? (
                <Link
                  href={href}
                  className="block rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors"
                  onClick={() =>
                    trackHallRecentMealClicked({
                      recipe_slug: entry.recipeSlug,
                      recipe_title: entry.title,
                      days_since_cooked: daysSinceCooked(entry),
                      source,
                    })
                  }
                >
                  {content}
                </Link>
              ) : (
                <div className="rounded-lg px-3 py-2.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
