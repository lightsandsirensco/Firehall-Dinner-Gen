import { Link } from "wouter";
import type { HallHistoryEntry } from "@shared/hall-profile/types";
import { formatLastCookedMessage } from "@shared/hall-profile/history-format";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { CookAgainButton } from "@/components/hall-history/cook-again-button";
import { Button } from "@/components/ui/button";
import { ChefHat, History, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

function entryHref(entry: HallHistoryEntry): string | undefined {
  if (entry.meta?.voteId) return `/vote/${entry.meta.voteId}`;
  return (
    entry.recipePath ??
    (entry.recipeSlug ? approvedCatalogRecipePath(entry.recipeSlug) : undefined)
  );
}

function entryMetaLine(entry: HallHistoryEntry): string {
  if (entry.type === "hall_vote" && entry.meta?.optionCount) {
    return `Hall Vote · ${entry.meta.optionCount} options`;
  }
  if (entry.type === "wheel_result") return "Classics Wheel";
  if (entry.type === "meal_generated") return "Hall Match";
  const parts: string[] = [];
  if (entry.crewSize) parts.push(`Crew ${entry.crewSize}`);
  const cooked = formatLastCookedMessage(entry);
  if (cooked) parts.push(cooked.replace(/\.$/, ""));
  return parts.join(" · ") || "Meal cooked";
}

interface HallHistoryTimelineProps {
  entries: HallHistoryEntry[];
  className?: string;
  emptyMessage?: string;
}

export function HallHistoryTimeline({
  entries,
  className,
  emptyMessage,
}: HallHistoryTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="fade-up rounded-2xl border border-dashed border-border/50 bg-muted/10 px-6 py-10 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <History className="h-6 w-6 text-primary/90" aria-hidden />
        </div>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {emptyMessage ?? "No meals logged yet. Cook a recipe or spin the wheel to start your timeline."}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild className="min-h-11 gap-2">
            <Link href="/generator">
              <Sparkles className="w-4 h-4" aria-hidden />
              Pick a meal
            </Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11 gap-2">
            <Link href="/wheel">
              <ChefHat className="w-4 h-4" aria-hidden />
              Spin the wheel
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ul className={cn("space-y-3", app.stagger, className)} data-testid="hall-history-timeline">
      {entries.map((entry) => {
        const href = entryHref(entry);
        const date = new Date(entry.at);
        const dateLabel = Number.isNaN(date.getTime())
          ? ""
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        return (
          <li
            key={entry.id}
            className="rounded-xl border border-border/40 bg-card/25 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="min-w-0">
              {href ? (
                <Link href={href} className="font-medium text-foreground hover:text-primary line-clamp-2">
                  {entry.title}
                </Link>
              ) : (
                <p className="font-medium text-foreground line-clamp-2">{entry.title}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{entryMetaLine(entry)}</p>
              {dateLabel ? (
                <p className="text-xs text-muted-foreground/80 mt-0.5">{dateLabel}</p>
              ) : null}
            </div>
            {entry.type === "meal_cooked" && entry.recipeSlug ? (
              <CookAgainButton
                title={entry.title}
                recipeSlug={entry.recipeSlug}
                recipePath={entry.recipePath}
                source="hall_history_timeline"
                size="sm"
                className="shrink-0"
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
