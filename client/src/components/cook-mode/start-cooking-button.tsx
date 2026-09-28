import { useEffect, useRef, useState } from "react";
import { ChefHat, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CookMode } from "@/components/cook-mode/cook-mode";
import { COOK_MODE } from "@/lib/brand-copy";
import type { CookModeRecipe } from "@/lib/cook-mode/types";
import { recordMealCooked } from "@/lib/hall-history-store";
import { useFeature } from "@/lib/billing/hooks";
import { postMealCooked } from "@/lib/meal-history-api";
import { trackMealCooked, trackMealLogged } from "@/lib/analytics";
import { MealFeedbackSheet } from "@/components/meal-history/meal-feedback-sheet";
import { cn } from "@/lib/utils";
import type { RecipeTags } from "@shared/schema";
import type { MealCostSnapshot } from "@shared/meal-history/types";

interface StartCookingButtonProps {
  recipe: CookModeRecipe | null;
  recipeSlug?: string;
  recipePath?: string;
  /** Real RecipeTags already shown on this recipe — snapshotted into meal history for Goals + Progress. Never fabricated if absent. */
  recipeTags?: RecipeTags;
  source?: string;
  className?: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  /** Open cook mode on mount (e.g. ?cook=1 deep link from Tonight) */
  autoOpen?: boolean;
  /** Real context this surface actually has on screen — never fabricated when absent. */
  mealOccasion?: string;
  nutritionGoal?: string;
  hallId?: string;
  /** Already-computed cost estimate for this recipe/crew size, if this surface has one. */
  costSnapshot?: MealCostSnapshot;
  /** Renders a fast, no-Cook-Mode "Made This" quick-log button alongside Start Cooking. */
  showQuickLog?: boolean;
}

export function StartCookingButton({
  recipe,
  recipeSlug,
  recipePath,
  recipeTags,
  source = "cook_mode",
  className,
  variant = "default",
  size = "default",
  autoOpen = false,
  mealOccasion,
  nutritionGoal,
  hallId,
  costSnapshot,
  showQuickLog = true,
}: StartCookingButtonProps) {
  const [open, setOpen] = useState(false);
  const hasMealMemory = useFeature("meal_memory");
  // Firehall Meals Pro V1 Feature 3 — one server write per Cook Mode
  // completion, even if "Finish" is double-clicked. Reset whenever Cook
  // Mode reopens so a genuine later re-cook still records a new event.
  const submittedRef = useRef(false);
  const quickLogSubmittedRef = useRef(false);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackEntryId, setFeedbackEntryId] = useState<number | null>(null);
  const [quickLogging, setQuickLogging] = useState(false);

  useEffect(() => {
    if (autoOpen && recipe && recipe.steps.length > 0) {
      setOpen(true);
    }
  }, [autoOpen, recipe]);

  useEffect(() => {
    if (open) submittedRef.current = false;
  }, [open]);

  if (!recipe || recipe.steps.length === 0) return null;

  // Firehall Meals Pro — write the canonical event to durable, cross-device
  // account history (Generator personalization + Meal History + Crew
  // Feedback). Best-effort: a network failure here must never block/undo
  // the Free local record or interrupt whichever flow called it. On
  // success, opens the fast post-meal feedback sheet.
  const logDurableMeal = async () => {
    if (!hasMealMemory || !recipeSlug) return;
    try {
      const result = await postMealCooked(recipeSlug, {
        is_high_protein: recipeTags?.high_protein,
        is_high_fiber: recipeTags?.high_fiber,
        meal_occasion: mealOccasion,
        crew_size: recipe.crewSize,
        nutrition_goal: nutritionGoal,
        hall_id: hallId,
        cost: costSnapshot,
      });
      trackMealLogged({
        recipe_slug: recipeSlug,
        meal_occasion: mealOccasion,
        crew_size: recipe.crewSize,
        nutrition_goal: nutritionGoal,
        source,
      });
      setFeedbackEntryId(result.entry.id);
      setFeedbackOpen(true);
    } catch {
      /* durable sync is best-effort — local history already recorded */
    }
  };

  const handleComplete = () => {
    // Existing Free/local behavior — always preserved unchanged, for every
    // user regardless of Pro entitlement (this is the one real "Mark as
    // Cooked" action; we reuse it rather than adding a second button).
    recordMealCooked({
      title: recipe.title,
      recipeSlug,
      recipePath,
      crewSize: recipe.crewSize,
      source,
    });
    trackMealCooked({ recipe_slug: recipeSlug, recipe_title: recipe.title, source, crew_size: recipe.crewSize });

    if (!submittedRef.current) {
      submittedRef.current = true;
      void logDurableMeal();
    }
  };

  const handleQuickLog = async () => {
    if (quickLogging || quickLogSubmittedRef.current) return;
    quickLogSubmittedRef.current = true;
    setQuickLogging(true);
    // Same Free local record Cook Mode completion writes — a firefighter who
    // already knows the recipe shouldn't have to step through Cook Mode just
    // to log that they made it.
    recordMealCooked({
      title: recipe.title,
      recipeSlug,
      recipePath,
      crewSize: recipe.crewSize,
      source: "made_this",
    });
    trackMealCooked({
      recipe_slug: recipeSlug,
      recipe_title: recipe.title,
      source: "made_this",
      crew_size: recipe.crewSize,
    });
    await logDurableMeal();
    setQuickLogging(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn("min-h-11 gap-2 touch-manipulation font-heading tracking-wide", className)}
          onClick={() => setOpen(true)}
          data-testid="button-start-cooking"
        >
          <ChefHat className="w-4 h-4 shrink-0" />
          {COOK_MODE.startCooking}
        </Button>
        {showQuickLog && hasMealMemory && recipeSlug ? (
          <Button
            type="button"
            variant="outline"
            size={size}
            className="min-h-11 gap-2 touch-manipulation"
            onClick={() => void handleQuickLog()}
            disabled={quickLogging}
            data-testid="button-made-this"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Made This
          </Button>
        ) : null}
      </div>
      <CookMode open={open} onOpenChange={setOpen} recipe={recipe} onComplete={handleComplete} />
      <MealFeedbackSheet
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        entryId={feedbackEntryId}
        recipeTitle={recipe.title}
        recipeSlug={recipeSlug}
        mealOccasion={mealOccasion}
      />
    </>
  );
}
