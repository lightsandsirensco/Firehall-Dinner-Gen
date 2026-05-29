import { cn } from "@/lib/utils";
import {
  deriveMealTrustBadges,
  type MealTrustBadge,
  type MealTrustInput,
} from "@shared/meal-trust/badges";

const TONE_CLASS: Record<MealTrustBadge["tone"], string> = {
  red: "bg-primary/12 text-primary border-primary/25",
  amber: "bg-amber-500/10 text-amber-200 border-amber-500/25",
  emerald: "bg-emerald-500/10 text-emerald-200 border-emerald-500/30",
  zinc: "bg-muted/60 text-muted-foreground border-border/40",
};

type MealTrustBadgesProps = {
  input: MealTrustInput;
  max?: number;
  size?: "sm" | "md";
  className?: string;
};

export function MealTrustBadges({
  input,
  max = 3,
  size = "sm",
  className,
}: MealTrustBadgesProps) {
  const badges = deriveMealTrustBadges(input, max);
  if (!badges.length) return null;

  return (
    <ul
      className={cn("flex flex-wrap gap-1.5", className)}
      aria-label="Hall meal badges"
    >
      {badges.map((b) => (
        <li key={b.id}>
          <span
            className={cn(
              "inline-flex items-center rounded-full border font-medium uppercase tracking-wide",
              TONE_CLASS[b.tone],
              size === "sm" ? "text-[9px] px-2 py-0.5" : "text-[10px] px-2.5 py-1",
            )}
          >
            {size === "sm" ? b.shortLabel : b.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
