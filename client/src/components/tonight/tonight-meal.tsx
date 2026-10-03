import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChefHat, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StartCookingButton } from "@/components/cook-mode/start-cooking-button";
import { MealTrustBadges } from "@/components/trust/meal-trust-badges";
import { useHallHistory } from "@/hooks/use-hall-history";
import { fetchGoldenRecipePage } from "@/lib/golden-recipe-api";
import { golden100HeroPath } from "@/lib/golden-100-hero";
import { displayRecipeHeroSrc } from "@/lib/verified-recipe-hero";
import { clientRecipeToCookMode } from "@/lib/cook-mode/adapters";
import { useMeasurementSystem } from "@/lib/measurement-preference";
import {
  clearTonightSelection,
  markTonightCookingStarted,
  stopTonightCooking,
  type TonightSelection,
} from "@/lib/tonight-selection-store";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { approvedCatalogHeroPath, resolveApprovedCatalogKind } from "@shared/approved-catalog";
import type { GoldenRecipePage } from "@shared/golden-100/recipe-page-schema";
import type { MealTrustInput } from "@shared/meal-trust/badges";

const PRIMARY_CTA =
  "min-h-14 w-full rounded-xl font-heading text-lg tracking-wide touch-manipulation";
const SECONDARY_CTA = "min-h-12 w-full rounded-xl text-[15px] font-semibold touch-manipulation";
const TEXT_LINK =
  "inline-flex min-h-11 items-center justify-center px-2 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline touch-manipulation";

type MealDetails = {
  imageSrc?: string;
  imageAlt: string;
  description?: string;
  crewSize?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  totalSteps?: number;
  badges?: MealTrustInput;
};

function useMealDetails(selection: TonightSelection): MealDetails {
  const generated = selection.generatedRecipe;
  const slug = generated ? undefined : selection.recipeSlug;

  const { data: page } = useQuery({
    queryKey: ["golden-recipe", slug],
    queryFn: () => fetchGoldenRecipePage(slug!),
    enabled: Boolean(slug),
    staleTime: Infinity,
    retry: false,
  });

  return useMemo(() => {
    const p = page as (GoldenRecipePage & { heroVerified?: boolean }) | undefined;
    const fallbackImage = selection.recipeSlug
      ? approvedCatalogHeroPath(selection.recipeSlug, resolveApprovedCatalogKind(selection.recipeSlug))
      : undefined;
    return {
      imageSrc: p
        ? displayRecipeHeroSrc(p.slug, p.heroImage || golden100HeroPath(p.slug), p.heroVerified)
        : selection.imageUrl || fallbackImage,
      imageAlt: p?.heroImageAlt?.trim() || selection.title,
      description: p?.shortDescription || p?.subtitle || selection.description,
      crewSize: selection.crewSize ?? p?.crewSize,
      prepMinutes: selection.prepMinutes ?? p?.prepTime,
      cookMinutes: selection.cookMinutes ?? p?.cookTime,
      totalSteps: p?.steps.length ?? generated?.steps.length,
      badges: p
        ? {
            category: p.category,
            tags: p.tags,
            cookTime: p.cookTime,
            difficulty: p.difficulty,
            cleanupDifficulty: p.cleanupDifficulty,
            protein: p.protein,
            popularityWeight: p.popularityWeight,
            cuisine: p.cuisine,
          }
        : generated
          ? { tags: generated.tags, cookTime: generated.timing?.total_min }
          : undefined,
    };
  }, [page, selection, generated]);
}

function useCookedTonight(selection: TonightSelection): boolean {
  const { entries } = useHallHistory();
  return useMemo(
    () =>
      entries.some(
        (e) =>
          e.type === "meal_cooked" &&
          e.at >= selection.selectedAt &&
          (selection.recipeSlug
            ? e.recipeSlug === selection.recipeSlug
            : e.title.trim().toLowerCase() === selection.title.toLowerCase()),
      ),
    [entries, selection],
  );
}

function MealImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={cn("flex items-center justify-center bg-zinc-900 text-muted-foreground/40", className)}
        aria-hidden
      >
        <UtensilsCrossed className="h-10 w-10" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={cn("object-cover bg-zinc-900", className)}
      onError={() => setFailed(true)}
      decoding="async"
    />
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0 px-2 py-2.5 text-center">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">{label}</dt>
      <dd className="mt-0.5 font-heading text-lg leading-none tracking-wide text-foreground tabular-nums">
        {value ?? "—"}
      </dd>
    </div>
  );
}

