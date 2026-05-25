import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ClientRecipeResponse, MealPlateLine } from "@shared/schema";
import { formatAdaptationLabel } from "@shared/imported-recipe";
import type { RecipeSourceAttribution } from "@shared/canonical-recipe";

function formatSourceAttribution(source: NonNullable<ClientRecipeResponse["_recipe_source"]>): string {
  return formatAdaptationLabel(source as RecipeSourceAttribution) || "Recipe from";
}
import { resolveMealPlate } from "@/lib/meal-plate-ui";
import { MealHeroImage } from "@/components/meal-hero-image";
import { resolveEditorialFallbackHero } from "@shared/meal-hero-fallback";
import { buildRecipeTrustLine } from "@/lib/recipe-trust-line";
import { Flame, Droplets, Wheat, Beef, Sparkles, Trash2, Clock, Timer, ShieldCheck, Thermometer, Printer, Leaf, Mail, Package, ShoppingCart, DollarSign, Lightbulb, List, Heart, Check, ChevronDown, UtensilsCrossed, Globe, Zap, Bug } from "lucide-react";
import { saveMeal, isMealSaved } from "@/lib/saved-meals";
import { escapeHtml } from "@/lib/escape-html";
import { useState, useEffect, useMemo } from "react";

let sessionProTipsCollapsed = false;

const STARCH = /\b(rice|potato|pasta|bread|bun|naan|noodle|fries|wedge|quinoa)\b/i;
const VEG = /\b(broccoli|bean|salad|slaw|corn|pepper|carrot|spinach|kale|cucumber|vegetable|greens)\b/i;

