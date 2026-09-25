import { useEffect, useRef, useState } from "react";
import { ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CookMode } from "@/components/cook-mode/cook-mode";
import { COOK_MODE } from "@/lib/brand-copy";
import type { CookModeRecipe } from "@/lib/cook-mode/types";
import { recordMealCooked } from "@/lib/hall-history-store";
import { useFeature } from "@/lib/billing/hooks";
import { postMealCooked } from "@/lib/meal-history-api";
import { cn } from "@/lib/utils";

interface StartCookingButtonProps {
  recipe: CookModeRecipe | null;
  recipeSlug?: string;
  recipePath?: string;
  source?: string;
  className?: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  /** Open cook mode on mount (e.g. ?cook=1 deep link from Tonight) */
  autoOpen?: boolean;
}

export function StartCookingButton({
  recipe,
  recipeSlug,
  recipePath,
  source = "cook_mode",
  className,
  variant = "default",
  size = "default",
  autoOpen = false,
}: StartCookingButtonProps) {
  const [open, setOpen] = useState(false);
  const hasMealMemory = useFeature("meal_memory");
  // Firehall Meals Pro V1 Feature 3 — one server write per Cook Mode
  // completion, even if "Finish" is double-clicked. Reset whenever Cook
  // Mode reopens so a genuine later re-cook still records a new event.
  const submittedRef = useRef(false);

  useEffect(() => {
    if (autoOpen && recipe && recipe.steps.length > 0) {
      setOpen(true);
    }
  }, [autoOpen, recipe]);

  useEffect(() => {
    if (open) submittedRef.current = false;
  }, [open]);

  if (!recipe || recipe.steps.length === 0) return null;

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

    // Firehall Meals Pro — additionally write the canonical event to
    // durable, cross-device account history for Generator personalization.
    // Best-effort: a network failure here must never block/undo the Free
    // local record above or interrupt the Cook Mode completion flow.
    if (hasMealMemory && recipeSlug && !submittedRef.current) {
      submittedRef.current = true;
      void postMealCooked(recipeSlug).catch(() => {
        /* durable sync is best-effort — local history above already recorded */
      });
    }
  };

  return (
    <>
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
      <CookMode
        open={open}
        onOpenChange={setOpen}
        recipe={recipe}
        onComplete={handleComplete}
      />
    </>
  );
}
