import { useState } from "react";
import { Link } from "wouter";
import { ChefHat, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  addProteinDealToShoppingList,
  fetchProteinDealRecipes,
  trackProteinDealClicked,
} from "@/lib/protein-deals/api";
import { PROTEIN_DEALS } from "@/lib/brand-copy";
import type { ProteinDealMatchedRecipe, ProteinDealRow } from "@shared/protein-deals/types";
import { formatProteinPrice, proteinDealLabel } from "@shared/protein-deals/types";
import { cn } from "@/lib/utils";

interface ProteinDealRowCardProps {
  deal: ProteinDealRow;
  hallId: string;
  canAct: boolean;
  compact?: boolean;
  onRecipes?: (deal: ProteinDealRow, recipes: ProteinDealMatchedRecipe[]) => void;
  className?: string;
}

export function ProteinDealRowCard({
  deal,
  hallId,
  canAct,
  compact = false,
  onRecipes,
  className,
}: ProteinDealRowCardProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const label = proteinDealLabel(deal);

  const findMeals = async () => {
    if (!canAct) {
      toast({ title: PROTEIN_DEALS.proTeaser });
      return;
    }
    setBusy(true);
    void trackProteinDealClicked(hallId, deal.id);
    try {
      const { recipes } = await fetchProteinDealRecipes(hallId, deal.id);
      if (onRecipes) {
        onRecipes(deal, recipes);
      } else {
        window.location.assign(`/hall/protein-deals?deal=${encodeURIComponent(deal.id)}`);
      }
    } catch {
      toast({ title: "Could not load recipe matches", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const addToList = async () => {
    if (!canAct) {
      toast({ title: PROTEIN_DEALS.proTeaser });
      return;
    }
    setBusy(true);
    try {
      await addProteinDealToShoppingList(hallId, deal.id);
      toast({ title: PROTEIN_DEALS.addedToList });
    } catch (err: unknown) {
      toast({
        title: err instanceof Error ? err.message : "Could not add to list",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className={cn(
        "rounded-xl border border-border/45 bg-card/40",
        compact ? "p-3.5 space-y-3" : "p-4 space-y-3",
        className,
      )}
      data-testid={`protein-deal-row-${deal.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground leading-snug break-words">{label}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{deal.store_name}</p>
        </div>
        <p className="text-sm font-semibold text-primary shrink-0 tabular-nums">{formatProteinPrice(deal)}</p>
      </div>
      <div className={cn("flex flex-col gap-2", !compact && "sm:flex-row")}>
        <Button
          type="button"
          size="sm"
          variant="default"
          disabled={busy}
          className="min-h-11 touch-manipulation flex-1"
          onClick={() => void findMeals()}
          data-testid={`protein-deal-find-${deal.id}`}
        >
          <ChefHat className="w-4 h-4 mr-1.5 shrink-0" aria-hidden />
          {PROTEIN_DEALS.actions.findMeals}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          className="min-h-11 touch-manipulation flex-1"
          onClick={() => void addToList()}
          data-testid={`protein-deal-list-${deal.id}`}
        >
          <ShoppingCart className="w-4 h-4 mr-1.5 shrink-0" aria-hidden />
          {PROTEIN_DEALS.actions.addToList}
        </Button>
      </div>
      {!canAct ? (
        <p className="text-xs text-muted-foreground leading-relaxed">{PROTEIN_DEALS.proTeaser}</p>
      ) : null}
    </article>
  );
}

interface ProteinDealRecipeMatchesProps {
  deal: ProteinDealRow;
  recipes: ProteinDealMatchedRecipe[];
  className?: string;
}

export function ProteinDealRecipeMatches({ deal, recipes, className }: ProteinDealRecipeMatchesProps) {
  const label = proteinDealLabel(deal);

  return (
    <section
      className={cn("rounded-xl border border-border/45 bg-card/30 p-4 space-y-3", className)}
      data-testid="protein-deal-recipe-matches"
    >
      <h2 className="font-heading text-lg tracking-wide">{PROTEIN_DEALS.matchedMeals(label)}</h2>
      {recipes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{PROTEIN_DEALS.noMatches}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <li key={recipe.slug}>
              <Link
                href={`/recipes/${recipe.slug}`}
                className="flex items-center gap-3 rounded-lg border border-border/35 p-2.5 min-h-[52px] hover:bg-muted/30 touch-manipulation"
              >
                <img
                  src={recipe.heroImage}
                  alt={recipe.title}
                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug break-words">{recipe.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{recipe.match_reason}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
