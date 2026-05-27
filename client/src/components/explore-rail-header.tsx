import { cn } from "@/lib/utils";
import type { ExploreRailPresentation } from "@/lib/explore-recommendation-ux";
import type { ExploreSectionTheme } from "@shared/explore-editorial";

const THEME_STYLES: Record<
  ExploreSectionTheme,
  { accent: string; glow: string }
> = {
  ember: {
    accent: "from-primary via-orange-500 to-amber-600",
    glow: "shadow-[0_0_40px_-8px_rgba(234,88,12,0.35)]",
  },
  smoke: {
    accent: "from-zinc-400 via-zinc-600 to-zinc-800",
    glow: "shadow-[0_0_32px_-10px_rgba(120,120,120,0.25)]",
  },
  gold: {
    accent: "from-amber-400 via-amber-500 to-yellow-700",
    glow: "shadow-[0_0_36px_-8px_rgba(245,158,11,0.3)]",
  },
  steel: {
    accent: "from-slate-300 via-slate-500 to-slate-700",
    glow: "",
  },
  copper: {
    accent: "from-orange-600 via-amber-700 to-amber-900",
    glow: "",
  },
  ocean: {
    accent: "from-cyan-400 via-teal-500 to-blue-800",
    glow: "shadow-[0_0_36px_-10px_rgba(34,211,238,0.2)]",
  },
};

export interface ExploreRailHeaderProps {
  presentation: ExploreRailPresentation;
  theme?: ExploreSectionTheme;
  className?: string;
}

export function ExploreRailHeader({ presentation, theme = "ember", className }: ExploreRailHeaderProps) {
  const themeStyle = THEME_STYLES[theme] ?? THEME_STYLES.ember;

  return (
    <div
      className={cn(
        "mb-4 sm:mb-5 px-0.5",
        presentation.isHeroRail && "mb-5 sm:mb-6",
        className,
      )}
      data-testid="explore-rail-header"
    >
      <div className="flex items-start gap-3">
        <span
          className="text-2xl sm:text-3xl leading-none mt-0.5 select-none"
          aria-hidden
        >
          {presentation.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/90 line-clamp-1">
              {presentation.hook}
            </p>
            {presentation.editorialBadge && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 rounded-full">
                {presentation.editorialBadge}
              </span>
            )}
          </div>
          <div
            className={cn(
              "h-1 rounded-full bg-gradient-to-r mb-2.5 max-w-[12rem]",
              themeStyle.accent,
              presentation.isHeroRail && "h-1.5 max-w-[5rem]",
            )}
            aria-hidden
          />
          <h2
            className={cn(
              "font-heading tracking-wide text-foreground",
              presentation.isHeroRail ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
            )}
          >
            {presentation.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-lg leading-relaxed">
            {presentation.subtitle}
          </p>
          {presentation.chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {presentation.chips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex text-[10px] font-medium text-muted-foreground bg-muted/50 border border-border/40 px-2.5 py-1 rounded-full"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
