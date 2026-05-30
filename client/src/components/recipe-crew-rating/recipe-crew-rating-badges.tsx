import {
  RECIPE_CREW_RATING_BADGE_EMOJI,
  RECIPE_CREW_RATING_BADGE_LABELS,
  type RecipeCrewRatingBadgeId,
} from "@shared/recipe-crew-ratings/types";
import { cn } from "@/lib/utils";

export function RecipeCrewRatingBadges({
  badges,
  className,
}: {
  badges: RecipeCrewRatingBadgeId[];
  className?: string;
}) {
  if (!badges.length) return null;

  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Recipe badges">
      {badges.map((id) => (
        <li
          key={id}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary"
        >
          <span aria-hidden>{RECIPE_CREW_RATING_BADGE_EMOJI[id]}</span>
          {RECIPE_CREW_RATING_BADGE_LABELS[id]}
        </li>
      ))}
    </ul>
  );
}
