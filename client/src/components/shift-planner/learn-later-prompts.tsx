import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { useFeature } from "@/lib/billing/hooks";
import { useProPaywall } from "@/components/billing/pro-paywall";
import { getPantryProfile } from "@/lib/shopping/shopping-store";
import {
  dismissPrompts,
  progressivePromptsFor,
  readDismissedPrompts,
  type ProgressivePrompt,
} from "@/lib/onboarding/progressive-prompts";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { createPantryProfile, listPantryEntries } from "@shared/shopping";

function pantryConfigured(): boolean {
  const current = JSON.stringify(listPantryEntries(getPantryProfile()));
  return current !== JSON.stringify(listPantryEntries(createPantryProfile()));
}

/** Optional follow-ups once the shift has a planned meal — never part of schedule setup. */
export function LearnLaterPrompts({ hasValue }: { hasValue: boolean }) {
  const { user, preferences } = useAuth();
  const hasNutritionGoals = useFeature("nutrition_goals");
  const { openProPaywall } = useProPaywall();
  const userId = user?.user_id ?? null;
  const [dismissed, setDismissed] = useState(() => (userId ? readDismissedPrompts(userId) : new Set<never>()));

  const prompts = useMemo(
    () =>
      userId
        ? progressivePromptsFor({
            hasValue,
            nutritionGoals: preferences?.nutrition_goals ?? [],
            dietaryRestrictions: preferences?.dietary_restrictions ?? [],
            allergies: preferences?.allergies ?? [],
            excludedIngredients: preferences?.excluded_ingredients ?? [],
            pantryConfigured: pantryConfigured(),
            hasNutritionGoalsFeature: hasNutritionGoals,
            dismissed,
          })
        : [],
    [userId, hasValue, preferences, hasNutritionGoals, dismissed],
  );

  if (!userId || prompts.length === 0) return null;

  const dismiss = (ids: ProgressivePrompt["id"][]) => setDismissed(dismissPrompts(userId, ids));

  return (
    <section className={cn(app.cardSurface, "space-y-3 p-4")} data-testid="learn-later-prompts">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base tracking-tight">Make the next plan even better</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Optional — add these whenever you like.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 -mr-2 -mt-2 shrink-0"
          onClick={() => dismiss(prompts.map((p) => p.id))}
          data-testid="learn-later-hide"
        >
          Not now
        </Button>
      </div>
      <ul className="space-y-1.5">
        {prompts.map((p) => {
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {p.title}
                  {p.locked ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      <Lock className="h-2.5 w-2.5" aria-hidden /> Pro
                    </span>
                  ) : null}
                  {p.href == null ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Coming soon
                    </span>
                  ) : null}
                </span>
                <span className="block text-xs text-muted-foreground">{p.body}</span>
              </span>
              {p.href != null ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden /> : null}
            </>
          );
          const rowClass = cn(
            "flex min-h-11 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left touch-manipulation",
            p.href != null && "hover-elevate active-elevate-2",
          );
          return (
            <li key={p.id} className="flex items-center gap-1 rounded-xl border border-border/40 bg-card/30">
              {p.locked ? (
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => openProPaywall("nutrition_goals", "shift_learn_later")}
                  data-testid={`learn-later-${p.id}`}
                >
                  {body}
                </button>
              ) : p.href != null ? (
                <Link href={p.href} className={rowClass} onClick={() => dismiss([p.id])} data-testid={`learn-later-${p.id}`}>
                  {body}
                </Link>
              ) : (
                <div className={rowClass} data-testid={`learn-later-${p.id}`}>
                  {body}
                </div>
              )}
              <button
                type="button"
                onClick={() => dismiss([p.id])}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                aria-label={`Dismiss ${p.title}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
