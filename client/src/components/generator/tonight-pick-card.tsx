import { useMemo, useState } from "react";
import { Clock, Shuffle, Users, UtensilsCrossed, Flame, ThumbsDown, X } from "lucide-react";
import type { ClientRecipeResponse } from "@shared/schema";
import {
  NOT_FEELING_IT_LABELS,
  NOT_FEELING_IT_REASONS,
  type NotFeelingItReason,
} from "@shared/tonight-filters";
import { customerProteinLabel } from "@shared/customer-facing";
import { resolveEditorialFallbackHero } from "@shared/meal-hero-fallback";
import { Button } from "@/components/ui/button";
import { MealHeroImage } from "@/components/meal-hero-image";
import { StartCookingButton } from "@/components/cook-mode/start-cooking-button";
import { useMeasurementSystem } from "@/components/measurement-unit-toggle";
import { clientRecipeToCookMode } from "@/lib/cook-mode/adapters";
import { resolveMealPlate } from "@/lib/meal-plate-ui";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { NutritionGoal } from "@shared/nutrition/goal-scoring";

interface TonightPickCardProps {
  recipe: ClientRecipeResponse;
  crewSize: number;
  onPickAgain?: () => void;
  pickAgainDisabled?: boolean;
  nutritionGoal?: NutritionGoal;
  onNotFeelingIt?: (reason: NotFeelingItReason, proteinLabel: string | null) => void;
  /** e.g. "quicker · no beef" — shown under the reasons while session nudges are active. */
  adjustingSummary?: string;
  onResetAdjustments?: () => void;
}

/** Badge when the server didn't send one (older cached responses) — real fields only. */
function fallbackBadge(recipe: ClientRecipeResponse): string | null {
  const traits = [recipe.catalog_badge, ...(recipe.catalog_trait_badges ?? [])];
  if (traits.includes("Hall Classic") || traits.includes("Crew Favorite")) return "Hall Favourite";
  const total = recipe.timing?.total_min ?? 0;
  if (total > 0 && total <= 45) return "Under 45 Min";
  if (recipe.budget_level === "low") return "Budget Pick";
  return null;
}

