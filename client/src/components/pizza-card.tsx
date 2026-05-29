import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { PizzaResponse } from "@shared/schema";
import { escapeHtml } from "@/lib/escape-html";
import {
  Flame,
  Droplets,
  Wheat,
  Beef,
  Sparkles,
  Trash2,
  Clock,
  Timer,
  ShieldCheck,
  Thermometer,
  Printer,
  Leaf,
  Mail,
  ThermometerSun,
  List,
  UtensilsCrossed,
  Wine,
  Replace,
} from "lucide-react";
import { getPizzaConceptMeta } from "@shared/pizza-concepts";
import { cn } from "@/lib/utils";
import { MealHeroImage } from "@/components/meal-hero-image";

interface PizzaCardProps {
  recipe: PizzaResponse;
  crewSize: number;
  onEmailClick?: () => void;
  onShoppingListClick?: () => void;
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

function IngredientGroup({ title, items }: { title: string; items: { item: string; amount: string; notes: string }[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((ing, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 rounded-md border border-border/40 p-3 leading-relaxed"
            style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
            data-testid={`pizza-ingredient-${title.toLowerCase()}-${i}`}
          >
            <p className="text-sm whitespace-normal break-words">
              <span className="font-bold text-foreground">{ing.item}</span>
              {ing.amount && <span className="text-primary font-medium"> — {ing.amount}</span>}
            </p>
            {ing.notes && <p className="text-xs text-muted-foreground whitespace-normal break-words">{ing.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildPizzaPrintHtml(recipe: PizzaResponse, crewSize: number): string {
  const e = escapeHtml;
  const safetyRows = recipe.protein_safety?.length
    ? recipe.protein_safety
        .map(ps => `<tr>
          <td style="font-weight:700;padding:6px 12px 6px 0">${e(ps.protein)}</td>
          <td style="padding:6px 12px">${e(ps.target_temp_f)}&deg;F / ${e(ps.target_temp_c)}&deg;C</td>
          <td style="padding:6px 12px">${ps.rest_minutes > 0 ? e(ps.rest_minutes) + " min" : "\u2014"}</td>
          <td style="padding:6px 12px;font-size:13px">${e(ps.probe_where)}${ps.notes ? ". " + e(ps.notes) : ""}</td>
        </tr>`)
        .join("")
    : "";

  const renderIngGroup = (title: string, items?: { item: string; amount: string; notes: string }[]) => {
    if (!items || items.length === 0) return "";
    return `<h3 style="font-size:14px;font-weight:700;margin:16px 0 6px;text-transform:uppercase;letter-spacing:1px;color:#555">${e(title)}</h3>
    <table class="ingredients"><tbody>${items.map(ing => `<tr>
      <td style="padding:4px 16px 4px 0;font-weight:600">${e(ing.item)}</td>
      <td style="padding:4px 0">${e(ing.amount)}</td>
      ${ing.notes ? `<td style="padding:4px 0 4px 16px;color:#555;font-size:13px">${e(ing.notes)}</td>` : "<td></td>"}
    </tr>`).join("")}</tbody></table>`;
  };

  const stepItems = recipe.build_steps
    .map((step) => {
      const heading = typeof step === "string" ? null : step.heading;
      const body = typeof step === "string" ? step : step.body;
      return `<li style="margin-bottom:12px;page-break-inside:avoid">
        ${heading ? `<strong>${e(heading)}</strong><br/>` : ""}${e(body)}
      </li>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${e(recipe.title)} — Pizza Night Print</title>
<style>
  @page { margin: 0.75in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; background: #fff; line-height: 1.5; font-size: 15px; }
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
  .cleanup { background: #f5f5f5; padding: 12px 16px; border-radius: 4px; margin-top: 16px; page-break-inside: avoid; }
  .cleanup strong { display: block; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; color: #666; margin-bottom: 4px; }
  .servings { font-size: 13px; color: #666; margin-bottom: 16px; }
  .macros { font-size: 14px; color: #222; margin-bottom: 8px; padding: 8px 0; }
  .macros strong { font-weight: 600; }
  .footer { text-align: center; color: #444; font-size: 12px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; }
  @media print { body { padding: 0; } .no-print { display: none !important; } }
</style>
</head>
<body>
  <h1>${e(recipe.title)}</h1>
  <p class="subtitle">${e(recipe.why_this_works)}</p>
  <p class="servings">Serves ${e(crewSize)} &bull; ${e(recipe.recommended_pizzas)} &bull; Dough: ${e(recipe.dough_type)}</p>

  ${recipe.timing ? `
  <h2>Timing</h2>
  <div class="timing-bar">
    <div class="timing-item"><strong>${e(recipe.timing.prep_minutes)}</strong><span>min prep</span></div>
    <div class="timing-item"><strong>${e(recipe.timing.bake_minutes)}</strong><span>min bake</span></div>
    <div class="timing-item"><strong>${e(recipe.timing.total_minutes)}</strong><span>min total</span></div>
  </div>` : ""}

  <h2>Oven Setup</h2>
  <p style="font-size:14px">Preheat to <strong>${e(recipe.oven_setup.preheat_temp_f)}&deg;F / ${e(recipe.oven_setup.preheat_temp_c)}&deg;C</strong> &bull; Rack: ${e(recipe.oven_setup.rack_position)} &bull; Surface: ${e(recipe.oven_setup.surface_option)}</p>

  <div class="macros">
    <strong>Macros per serving (2 slices):</strong>
    Calories: ${e(recipe.macros_per_serving.calories)} | Protein: ${e(recipe.macros_per_serving.protein_g)}g | Carbs: ${e(recipe.macros_per_serving.carbs_g)}g | Fat: ${e(recipe.macros_per_serving.fat_g)}g
  </div>

  ${safetyRows ? `
  <h2>Food Safety</h2>
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
  ${renderIngGroup("Dough", recipe.ingredients.dough)}
  ${renderIngGroup("Sauce", recipe.ingredients.sauce)}
  ${renderIngGroup("Cheese", recipe.ingredients.cheese)}
  ${renderIngGroup("Toppings", recipe.ingredients.toppings)}
  ${renderIngGroup("Drizzles & Finishing", recipe.ingredients.drizzles)}

  <h2>Build Steps</h2>
  <ol>${stepItems}</ol>

  ${recipe.cleanup_tip ? `<div class="cleanup"><strong>Cleanup Tip</strong>${e(recipe.cleanup_tip)}</div>` : ""}

  ${recipe.veg_option?.enabled ? `
  <h2 style="color:#16a34a">Veg Option (1 Serving)</h2>
  <p style="font-size:14px;margin-bottom:8px">${e(recipe.veg_option.description)}</p>
  <table class="ingredients"><tbody>
    ${recipe.veg_option.swap_toppings.map(ing => `<tr>
      <td style="padding:4px 16px 4px 0;font-weight:600">${e(ing.item)}</td>
      <td style="padding:4px 0">${e(ing.amount)}</td>
      ${ing.notes ? `<td style="padding:4px 0 4px 16px;color:#555;font-size:13px">${e(ing.notes)}</td>` : "<td></td>"}
    </tr>`).join("")}
  </tbody></table>
  <ol style="margin-top:12px">
    ${recipe.veg_option.steps.map(s => `<li style="margin-bottom:8px">${e(s)}</li>`).join("")}
  </ol>` : ""}

  <div class="footer">
    www.lightsandsirensco.com<br>
    <span style="font-size:11px;color:#888">Powered by Lights &amp; Sirens Co.</span>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}

export function PizzaCard({ recipe, crewSize, onEmailClick, onShoppingListClick }: PizzaCardProps) {
  const meta = getPizzaConceptMeta(recipe.pizza_style_id);
  const heroEmoji = recipe.hero_emoji ?? meta?.heroEmoji ?? "🍕";
  const heroGradient = meta?.heroGradient ?? "from-orange-950 via-red-950 to-zinc-950";
  const badges = recipe.badges?.length ? recipe.badges : meta?.badges ?? [];
  const hasTiming = recipe.timing && (recipe.timing.prep_minutes || recipe.timing.bake_minutes || recipe.timing.total_minutes);
  const hasSafety = recipe.protein_safety && recipe.protein_safety.length > 0;

  const handlePrint = () => {
    const html = buildPizzaPrintHtml(recipe, crewSize);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {recipe.hero_image ? (
        <MealHeroImage
          src={recipe.hero_image}
          alt={recipe.hero_image_alt || recipe.title}
          title={recipe.title}
          heldLabel="Pizza Night"
          variant="cinematic"
          priority
          className="rounded-2xl overflow-hidden ring-1 ring-primary/25 shadow-xl shadow-black/30"
        />
      ) : (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl ring-1 ring-primary/25 shadow-xl shadow-black/30",
          recipe.hero_image_status === "pending" && "animate-pulse",
          "bg-gradient-to-br",
          heroGradient,
        )}
        data-testid="pizza-recipe-hero"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(255,255,255,0.08),transparent)]" />
        <div className="relative flex items-center justify-between gap-4 p-6 sm:p-8">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.35em] text-primary font-semibold mb-2">
              {recipe.category?.replace(/_/g, " ") ?? "Hall Pizza"}
            </p>
            <h2
              className="font-heading text-2xl sm:text-4xl tracking-wide text-white leading-tight drop-shadow-md"
              data-testid="pizza-text-recipe-title"
            >
              {recipe.title}
            </h2>
            {recipe.hall_line && (
              <p className="text-sm text-white/75 mt-2 max-w-lg">{recipe.hall_line}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {badges.map((b) => (
                <span
                  key={b}
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 text-white border border-white/15"
                >
                  {b}
                </span>
              ))}
              {recipe.spice_level && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/80 text-primary-foreground">
                  {recipe.spice_level}
                </span>
              )}
              {recipe.difficulty && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 text-white">
                  {recipe.difficulty}
                </span>
              )}
              {recipe.estimated_cost && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 text-white">
                  Est. {recipe.estimated_cost}
                </span>
              )}
            </div>
          </div>
          <span className="text-6xl sm:text-7xl shrink-0 drop-shadow-2xl" aria-hidden>
            {heroEmoji}
          </span>
        </div>
      </div>
      )}

      <div className="space-y-1 px-0.5">
        <div className="flex items-start justify-end gap-3 flex-wrap">
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            {onEmailClick && (
              <Button variant="outline" onClick={onEmailClick} data-testid="pizza-button-email">
                <Mail className="w-4 h-4 mr-2" />
                Email me this recipe
              </Button>
            )}
            <Button variant="outline" onClick={handlePrint} data-testid="pizza-button-print">
              <Printer className="w-4 h-4 mr-2" />
              Print for the Hall
            </Button>
            {onShoppingListClick && (
              <Button variant="outline" onClick={onShoppingListClick} data-testid="pizza-button-shopping-list">
                <List className="w-4 h-4 mr-2" />
                Shopping List
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="pizza-text-why">
          {recipe.why_this_works}
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="outline" className="text-xs" data-testid="pizza-badge-dough">
            {recipe.dough_type}
          </Badge>
          <Badge variant="secondary" className="text-xs" data-testid="pizza-badge-count">
            {recipe.recommended_pizzas}
          </Badge>
          {recipe.crust_type && (
            <Badge variant="outline" className="text-xs border-border/60">
              {recipe.crust_type}
            </Badge>
          )}
          {recipe.sauce_style && (
            <Badge variant="outline" className="text-xs border-border/60">
              {recipe.sauce_style}
            </Badge>
          )}
        </div>
      </div>

      {(recipe.recommended_sides?.length || recipe.dipping_sauces?.length) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {recipe.recommended_sides && recipe.recommended_sides.length > 0 && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UtensilsCrossed className="w-4 h-4 text-primary" />
                  <h3 className="font-heading text-sm tracking-wider uppercase">Optional sides</h3>
                </div>
                <ul className="text-sm text-foreground/85 space-y-1">
                  {recipe.recommended_sides.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {recipe.dipping_sauces && recipe.dipping_sauces.length > 0 && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wine className="w-4 h-4 text-primary" />
                  <h3 className="font-heading text-sm tracking-wider uppercase">Dipping Sauces</h3>
                </div>
                <ul className="text-sm text-foreground/85 space-y-1">
                  {recipe.dipping_sauces.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {(recipe.optional_toppings?.length || recipe.substitutions?.length) && (
        <Card className="border-dashed border-border/60">
          <CardContent className="p-4 grid sm:grid-cols-2 gap-4">
            {recipe.optional_toppings && recipe.optional_toppings.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                  Optional Toppings
                </h3>
                <ul className="text-sm space-y-1">
                  {recipe.optional_toppings.map((t) => (
                    <li key={t} className="text-foreground/85">
                      + {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recipe.substitutions && recipe.substitutions.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Replace className="w-3.5 h-3.5 text-muted-foreground" />
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Substitutions
                  </h3>
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {recipe.substitutions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3" data-testid="pizza-section-timing-macros">
        {hasTiming && (
          <Card className="flex-1 min-w-[200px]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Timing</h3>
              </div>
              <div className="flex gap-2" data-testid="pizza-section-timing">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <Timer className="w-4 h-4 text-blue-400" />
                  <span className="font-heading text-xl leading-none">{recipe.timing.prep_minutes}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">prep</span>
                </div>
                <Separator orientation="vertical" className="h-14 self-center" />
                <div className="flex flex-col items-center gap-1 flex-1">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="font-heading text-xl leading-none">{recipe.timing.bake_minutes}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">bake</span>
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
              <Badge variant="outline" className="ml-auto text-xs">2 slices</Badge>
            </div>
            <div className="flex gap-2" data-testid="pizza-section-macros">
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

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ThermometerSun className="w-4 h-4 text-primary" />
            <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Oven Setup</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="pizza-section-oven">
            <div className="rounded-md border border-border/40 p-3 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Preheat</p>
              <p className="font-heading text-xl text-primary">{recipe.oven_setup.preheat_temp_f}°F</p>
              <p className="text-xs text-muted-foreground">{recipe.oven_setup.preheat_temp_c}°C</p>
            </div>
            <div className="rounded-md border border-border/40 p-3 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Rack Position</p>
              <p className="text-sm font-medium text-foreground">{recipe.oven_setup.rack_position}</p>
            </div>
            <div className="rounded-md border border-border/40 p-3 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Surface</p>
              <p className="text-sm font-medium text-foreground">{recipe.oven_setup.surface_option}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasSafety && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Food Safety</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="pizza-section-safety">
              {recipe.protein_safety.map((ps, i) => (
                <div key={i} className="rounded-md border border-border/40 p-3 space-y-2" data-testid={`pizza-safety-${i}`}>
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="font-heading text-lg tracking-wider uppercase text-foreground mb-3">Ingredients</h3>
          <div className="space-y-4" data-testid="pizza-section-ingredients">
            <IngredientGroup title="Dough" items={recipe.ingredients.dough || []} />
            <IngredientGroup title="Sauce" items={recipe.ingredients.sauce} />
            <IngredientGroup title="Cheese" items={recipe.ingredients.cheese} />
            <IngredientGroup title="Toppings" items={recipe.ingredients.toppings} />
            <IngredientGroup title="Drizzles & Finishing" items={recipe.ingredients.drizzles} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-heading text-lg tracking-wider uppercase text-foreground mb-3">Build Steps</h3>
          <ol className="space-y-4" data-testid="pizza-section-steps">
            {recipe.build_steps.map((step, i) => {
              const heading = typeof step === "string" ? null : step.heading;
              const body = typeof step === "string" ? step : step.body;
              return (
                <li key={i} className="flex gap-3" data-testid={`pizza-step-${i}`}>
                  <span className="font-heading text-xl text-primary flex-shrink-0 w-6 text-right leading-6">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {heading && <p className="text-sm font-bold text-foreground mb-0.5 leading-snug">{heading}</p>}
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
              <h3 className="font-heading text-sm tracking-wider uppercase text-muted-foreground mb-1">Cleanup Tip</h3>
              <p className="text-sm text-foreground/80" data-testid="pizza-text-cleanup">{recipe.cleanup_tip}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {recipe.veg_option?.enabled && (
        <Card className="border-green-600/30" data-testid="pizza-section-veg-option">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-500" />
              <h3 className="font-heading text-lg tracking-wider uppercase text-green-600 dark:text-green-400">
                Veg Option (1 Serving)
              </h3>
            </div>
            <p className="text-sm text-foreground/80">{recipe.veg_option.description}</p>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Swap Toppings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2" data-testid="pizza-veg-toppings">
                {recipe.veg_option.swap_toppings.map((ing, i) => (
                  <div key={i} className="flex flex-col gap-1 rounded-md border border-green-600/20 p-2.5 leading-relaxed" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }} data-testid={`pizza-veg-topping-${i}`}>
                    <p className="text-sm whitespace-normal break-words">
                      <span className="font-bold text-foreground">{ing.item}</span>
                      {ing.amount && <span className="text-green-600 dark:text-green-400 font-medium"> — {ing.amount}</span>}
                    </p>
                    {ing.notes && <p className="text-xs text-muted-foreground whitespace-normal break-words">{ing.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Steps</h4>
              <ol className="space-y-2" data-testid="pizza-veg-steps">
                {recipe.veg_option.steps.map((s, i) => (
                  <li key={i} className="flex gap-3" data-testid={`pizza-veg-step-${i}`}>
                    <span className="font-heading text-lg text-green-600 dark:text-green-400 flex-shrink-0 w-5 text-right leading-5">{i + 1}</span>
                    <p className="text-sm text-foreground/80 leading-relaxed">{s}</p>
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
