import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, Search, Clock, Users, ChevronLeft, ExternalLink, X, Loader2, Heart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSavedCount } from "@/lib/saved-meals";

interface SearchResult {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  summary: string;
  cuisines?: string[];
  diets?: string[];
}

interface RecipeDetail {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  summary: string;
  cuisines: string[];
  diets: string[];
  dishTypes: string[];
  ingredients: { name: string; amount: number; unit: string; original: string }[];
  steps: { number: number; step: string }[];
  macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

const CUISINE_OPTIONS = [
  { value: "all", label: "All Cuisines" },
  { value: "american", label: "American" },
  { value: "italian", label: "Italian" },
  { value: "mexican", label: "Mexican" },
  { value: "asian", label: "Asian" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "indian", label: "Indian" },
  { value: "thai", label: "Thai" },
  { value: "chinese", label: "Chinese" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "cajun", label: "Cajun" },
  { value: "greek", label: "Greek" },
  { value: "french", label: "French" },
];

const DIET_OPTIONS = [
  { value: "all", label: "Any Diet" },
  { value: "gluten free", label: "Gluten Free" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "dairy free", label: "Dairy Free" },
  { value: "whole30", label: "Whole30" },
  { value: "paleo", label: "Paleo" },
  { value: "ketogenic", label: "Keto" },
];

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [cuisine, setCuisine] = useState("all");
  const [diet, setDiet] = useState("all");
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [favCount] = useState(() => getSavedCount());

  useEffect(() => {
    setSubmittedQuery("");
  }, []);

  const searchParams = new URLSearchParams();
  if (submittedQuery) searchParams.set("q", submittedQuery);
  if (cuisine !== "all") searchParams.set("cuisine", cuisine);
  if (diet !== "all") searchParams.set("diet", diet);
  searchParams.set("number", "12");

