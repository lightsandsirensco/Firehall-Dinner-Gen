import { useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { BookOpen, ChevronRight, History, Shuffle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHallHistory } from "@/hooks/use-hall-history";
import { setTonightSelection } from "@/lib/tonight-selection-store";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { isApprovedCatalogSlug } from "@shared/hall-catalog/gate";
import type { HallHistoryEntry } from "@shared/hall-profile/types";

const ROW_CLASS =
  "flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left touch-manipulation transition-colors hover:bg-muted/25 active:bg-muted/35";

function OptionBody({
  icon: Icon,
  title,
  detail,
  trailing,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  trailing?: ReactNode;
}) {
  return (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground leading-snug">{detail}</span>
      </span>
      {trailing ?? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />}
    </>
  );
}

function cookAgainPath(entry: HallHistoryEntry): string | undefined {
  if (entry.recipePath?.startsWith("/recipes/")) return entry.recipePath;
  if (entry.recipeSlug && isApprovedCatalogSlug(entry.recipeSlug)) {
    const path = approvedCatalogRecipePath(entry.recipeSlug);
    if (path.startsWith("/recipes/")) return path;
  }
  return undefined;
}

/** State 1 — nothing chosen for tonight yet. */
export function TonightEmptyState() {
  const { recentlyCooked } = useHallHistory();
  const [showRecent, setShowRecent] = useState(false);

  const recent = useMemo(
    () =>
      recentlyCooked
        .map((entry) => ({ entry, path: cookAgainPath(entry) }))
        .filter((row): row is { entry: HallHistoryEntry; path: string } => Boolean(row.path))
        .slice(0, 3),
    [recentlyCooked],
  );

  return (
    <div className="space-y-8" data-testid="tonight-empty-state">
      <header className="space-y-3 px-0.5 pt-2">
        <p className={app.eyebrowAccent}>Tonight</p>
        <h1 className="font-heading text-[2.5rem] leading-[0.95] tracking-tight text-foreground sm:text-5xl">
          What are we cooking?
        </h1>
        <p className="max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          Answer 3 quick questions and get a crew-sized dinner recommendation.
        </p>
      </header>

      <Button
        asChild
        size="lg"
        className="min-h-14 w-full rounded-xl font-heading text-lg tracking-wide touch-manipulation"
      >
        <Link href="/generator" data-testid="tonight-find-meal">
          Find Tonight&apos;s Meal
        </Link>
      </Button>

      <section className="space-y-2.5" aria-labelledby="tonight-quick-options">
        <h2 id="tonight-quick-options" className={cn(app.sectionLabel, "px-0.5")}>
          Quick options
        </h2>
        <ul className="overflow-hidden rounded-2xl border border-border/40 bg-card/30 divide-y divide-border/30">
          <li>
            <Link href="/wheel" className={ROW_CLASS} data-testid="tonight-surprise">
              <OptionBody icon={Shuffle} title="Surprise the hall" detail="Get a random crew-friendly meal" />
            </Link>
          </li>
          <li>
            <Link href="/explore" className={ROW_CLASS} data-testid="tonight-browse">
              <OptionBody icon={BookOpen} title="Browse recipes" detail="Choose something from the catalog" />
            </Link>
          </li>
          {recent.length > 0 ? (
            <li>
              <button
                type="button"
                className={ROW_CLASS}
                onClick={() => setShowRecent((v) => !v)}
                aria-expanded={showRecent}
                aria-controls="tonight-cook-again-list"
                data-testid="tonight-cook-again"
              >
                <OptionBody
                  icon={History}
                  title="Cook it again"
                  detail="Repeat a recent meal"
                  trailing={
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform",
                        showRecent && "rotate-90",
                      )}
                      aria-hidden
                    />
                  }
                />
              </button>
              {showRecent ? (
                <ul id="tonight-cook-again-list" className="border-t border-border/30 bg-background/40 py-1">
                  {recent.map(({ entry, path }) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center gap-3 py-2 pl-[3.75rem] pr-4 text-left text-sm font-medium text-foreground/90 touch-manipulation hover:bg-muted/25"
                        onClick={() =>
                          setTonightSelection({
                            source: "cook_again",
                            title: entry.title,
                            recipeSlug: entry.recipeSlug,
                            recipePath: path,
                            crewSize: entry.crewSize,
                          })
                        }
                      >
                        <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
