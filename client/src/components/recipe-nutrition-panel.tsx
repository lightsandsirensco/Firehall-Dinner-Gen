import { cn } from "@/lib/utils";

export interface RecipeNutritionPanelProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  className?: string;
}

/** Per-serving macros — recipe detail pages only (not Explore/cards). */
export function RecipeNutritionPanel({
  calories,
  protein,
  carbs,
  fat,
  className,
}: RecipeNutritionPanelProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/20 bg-card/20 p-4 sm:p-5 print:border print:bg-white",
        className,
      )}
      aria-labelledby="recipe-nutrition-heading"
      data-testid="recipe-nutrition-panel"
    >
      <h2
        id="recipe-nutrition-heading"
        className="font-heading text-sm uppercase tracking-widest text-muted-foreground"
      >
        Nutrition (Per Serving)
      </h2>
      <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Calories</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-foreground">{calories}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Protein</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-foreground">{protein}g</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Carbs</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-foreground">{carbs}g</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Fat</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-foreground">{fat}g</dd>
        </div>
      </dl>
    </section>
  );
}

export function buildNutritionPrintHtml(macros: RecipeNutritionPanelProps): string {
  return `<section style="margin:20px 0;padding:12px 0;border-top:1px solid #ddd;border-bottom:1px solid #ddd">
  <h2 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Nutrition (Per Serving)</h2>
  <p style="font-size:14px;line-height:1.8;margin:0">
    Calories: ${macros.calories}<br/>
    Protein: ${macros.protein}g<br/>
    Carbs: ${macros.carbs}g<br/>
    Fat: ${macros.fat}g
  </p>
</section>`;
}
