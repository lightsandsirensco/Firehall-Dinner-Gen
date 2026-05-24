import type { ExploreRecipeCard } from "@/lib/explore-recipe";
import { computeCardPresentation } from "@/lib/explore-recipe";
import { ExploreGridCard, ExploreGridCardSkeleton } from "@/components/explore-grid-card";

export interface ExploreRecipeCardViewProps {
  recipe: ExploreRecipeCard;
  displayServings?: number;
  tags?: string[];
  isFirehallFallback?: boolean;
  isCurated?: boolean;
  onClick: () => void;
}

/** Netflix-style thumbnail card — appetite-first overlay layout */
export function ExploreRecipeCard({
  recipe,
  displayServings,
  isFirehallFallback,
  isCurated,
  onClick,
}: ExploreRecipeCardViewProps) {
  const presentation = computeCardPresentation(recipe, {
    crewSize: displayServings,
    isCurated,
  });

  return (
    <ExploreGridCard
      recipe={recipe}
      crewSize={displayServings}
      presentation={presentation}
      isCurated={isCurated}
      isFirehallFallback={isFirehallFallback}
      onClick={onClick}
    />
  );
}

export function ExploreRecipeCardSkeleton() {
  return <ExploreGridCardSkeleton />;
}
