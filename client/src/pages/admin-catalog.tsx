import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, ImageIcon, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminFetch } from "@/lib/admin-api";

type AdminCatalogSource =
  | "golden_100"
  | "performance_meal"
  | "hall_expansion"
  | "breakfast_catalog"
  | "bbq_catalog"
  | "smoothie"
  | "pizza_night"
  | "firehall_catalog";

interface AdminCatalogEntry {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  protein: string;
  cuisine: string;
  mealFormat: string;
  cookTime: number;
  heroImage: string;
  thumbImage: string;
  catalogSource: AdminCatalogSource;
  isGolden100: boolean;
  catalogBadge: string | null;
  previewPath: string;
}

interface AdminCatalogManifestResponse {
  generatedAt: string;
  recipeCount: number;
  summary: { bySource: Record<AdminCatalogSource, number> };
  recipes: AdminCatalogEntry[];
}

const SOURCE_LABELS: Record<AdminCatalogSource, string> = {
  golden_100: "Golden 100",
  performance_meal: "Performance Meals",
  hall_expansion: "Hall Expansion",
  breakfast_catalog: "Breakfast",
  bbq_catalog: "BBQ & Grill",
  smoothie: "Smoothies",
  pizza_night: "Pizza Night",
  firehall_catalog: "General Catalog",
};

function RecipeThumb({ entry }: { entry: AdminCatalogEntry }) {
  const [failed, setFailed] = useState(false);
  const src = entry.thumbImage || entry.heroImage;

  if (failed || !src) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-muted text-muted-foreground gap-1" aria-hidden>
        <ImageIcon className="w-8 h-8 opacity-40" />
        <span className="text-[10px] font-medium">No image yet</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={entry.title}
      className="w-full h-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export default function AdminCatalogPage() {
  const [source, setSource] = useState<AdminCatalogSource | "all">("all");

  const { data: manifest, isLoading, isFetching, error, refetch } = useQuery<AdminCatalogManifestResponse>({
    queryKey: ["/api/admin/catalog/manifest"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/catalog/manifest");
      if (!res.ok) {
        throw new Error(`Manifest ${res.status}: ${await res.text()}`);
      }
      return res.json();
    },
    staleTime: 60_000,
  });

  const recipes = manifest?.recipes ?? [];

  const sources = useMemo(() => {
    const present = new Set(recipes.map((r) => r.catalogSource));
    return (Object.keys(SOURCE_LABELS) as AdminCatalogSource[]).filter((s) => present.has(s));
  }, [recipes]);

  const filtered = useMemo(() => {
    if (source === "all") return recipes;
    return recipes.filter((r) => r.catalogSource === source);
  }, [recipes, source]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <h1 className="font-heading text-xl tracking-wide">All Recipes</h1>
              <p className="text-xs text-muted-foreground">
                {manifest?.recipeCount ?? "—"} recipes across every active catalog
                {import.meta.env.DEV ? " · dev auth bypass" : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Admin
              </Button>
            </Link>
            <Link href="/admin/golden-100">
              <Button variant="outline" size="sm">
                Golden 100 only
              </Button>
            </Link>
            <Button size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant={source === "all" ? "default" : "outline"} onClick={() => setSource("all")}>
            All{manifest ? ` (${manifest.recipeCount})` : ""}
          </Button>
          {sources.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={source === s ? "default" : "outline"}
              onClick={() => setSource(s)}
            >
              {SOURCE_LABELS[s]} ({manifest?.summary.bySource[s] ?? 0})
            </Button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {error && (
          <Card className="mb-4 border-destructive">
            <CardContent className="pt-4 text-destructive text-sm">
              {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <CardContent className="p-2 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
            <p className="text-sm font-medium">No recipes in this catalog</p>
            <p className="text-xs mt-1">Try another filter or refresh the manifest.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setSource("all")}>
              Show all
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((r) => (
              <Link
                key={r.slug}
                href={r.previewPath}
                className="group block text-left rounded-lg border bg-card shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <RecipeThumb entry={r} />
                  <Badge className="absolute top-1.5 left-1.5 text-[9px] capitalize shadow-sm" variant="secondary">
                    {SOURCE_LABELS[r.catalogSource]}
                  </Badge>
                  {r.isGolden100 && (
                    <Badge className="absolute top-1.5 right-1.5 text-[9px]" variant="default">
                      Golden 100
                    </Badge>
                  )}
                </div>
                <div className="p-2.5 space-y-1.5">
                  <p className="text-xs font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {r.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize truncate">
                    {r.categoryLabel}
                  </p>
                  <div className="flex flex-wrap gap-1 items-center">
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 capitalize">
                      {r.protein}
                    </Badge>
                    {r.catalogBadge && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {r.catalogBadge}
                      </Badge>
                    )}
                    <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