function formatMinutes(min?: number): string | undefined {
  if (min == null || !Number.isFinite(min)) return undefined;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h} hr`;
}

/** Opens the existing Cook Mode: on the recipe page for catalog meals, inline for generator-only meals. */
function CookAction({
  selection,
  label,
  className,
}: {
  selection: TonightSelection;
  label: string;
  className?: string;
}) {
  const [, navigate] = useLocation();
  const [measurementSystem] = useMeasurementSystem();
  const generated = selection.generatedRecipe;
  const cookRecipe = useMemo(
    () =>
      generated
        ? clientRecipeToCookMode(generated, measurementSystem, selection.crewSize ?? generated.servings)
        : null,
    [generated, measurementSystem, selection.crewSize],
  );

  if (cookRecipe) {
    return (
      <StartCookingButton
        recipe={cookRecipe}
        recipeSlug={selection.recipeSlug}
        recipePath={selection.recipePath}
        recipeTags={generated?.recipe_tags}
        source="tonight"
        size="lg"
        showQuickLog={false}
        onStart={() => markTonightCookingStarted()}
        label={label}
        className={cn(PRIMARY_CTA, className)}
      />
    );
  }

  if (!selection.recipePath) return null;
  return (
    <Button
      type="button"
      size="lg"
      className={cn(PRIMARY_CTA, "gap-2", className)}
      onClick={() => {
        markTonightCookingStarted();
        navigate(`${selection.recipePath}?cook=1`);
      }}
      data-testid="tonight-start-cooking"
    >
      <ChefHat className="h-5 w-5 shrink-0" aria-hidden />
      {label}
    </Button>
  );
}

/** State 2 (selected) and State 3 (cooking / cooked). The meal name appears exactly once. */
export function TonightMeal({ selection }: { selection: TonightSelection }) {
  const details = useMealDetails(selection);
  const cooked = useCookedTonight(selection);
  const cooking = Boolean(selection.cookingStartedAt) && !cooked;
  const selected = !cooking && !cooked;

  const crewValue = details.crewSize ? `${details.crewSize}` : undefined;
  const fullRecipe = selection.recipePath ? (
    <Link href={selection.recipePath} className={TEXT_LINK} data-testid="tonight-view-recipe">
      View full recipe
    </Link>
  ) : null;

  const testId = selected ? "tonight-meal-selected" : cooking ? "tonight-meal-cooking" : "tonight-meal-cooked";
  const eyebrow = selected ? "Tonight's meal" : cooking ? "Cooking now" : "Dinner's done";

  return (
    <div className="space-y-5" data-testid={testId}>
      <p className={cn(app.eyebrowAccent, "px-0.5 pt-2")}>{eyebrow}</p>

      {selected ? (
        <article className="overflow-hidden rounded-3xl border border-border/40 bg-card/40 shadow-xl shadow-black/30">
          <MealImage src={details.imageSrc} alt={details.imageAlt} className="aspect-[4/3] w-full sm:aspect-[16/9]" />
          <div className="space-y-4 p-5">
            <div className="space-y-2">
              <h1 className="font-heading text-[2rem] uppercase leading-[0.95] tracking-tight text-foreground sm:text-4xl">
                {selection.title}
              </h1>
              {details.description ? (
                <p className="text-[15px] leading-relaxed text-muted-foreground line-clamp-3">
                  {details.description}
                </p>
              ) : null}
            </div>

            <dl className="grid grid-cols-3 divide-x divide-border/30 rounded-xl border border-border/35 bg-background/40">
              <Fact label="Crew" value={crewValue} />
              <Fact label="Prep" value={formatMinutes(details.prepMinutes)} />
              <Fact label="Cook" value={formatMinutes(details.cookMinutes)} />
            </dl>

            {details.badges ? <MealTrustBadges input={details.badges} max={3} /> : null}
          </div>
        </article>
      ) : (
        <article className="flex items-center gap-4 rounded-2xl border border-border/40 bg-card/40 p-3">
          <MealImage src={details.imageSrc} alt={details.imageAlt} className="h-20 w-20 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="font-heading text-xl uppercase leading-tight tracking-tight text-foreground line-clamp-2">
              {selection.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              {cooked ? (
                <span className="inline-flex items-center gap-1 text-emerald-300/90">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Cooked tonight
                </span>
              ) : (
                [details.totalSteps ? `${details.totalSteps} steps` : null, crewValue ? `${crewValue} crew` : null]
                  .filter(Boolean)
                  .join(" · ")
              )}
            </p>
          </div>
        </article>
      )}

      {cooking ? (
        <p className="px-0.5 text-sm leading-relaxed text-muted-foreground">
          Cook Mode walks you through each step, with the ingredient list one tap away.
        </p>
      ) : null}

      <div className="space-y-2.5">
        {/* Same tree position in every state: an inline Cook Mode must survive the switch to "cooking" and "cooked". */}
        <CookAction
          selection={selection}
          label={cooking ? "Resume Cooking" : "Start Cooking"}
          className={cooked ? "hidden" : undefined}
        />

        {selected || cooked ? (
          <Button asChild variant="outline" className={SECONDARY_CTA}>
            <Link href="/generator" data-testid="tonight-pick-another">
              Pick Another Meal
            </Link>
          </Button>
        ) : selection.recipePath ? (
          <Button asChild variant="outline" className={SECONDARY_CTA}>
            <Link href={selection.recipePath} data-testid="tonight-view-recipe">
              View full recipe
            </Link>
          </Button>
        ) : null}

        <div className="flex flex-wrap justify-center gap-x-4">
          {selected ? fullRecipe : null}
          {cooking ? (
            <>
              <button type="button" className={TEXT_LINK} onClick={() => stopTonightCooking()}>
                Stop cooking
              </button>
              <Link href="/generator" className={TEXT_LINK}>
                Pick another meal
              </Link>
            </>
          ) : null}
          {cooked ? (
            <>
              {fullRecipe}
              <button type="button" className={TEXT_LINK} onClick={() => clearTonightSelection()}>
                Clear tonight
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
