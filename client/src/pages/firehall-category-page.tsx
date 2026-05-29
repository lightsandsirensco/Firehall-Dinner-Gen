import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { fetchGoldenCatalogIndex } from "@/lib/golden-recipe-api";
import { getSavedCount } from "@/lib/saved-meals";
import { usePageSeo } from "@/lib/seo/use-page-seo";
import { buildFirehallCategorySeo } from "@shared/seo/metadata";
import { FIREHALL_CATEGORY_IDS, FIREHALL_CATEGORY_LABEL, type FirehallCategoryId } from "@shared/firehall-categories";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

function isFirehallCategoryId(id: string): id is FirehallCategoryId {
  return (FIREHALL_CATEGORY_IDS as readonly string[]).includes(id);
}

function entryMatchesCategory(entry: { category: string; mealFormat: string; title: string; tags: string[] }, cat: FirehallCategoryId): boolean {
  const c = (entry.category || "").toLowerCase();
  const t = `${entry.title} ${entry.mealFormat} ${entry.tags.join(" ")}`.toLowerCase();

  switch (cat) {
    case "crew_favorites":
      return c === "firehall_classics";
    case "quick_meals":
      return c === "quick_shift_meals" || /\bquick\b|\bfast\b|\b30\b/.test(t);
    case "comfort_food":
      return c === "comfort_food";
    case "high_protein":
      return /high_protein/.test(t) || c === "healthy_performance";
    case "bbq_smoker":
      return c === "bbq_grill_nights" || /bbq|smok|brisket|ribs|grill/.test(t);
    case "healthy_options":
      return c === "healthy_performance";
    case "easy_cleanup":
      return c === "meal_prep_leftovers" || c === "rookie_friendly" || /one_pot|sheet_pan|skillet/.test(t);
    case "feed_a_crowd":
      return c === "big_crew_feeders";
    case "game_day":
      return c === "game_day_watch_party" || /wings|nacho|dip|slider/.test(t);
    default:
      return false;
  }
}

export default function FirehallCategoryPage() {
  const [, params] = useRoute("/categories/:categoryId");
  const categoryId = (params?.categoryId ?? "").trim();
  const favCount = useMemo(() => getSavedCount(), []);

  const cat = isFirehallCategoryId(categoryId) ? categoryId : null;

  const { data: catalog } = useQuery({
    queryKey: ["golden-catalog-index"],
    queryFn: fetchGoldenCatalogIndex,
    staleTime: 5 * 60 * 1000,
  });

  const recipes = useMemo(() => {
    const all = catalog?.recipes ?? [];
    if (!cat) return [];
    return all.filter((r) => entryMatchesCategory(r, cat)).slice(0, 60);
  }, [catalog?.recipes, cat]);

  const seo = useMemo(() => (cat ? buildFirehallCategorySeo(cat, recipes.length) : null), [cat, recipes.length]);
  usePageSeo(seo);

  if (!cat) {
    return (
      <div className={cn(app.page, "pb-safe-nav")}>
        <SiteHeader activePage="explore" favCount={favCount} />
        <main className={cn(app.mainDetail, "py-10")}>
          <h1 className={cn(app.titlePage)}>Category not found</h1>
          <p className={cn(app.lead, "mt-3 max-w-prose")}>
            Try Explore or browse all recipes.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            <Link href="/explore" className="text-primary hover:underline">
              ← Explore meals
            </Link>
            {" · "}
            <Link href="/recipes" className="text-primary hover:underline">
              All recipes
            </Link>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className={cn(app.page, "pb-safe-nav")}>
      <SiteHeader activePage="explore" favCount={favCount} />
      <main className={cn(app.mainDetail, "py-8 sm:py-10")} id="main-content">
        <p className={cn(app.eyebrowMuted)}>Category</p>
        <h1 className={cn(app.titlePage, "mt-2")}>{FIREHALL_CATEGORY_LABEL[cat]}</h1>
        <p className={cn(app.lead, "mt-3 max-w-prose")}>
          Hall-tested meals organized by a practical station night — not cuisines.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recipes.map((r) => (
            <Link
              key={r.slug}
              href={`/recipes/${r.slug}`}
              className="rounded-xl border border-border/25 bg-muted/10 p-4 hover:border-primary/25 transition-colors"
            >
              <p className="font-semibold text-foreground">{r.title}</p>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.subtitle}</p>
              <p className="mt-2 text-xs text-muted-foreground">{r.cookTime} min</p>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          <Link href="/explore" className="text-primary hover:underline">
            ← Explore
          </Link>
          {" · "}
          <Link href="/recipes" className="text-primary hover:underline">
            All recipes
          </Link>
        </p>
      </main>
    </div>
  );
}

