import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

export interface RecipeNutritionPanelProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  className?: string;
  /** When false, show “coming soon” instead of zeros. */
  estimateAvailable?: boolean;
}

function macroValue(v: number | null | undefined): number | null {
  if (v == null || Number.isNaN(v)) return null;
  return v;
}

/** Per-row validity — hide 0/null/undefined macro rows; never show fake zeros. */
export function getDisplayableMacroRows(macros: {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}): Array<{ label: string; value: string; id: string }> {
  const rows: Array<{ label: string; value: string; id: string }> = [];
  const cal = macroValue(macros.calories);
  const protein = macroValue(macros.protein);
  const carbs = macroValue(macros.carbs);
  const fat = macroValue(macros.fat);

  if (cal != null && cal > 0) rows.push({ label: "Calories", value: String(cal), id: "calories" });
  if (protein != null && protein > 0) rows.push({ label: "Protein", value: `${protein}g`, id: "protein" });
  if (carbs != null && carbs > 0) rows.push({ label: "Carbs", value: `${carbs}g`, id: "carbs" });
  if (fat != null && fat > 0) rows.push({ label: "Fat", value: `${fat}g`, id: "fat" });

  return rows;
}

export function hasDisplayableNutrition(macros: {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  estimateAvailable?: boolean;
}): boolean {
  if (macros.estimateAvailable === false) return false;
  return getDisplayableMacroRows(macros).length > 0;
}

/** Per-serving macros — recipe detail pages only (not Explore/cards). */
export function RecipeNutritionPanel({
  calories,
  protein,
  carbs,
  fat,
  className,
  estimateAvailable = true,
}: RecipeNutritionPanelProps) {
  const rows = getDisplayableMacroRows({ calories, protein, carbs, fat });
  const showEstimate = estimateAvailable !== false && rows.length > 0;

  if (!showEstimate) {
    return (
      <section
        className={cn(app.panel, "p-4 sm:p-5 print:border print:bg-white", className)}
        aria-labelledby="recipe-nutrition-heading"
        data-testid="recipe-nutrition-unavailable"
      >
        <h2 id="recipe-nutrition-heading" className={app.sectionLabel}>
          Nutrition
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">Nutrition estimate coming soon.</p>
      </section>
    );
  }

  return (
    <section
      className={cn(app.panel, "p-4 sm:p-5 print:border print:bg-white", className)}
      aria-labelledby="recipe-nutrition-heading"
      data-testid="recipe-nutrition-panel"
    >
      <h2 id="recipe-nutrition-heading" className={app.sectionLabel}>
        Nutrition
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">Estimated per serving</p>
      <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {rows.map((row) => (
          <div key={row.id}>
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function buildNutritionPrintHtml(macros: RecipeNutritionPanelProps): string {
  if (macros.estimateAvailable === false || !hasDisplayableNutrition(macros)) return "";
  const rows = getDisplayableMacroRows(macros);
  if (rows.length === 0) return "";
  const lines = rows.map((r) => `${r.label}: ${r.value}`).join("<br/>\n    ");
  return `<section style="margin:20px 0;padding:12px 0;border-top:1px solid #ddd;border-bottom:1px solid #ddd">
  <h2 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Nutrition</h2>
  <p style="font-size:12px;color:#666;margin:0 0 8px">Estimated per serving</p>
  <p style="font-size:14px;line-height:1.8;margin:0">
    ${lines}
  </p>
</section>`;
}
