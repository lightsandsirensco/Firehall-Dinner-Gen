import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ClientRecipeResponse, MealPlateLine } from "@shared/schema";
import { customerSourceAttribution } from "@shared/customer-facing";
import type { RecipeSourceAttribution } from "@shared/canonical-recipe";
import { resolveMealPlate } from "@/lib/meal-plate-ui";
import { MealHeroImage } from "@/components/meal-hero-image";
import { resolveEditorialFallbackHero } from "@shared/meal-hero-fallback";
import { buildRecipeTrustLine } from "@/lib/recipe-trust-line";
import { Flame, Droplets, Wheat, Beef, Sparkles, Trash2, Clock, Timer, ShieldCheck, Thermometer, Printer, Leaf, Mail, Package, ShoppingCart, DollarSign, Lightbulb, List, Heart, Check, ChevronDown, UtensilsCrossed, Globe, Zap, Bug } from "lucide-react";
import { saveMeal, isMealSaved } from "@/lib/saved-meals";
import { hapticSuccess } from "@/lib/haptics";
import { escapeHtml } from "@/lib/escape-html";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

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

function MealSection({
  title,
  children,
  className,
  ...rest
}: {
  title: string;
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("space-y-4 pt-6 border-t border-border/20 first:border-0 first:pt-0", className)}
      {...rest}
    >
      <h3 className={app.titleMeal}>{title}</h3>
      {children}
    </section>
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
      <p className="text-[11px] font-semibold text-primary/90">{label}</p>
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
      hapticSuccess();
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
    <div className={cn(app.sectionGap, "meal-reveal motion-reduce:animate-none animate-in fade-in slide-in-from-bottom-3 duration-500")}>
      {recipe.hero_image && recipe.hero_image_status === "ready" ? (
        <MealHeroImage
          src={recipe.hero_image}
          alt={recipe.hero_image_alt || displayTitle}
          title={displayTitle}
          emoji="🔥"
          variant="cinematic"
          priority
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
        />
      ) : null}
      {(recipe as any)._filters_adjusted && (
        <div className="flex items-center gap-2 text-sm text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2" data-testid="text-allergen-adjustment-note">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          {(recipe as any)._adjustment_note || "Adjusted meal style to meet allergy requirements."}
        </div>
      )}
      <div className="space-y-3">
        <h2 className={cn(app.titlePage, "max-w-2xl")} data-testid="text-recipe-title">
          {displayTitle}
        </h2>
        <p className={cn(app.subtitle, "max-w-xl")} data-testid="text-recipe-trust-line">
          {trustLine}
        </p>
        {recipe._recipe_source?.name && !recipe.hall_curated && !recipe._fallback && (
          <p className="text-xs text-muted-foreground/80 mt-1 max-w-xl" data-testid="text-recipe-source">
            {recipe._recipe_source.url ? (
              <>
                {customerSourceAttribution(recipe._recipe_source as RecipeSourceAttribution) || "Inspired by"}{" "}
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
              <>
                {customerSourceAttribution(recipe._recipe_source as RecipeSourceAttribution) ||
                  `Inspired by ${recipe._recipe_source.name}`}
              </>
            )}
          </p>
        )}
        {mealPlate?.cuisine_label && (
          <p className={app.caption} data-testid="text-cuisine-label">
            {mealPlate.cuisine_label}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {(recipe as ClientRecipeResponse).catalog_badge && (
            <span className={app.pill} data-testid="badge-catalog-source">
              {(recipe as ClientRecipeResponse).catalog_badge}
            </span>
          )}
          {((recipe as ClientRecipeResponse).catalog_trait_badges || []).map((badge) => (
            <span key={badge} className={app.pill} data-testid="badge-catalog-trait">
              {badge}
            </span>
          ))}
          {hasTiming && (
            <span className={app.pill}>
              <Clock className="w-3.5 h-3.5 mr-1.5 inline opacity-70" aria-hidden />
              {recipe.timing.total_min} min
            </span>
          )}
          {recipe.chosen_protein && (
            <span className={app.pill} data-testid="text-chosen-protein">
              {recipe.chosen_protein}
            </span>
          )}
          {recipe.meal_format && (
            <span className={app.pill} data-testid="badge-meal-format">
              {recipe.meal_format}
            </span>
          )}
          {recipe.budget_level === "low" && (
            <span className={app.pill} data-testid="badge-budget-friendly">
              Budget-friendly
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {!hideSave && (
            <Button
              variant={saved ? "secondary" : "outline"}
              size="sm"
              onClick={handleSave}
              disabled={saved}
              className="min-h-10 touch-manipulation"
              data-testid="button-save-favorite"
            >
              {saved ? <Check className="w-4 h-4 mr-1.5" /> : <Heart className="w-4 h-4 mr-1.5" />}
              {saved ? "Saved" : "Save"}
            </Button>
          )}
          {onShoppingListClick && (
            <Button size="sm" variant="outline" onClick={onShoppingListClick} className="min-h-10 touch-manipulation" data-testid="button-shopping-list">
              <List className="w-4 h-4 mr-1.5" />
              List
            </Button>
          )}
          {onEmailClick && (
            <Button size="sm" variant="outline" onClick={onEmailClick} className="min-h-10 touch-manipulation" data-testid="button-email-recipe">
              <Mail className="w-4 h-4 mr-1.5" />
              Email
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handlePrint} className="min-h-10 touch-manipulation" data-testid="button-print">
            <Printer className="w-4 h-4 mr-1.5" />
            Print
          </Button>
        </div>
        {showConfirm && (
          <div className="flex items-center gap-2 text-sm text-primary success-pop motion-reduce:animate-none" data-testid="text-save-confirmation">
            <Check className="w-4 h-4" />
            Saved to Hall Favorites.
          </div>
        )}
        <p className={cn(app.lead, "max-w-2xl")} data-testid="text-recipe-why">
          {recipe.why_it_fits_tonight}
        </p>
      </div>

      {mealPlate && (mealPlate.main.length > 0 || mealPlate.sides.length > 0) && (
        <MealSection title="Tonight's table" data-testid="section-meal-plate">
          <PlateSection label="Main" items={mealPlate.main} testId="plate-main" />
          <PlateSection
            label="Sides"
            items={[...starchSides, ...vegSides]}
            testId="plate-sides"
          />
          <PlateSection label="Optional" items={mealPlate.optional} testId="plate-optional" />
        </MealSection>
      )}

      {recipe.ingredients_used && recipe.ingredients_used.length > 0 && (
        <MealSection title="From the fridge" data-testid="section-ingredients-used">
          <div className="flex flex-wrap gap-2">
            {recipe.ingredients_used.map((item, i) => (
              <span key={i} className={app.pill} data-testid={`badge-ingredient-used-${i}`}>
                {item}
              </span>
            ))}
          </div>
          {recipe.extra_items_needed && recipe.extra_items_needed.length > 0 && (
            <p className={cn(app.subtitle, "mt-3")}>
              <span className="text-foreground/80">Grab if needed:</span>{" "}
              {recipe.extra_items_needed.join(", ")}
            </p>
          )}
        </MealSection>
      )}

      <p className={cn(app.caption, "flex flex-wrap gap-x-4 gap-y-1")} data-testid="section-timing-macros">
        {hasTiming && (
          <>
            <span data-testid="section-timing">
              <span className="text-foreground/80">{recipe.timing.prep_min}</span> min prep ·{" "}
              <span className="text-foreground/80">{recipe.timing.cook_min}</span> min cook
            </span>
          </>
        )}
        <span data-testid="section-macros">
          <span className="text-foreground font-medium">{recipe.macros_per_serving.calories}</span> cal ·{" "}
          <span className="text-foreground font-medium">{recipe.macros_per_serving.protein_g}g</span> protein per seat
        </span>
      </p>

      {hasSafety && (
        <MealSection title="Cook to temp" data-testid="section-protein-safety">
          <p className={app.subtitle}>
            <span className="text-foreground font-medium">{recipe.protein_safety.protein}</span>
            {" — "}
            <span className="text-foreground">{recipe.protein_safety.internal_temp_f}°F internal</span>
            {recipe.protein_safety.rest_min > 0 && (
              <>, rest {recipe.protein_safety.rest_min} min</>
            )}
          </p>
          {recipe.protein_safety.notes && (
            <p className={app.caption}>{recipe.protein_safety.notes}</p>
          )}
        </MealSection>
      )}

      <MealSection title={mealPlate ? "Full ingredient list" : "Ingredients"}>
        <ul className="divide-y divide-border/25" data-testid="section-ingredients">
          {recipe.ingredients.map((ing, i) => (
            <li
              key={i}
              className="flex justify-between gap-4 py-3.5 text-[15px]"
              data-testid={`ingredient-row-${i}`}
            >
              <span className="font-medium">{ing.name}</span>
              <span className="text-muted-foreground tabular-nums shrink-0">
                {fmtQty(ing.qty, ing.unit) || "—"}
              </span>
            </li>
          ))}
        </ul>
      </MealSection>

      <MealSection title="How to cook it">
        <ol className="space-y-8" data-testid="section-steps">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-4" data-testid={`step-${i}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60 text-sm font-semibold tabular-nums">
                {step.n}
              </span>
              <div className="flex-1 min-w-0 pt-0.5">
                {step.title && (
                  <p className="font-medium text-foreground mb-1">{step.title}</p>
                )}
                <p className="text-[15px] text-muted-foreground leading-relaxed">{step.instructions}</p>
              </div>
            </li>
          ))}
        </ol>
      </MealSection>

      {recipe.plating && recipe.plating.assembly_instructions && (
        <MealSection title="Tonight's spread" data-testid="section-plating">
          {recipe.plating.serve_style && (
            <p className={app.caption} data-testid="badge-serve-style">
              {recipe.plating.serve_style}
            </p>
          )}
          <p className={app.subtitle} data-testid="text-plating-instructions">
            {recipe.plating.assembly_instructions}
          </p>
        </MealSection>
      )}

      {recipe.pro_tips && recipe.pro_tips.length > 0 && (
        <MealSection title="Hall tips" data-testid="section-pro-tips">
          <button
            type="button"
            onClick={toggleProTips}
            className="flex items-center gap-2 text-sm text-muted-foreground -mt-2 mb-1"
            data-testid="button-toggle-pro-tips"
          >
            <ChevronDown
              className={cn("w-4 h-4 transition-transform", !proTipsOpen && "-rotate-90")}
            />
            {proTipsOpen ? "Hide tips" : "Show tips"}
          </button>
          {proTipsOpen && (
            <ul className="space-y-3" data-testid="list-pro-tips">
              {recipe.pro_tips.map((tip, i) => (
                <li key={i} className={app.subtitle} data-testid={`pro-tip-${i}`}>
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </MealSection>
      )}

      {recipe.cleanup_tip?.trim() && (
        <MealSection title="Kitchen shutdown">
          <p className={app.subtitle} data-testid="text-cleanup-tip">
            {recipe.cleanup_tip}
          </p>
        </MealSection>
      )}

      {recipe.budget_tips && recipe.budget_tips.length > 0 && (
        <MealSection title="Budget tips" data-testid="section-budget-tips">
          <ul className="space-y-2">
            {recipe.budget_tips.map((tip, i) => (
              <li key={i} className={app.subtitle} data-testid={`budget-tip-${i}`}>
                {tip}
              </li>
            ))}
          </ul>
        </MealSection>
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
