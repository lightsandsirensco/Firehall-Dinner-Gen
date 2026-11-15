import { RECIPE_STRIP_LINE } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

type RecipeBrandStripProps = {
  className?: string;
  line?: string;
};

export function RecipeBrandStrip({ className, line = RECIPE_STRIP_LINE }: RecipeBrandStripProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/25 bg-card/20 px-4 py-3 sm:px-5 sm:py-3.5",
        "text-sm text-muted-foreground leading-relaxed",
        className,
      )}
      data-testid="recipe-brand-strip"
    >
      {line}
    </div>
  );
}
