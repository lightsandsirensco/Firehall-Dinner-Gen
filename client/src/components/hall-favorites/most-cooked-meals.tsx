import { Link } from "wouter";
import { ChefHat } from "lucide-react";
import type { MostCookedMeal } from "@shared/hall-favorites/types";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { HALL_FAVORITES } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

interface MostCookedMealsProps {
  meals: MostCookedMeal[];
  className?: string;
}

export function MostCookedMeals({ meals, className }: MostCookedMealsProps) {
  if (meals.length === 0) return null;

  return (
    <section
      className={cn("rounded-xl border border-border/40 bg-card/25 px-4 py-4", className)}
      aria-labelledby="most-cooked-heading"
      data-testid="most-cooked-meals"
    >
      <div className="flex items-center gap-2 mb-3">
        <ChefHat className="w-4 h-4 text-primary shrink-0" aria-hidden />
        <h2 id="most-cooked-heading" className="text-sm font-semibold text-foreground">
          {HALL_FAVORITES.mostCooked}
        </h2>
      </div>
      <ol className="space-y-2">
        {meals.map((meal, index) => {
          const href =
            meal.recipePath ??
            (meal.slug ? approvedCatalogRecipePath(meal.slug) : undefined);
          const label = (
            <>
              <span className="font-medium text-foreground line-clamp-1">{meal.title}</span>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                Cooked {meal.cookCount} time{meal.cookCount === 1 ? "" : "s"}
              </span>
            </>
          );
          return (
            <li key={`${meal.slug ?? meal.title}-${index}`} className="flex gap-3 items-start">
              <span className="text-xs font-mono text-muted-foreground w-5 pt-1 shrink-0">
                {index + 1}
              </span>
              {href ? (
                <Link href={href} className="flex-1 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors">
                  {label}
                </Link>
              ) : (
                <div className="flex-1 px-2 py-1.5">{label}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