function formatCookTime(minutes: number): string {
  if (minutes < 90) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h} hrs`;
}

function fallbackWhy(recipe: ClientRecipeResponse): string | null {
  const first = recipe.why_it_fits_tonight?.trim().split(/(?<=[.!?])\s/)[0];
  return first && first.length <= 140 ? first : null;
}

/** Pick Tonight decision header — image, essentials, one reason, Cook This / Pick Again. */
export function TonightPickCard({
  recipe,
  crewSize,
  onPickAgain,
  pickAgainDisabled,
  nutritionGoal,
  onNotFeelingIt,
  adjustingSummary,
  onResetAdjustments,
}: TonightPickCardProps) {
  const [measurementSystem] = useMeasurementSystem();
  const [reasonsOpen, setReasonsOpen] = useState(false);
  const mealPlate = useMemo(() => resolveMealPlate(recipe), [recipe]);
  const title = mealPlate?.display_title || recipe.title;
  const cookModeRecipe = useMemo(
    () => clientRecipeToCookMode(recipe, measurementSystem, crewSize),
    [recipe, measurementSystem, crewSize],
  );

  const heroSrc =
    recipe.hero_image && recipe.hero_image_status === "ready"
      ? recipe.hero_image
      : resolveEditorialFallbackHero(title, {
          mealFormat: recipe.meal_style,
          protein: recipe.chosen_protein,
        }) ?? "";
  const totalMin = recipe.timing?.total_min ?? 0;
  const protein = customerProteinLabel(
    (recipe as { protein_label?: string }).protein_label || recipe.chosen_protein,
  );
  const badge = recipe._tonight_badge || fallbackBadge(recipe);
  const why = recipe._tonight_why || fallbackWhy(recipe);

  const facts = [
    totalMin > 0 && { icon: Clock, value: formatCookTime(totalMin), label: "Total time", testId: "tonight-fact-time" },
    { icon: Users, value: `Serves ${crewSize}`, label: "Crew size", testId: "tonight-fact-crew" },
    protein && { icon: UtensilsCrossed, value: protein, label: "Protein", testId: "tonight-fact-protein" },
  ].filter(Boolean) as Array<{ icon: typeof Clock; value: string; label: string; testId: string }>;

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="tonight-pick-card">
      <div className="relative">
        <MealHeroImage
          src={heroSrc}
          alt={recipe.hero_image_alt || title}
          title={title}
          heldLabel="Tonight's Pick"
          variant="cinematic"
          className="sm:max-h-[max(380px,min(540px,calc(100vh-400px)))]"
          priority
        />
        {badge && (
          <span
            className="absolute left-3 top-3 sm:left-4 sm:top-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground shadow-lg shadow-black/40"
            data-testid="tonight-badge"
          >
            <Flame className="h-3.5 w-3.5" aria-hidden />
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <h2 className={cn(app.titleMeal, "max-w-2xl text-balance")} data-testid="text-recipe-title">
          {title}
        </h2>

        <dl className={cn("grid gap-2", facts.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {facts.map(({ icon: Icon, value, label, testId }) => (
            <div
              key={testId}
              className="rounded-xl border border-border/30 bg-muted/30 px-2.5 py-2.5 sm:px-3"
              data-testid={testId}
            >
              <dt className="sr-only">{label}</dt>
              <dd className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-1.5 text-[13px] sm:text-sm font-semibold text-foreground leading-tight">
                <Icon className="h-4 w-4 shrink-0 text-primary/90" aria-hidden />
                <span className="break-words">{value}</span>
              </dd>
            </div>
          ))}
        </dl>

        {why && (
          <p className="text-sm sm:text-base text-foreground/85 leading-snug text-balance" data-testid="tonight-why">
            <span className="font-semibold text-primary">Why this works tonight: </span>
            {why}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {cookModeRecipe.steps.length > 0 && (
          <div className="flex-1 min-w-0 [&>div]:w-full [&_button]:w-full">
            <StartCookingButton
              recipe={cookModeRecipe}
              recipeSlug={recipe._slug}
              recipeTags={recipe.recipe_tags}
              source="generator_result"
              size="lg"
              className="min-h-12 text-base"
              nutritionGoal={nutritionGoal}
              showQuickLog={false}
              label="Cook This"
            />
          </div>
        )}
        {onPickAgain && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onPickAgain}
            disabled={pickAgainDisabled}
            className={cn(
              "min-h-12 gap-2 touch-manipulation font-heading tracking-wide",
              cookModeRecipe.steps.length > 0 ? "shrink-0 px-4" : "flex-1",
            )}
            data-testid="button-pick-again"
          >
            <Shuffle className="h-4 w-4" aria-hidden />
            Pick Again
          </Button>
        )}
      </div>

      {onNotFeelingIt && (
        <div data-testid="not-feeling-it">
          {reasonsOpen ? (
            <div className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">What's off about this one?</p>
                <button
                  type="button"
                  onClick={() => setReasonsOpen(false)}
                  aria-label="Close"
                  className="-my-2 -mr-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground touch-manipulation"
                  data-testid="button-close-not-feeling-it"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {NOT_FEELING_IT_REASONS.map((reason) => (
                  <Button
                    key={reason}
                    type="button"
                    variant="outline"
                    disabled={pickAgainDisabled || (reason === "protein" && !protein)}
                    onClick={() => {
                      setReasonsOpen(false);
                      onNotFeelingIt(reason, protein);
                    }}
                    className="min-h-11 h-auto whitespace-normal px-2 py-2 text-[13px] leading-tight touch-manipulation"
                    data-testid={`not-feeling-it-${reason}`}
                  >
                    {reason === "protein" && protein ? `No ${protein.toLowerCase()}` : NOT_FEELING_IT_LABELS[reason]}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setReasonsOpen(true)}
              disabled={pickAgainDisabled}
              className="mx-auto flex min-h-10 items-center gap-1.5 px-3 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline touch-manipulation disabled:opacity-50"
              data-testid="button-not-feeling-it"
            >
              <ThumbsDown className="h-4 w-4" aria-hidden />
              Not feeling it?
            </button>
          )}
          {adjustingSummary && (
            <p className="mt-1 text-center text-xs text-muted-foreground" data-testid="not-feeling-it-summary">
              Adjusting picks: {adjustingSummary}
              {onResetAdjustments && (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={onResetAdjustments}
                    className="-my-3 inline-flex min-h-10 items-center px-1.5 underline underline-offset-2 hover:text-foreground touch-manipulation"
                    data-testid="button-reset-not-feeling-it"
                  >
                    Reset
                  </button>
                </>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
