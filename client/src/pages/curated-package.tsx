import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Flame, ExternalLink, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { RecipeCard } from "@/components/recipe-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSavedCount } from "@/lib/saved-meals";
import { buildShoppingListFromClientMeal } from "@/lib/shopping-list";
import { EmailModal } from "@/components/email-modal";
import { ShoppingListModal } from "@/components/shopping-list-modal";
import type { ClientRecipeResponse } from "@shared/schema";
import { MealHeroImage } from "@/components/meal-hero-image";

interface CuratedPackageResponse {
  slug: string;
  title: string;
  displayTitle: string;
  emoji: string;
  heroImage: string;
  imageAlt?: string;
  tags?: string[];
  cuisineLabel?: string;
  externalUrl?: string;
  tagline: string;
  crewLine: string;
  curated: boolean;
  recipe: ClientRecipeResponse;
}

export default function CuratedPackagePage() {
  const [, params] = useRoute("/package/:slug");
  const slug = params?.slug || "";
  const [favCount] = useState(() => getSavedCount());
  const [crewSize, setCrewSize] = useState(6);
  const [emailOpen, setEmailOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);

  const { data, isLoading, error } = useQuery<CuratedPackageResponse>({
    queryKey: [`/api/curated/${slug}`, crewSize],
    queryFn: async () => {
      const res = await fetch(`/api/curated/${slug}?crewSize=${crewSize}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Package not found");
      }
      return res.json();
    },
    enabled: !!slug,
    staleTime: Infinity,
  });

  const recipe = data?.recipe;
  const shoppingList = useMemo(
    () => (recipe ? buildShoppingListFromClientMeal(recipe) : null),
    [recipe],
  );

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <SiteHeader activePage="wheel" favCount={favCount} />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-page py-6 sm:py-10 pb-safe-nav">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link href="/wheel">
            <Button variant="ghost" className="gap-1.5 min-h-11 touch-manipulation" data-testid="button-back-wheel">
              <ChevronLeft className="w-4 h-4" />
              Back to wheel
            </Button>
          </Link>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
            Curated hall package
          </Badge>
        </div>

        {isLoading && (
          <div className="space-y-6" data-testid="curated-loading">
            <div className="w-full aspect-[5/4] max-h-[min(48vh,440px)] sm:aspect-[16/9] rounded-2xl skeleton-shimmer" />
            <div className="space-y-3 px-1">
              <div className="h-10 w-3/4 skeleton-shimmer rounded-lg" />
              <div className="h-4 w-full skeleton-shimmer rounded" />
              <div className="h-4 w-2/3 skeleton-shimmer rounded" />
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-20" data-testid="curated-error">
            <p className="text-destructive font-medium">{(error as Error).message}</p>
            <Link href="/wheel" className="text-sm text-primary mt-4 inline-block hover:underline">
              Return to Classics Wheel
            </Link>
          </div>
        )}

        {data && recipe && (
          <div className="space-y-8">
            <div className="relative rounded-2xl overflow-hidden border border-primary/30 shadow-2xl shadow-primary/15 ring-1 ring-primary/20">
              <MealHeroImage
                src={data.heroImage}
                alt={data.imageAlt || data.title}
                emoji={data.emoji}
                title={data.title}
                variant="cinematic"
                className="w-full"
              />
              <div className="relative p-5 sm:p-8 -mt-8 sm:-mt-16 bg-gradient-to-t from-card via-card/95 to-transparent">
                <span className="text-4xl sm:text-5xl block mb-3" role="img" aria-hidden>
                  {data.emoji}
                </span>
                <p className="text-xs uppercase tracking-[0.35em] text-primary font-semibold mb-2">
                  Complete dinner package
                </p>
                <h1
                  className="font-heading text-2xl sm:text-4xl tracking-wide text-foreground mb-2"
                  data-testid="text-curated-title"
                >
                  {data.displayTitle}
                </h1>
                <p className="text-sm text-muted-foreground mb-1">{data.tagline}</p>
                <p className="text-sm text-foreground/85 max-w-2xl leading-relaxed mb-4">
                  {data.crewLine}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-xs text-muted-foreground flex items-center gap-2">
                    Crew size
                    <select
                      value={crewSize}
                      onChange={(e) => setCrewSize(parseInt(e.target.value, 10))}
                      className="bg-muted border border-border/50 rounded-md px-2 py-1 text-sm text-foreground"
                      data-testid="select-crew-size"
                    >
                      {[4, 6, 8, 10, 12, 15, 20].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  {data.externalUrl && (
                    <a
                      href={data.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      data-testid="link-external-recipe"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Reference recipe online
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flame className="w-4 h-4 text-primary" />
              <span>
                Main, sides, ingredients, and steps are curated for the hall — not randomly invented.
              </span>
            </div>

            <RecipeCard recipe={recipe} crewSize={crewSize} />

            <div className="flex flex-wrap gap-3 justify-center pt-4 border-t border-border/30">
              <Button onClick={() => setShoppingOpen(true)} disabled={!shoppingList} data-testid="button-curated-shopping">
                Shopping list
              </Button>
              <Button variant="outline" onClick={() => setEmailOpen(true)} disabled={!recipe} data-testid="button-curated-email">
                Email crew
              </Button>
              <Link href="/wheel">
                <Button variant="outline">Spin again</Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {recipe && (
        <>
          <EmailModal
            open={emailOpen}
            onOpenChange={setEmailOpen}
            recipe={recipe}
            crewSize={crewSize}
            healthinessLevel="balanced"
          />
          {shoppingList && (
            <ShoppingListModal
              open={shoppingOpen}
              onOpenChange={setShoppingOpen}
              shoppingList={shoppingList}
              recipeTitle={recipe.title}
              generatorType="meal"
            />
          )}
        </>
      )}

      <footer className="text-center py-6 mt-8 border-t border-border/20">
        <p className="text-xs text-muted-foreground/50">
          Powered by{" "}
          <a href="https://www.lightsandsirensco.com" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">
            Lights &amp; Sirens Co.
          </a>
        </p>
      </footer>
    </div>
  );
}
