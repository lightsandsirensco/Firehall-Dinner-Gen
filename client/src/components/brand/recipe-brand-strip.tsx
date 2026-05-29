import { LIGHTS_COPY } from "@/lib/lights-and-sirens";
import { LightsAndSirensLink } from "./lights-and-sirens-link";
import { cn } from "@/lib/utils";

type RecipeBrandStripProps = {
  className?: string;
  line?: string;
};

export function RecipeBrandStrip({ className, line = LIGHTS_COPY.recipeStrip }: RecipeBrandStripProps) {
  const [before, after] = line.split("Lights & Sirens Co.");

  return (
    <div
      className={cn(
        "rounded-xl border border-border/25 bg-card/20 px-4 py-3 sm:px-5 sm:py-3.5",
        "text-sm text-muted-foreground leading-relaxed",
        className,
      )}
      data-testid="recipe-brand-strip"
    >
      {before}
      <LightsAndSirensLink variant="inline">Lights & Sirens Co.</LightsAndSirensLink>
      {after ?? ""}
    </div>
  );
}
