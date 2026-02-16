import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { GenerateResponse } from "@shared/schema";
import { Flame, Droplets, Wheat, Beef, Sparkles, Trash2, Clock, Timer, ShieldCheck, Thermometer, Printer } from "lucide-react";

interface RecipeCardProps {
  recipe: GenerateResponse;
  crewSize: number;
}

function MacroBar({ label, value, unit, icon, color }: { label: string; value: number; unit: string; icon: any; color: string }) {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="font-heading text-xl leading-none">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{unit}</span>
    </div>
  );
}

function buildPrintHtml(recipe: GenerateResponse, crewSize: number): string {
  const safetyRows = recipe.protein_safety?.length
    ? recipe.protein_safety
        .map(
          (ps) =>
            `<tr>
              <td style="font-weight:700;padding:6px 12px 6px 0">${ps.protein}</td>
              <td style="padding:6px 12px">${ps.target_temp_f}&deg;F / ${ps.target_temp_c}&deg;C</td>
              <td style="padding:6px 12px">${ps.rest_minutes > 0 ? ps.rest_minutes + " min" : "—"}</td>
              <td style="padding:6px 12px;font-size:13px">${ps.probe_where}${ps.notes ? ". " + ps.notes : ""}</td>
            </tr>`
        )
        .join("")
    : "";

  const ingredientRows = recipe.ingredients
    .map(
      (ing) =>
        `<tr>
          <td style="padding:4px 16px 4px 0;font-weight:600">${ing.item}</td>
          <td style="padding:4px 0">${ing.amount || ""}</td>
          ${ing.notes ? `<td style="padding:4px 0 4px 16px;color:#555;font-size:13px">${ing.notes}</td>` : "<td></td>"}
        </tr>`
    )
    .join("");

  const stepItems = recipe.steps
    .map((step, i) => {
      const heading = typeof step === "string" ? null : step.heading;
      const body = typeof step === "string" ? step : step.body;
      return `<li style="margin-bottom:12px;page-break-inside:avoid">
        ${heading ? `<strong>${heading}</strong><br/>` : ""}
        ${body}
      </li>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${recipe.title} — Print</title>
<style>
  @page { margin: 0.75in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; background: #fff; line-height: 1.5; font-size: 15px; padding: 0; }
  h1 { font-size: 32px; font-weight: 800; margin-bottom: 4px; letter-spacing: 0.5px; }
  h2 { font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 8px; border-bottom: 2px solid #222; padding-bottom: 4px; }
  .subtitle { color: #444; font-style: italic; font-size: 14px; margin-bottom: 16px; }
  .timing-bar { display: flex; gap: 24px; background: #f5f5f5; padding: 10px 16px; border-radius: 4px; margin-bottom: 8px; }
  .timing-item { text-align: center; }
  .timing-item strong { display: block; font-size: 22px; line-height: 1.2; }
  .timing-item span { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
  table { width: 100%; border-collapse: collapse; }
  table.safety td { border-bottom: 1px solid #ddd; vertical-align: top; }
  table.ingredients td { border-bottom: 1px solid #eee; vertical-align: top; }
  ol { padding-left: 24px; }
  ol li { font-size: 15px; }
  .cleanup { background: #f5f5f5; padding: 12px 16px; border-radius: 4px; margin-top: 16px; page-break-inside: avoid; }
  .cleanup strong { display: block; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; color: #666; margin-bottom: 4px; }
  .servings { font-size: 13px; color: #666; margin-bottom: 16px; }
  .macros { font-size: 14px; color: #222; margin-bottom: 8px; padding: 8px 0; }
  .macros strong { font-weight: 600; }
  .footer { text-align: center; color: #444; font-size: 12px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <h1>${recipe.title}</h1>
  <p class="subtitle">${recipe.why_it_fits_tonight}</p>
  <p class="servings">Serves ${crewSize}</p>

  ${recipe.timing ? `
  <h2>Timing</h2>
  <div class="timing-bar">
    <div class="timing-item"><strong>${recipe.timing.prep_minutes}</strong><span>min prep</span></div>
    <div class="timing-item"><strong>${recipe.timing.cook_minutes}</strong><span>min cook</span></div>
    <div class="timing-item"><strong>${recipe.timing.total_minutes}</strong><span>min total</span></div>
  </div>` : ""}

  <div class="macros">
    <strong>Macros per serving:</strong>
    Calories: ${recipe.macros_per_serving.calories} | Protein: ${recipe.macros_per_serving.protein_g}g | Carbs: ${recipe.macros_per_serving.carbs_g}g | Fat: ${recipe.macros_per_serving.fat_g}g
  </div>

  ${safetyRows ? `
  <h2>Protein Safety</h2>
  <table class="safety">
    <thead><tr>
      <th style="text-align:left;padding:6px 12px 6px 0;font-size:12px;text-transform:uppercase;color:#666">Protein</th>
      <th style="text-align:left;padding:6px 12px;font-size:12px;text-transform:uppercase;color:#666">Internal Temp</th>
      <th style="text-align:left;padding:6px 12px;font-size:12px;text-transform:uppercase;color:#666">Rest</th>
      <th style="text-align:left;padding:6px 12px;font-size:12px;text-transform:uppercase;color:#666">Details</th>
    </tr></thead>
    <tbody>${safetyRows}</tbody>
  </table>` : ""}

  <h2>Ingredients</h2>
  <table class="ingredients">
    <tbody>${ingredientRows}</tbody>
  </table>

  <h2>Steps</h2>
  <ol>${stepItems}</ol>

  ${recipe.cleanup_tip ? `
  <div class="cleanup">
    <strong>Cleanup Tip</strong>
    ${recipe.cleanup_tip}
  </div>` : ""}

  <div class="footer">www.lightsandsirensco.com</div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}

export function RecipeCard({ recipe, crewSize }: RecipeCardProps) {
  const hasTiming = recipe.timing && (recipe.timing.prep_minutes || recipe.timing.cook_minutes || recipe.timing.total_minutes);
  const hasSafety = recipe.protein_safety && recipe.protein_safety.length > 0;

  const handlePrint = () => {
    const html = buildPrintHtml(recipe, crewSize);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h2 className="font-heading text-4xl md:text-5xl tracking-wide text-foreground leading-none" data-testid="text-recipe-title">
            {recipe.title}
          </h2>
          <Button variant="outline" onClick={handlePrint} className="flex-shrink-0" data-testid="button-print">
            <Printer className="w-4 h-4 mr-2" />
            Print for the Hall
          </Button>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="text-recipe-why">
          {recipe.why_it_fits_tonight}
        </p>
      </div>

      <div className="flex flex-wrap gap-3" data-testid="section-timing-macros">
        {hasTiming && (
          <Card className="flex-1 min-w-[200px]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Timing</h3>
              </div>
              <div className="flex gap-2" data-testid="section-timing">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <Timer className="w-4 h-4 text-blue-400" />
                  <span className="font-heading text-xl leading-none">{recipe.timing.prep_minutes}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">prep</span>
                </div>
                <Separator orientation="vertical" className="h-14 self-center" />
                <div className="flex flex-col items-center gap-1 flex-1">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="font-heading text-xl leading-none">{recipe.timing.cook_minutes}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">cook</span>
                </div>
                <Separator orientation="vertical" className="h-14 self-center" />
                <div className="flex flex-col items-center gap-1 flex-1">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span className="font-heading text-xl leading-none">{recipe.timing.total_minutes}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">total</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="flex-1 min-w-[200px]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Macros Per Serving</h3>
              <Badge variant="outline" className="ml-auto text-xs">
                {crewSize} servings
              </Badge>
            </div>
            <div className="flex gap-2" data-testid="section-macros">
              <MacroBar label="Calories" value={recipe.macros_per_serving.calories} unit="cal" icon={Flame} color="text-orange-400" />
              <Separator orientation="vertical" className="h-14 self-center" />
              <MacroBar label="Protein" value={recipe.macros_per_serving.protein_g} unit="protein" icon={Beef} color="text-red-400" />
              <Separator orientation="vertical" className="h-14 self-center" />
              <MacroBar label="Carbs" value={recipe.macros_per_serving.carbs_g} unit="carbs" icon={Wheat} color="text-amber-400" />
              <Separator orientation="vertical" className="h-14 self-center" />
              <MacroBar label="Fat" value={recipe.macros_per_serving.fat_g} unit="fat" icon={Droplets} color="text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {hasSafety && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Protein Safety</h3>
            </div>
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              data-testid="section-protein-safety"
            >
              {recipe.protein_safety.map((ps, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border/40 p-3 space-y-2"
                  data-testid={`protein-safety-${i}`}
                >
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-bold text-sm text-foreground">{ps.protein}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-muted-foreground">Target:</span>
                      <span className="text-sm font-heading text-primary">{ps.target_temp_f}°F</span>
                      <span className="text-xs text-muted-foreground">/ {ps.target_temp_c}°C</span>
                    </div>
                    {ps.rest_minutes > 0 && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-muted-foreground">Rest:</span>
                        <span className="text-sm font-medium text-foreground">{ps.rest_minutes} min</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground/80">Probe:</span> {ps.probe_where}
                  </p>
                  {ps.notes && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {ps.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="font-heading text-lg tracking-wider uppercase text-foreground mb-3">
            Ingredients
          </h3>
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            data-testid="section-ingredients"
          >
            {recipe.ingredients.map((ing, i) => (
              <div
                key={i}
                className="flex flex-col gap-1 rounded-md border border-border/40 p-3 leading-relaxed"
                style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                data-testid={`ingredient-row-${i}`}
              >
                <p className="text-sm whitespace-normal break-words">
                  <span className="font-bold text-foreground">{ing.item}</span>
                  {ing.amount && (
                    <span className="text-primary font-medium"> — {ing.amount}</span>
                  )}
                </p>
                {ing.notes && (
                  <p className="text-xs text-muted-foreground whitespace-normal break-words">
                    {ing.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-heading text-lg tracking-wider uppercase text-foreground mb-3">
            Steps
          </h3>
          <ol className="space-y-4" data-testid="section-steps">
            {recipe.steps.map((step, i) => {
              const heading = typeof step === "string" ? null : step.heading;
              const body = typeof step === "string" ? step : step.body;
              return (
                <li key={i} className="flex gap-3" data-testid={`step-${i}`}>
                  <span className="font-heading text-xl text-primary flex-shrink-0 w-6 text-right leading-6">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {heading && (
                      <p className="text-sm font-bold text-foreground mb-0.5 leading-snug">
                        {heading}
                      </p>
                    )}
                    <p className="text-sm text-foreground/80 leading-relaxed">{body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Trash2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-heading text-sm tracking-wider uppercase text-muted-foreground mb-1">
                Cleanup Tip
              </h3>
              <p className="text-sm text-foreground/80" data-testid="text-cleanup-tip">{recipe.cleanup_tip}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
