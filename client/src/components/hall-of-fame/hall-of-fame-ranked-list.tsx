import { Link } from "wouter";
import { Trophy } from "lucide-react";
import type { AnalyticsRankedRow } from "@shared/analytics/events";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { cn } from "@/lib/utils";

function recipeHrefForRow(row: AnalyticsRankedRow): string | undefined {
  if (!row.key || row.key.includes(" ")) return undefined;
  return approvedCatalogRecipePath(row.key);
}

interface HallOfFameRankedListProps {
  title: string;
  rows: AnalyticsRankedRow[];
  countLabel: (count: number) => string;
  empty: string;
  className?: string;
  testId?: string;
}

export function HallOfFameRankedList({
  title,
  rows,
  countLabel,
  empty,
  className,
  testId,
}: HallOfFameRankedListProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/50 bg-card/40 shadow-sm overflow-hidden",
        className,
      )}
      aria-labelledby={`hof-${testId ?? title}-heading`}
      data-testid={testId}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/20">
        <Trophy className="w-4 h-4 text-primary shrink-0" aria-hidden />
        <h2
          id={`hof-${testId ?? title}-heading`}
          className="text-sm font-semibold text-foreground tracking-wide"
        >
          {title}
        </h2>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ol className="divide-y divide-border/30">
          {rows.map((row, index) => {
            const href = recipeHrefForRow(row);
            const rank = index + 1;
            const isTop = rank === 1;
            const content = (
              <>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono tabular-nums",
                    isTop
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground line-clamp-2 leading-snug">
                    {row.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {countLabel(row.count)}
                  </span>
                </span>
              </>
            );

            return (
              <li key={`${row.key}-${index}`}>
                {href ? (
                  <Link
                    href={href}
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors touch-manipulation"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-4 py-3.5">{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
