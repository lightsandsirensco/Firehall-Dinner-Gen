import { cn } from "@/lib/utils";
import {
  DIETARY_FILTER_LABELS,
  type DietaryFilterKey,
  type RecipeDietaryProfileSchema,
} from "@shared/dietary/schema";

/** Verified diet badges shown only when classification confidence is High. */
const VERIFIED_ORDER: DietaryFilterKey[] = ["vegan", "vegetarian", "glutenFree", "dairyFree", "nutFree", "peanutFree", "soyFree", "shellfishFree", "fishFree", "eggFree", "porkFree"];

export function DietaryBadges({
  dietary,
  className,
}: {
  dietary?: RecipeDietaryProfileSchema;
  className?: string;
}) {
  if (!dietary) return null;

  const verified = dietary.confidence === "high" ? VERIFIED_ORDER.filter((key) => dietary.flags[key]) : [];
  const adaptable = dietary.adaptable;

  if (verified.length === 0 && adaptable.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)} data-testid="recipe-dietary-badges">
      {verified.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Verified dietary badges">
          {verified.map((key) => (
            <li key={key}>
              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-200">
                {DIETARY_FILTER_LABELS[key]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {adaptable.length > 0 && (
        <ul className="space-y-1" aria-label="Adaptable dietary swaps">
          {adaptable.map((item) => (
            <li key={item.flag} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-200">
                {item.label}
              </span>
              <span className="leading-snug">{item.note}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