interface RecipeCardProps {
  recipe: ClientRecipeResponse;
  crewSize: number;
  onEmailClick?: () => void;
  onShoppingListClick?: () => void;
  hideSave?: boolean;
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

function PlateSection({
  label,
  items,
  testId,
}: {
  label: string;
  items: MealPlateLine[];
  testId: string;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-2" data-testid={testId}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/90">{label.toUpperCase()}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="text-sm text-foreground leading-snug">
            <span className="font-semibold">{item.name}</span>
            {item.amount ? (
              <span className="text-muted-foreground"> — {item.amount}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function fmtQty(qty: number, unit: string): string {
  if (!qty && !unit) return "";
  const display = qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
  return unit ? `${display} ${unit}` : display;
}

export function buildPrintHtml(recipe: ClientRecipeResponse, crewSize: number): string {
  const e = escapeHtml;
  const safetyHtml = recipe.protein_safety && recipe.protein_safety.internal_temp_f > 0
    ? `<tr>
        <td style="font-weight:700;padding:6px 12px 6px 0">${e(recipe.protein_safety.protein)}</td>
        <td style="padding:6px 12px">${e(recipe.protein_safety.internal_temp_f)}&deg;F</td>
        <td style="padding:6px 12px">${recipe.protein_safety.rest_min > 0 ? e(recipe.protein_safety.rest_min) + " min" : "—"}</td>
        <td style="padding:6px 12px;font-size:13px">${e(recipe.protein_safety.notes)}</td>
      </tr>`
    : "";

  const ingredientRows = recipe.ingredients
    .map(
      (ing) =>
        `<tr>
          <td style="padding:4px 16px 4px 0;font-weight:600">${e(ing.name)}</td>
          <td style="padding:4px 0">${e(fmtQty(ing.qty, ing.unit))}</td>
          <td style="padding:4px 0 4px 16px;color:#555;font-size:13px">${e(ing.category)}</td>
        </tr>`
    )
    .join("");

  const stepItems = recipe.steps
    .map((step) => {
      return `<li style="margin-bottom:12px;page-break-inside:avoid">
        ${step.title ? `<strong>${e(step.title)}</strong><br/>` : ""}
        ${e(step.instructions)}
      </li>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${e(recipe.title)} — Print</title>
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
  <h1>${e(recipe.title)}</h1>
  <p class="subtitle">${e(recipe.why_it_fits_tonight)}</p>
  <p class="servings">Serves ${e(crewSize)}${recipe.chosen_protein ? ` &bull; Protein: ${e(recipe.chosen_protein)}` : ""}${recipe.budget_level === "low" ? " &bull; <strong>Budget-friendly ($)</strong>" : ""}</p>

  ${recipe.ingredients_used && recipe.ingredients_used.length > 0 ? `
  <h2>Using What's in the Fridge</h2>
  <p style="font-size:14px;margin-bottom:4px">${recipe.ingredients_used.map((i) => e(i)).join(", ")}</p>
  ${recipe.extra_items_needed && recipe.extra_items_needed.length > 0 ? `
  <p style="font-size:13px;color:#666;margin-top:8px"><strong>You may need to grab:</strong> ${recipe.extra_items_needed.map((i) => e(i)).join(", ")}</p>` : ""}
  ` : ""}

  ${recipe.timing ? `
  <h2>Timing</h2>
  <div class="timing-bar">
    <div class="timing-item"><strong>${recipe.timing.prep_min}</strong><span>min prep</span></div>
    <div class="timing-item"><strong>${recipe.timing.cook_min}</strong><span>min cook</span></div>
    <div class="timing-item"><strong>${recipe.timing.total_min}</strong><span>min total</span></div>
  </div>` : ""}

  <div class="macros">
    <strong>Macros per serving:</strong>
    Calories: ${recipe.macros_per_serving.calories} | Protein: ${recipe.macros_per_serving.protein_g}g | Carbs: ${recipe.macros_per_serving.carbs_g}g | Fat: ${recipe.macros_per_serving.fat_g}g
  </div>

  ${safetyHtml ? `
  <h2>Protein Safety</h2>
  <table class="safety">
    <thead><tr>
      <th style="text-align:left;padding:6px 12px 6px 0;font-size:12px;text-transform:uppercase;color:#666">Protein</th>
      <th style="text-align:left;padding:6px 12px;font-size:12px;text-transform:uppercase;color:#666">Internal Temp</th>
      <th style="text-align:left;padding:6px 12px;font-size:12px;text-transform:uppercase;color:#666">Rest</th>
      <th style="text-align:left;padding:6px 12px;font-size:12px;text-transform:uppercase;color:#666">Details</th>
    </tr></thead>
    <tbody>${safetyHtml}</tbody>
  </table>` : ""}

  <h2>Ingredients</h2>
  <table class="ingredients">
    <tbody>${ingredientRows}</tbody>
  </table>

  <h2>Steps</h2>
  <ol>${stepItems}</ol>

  ${recipe.pro_tips && recipe.pro_tips.length > 0 ? `
  <h2>Pro Tips</h2>
  <ul style="padding-left:20px;font-size:14px">
    ${recipe.pro_tips.map((tip) => `<li style="margin-bottom:4px">${e(tip)}</li>`).join("")}
  </ul>` : ""}

  ${recipe.cleanup_tip ? `
  <div class="cleanup">
    <strong>Cleanup Tip</strong>
    ${e(recipe.cleanup_tip)}
  </div>` : ""}

  ${recipe.budget_tips && recipe.budget_tips.length > 0 ? `
  <h2>Budget Tips</h2>
  <ul style="padding-left:20px;font-size:14px">
    ${recipe.budget_tips.map((tip) => `<li style="margin-bottom:4px">${e(tip)}</li>`).join("")}
  </ul>` : ""}

  ${recipe.veg_option?.enabled ? `
  <h2 style="color:#16a34a">Veg Option (1 Serving)</h2>
  <p style="font-size:14px;margin-bottom:8px"><strong>Swap protein:</strong> ${e(recipe.veg_option.swap_protein)}</p>
  <table class="ingredients">
    <tbody>
      ${recipe.veg_option.ingredients.map((ing) => `<tr>
        <td style="padding:4px 16px 4px 0;font-weight:600">${e(ing.item)}</td>
        <td style="padding:4px 0">${e(ing.amount)}</td>
        ${ing.notes ? `<td style="padding:4px 0 4px 16px;color:#555;font-size:13px">${e(ing.notes)}</td>` : "<td></td>"}
      </tr>`).join("")}
    </tbody>
  </table>
  <ol style="margin-top:12px">
    ${recipe.veg_option.steps.map((s) => `<li style="margin-bottom:8px">${e(s)}</li>`).join("")}
  </ol>
  <div class="cleanup" style="margin-top:12px">
    <strong>Plating Notes</strong>
    ${e(recipe.veg_option.plating_notes)}
  </div>` : ""}

  <div class="footer">
    www.lightsandsirensco.com<br>
    <span style="font-size:11px;color:#888">Powered by Lights &amp; Sirens Co.</span>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}

export function RecipeCard({ recipe, crewSize, onEmailClick, onShoppingListClick, hideSave }: RecipeCardProps) {
  const hasTiming = recipe.timing && (recipe.timing.prep_min || recipe.timing.cook_min || recipe.timing.total_min);
  const hasSafety = recipe.protein_safety && recipe.protein_safety.internal_temp_f > 0;
  const [saved, setSaved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [proTipsOpen, setProTipsOpen] = useState(!sessionProTipsCollapsed);

  const toggleProTips = () => {
    setProTipsOpen(prev => {
      const next = !prev;
      sessionProTipsCollapsed = !next;
      return next;
    });
  };

  useEffect(() => {
    setSaved(isMealSaved(recipe));
    setShowConfirm(false);
  }, [recipe._id, recipe._signature, recipe.title]);

  const handleSave = () => {
    const result = saveMeal(recipe);
    if (result.saved || result.duplicate) {
      setSaved(true);
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 2500);
    }
  };

  const handlePrint = () => {
    const html = buildPrintHtml(recipe, crewSize);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const recipeTags = recipe.recipe_tags;
  const mealPlate = useMemo(() => resolveMealPlate(recipe), [recipe]);
  const trustLine = useMemo(() => buildRecipeTrustLine(recipe, crewSize), [recipe, crewSize]);
  const starchSides = mealPlate?.sides.filter((s) => s.role === "starch") || [];
  const vegSides = mealPlate?.sides.filter((s) => s.role === "veg") || [];

  const isDebugMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug") === "1";
  }, []);

  const debugData = (recipe as any)._debug || null;
  const displayTitle = mealPlate?.display_title || recipe.title;
  const fallbackHero = resolveEditorialFallbackHero(displayTitle, {
    mealFormat: recipe.meal_style,
    protein: recipe.chosen_protein,
  });

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {recipe.hero_image && recipe.hero_image_status === "ready" ? (
        <MealHeroImage
          src={recipe.hero_image}
          alt={recipe.hero_image_alt || displayTitle}
          title={displayTitle}
          emoji="🔥"
          variant="cinematic"
          priority
          className="rounded-2xl overflow-hidden ring-1 ring-border/40 shadow-xl shadow-black/25"
        />
      ) : recipe.hero_image_status === "pending" ? (
        <div
          className="relative w-full aspect-[5/4] max-h-[min(40vh,360px)] sm:aspect-[16/9] sm:max-h-[min(360px,48vh)] rounded-2xl overflow-hidden ring-1 ring-border/30"
          aria-label="Generating meal photo"
          data-testid="meal-hero-pending"
        >
          {fallbackHero ? (
            <MealHeroImage
              src={fallbackHero}
              alt={displayTitle}
              title={displayTitle}
              variant="cinematic"
              className="opacity-70"
              imgClassName="opacity-90"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
          )}
          <div className="absolute inset-0 bg-black/25 animate-pulse pointer-events-none" />
        </div>
      ) : fallbackHero ? (
        <MealHeroImage
          src={fallbackHero}
          alt={displayTitle}
          title={displayTitle}
          emoji="🔥"
          variant="cinematic"
          priority
          className="rounded-2xl overflow-hidden ring-1 ring-border/40 shadow-xl shadow-black/25"
        />
      ) : null}
      {(recipe as any)._filters_adjusted && (
        <div className="flex items-center gap-2 text-sm text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2" data-testid="text-allergen-adjustment-note">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          {(recipe as any)._adjustment_note || "Adjusted meal style to meet allergy requirements."}
        </div>
      )}
      <div className="space-y-1">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl tracking-wide text-foreground leading-tight" data-testid="text-recipe-title">
          {displayTitle}
        </h2>
        <p
          className="flex items-center gap-1.5 text-sm text-muted-foreground leading-snug mt-2 max-w-xl"
          data-testid="text-recipe-trust-line"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-primary/55 shrink-0" aria-hidden />
          <span>{trustLine}</span>
        </p>
        {recipe._recipe_source?.name && !recipe._fallback && (
          <p className="text-xs text-muted-foreground/80 mt-1 max-w-xl" data-testid="text-recipe-source">
            {recipe._recipe_source.url ? (
              <>
                {formatSourceAttribution(recipe._recipe_source)}{" "}
                <a
                  href={recipe._recipe_source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {recipe._recipe_source.name}
                </a>
              </>
            ) : (
              <>{formatSourceAttribution(recipe._recipe_source) || `Recipe from ${recipe._recipe_source.name}`}</>
            )}
          </p>
        )}
        {recipe._fallback && (
          <p className="text-xs text-amber-700/90 dark:text-amber-500/90 mt-1 max-w-xl" data-testid="text-template-fallback">
            Backup recipe while we find a better match — try different filters for a publisher-sourced meal.
          </p>
        )}
        {mealPlate?.cuisine_label && (
          <p className="text-xs uppercase tracking-widest text-primary/80 mt-2" data-testid="text-cuisine-label">
            {mealPlate.cuisine_label} · Hall spread
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {!hideSave && (
            <Button
              variant={saved ? "default" : "outline"}
              onClick={handleSave}
              disabled={saved}
              className={`w-full justify-start ${saved ? "bg-primary/20 text-primary border-primary/30" : ""}`}
              data-testid="button-save-favorite"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Saved</span>
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Save</span>
                </>
              )}
            </Button>
          )}
          {onShoppingListClick && (
            <Button onClick={onShoppingListClick} className="w-full justify-start" data-testid="button-shopping-list">
              <List className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Shopping List</span>
            </Button>
          )}
          {onEmailClick && (
            <Button variant="outline" onClick={onEmailClick} className="w-full justify-start" data-testid="button-email-recipe">
              <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Email</span>
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint} className="w-full justify-start" data-testid="button-print">
            <Printer className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Print</span>
          </Button>
        </div>
        {showConfirm && (
          <div className="flex items-center gap-2 text-sm text-primary animate-in fade-in duration-300" data-testid="text-save-confirmation">
            <Check className="w-4 h-4" />
            Saved to Hall Favorites.
          </div>
        )}
        <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5 mt-1">
          <p className="text-[10px] uppercase tracking-widest text-primary/80 font-semibold mb-1">
            Tonight at the hall
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed" data-testid="text-recipe-why">
            {recipe.why_it_fits_tonight}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {recipe.chosen_protein && (
            <div className="flex items-center gap-2">
              <Beef className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground" data-testid="text-chosen-protein">
                Protein: {recipe.chosen_protein}
              </span>
            </div>
          )}
          {recipe.meal_format && (
            <Badge className="text-[10px] font-bold uppercase tracking-widest bg-primary/15 text-primary border border-primary/30 px-2 py-0.5" data-testid="badge-meal-format">
              {recipe.meal_format}
            </Badge>
          )}
          {recipe.meal_style && recipe.meal_style !== recipe.meal_format && (
            <Badge variant="outline" className="text-xs" data-testid="badge-meal-style">
              {recipe.meal_style}
            </Badge>
          )}
          {recipe.budget_level === "low" && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-budget-friendly">
              <DollarSign className="w-3 h-3 mr-1" />
              Budget-friendly
            </Badge>
          )}
        </div>
        {recipeTags && (recipeTags.cuisine || recipeTags.cooking_method || recipeTags.high_protein || recipeTags.high_fiber || recipeTags.quick_cleanup || !recipeTags.base_carb || recipeTags.base_carb === "none" || recipeTags.base_carb === "greens") && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap" data-testid="section-recipe-tags">
            {recipeTags.cuisine && (
              <Badge variant="outline" className="text-xs" data-testid="badge-tag-cuisine">
                <Globe className="w-3 h-3 mr-1" />
                {recipeTags.cuisine}
              </Badge>
            )}
            {recipeTags.cooking_method && (
              <Badge variant="outline" className="text-xs" data-testid="badge-tag-method">
                <UtensilsCrossed className="w-3 h-3 mr-1" />
                {recipeTags.cooking_method}
              </Badge>
            )}
            {recipeTags.high_protein && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-tag-high-protein">
                <Flame className="w-3 h-3 mr-1" />
                Feeds hard
              </Badge>
            )}
            {recipeTags.quick_cleanup && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-tag-quick-cleanup">
                <Sparkles className="w-3 h-3 mr-1" />
                Easy cleanup
              </Badge>
            )}
            {(recipeTags.base_carb === "none" || !recipeTags.base_carb) && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-no-carb">
                <Leaf className="w-3 h-3 mr-1" />
                No starch side
              </Badge>
            )}
            {recipeTags.base_carb === "greens" && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-lower-carb">
                <Leaf className="w-3 h-3 mr-1" />
                Greens base
              </Badge>
            )}
          </div>
        )}
      </div>

      {mealPlate && (mealPlate.main.length > 0 || mealPlate.sides.length > 0) && (
        <Card className="border-primary/25 bg-gradient-to-br from-primary/5 to-transparent" data-testid="section-meal-plate">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">
                Tonight&apos;s table
              </h3>
            </div>
            <PlateSection label="Main" items={mealPlate.main} testId="plate-main" />
            <PlateSection
              label="Sides"
              items={[...starchSides, ...vegSides]}
              testId="plate-sides"
            />
            <PlateSection label="Optional" items={mealPlate.optional} testId="plate-optional" />
          </CardContent>
        </Card>
      )}

      {recipe.ingredients_used && recipe.ingredients_used.length > 0 && (
        <Card data-testid="section-ingredients-used">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Using What's in the Fridge</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {recipe.ingredients_used.map((item, i) => (
                <Badge key={i} variant="outline" className="capitalize px-3 py-1" data-testid={`badge-ingredient-used-${i}`}>
                  {item}
                </Badge>
              ))}
            </div>
            {recipe.extra_items_needed && recipe.extra_items_needed.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">You may need to grab</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recipe.extra_items_needed.map((item, i) => (
                    <Badge key={i} variant="secondary" className="capitalize px-3 py-1" data-testid={`badge-extra-item-${i}`}>
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3" data-testid="section-timing-macros">
        {hasTiming && (
          <Card className="flex-1 min-w-[200px]">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Timing</h3>
              </div>
              <div className="flex gap-2" data-testid="section-timing">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <Timer className="w-4 h-4 text-blue-400" />
                  <span className="font-heading text-xl leading-none">{recipe.timing.prep_min}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">prep</span>
                </div>
                <Separator orientation="vertical" className="h-14 self-center" />
                <div className="flex flex-col items-center gap-1 flex-1">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="font-heading text-xl leading-none">{recipe.timing.cook_min}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">cook</span>
                </div>
                <Separator orientation="vertical" className="h-14 self-center" />
                <div className="flex flex-col items-center gap-1 flex-1">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span className="font-heading text-xl leading-none">{recipe.timing.total_min}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">total</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="flex-1 min-w-[200px]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-sm tracking-wider uppercase text-muted-foreground">
                Rough nutrition per seat
              </h3>
              <Badge variant="outline" className="ml-auto text-xs">
                {crewSize} at the table
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground/80 mb-2 -mt-1">
              {recipe.macros_estimated
                ? "Estimated after sides were added — ballpark for planning, not lab-precise."
                : "Ballpark only — we feed the crew first, count macros second."}
            </p>
            <div className="flex gap-2 opacity-90" data-testid="section-macros">
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
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Protein Safety</h3>
            </div>
            <div
              className="rounded-md border border-border/40 p-3 space-y-2"
              data-testid="section-protein-safety"
            >
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="font-bold text-sm text-foreground">{recipe.protein_safety.protein}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-muted-foreground">Internal Temp:</span>
                  <span className="text-sm font-heading text-primary">{recipe.protein_safety.internal_temp_f}°F</span>
                </div>
                {recipe.protein_safety.rest_min > 0 && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-muted-foreground">Rest:</span>
                    <span className="text-sm font-medium text-foreground">{recipe.protein_safety.rest_min} min</span>
                  </div>
                )}
              </div>
              {recipe.protein_safety.notes && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {recipe.protein_safety.notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <List className="w-4 h-4 text-primary" />
            <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">
              {mealPlate ? "Full ingredient list" : "Ingredients"}
            </h3>
          </div>
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
            data-testid="section-ingredients"
          >
            {recipe.ingredients.map((ing, i) => (
              <div
                key={i}
                className="flex flex-col gap-1.5 rounded-md border border-border/50 p-3.5 leading-relaxed transition-colors duration-150"
                style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                data-testid={`ingredient-row-${i}`}
              >
                <p className="text-sm whitespace-normal break-words">
                  <span className="font-bold text-foreground">{ing.name}</span>
                  {(ing.qty > 0 || ing.unit) && (
                    <span className="text-primary font-medium"> — {fmtQty(ing.qty, ing.unit)}</span>
                  )}
                </p>
                {ing.category && ing.category !== "other" && (
                  <p className="text-xs text-muted-foreground whitespace-normal break-words capitalize">
                    {ing.category}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed className="w-4 h-4 text-primary" />
            <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">
              Steps
            </h3>
          </div>
          <ol className="space-y-5" data-testid="section-steps">
            {recipe.steps.map((step, i) => {
              return (
                <li key={i} className="flex gap-3 sm:gap-4" data-testid={`step-${i}`}>
                  <span className="font-heading text-xl sm:text-2xl font-bold text-primary flex-shrink-0 w-8 sm:w-7 text-center leading-8 sm:leading-7 rounded-md bg-primary/10 h-8 sm:h-7 flex items-center justify-center">
                    {step.n}
                  </span>
                  <div className="flex-1 min-w-0 pt-0.5">
                    {step.title && (
                      <p className="text-[15px] sm:text-sm font-bold text-foreground mb-1 leading-snug">
                        {step.title}
                      </p>
                    )}
                    <p className="text-[15px] sm:text-sm text-foreground/85 leading-relaxed">{step.instructions}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {recipe.plating && recipe.plating.assembly_instructions && (
        <Card data-testid="section-plating">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <UtensilsCrossed className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Tonight&apos;s spread</h3>
            </div>
            {recipe.plating.serve_style && (
              <Badge variant="outline" className="text-xs mb-2" data-testid="badge-serve-style">
                {recipe.plating.serve_style}
              </Badge>
            )}
            <p className="text-sm text-foreground/80 leading-relaxed" data-testid="text-plating-instructions">
              {recipe.plating.assembly_instructions}
            </p>
            {recipe.plating.optional_toppings && recipe.plating.optional_toppings.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recipe.plating.optional_toppings.map((topping, i) => (
                  <Badge key={i} variant="secondary" className="text-xs" data-testid={`badge-topping-${i}`}>
                    {topping}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {recipe.pro_tips && recipe.pro_tips.length > 0 && (
        <Card data-testid="section-pro-tips">
          <CardContent className="p-5">
            <button
              type="button"
              onClick={toggleProTips}
              className="flex items-center justify-between w-full text-left cursor-pointer"
              data-testid="button-toggle-pro-tips"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">
                  Pro Tips
                </h3>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${proTipsOpen ? "" : "-rotate-90"}`}
              />
            </button>
            {proTipsOpen && (
              <ul className="mt-3 space-y-2" data-testid="list-pro-tips">
                {recipe.pro_tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/80" data-testid={`pro-tip-${i}`}>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {recipe.cleanup_tip?.trim() && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Trash2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-heading text-sm tracking-wider uppercase text-muted-foreground mb-1">
                  Kitchen shutdown
                </h3>
                <p className="text-sm text-foreground/80" data-testid="text-cleanup-tip">{recipe.cleanup_tip}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {recipe.budget_tips && recipe.budget_tips.length > 0 && (
        <Card data-testid="section-budget-tips">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h3 className="font-heading text-lg tracking-wider uppercase text-foreground">Budget Tips</h3>
            </div>
            <ul className="space-y-2">
              {recipe.budget_tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/80" data-testid={`budget-tip-${i}`}>
                  <DollarSign className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {recipe.veg_option?.enabled && (
        <Card className="border-green-600/30" data-testid="section-veg-option">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-500" />
              <h3 className="font-heading text-lg tracking-wider uppercase text-green-600 dark:text-green-400">
                Veg Option (1 Serving)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-green-600/40 text-green-700 dark:text-green-400" data-testid="badge-veg-swap-protein">
                {recipe.veg_option.swap_protein}
              </Badge>
              <span className="text-xs text-muted-foreground">replaces {recipe.chosen_protein}</span>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Additional Ingredients
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2" data-testid="veg-ingredients">
                {recipe.veg_option.ingredients.map((ing, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-1 rounded-md border border-green-600/20 p-2.5 leading-relaxed"
                    style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                    data-testid={`veg-ingredient-${i}`}
                  >
                    <p className="text-sm whitespace-normal break-words">
                      <span className="font-bold text-foreground">{ing.item}</span>
                      {ing.amount && (
                        <span className="text-green-600 dark:text-green-400 font-medium"> — {ing.amount}</span>
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
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Steps
              </h4>
              <ol className="space-y-2" data-testid="veg-steps">
                {recipe.veg_option.steps.map((step, i) => (
                  <li key={i} className="flex gap-4" data-testid={`veg-step-${i}`}>
                    <span className="font-heading text-lg font-bold text-green-500 flex-shrink-0 w-7 text-center leading-7 rounded-md bg-green-500/10 h-7 flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-sm text-foreground/80 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-md border border-green-600/20 p-3">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                Plating Notes
              </h4>
              <p className="text-sm text-foreground/80" data-testid="text-veg-plating">{recipe.veg_option.plating_notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isDebugMode && (
        <Card className="border-yellow-600/40 bg-yellow-950/20 mt-4" data-testid="debug-panel">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-yellow-500">Debug Panel</span>
            </div>

            {debugData?.validation_errors && debugData.validation_errors.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-400 mb-1">Validation Errors ({debugData.validation_errors.length})</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {debugData.validation_errors.map((err: string, i: number) => (
                    <li key={i} className="text-xs text-red-300 font-mono">{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {debugData?.issues && debugData.issues.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-yellow-400 mb-1">All Issues ({debugData.issues.length})</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {debugData.issues.map((issue: string, i: number) => (
                    <li key={i} className="text-xs text-yellow-300 font-mono">{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {debugData && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Debug Info</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground">
                  <span>validation_ok: {String(debugData.validation_ok)}</span>
                  <span>action: {debugData.action}</span>
                  <span>meal_style: {debugData.meal_style}</span>
                  <span>cuisine: {debugData.cuisine}</span>
                  <span>base_carb: {debugData.base_carb}</span>
                  <span>cooking_method: {debugData.cooking_method}</span>
                </div>
              </div>
            )}

            {debugData?.label_audit && (
              <div>
                <p className="text-xs font-semibold text-blue-400 mb-1">Label Audit</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground">
                  <span>audit_ok: {String(debugData.label_audit.ok)}</span>
                  <span>fixes: {debugData.label_audit.fixes_applied?.length || 0}</span>
                </div>
                {debugData.label_audit.fixes_applied?.length > 0 && (
                  <div className="mt-1">
                    <p className="text-[10px] font-semibold text-blue-300">Fixes Applied:</p>
                    <ul className="text-[10px] font-mono text-blue-200/70 list-disc pl-4">
                      {debugData.label_audit.fixes_applied.map((fix: string, i: number) => (
                        <li key={i}>{fix}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {debugData.label_audit.issues?.length > 0 && (
                  <div className="mt-1">
                    <p className="text-[10px] font-semibold text-orange-300">Audit Issues:</p>
                    <ul className="text-[10px] font-mono text-orange-200/70 list-disc pl-4">
                      {debugData.label_audit.issues.map((issue: string, i: number) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {debugData.label_audit.details && (
                  <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono text-muted-foreground">
                    <span>req_style: {debugData.label_audit.details.requestedStyle}</span>
                    <span>inf_style: {debugData.label_audit.details.inferredStyle}</span>
                    <span>fin_style: {debugData.label_audit.details.finalStyle}</span>
                    <span>inf_cuisine: {debugData.label_audit.details.inferredCuisine}</span>
                    <span>fin_cuisine: {debugData.label_audit.details.finalCuisine}</span>
                    <span>inf_carb: {debugData.label_audit.details.inferredBaseCarb}</span>
                    <span>inf_method: {debugData.label_audit.details.inferredMethod}</span>
                    <span>inf_health: {debugData.label_audit.details.inferredHealthiness}</span>
                    <span>inf_budget: {debugData.label_audit.details.inferredBudget}</span>
                    <span>appliance_fit: {String(debugData.label_audit.details.applianceFit)}</span>
                    <span>allergen_clean: {String(debugData.label_audit.details.allergenClean)}</span>
                  </div>
                )}
              </div>
            )}

            <details>
              <summary className="text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground">
                Raw Debug Data
              </summary>
              <pre className="mt-2 text-[10px] font-mono text-muted-foreground bg-black/30 rounded p-3 overflow-x-auto max-h-96 whitespace-pre-wrap" data-testid="debug-raw-json">
                {JSON.stringify(debugData || { note: "No _debug block in response. Recipe may have been served from prefetch/cache without ?debug=1." }, null, 2)}
              </pre>
            </details>
            <details>
              <summary className="text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground">
                Recipe Summary
              </summary>
              <pre className="mt-2 text-[10px] font-mono text-muted-foreground bg-black/30 rounded p-3 overflow-x-auto max-h-96 whitespace-pre-wrap">
                {JSON.stringify({
                  title: recipe.title,
                  meal_format: recipe.meal_format,
                  meal_style: recipe.meal_style,
                  chosen_protein: recipe.chosen_protein,
                  budget_level: recipe.budget_level,
                  servings: recipe.servings,
                  timing: recipe.timing,
                  ingredient_count: recipe.ingredients?.length,
                  step_count: recipe.steps?.length,
                  tags: recipe.tags,
                }, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
