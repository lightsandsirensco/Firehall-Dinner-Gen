import { useHallHistory } from "@/hooks/use-hall-history";
import { LastCookedBadge } from "@/components/hall-history/last-cooked-badge";
import { RepeatWarning } from "@/components/hall-history/repeat-warning";
import { CookAgainButton } from "@/components/hall-history/cook-again-button";
import { cn } from "@/lib/utils";

interface HallRecipeHistoryPanelProps {
  recipeSlug?: string;
  title: string;
  recipePath?: string;
  className?: string;
  source?: string;
}

export function HallRecipeHistoryPanel({
  recipeSlug,
  title,
  recipePath,
  className,
  source = "recipe_page",
}: HallRecipeHistoryPanelProps) {
  const { lastCookedForSlug, shouldAvoidRepeat } = useHallHistory();
  const entry = recipeSlug ? lastCookedForSlug(recipeSlug) : undefined;
  const repeat = shouldAvoidRepeat(recipeSlug);

  if (!entry && !repeat.avoid) return null;

  return (
    <div className={cn("space-y-3", className)} data-testid="hall-recipe-history-panel">
      <LastCookedBadge entry={entry} />
      <RepeatWarning entry={repeat.entry} avoid={repeat.avoid} />
      {entry ? (
        <CookAgainButton
          title={title}
          recipeSlug={recipeSlug}
          recipePath={recipePath}
          source={source}
          size="sm"
        />
      ) : null}
    </div>
  );
}
