import { cn } from "@/lib/utils";

export interface ExploreCategoryNavProps {
  items: { id: string; label: string; emoji?: string }[];
  activeId?: string;
  onSelect: (sectionId: string) => void;
  className?: string;
}

export function ExploreCategoryNav({
  items,
  activeId,
  onSelect,
  className,
}: ExploreCategoryNavProps) {
  return (
    <nav
      className={cn(
        "sticky z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 py-2.5",
        "bg-background/90 backdrop-blur-md border-b border-border/40",
        className,
      )}
      aria-label="Browse meal categories"
      data-testid="explore-category-nav"
    >
      <div
        className={cn(
          "flex gap-2 overflow-x-auto pb-0.5",
          "scrollbar-none scroll-smooth snap-x snap-mandatory",
        )}
      >
        {items.map((item) => {
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "snap-start shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-wider min-h-11",
                "transition-colors duration-200 border touch-manipulation active:scale-[0.97]",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground",
              )}
              data-testid={`nav-category-${item.id}`}
            >
              {item.emoji && (
                <span className="mr-1.5 text-sm leading-none" aria-hidden>
                  {item.emoji}
                </span>
              )}
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
