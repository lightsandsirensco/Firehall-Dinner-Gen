/**
 * Meal History + Crew Feedback — account-level UI.
 *
 * Every signed-in user sees their durable, cross-device `user_meal_history`.
 * Free: the last 30 days, with a count of older meals that are kept but
 * locked. Premium (Meal Memory): full history plus crew-favorite recall.
 * Distinct from the device-local Hall History timeline below it on
 * /me/history. Tapping a card opens detail + lightweight feedback editing.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Lock, Sparkles, Star, ThumbsDown, ThumbsUp, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/context";
import { useFeature } from "@/lib/billing/hooks";
import { deleteMealHistoryEntry, fetchMealHistory } from "@/lib/meal-history-api";
import { trackHistoryPaywallViewed } from "@/lib/analytics";
import { useProPaywall } from "@/components/billing/pro-paywall";
import { MealFeedbackSheet } from "@/components/meal-history/meal-feedback-sheet";
import { CookAgainButton } from "@/components/hall-history/cook-again-button";
import {
  FEEDBACK_TAG_LABELS,
  type MealHistoryEntry,
  type MealHistoryFavorite,
} from "@shared/meal-history/types";
import { FREE_HISTORY_WINDOW_DAYS } from "@shared/meal-history/access";
import { MEAL_OCCASION_LABELS, type MealOccasion } from "@shared/shift-planner/occasions";
import { NUTRITION_GOAL_LABELS, type NutritionGoal } from "@shared/nutrition/goal-scoring";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 30;

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
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

function CrewFavorites({ favorites }: { favorites: MealHistoryFavorite[] }) {
  if (favorites.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="meal-memory-favorites">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Crew favorites
      </p>
      <ul className="space-y-2">
        {favorites.map((fav) => (
          <li
            key={fav.recipe_slug}
            className="flex items-center gap-3 rounded-xl border border-border/30 bg-background/40 px-3 py-2"
          >
            {fav.hero_image ? (
              <img src={fav.hero_image} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 bg-muted" loading="lazy" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-muted shrink-0" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug line-clamp-2">{fav.title ?? fav.recipe_slug}</p>
              <p className="text-[11px] text-muted-foreground">
                {fav.times_cooked}× · {formatDateLabel(fav.last_cooked_at)}
              </p>
            </div>
            <CookAgainButton
              title={fav.title ?? fav.recipe_slug}
              recipeSlug={fav.recipe_slug}
              recipePath={fav.recipe_path ?? undefined}
              source="meal_memory_favorites"
              size="sm"
              className="min-h-9 shrink-0"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MealMemorySection() {
  const { authenticated } = useAuth();
  const canLogHistory = useFeature("meal_history");
  const { openProPaywall } = useProPaywall();
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [detailEntry, setDetailEntry] = useState<MealHistoryEntry | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const paywallTracked = useRef(false);

  const historyQuery = useQuery({
    queryKey: ["/api/meal-history", { limit }],
    queryFn: () => fetchMealHistory({ limit }),
    enabled: authenticated && canLogHistory,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const data = historyQuery.data;
  const lockedCount = data?.locked_count ?? 0;

  useEffect(() => {
    if (paywallTracked.current || !data || data.tier !== "free" || lockedCount === 0) return;
    paywallTracked.current = true;
    trackHistoryPaywallViewed({ surface: "me_history_locked", locked_count: lockedCount });
  }, [data, lockedCount]);

  if (!authenticated || !canLogHistory) return null;

  const isPremium = data?.tier === "premium";
  const windowDays = data?.window_days ?? FREE_HISTORY_WINDOW_DAYS;
  const entries = data?.entries ?? [];

  const openUpgrade = (surface: string) => openProPaywall("meal_memory", surface);

  const refetchHistory = () => queryClient.invalidateQueries({ queryKey: ["/api/meal-history"] });

  const handleRemove = async (id: number) => {
    setRemovingId(id);
    try {
      await deleteMealHistoryEntry(id);
      await refetchHistory();
      setDetailEntry(null);
    } catch {
      /* best-effort — leave the entry visible so the user can retry */
    } finally {
      setRemovingId(null);
    }
  };

  const refreshAfterFeedback = async () => {
    await refetchHistory();
    const fresh = queryClient.getQueryData<typeof data>(["/api/meal-history", { limit }]);
    const updated = fresh?.entries.find((e) => e.id === detailEntry?.id);
    if (updated) setDetailEntry(updated);
  };

  return (
    <section
      className="rounded-2xl border border-border/40 bg-card/25 p-4 space-y-3"
      data-testid="meal-memory-section"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-sm tracking-wide">Meal history</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isPremium
              ? "Every meal you've made, rated and noted — across every device."
              : `Meals you've made in the last ${windowDays} days, with your ratings and notes.`}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            isPremium ? "border-primary/40 text-primary" : "border-border/50 text-muted-foreground",
          )}
          data-testid="meal-memory-depth"
        >
          {isPremium ? <Sparkles className="h-3 w-3" aria-hidden /> : <History className="h-3 w-3" aria-hidden />}
          {isPremium ? "Full history" : `Last ${windowDays} days`}
        </span>
      </div>

      {isPremium && <CrewFavorites favorites={data?.favorites ?? []} />}

      {historyQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-6 space-y-2" data-testid="meal-memory-empty">
          <UtensilsCrossed className="h-6 w-6 mx-auto text-muted-foreground/50" aria-hidden />
          <p className="text-sm font-medium text-foreground">
            {lockedCount > 0 ? `Nothing cooked in the last ${windowDays} days.` : "Nothing cooked yet."}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Finish Cook Mode or tap Made This and the meal lands here — rate it in one tap.
          </p>
          <Button asChild size="sm" className="min-h-10 touch-manipulation">
            <Link href="/generator">Find a meal</Link>
          </Button>
        </div>
      ) : (
        <>
          {isPremium && entries.length > 0 && (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pt-1">
              All meals
            </p>
          )}
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
                        {entry.rating ? (
                          <StarRow rating={entry.rating} />
                        ) : (
                          <span className="text-[11px] text-primary">Tap to rate</span>
                        )}
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
                      {(goal || entry.crew_size || entry.cost?.trustworthy) && (
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
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {data?.has_more && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full min-h-10 touch-manipulation"
              disabled={historyQuery.isFetching}
              onClick={() => setLimit((l) => l + PAGE_SIZE)}
              data-testid="meal-memory-show-more"
            >
              {historyQuery.isFetching ? "Loading…" : "Show more"}
            </Button>
          )}
        </>
      )}

      {!isPremium && data && (
        lockedCount > 0 ? (
          <button
            type="button"
            onClick={() => openUpgrade("me_history_locked")}
            className="w-full flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-3 text-left touch-manipulation hover-elevate"
            data-testid="meal-memory-locked-older"
          >
            <Lock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {lockedCount} older meal{lockedCount === 1 ? "" : "s"} saved
              </span>
              <span className="block text-xs text-muted-foreground">
                Kept safe on your account. Firehall Meals Pro shows your full history, long-term ratings and crew
                favorites.
              </span>
            </span>
            <span className="text-xs font-semibold text-primary shrink-0">Unlock</span>
          </button>
        ) : (
          entries.length > 0 && (
            <p className="text-[11px] text-muted-foreground" data-testid="meal-memory-depth-note">
              Free shows your last {windowDays} days. Older meals stay saved —{" "}
              <button
                type="button"
                className="text-primary underline underline-offset-2"
                onClick={() => openUpgrade("me_history_depth_note")}
              >
                Pro shows your full history
              </button>
              .
            </p>
          )
        )
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
                  <CookAgainButton
                    title={detailEntry.title ?? detailEntry.recipe_slug}
                    recipeSlug={detailEntry.recipe_slug}
                    recipePath={detailEntry.recipe_path}
                    source="meal_memory_detail"
                    className="flex-1 min-h-11"
                  />
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
          key={detailEntry.id}
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
