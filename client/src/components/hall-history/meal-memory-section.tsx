/**
 * Firehall Meals Pro V1 Feature 3 — "Meal memory" account-level UI.
 *
 * Compact, distinct from the free device-local Hall History timeline below
 * it on this same page (see me-history-page.tsx) — this surfaces the NEW
 * durable, cross-device `user_meal_history` table, Pro-only.
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { useFeature, useRecordPaywallView } from "@/lib/billing/hooks";
import { deleteMealHistoryEntry, fetchMealHistory } from "@/lib/meal-history-api";
import { trackProFeatureClicked } from "@/lib/analytics";

export function MealMemorySection() {
  const { authenticated } = useAuth();
  const hasMealMemory = useFeature("meal_memory");
  const [, setLocation] = useLocation();
  const recordPaywall = useRecordPaywallView();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<number | null>(null);

  const historyQuery = useQuery({
    queryKey: ["/api/meal-history"],
    queryFn: fetchMealHistory,
    enabled: authenticated && hasMealMemory,
    staleTime: 30_000,
  });

  // Meal memory is an account-level (signed-in) capability — nothing to
  // show a guest here (the free device-local timeline below still works).
  if (!authenticated) return null;

  if (!hasMealMemory) {
    return (
      <section
        className="rounded-2xl border border-border/40 bg-card/25 p-4 space-y-2"
        data-testid="meal-memory-locked-section"
      >
        <div className="flex items-center gap-1.5">
          <h2 className="font-heading text-sm tracking-wide">Meal memory</h2>
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
            <Lock className="h-2.5 w-2.5" aria-hidden />
            Pro
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Firehall Meals Pro remembers what you've cooked across every device and helps keep meals
          from getting repetitive.
        </p>
        <button
          type="button"
          onClick={() => {
            trackProFeatureClicked({ feature: "meal_memory", page: "/me/history", logged_in: authenticated });
            void recordPaywall("meal_memory", "me_history");
            setLocation("/me/subscription?feature=meal_memory");
          }}
          className="w-full rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-left text-xs text-muted-foreground"
          data-testid="meal-memory-locked"
        >
          Upgrade to Firehall Meals Pro to unlock meal memory.
        </button>
      </section>
    );
  }

  const entries = historyQuery.data?.entries ?? [];

  const handleRemove = async (id: number) => {
    setRemovingId(id);
    try {
      await deleteMealHistoryEntry(id);
      await queryClient.invalidateQueries({ queryKey: ["/api/meal-history"] });
    } catch {
      /* best-effort — leave the entry visible so the user can retry */
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section
      className="rounded-2xl border border-border/40 bg-card/25 p-4 space-y-3"
      data-testid="meal-memory-section"
    >
      <div>
        <h2 className="font-heading text-sm tracking-wide">Meal memory</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Meals you've marked cooked, remembered across every device.
        </p>
      </div>

      {historyQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-muted-foreground" data-testid="meal-memory-empty">
          No cooked meals recorded yet. Finish Cook Mode on a recipe to start remembering.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="meal-memory-list">
          {entries.map((entry) => {
            const date = new Date(entry.cooked_at);
            const dateLabel = Number.isNaN(date.getTime())
              ? ""
              : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            return (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/40 px-3 py-2"
              >
                <div className="min-w-0">
                  {entry.recipe_path ? (
                    <Link
                      href={entry.recipe_path}
                      className="text-sm font-medium text-foreground hover:text-primary line-clamp-1"
                    >
                      {entry.title ?? entry.recipe_slug}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground line-clamp-1">
                      {entry.title ?? "Recipe no longer available"}
                    </p>
                  )}
                  {dateLabel ? (
                    <p className="text-xs text-muted-foreground/80 mt-0.5">{dateLabel}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={removingId === entry.id}
                  onClick={() => void handleRemove(entry.id)}
                  aria-label={`Remove ${entry.title ?? entry.recipe_slug} from meal memory`}
                  data-testid={`meal-memory-remove-${entry.id}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
