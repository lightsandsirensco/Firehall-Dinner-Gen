import { Flame } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center fade-up" data-testid="empty-state">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping" style={{ animationDuration: "2.5s" }} />
        <Flame className="w-10 h-10 text-primary/60" />
      </div>
      <h2 className="font-heading text-3xl tracking-wide text-foreground mb-2" data-testid="text-empty-title">
        READY TO COOK
      </h2>
      <p className="text-muted-foreground text-sm max-w-sm mb-1" data-testid="text-empty-description">
        Set your crew's filters and hit Generate Meal to get a high-protein, firehall-ready recipe.
      </p>
      <p className="text-muted-foreground/60 text-xs max-w-xs" data-testid="text-empty-hint">
        Meals are built for real crews with real appetites.
      </p>
    </div>
  );
}
