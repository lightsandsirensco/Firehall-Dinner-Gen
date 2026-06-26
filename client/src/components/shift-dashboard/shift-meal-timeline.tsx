import { Link } from "wouter";
import type { HallHistoryEntry } from "@shared/hall-profile/types";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { formatLastCookedMessage } from "@shared/hall-profile/history-format";
import { trackShiftMealSelected } from "@/lib/analytics";
import { cn } from "@/lib/utils";

function entryHref(entry: HallHistoryEntry): string | undefined {
  return (
    entry.recipePath ??
    (entry.recipeSlug ? approvedCatalogRecipePath(entry.recipeSlug) : undefined)
  );
}

interface ShiftMealTimelineProps {
  entries: HallHistoryEntry[];
  hallId: string;
  shiftId: string;
  emptyMessage: string;
  className?: string;
}

export function ShiftMealTimeline({
  entries,
  hallId,
  shiftId,
  emptyMessage,
  className,
}: ShiftMealTimelineProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>;
  }

  return (
    <ul className={cn("space-y-2.5", className)} data-testid="shift-meal-timeline">
      {entries.map((entry) => {
        const href = entryHref(entry);
        const date = new Date(entry.at);
        const dateLabel = Number.isNaN(date.getTime())
          ? ""
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        return (
          <li
            key={entry.id}
            className="rounded-xl border border-border/40 bg-card/25 px-4 py-3"
          >
            {href ? (
              <Link
                href={href}
                className="font-medium text-foreground hover:text-primary line-clamp-2"
                onClick={() => {
                  trackShiftMealSelected({
                    hall_id: hallId,
                    shift_id: shiftId,
                    recipe_slug: entry.recipeSlug,
                    recipe_title: entry.title,
                    source: "recently_cooked",
                  });
                }}
              >
                {entry.title}
              </Link>
            ) : (
              <p className="font-medium text-foreground line-clamp-2">{entry.title}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formatLastCookedMessage(entry)}
              {dateLabel ? ` · ${dateLabel}` : ""}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