  const { data: searchData, isLoading: searchLoading, error: searchError } = useQuery<{ results: SearchResult[]; totalResults: number }>({
    queryKey: ["/api/explore/search", submittedQuery, cuisine, diet],
    queryFn: async () => {
      const res = await fetch(`/api/explore/search?${searchParams}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Search failed");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: recipeDetail, isLoading: detailLoading, error: detailError } = useQuery<RecipeDetail>({
    queryKey: ["/api/explore/recipe", selectedRecipeId],
    queryFn: async () => {
      const res = await fetch(`/api/explore/recipe/${selectedRecipeId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load recipe");
      }
      return res.json();
    },
    enabled: !!selectedRecipeId,
    staleTime: 10 * 60 * 1000,
  });

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchQuery);
    setSelectedRecipeId(null);
  }, [searchQuery]);

  if (selectedRecipeId && recipeDetail) {
    return (
      <div className="min-h-screen bg-background">
        <ExplorNav favCount={favCount} />
        <main className="max-w-[900px] mx-auto px-4 py-6">
          <Button variant="ghost" className="mb-4 gap-1" onClick={() => setSelectedRecipeId(null)} data-testid="button-back-to-results">
            <ChevronLeft className="w-4 h-4" />
            Back to results
          </Button>
          <RecipeDetailView recipe={recipeDetail} />
        </main>
        <Footer />
      </div>
    );
  }

  if (selectedRecipeId && (detailLoading || detailError)) {
    return (
      <div className="min-h-screen bg-background">
        <ExplorNav favCount={favCount} />
        <main className="max-w-[900px] mx-auto px-4 py-6">
          <Button variant="ghost" className="mb-4 gap-1" onClick={() => setSelectedRecipeId(null)} data-testid="button-back-to-results">
            <ChevronLeft className="w-4 h-4" />
            Back to results
          </Button>
          {detailLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="text-center py-12" data-testid="explore-detail-error">
              <p className="text-destructive font-medium">{(detailError as Error).message}</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Could not load recipe details.</p>
              <Button variant="outline" onClick={() => setSelectedRecipeId(null)} data-testid="button-back-after-error">
                Back to results
              </Button>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ExplorNav favCount={favCount} />

      <header className="bg-background border-b border-border/40">
        <div className="max-w-[1400px] mx-auto px-4 py-6 text-center">
          <h1 className="font-heading text-4xl sm:text-5xl leading-none tracking-wide text-foreground" data-testid="text-explore-title">
            EXPLORE RECIPES
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
            Search thousands of recipes for inspiration. Find crew meals by cuisine, diet, or ingredients.
          </p>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6" data-testid="form-explore-search">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes... (e.g. chicken tacos, pasta, stir fry)"
              className="pl-9"
              data-testid="input-explore-search"
            />
            {searchQuery && (
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => { setSearchQuery(""); setSubmittedQuery(""); }}>
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <Select value={cuisine} onValueChange={setCuisine}>
            <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-explore-cuisine">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CUISINE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={diet} onValueChange={setDiet}>
            <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-explore-diet">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIET_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" className="font-heading tracking-wider" data-testid="button-explore-search">
            <Search className="w-4 h-4 mr-1" />
            SEARCH
          </Button>
        </form>

        {searchLoading && (
          <div className="flex items-center justify-center py-20" data-testid="explore-loading">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {searchError && (
          <div className="text-center py-12" data-testid="explore-error">
            <p className="text-destructive font-medium">{(searchError as Error).message}</p>
            <p className="text-sm text-muted-foreground mt-1">Please try again or adjust your search.</p>
          </div>
        )}

        {!searchLoading && searchData && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground" data-testid="text-result-count">
                {searchData.totalResults > 0 ? `${searchData.totalResults.toLocaleString()} recipes found` : "No recipes found"}
                {submittedQuery && ` for "${submittedQuery}"`}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="explore-results-grid">
              {searchData.results.map((result) => (
                <Card
                  key={result.id}
                  className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedRecipeId(result.id)}
                  data-testid={`card-explore-result-${result.id}`}
                >
                  {result.image && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={result.image}
                        alt={result.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-heading text-sm tracking-wide text-foreground line-clamp-2 mb-2" data-testid={`text-result-title-${result.id}`}>
                      {result.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      {result.readyInMinutes > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {result.readyInMinutes} min
                        </span>
                      )}
                      {result.servings > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {result.servings} servings
                        </span>
                      )}
                    </div>
                    {result.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{result.summary}</p>
                    )}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {(result.cuisines || []).slice(0, 2).map(c => (
                        <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                      ))}
                      {(result.diets || []).slice(0, 2).map(d => (
                        <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {searchData.results.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No recipes found. Try different keywords or filters.</p>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function ExplorNav({ favCount }: { favCount: number }) {
  return (
    <div className="bg-background border-b border-border/40">
      <div className="max-w-[1400px] mx-auto px-4">
        <nav className="flex items-center justify-between py-2" data-testid="nav-links">
          <div className="flex items-center gap-2">
            <Flame className="w-7 h-7" style={{ color: "#C62828" }} />
            <span className="font-heading text-lg leading-none tracking-wide text-foreground">FIREHALL MEALS</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium px-3 py-1.5" data-testid="nav-link-meals">
              Meal Generator
            </Link>
            <span className="text-muted-foreground/30 text-xs">|</span>
            <Link href="/pizza" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium px-3 py-1.5" data-testid="nav-link-pizza">
              Pizza Night
            </Link>
            <span className="text-muted-foreground/30 text-xs">|</span>
            <span className="text-xs uppercase tracking-wider text-foreground font-medium px-3 py-1.5" data-testid="nav-link-explore-active">
              Explore
            </span>
            <span className="text-muted-foreground/30 text-xs">|</span>
            <Link href="/favorites" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-medium px-3 py-1.5 flex items-center gap-1" data-testid="nav-link-favorites">
              <Heart className="w-3 h-3" />
              Favorites
              {favCount > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 min-w-[16px] leading-none">{favCount}</Badge>
              )}
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}

function RecipeDetailView({ recipe }: { recipe: RecipeDetail }) {
  return (
    <div className="space-y-6" data-testid="explore-recipe-detail">
      {recipe.image && (
        <div className="rounded-xl overflow-hidden max-h-[400px]">
          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div>
        <h1 className="font-heading text-2xl sm:text-3xl tracking-wide text-foreground mb-2" data-testid="text-detail-title">
          {recipe.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          {recipe.readyInMinutes > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {recipe.readyInMinutes} min
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {recipe.servings} servings
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {recipe.cuisines.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
          {recipe.diets.map(d => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
          {recipe.dishTypes.slice(0, 3).map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
        </div>
        {recipe.summary && (
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-detail-summary">{recipe.summary}</p>
        )}
      </div>

      {recipe.macros.calories > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-heading text-sm tracking-wider uppercase text-foreground mb-3">Nutrition per Serving</h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-foreground" data-testid="text-detail-calories">{recipe.macros.calories}</p>
                <p className="text-xs text-muted-foreground">Calories</p>
              </div>
              <div>
                <p className="text-lg font-bold text-primary" data-testid="text-detail-protein">{recipe.macros.protein_g}g</p>
                <p className="text-xs text-muted-foreground">Protein</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground" data-testid="text-detail-carbs">{recipe.macros.carbs_g}g</p>
                <p className="text-xs text-muted-foreground">Carbs</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground" data-testid="text-detail-fat">{recipe.macros.fat_g}g</p>
                <p className="text-xs text-muted-foreground">Fat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="font-heading text-sm tracking-wider uppercase text-foreground mb-3">Ingredients</h3>
          <ul className="space-y-1.5" data-testid="section-detail-ingredients">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                {ing.original}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {recipe.steps.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-heading text-sm tracking-wider uppercase text-foreground mb-3">Instructions</h3>
            <ol className="space-y-3" data-testid="section-detail-steps">
              {recipe.steps.map((step) => (
                <li key={step.number} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                    {step.number}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{step.step}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {recipe.sourceUrl && (
        <div className="text-center">
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline" data-testid="link-source-recipe">
            <ExternalLink className="w-4 h-4" />
            View original recipe
          </a>
        </div>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="text-center py-4 mt-6">
      <p className="text-xs text-muted-foreground/60">
        Powered by{" "}
        <a href="https://www.lightsandsirensco.com" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors" data-testid="link-attribution">
          Lights &amp; Sirens Co.
        </a>
        {" "}&middot;{" "}Recipe data from{" "}
        <a href="https://spoonacular.com" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">
          Spoonacular
        </a>
      </p>
    </footer>
  );
}
