import { Flame } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Flame className="w-10 h-10 text-primary/60" />
      </div>
      <h2 className="font-heading text-3xl tracking-wide text-foreground mb-2" data-testid="text-empty-title">
        READY TO COOK
      </h2>
      <p className="text-muted-foreground text-sm max-w-sm">
        Set your crew's filters and hit Generate Meal to get a high-protein, firehall-ready recipe.
      </p>
    </div>
  );
}
