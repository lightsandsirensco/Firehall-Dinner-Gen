/**
 * Firehall Meals Meal History + Crew Feedback — account-level UI.
 *
 * Compact, distinct from the free device-local Hall History timeline below
 * it on this same page (see me-history-page.tsx) — this surfaces the
 * durable, cross-device `user_meal_history` table, Pro-only. Chronological,
 * newest first; tapping a card opens the full detail + lets you edit
 * feedback later.
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Trash2, Star, ThumbsUp, ThumbsDown, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/context";
import { useFeature, useRecordPaywallView } from "@/lib/billing/hooks";
import { deleteMealHistoryEntry, fetchMealHistory } from "@/lib/meal-history-api";
import { trackProFeatureClicked } from "@/lib/analytics";
import { MealFeedbackSheet } from "@/components/meal-history/meal-feedback-sheet";
import { FEEDBACK_TAG_LABELS, type MealHistoryEntry } from "@shared/meal-history/types";
import { MEAL_OCCASION_LABELS, type MealOccasion } from "@shared/shift-planner/occasions";
import { NUTRITION_GOAL_LABELS, type NutritionGoal } from "@shared/nutrition/goal-scoring";
import { cn } from "@/lib/utils";

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function occasionLabel(value: string | null): string | null {
  if (!value) return null;
  return MEAL_OCCASION_LABELS[value as MealOccasion] ?? null;
}

function nutritionGoalLabel(value: string | null): string | null {
  if (!value || value === "no_preference") return null;
  return NUTRITION_GOAL_LABELS[value as NutritionGoal] ?? null;
}

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          className={cn(cls, v <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
        />
      ))}
    </div>
  );
}

export function MealMemorySection() {
  const { authenticated } = useAuth();
  const hasMealMemory = useFeature("meal_memory");
  const [, setLocation] = useLocation();
  const recordPaywall = useRecordPaywallView();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [detailEntry, setDetailEntry] = useState<MealHistoryEntry | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
          <h2 className="font-heading text-sm tracking-wide">Meal history</h2>
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
            <Lock className="h-2.5 w-2.5" aria-hidden />
            Pro
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Firehall Meals Pro remembers what you've cooked and rated across every device, and helps
          keep meals from getting repetitive.
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
          Upgrade to Firehall Meals Pro to unlock meal history.
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
      setDetailEntry(null);
    } catch {
      /* best-effort — leave the entry visible so the user can retry */
    } finally {
      setRemovingId(null);
    }
  };

  const refreshAfterFeedback = async () => {
    const fresh = await queryClient.fetchQuery({ queryKey: ["/api/meal-history"], queryFn: fetchMealHistory });
    const updated = fresh.entries.find((e) => e.id === detailEntry?.id);
    if (updated) setDetailEntry(updated);
  };

  return (
    <section
      className="rounded-2xl border border-border/40 bg-card/25 p-4 space-y-3"
      data-testid="meal-memory-section"
    >
      <div>
        <h2 className="font-heading text-sm tracking-wide">Meal history</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Meals you've made, remembered and rated across every device.
        </p>
      </div>

      {historyQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-6 space-y-2" data-testid="meal-memory-empty">
          <UtensilsCrossed className="h-6 w-6 mx-auto text-muted-foreground/50" aria-hidden />
          <p className="text-sm font-medium text-foreground">Nothing cooked yet.</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Log meals you make and Firehall Meals will start learning what your crew likes.
          </p>
          <Button asChild size="sm" className="min-h-10 touch-manipulation">
            <Link href="/generator">Find a meal</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="meal-memory-list">
          {entries.map((entry) => {
            const dateLabel = formatDateLabel(entry.cooked_at);
            const occasion = occasionLabel(entry.meal_occasion);
            const goal = nutritionGoalLabel(entry.nutrition_goal);

            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setDetailEntry(entry)}
                  className="w-full flex items-center gap-3 rounded-xl border border-border/30 bg-background/40 px-3 py-2.5 text-left hover-elevate active-elevate-2 touch-manipulation"
                  data-testid={`meal-memory-card-${entry.id}`}
                >
                  {entry.hero_image ? (
                    <img
                      src={entry.hero_image}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover shrink-0 bg-muted"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted shrink-0" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        {entry.title ?? entry.recipe_slug}
                      </p>
                      <span className="text-[11px] text-muted-foreground/80 shrink-0">
                        {[dateLabel, occasion].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.rating ? <StarRow rating={entry.rating} /> : null}
                      {entry.make_again === true && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                          <ThumbsUp className="h-3 w-3" /> Would make again
                        </span>
                      )}
                      {entry.make_again === false && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <ThumbsDown className="h-3 w-3" /> Wouldn't repeat
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground/80 line-clamp-1">
                      {[goal, entry.crew_size ? `Crew of ${entry.crew_size}` : null].filter(Boolean).join(" · ")}
                      {entry.cost?.trustworthy && (
                        <>
                          {" "}
                          {(goal || entry.crew_size) && "· "}~${Math.round(entry.cost.perPersonMin)}
                          {entry.cost.perPersonMax !== entry.cost.perPersonMin
                            ? `–${Math.round(entry.cost.perPersonMax)}`
                            : ""}
                          /person
                        </>
                      )}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {detailEntry && (
        <Sheet open={!!detailEntry} onOpenChange={(o) => !o && setDetailEntry(null)}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader className="text-left">
              <SheetTitle className="font-heading">{detailEntry.title ?? detailEntry.recipe_slug}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pb-[env(safe-area-inset-bottom)]">
              {detailEntry.hero_image && (
                <img
                  src={detailEntry.hero_image}
                  alt=""
                  className="w-full h-40 rounded-xl object-cover bg-muted"
                  loading="lazy"
                />
              )}
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  {formatDateLabel(detailEntry.cooked_at)}
                  {occasionLabel(detailEntry.meal_occasion) ? ` · ${occasionLabel(detailEntry.meal_occasion)}` : ""}
                  {detailEntry.crew_size ? ` · Crew of ${detailEntry.crew_size}` : ""}
                </p>
                {nutritionGoalLabel(detailEntry.nutrition_goal) && (
                  <p>Nutrition goal: {nutritionGoalLabel(detailEntry.nutrition_goal)}</p>
                )}
                {detailEntry.cost?.trustworthy && (
                  <p>
                    Est. ${Math.round(detailEntry.cost.totalMin)}–${Math.round(detailEntry.cost.totalMax)} total (~$
                    {Math.round(detailEntry.cost.perPersonMin)}–${Math.round(detailEntry.cost.perPersonMax)}/person)
                  </p>
                )}
              </div>

              {detailEntry.rating ? (
                <StarRow rating={detailEntry.rating} size="lg" />
              ) : (
                <p className="text-sm text-muted-foreground">Not rated yet.</p>
              )}

              {detailEntry.make_again !== null && (
                <p className="text-sm flex items-center gap-1.5">
                  {detailEntry.make_again ? (
                    <>
                      <ThumbsUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Would make again
                    </>
                  ) : (
                    <>
                      <ThumbsDown className="h-4 w-4 text-muted-foreground" /> Wouldn't make again
                    </>
                  )}
                </p>
              )}

              {detailEntry.feedback_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detailEntry.feedback_tags.map((tag) => (
                    <span key={tag} className="text-xs rounded-full border border-border/40 px-2.5 py-1">
                      {FEEDBACK_TAG_LABELS[tag]}
                    </span>
                  ))}
                </div>
              )}

              {detailEntry.note && (
                <p className="text-sm italic text-foreground/90 border-l-2 border-border/40 pl-3">
                  "{detailEntry.note}"
                </p>
              )}

              <div className="flex gap-2 pt-2">
                {detailEntry.recipe_path && (
                  <Button asChild variant="outline" className="flex-1 min-h-11 touch-manipulation">
                    <Link href={detailEntry.recipe_path}>View recipe</Link>
                  </Button>
                )}
                <Button
                  className="flex-1 min-h-11 touch-manipulation"
                  onClick={() => setFeedbackOpen(true)}
                  data-testid="button-edit-feedback"
                >
                  {detailEntry.rating ? "Edit rating" : "Rate this meal"}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-destructive"
                disabled={removingId === detailEntry.id}
                onClick={() => void handleRemove(detailEntry.id)}
                data-testid={`meal-memory-remove-${detailEntry.id}`}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                Remove from history
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {detailEntry && (
        <MealFeedbackSheet
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          entryId={detailEntry.id}
          recipeTitle={detailEntry.title ?? undefined}
          recipeSlug={detailEntry.recipe_slug}
          mealOccasion={detailEntry.meal_occasion ?? undefined}
          initialRating={detailEntry.rating}
          initialMakeAgain={detailEntry.make_again}
          initialTags={detailEntry.feedback_tags}
          initialNote={detailEntry.note}
          onSaved={() => void refreshAfterFeedback()}
        />
      )}
    </section>
  );
}
