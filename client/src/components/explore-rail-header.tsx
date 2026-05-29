import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import type { ExploreRailPresentation } from "@/lib/explore-recommendation-ux";
import type { ExploreSectionTheme } from "@shared/explore-editorial";

export interface ExploreRailHeaderProps {
  presentation: ExploreRailPresentation;
  theme?: ExploreSectionTheme;
  className?: string;
}

export function ExploreRailHeader({ presentation, className }: ExploreRailHeaderProps) {
  return (
    <div
      className={cn(
        "mb-5 sm:mb-7",
        presentation.isHeroRail && "mb-6 sm:mb-8",
        className,
      )}
      data-testid="explore-rail-header"
    >
      {presentation.hook && !presentation.isHeroRail && (
        <p className={cn(app.eyebrowMuted, "mb-2")}>{presentation.hook}</p>
      )}
      <h2
        className={cn(
          presentation.isHeroRail ? app.titleSection : app.titleMeal,
        )}
      >
        {presentation.title}
      </h2>
      {presentation.subtitle && (
        <p className={cn(app.subtitle, "mt-2 max-w-xl")}>{presentation.subtitle}</p>
      )}
    </div>
  );
}
