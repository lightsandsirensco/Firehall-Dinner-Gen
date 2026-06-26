import { useEffect, useState } from "react";
import { ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CookMode } from "@/components/cook-mode/cook-mode";
import { COOK_MODE } from "@/lib/brand-copy";
import type { CookModeRecipe } from "@/lib/cook-mode/types";
import { recordMealCooked } from "@/lib/hall-history-store";
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

  useEffect(() => {
    if (autoOpen && recipe && recipe.steps.length > 0) {
      setOpen(true);
    }
  }, [autoOpen, recipe]);

  if (!recipe || recipe.steps.length === 0) return null;

  const handleComplete = () => {
    recordMealCooked({
      title: recipe.title,
      recipeSlug,
      recipePath,
      crewSize: recipe.crewSize,
      source,
    });
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
