import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CatalogHeroImage } from "@/components/admin/catalog-hero-image";
import { adminFetch } from "@/lib/admin-api";
import type { CuratedRecipe, CuratedRecipeStatus } from "@shared/curated-recipe/types";

interface ManifestRecipe {
  slug: string;
  title: string;
  category: string;
  masterCategoryId: string;
  protein: string;
  cuisine: string;
  mealFormat: string;
  hookLine: string;
  heroImage: string;
  heroAvailable?: boolean;
  status: CuratedRecipeStatus | "unseeded";
  recipeId?: string;
  featured?: boolean;
  pageComplete?: boolean;
  realismScore?: number;
  firefighterScore?: number;
  assetsComplete?: boolean;
  missingAssets?: string[];
  imageIntegrityScore?: number;
  platingType?: string;
  depictedPlating?: string | null;
  imageIntegrityPass?: boolean;
  imageIntegrityFlags?: string[];
  imageTitleMismatch?: boolean;
}

interface ManifestResponse {
  summary: { total: number; byCategory: Record<string, number> };
  recipeCount: number;
  recipes: ManifestRecipe[];
  staticIssues: Array<{ slug: string; message: string }>;
}

interface GoldenRecipeDetailResponse extends ManifestRecipe {
  curated: CuratedRecipe | null;
}

function formatCategory(id: string): string {
  return id.replace(/_/g, " ");
}

function statusBadgeVariant(
  status: ManifestRecipe["status"],
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "published":
      return "default";
    case "draft":
    case "review":
      return "secondary";
    case "archived":
      return "outline";
    default:
      return "outline";
  }
}

function statusLabel(status: ManifestRecipe["status"]): string {
  if (status === "unseeded") return "manifest only";
  return status;
}

export default function AdminGolden100Page() {
  const [category, setCategory] = useState<string>("all");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const {
    data: manifest,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<ManifestResponse>({
    queryKey: ["/api/admin/golden-100/manifest"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/golden-100/manifest");
      if (!res.ok) {
        throw new Error(`Manifest ${res.status}: ${await res.text()}`);
      }
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: detail, isLoading: detailLoading } = useQuery<GoldenRecipeDetailResponse>({
    queryKey: ["/api/admin/golden-100/recipe", selectedSlug],
    queryFn: async () => {
      const res = await adminFetch(
        `/api/admin/golden-100/recipe/${encodeURIComponent(selectedSlug!)}`,
      );
      if (!res.ok) {
        throw new Error(`Recipe ${res.status}: ${await res.text()}`);
      }
      return res.json();
    },
    enabled: !!selectedSlug,
  });

  const recipes = manifest?.recipes ?? [];

  const categories = useMemo(() => {
    const set = new Set(recipes.map((r) => r.category || r.masterCategoryId));
    return ["all", ...[...set].sort()];
  }, [recipes]);

  const filtered = useMemo(() => {
    if (category === "all") return recipes;
    return recipes.filter(
      (r) => (r.category || r.masterCategoryId) === category,
    );
  }, [recipes, category]);

  const selectedManifest = selectedSlug
    ? recipes.find((r) => r.slug === selectedSlug)
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <h1 className="font-heading text-xl tracking-wide">Golden 100 Catalog</h1>
              <p className="text-xs text-muted-foreground">
                {manifest?.recipeCount ?? "—"} recipes
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
            <Button size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-3 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={category === cat ? "default" : "outline"}
              onClick={() => setCategory(cat)}
            >
              {cat === "all" ? "All" : formatCategory(cat)}
              {cat !== "all" && manifest?.summary.byCategory[cat]
                ? ` (${manifest.summary.byCategory[cat]})`
                : ""}
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

        {manifest?.staticIssues?.length ? (
          <p className="text-xs text-amber-600 mb-4">
            {manifest.staticIssues.length} static manifest issue(s) — check server audit.
          </p>
        ) : null}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
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
            <p className="text-sm font-medium">No recipes in this category</p>
            <p className="text-xs mt-1">Try another filter or refresh the manifest.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setCategory("all")}>
              Show all
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((r) => (
              <button
                key={r.slug}
                type="button"
                onClick={() => setSelectedSlug(r.slug)}
                className="group text-left rounded-lg border bg-card shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <CatalogHeroImage
                    slug={r.slug}
                    alt={r.title}
                    available={r.heroAvailable !== false}
                  />
                  <Badge
                    className="absolute top-1.5 left-1.5 text-[9px] capitalize shadow-sm"
                    variant={statusBadgeVariant(r.status)}
                  >
                    {statusLabel(r.status)}
                  </Badge>
                  {r.imageTitleMismatch && (
                    <Badge className="absolute bottom-1.5 left-1.5 text-[9px] bg-destructive">
                      image mismatch
                    </Badge>
                  )}
                  {r.pageComplete === false && !r.imageTitleMismatch && (
                    <Badge className="absolute bottom-1.5 left-1.5 text-[9px] bg-amber-600">
                      page
                    </Badge>
                  )}
                  {r.assetsComplete === false && r.heroAvailable && (
                    <Badge className="absolute bottom-1.5 right-1.5 text-[9px] bg-amber-700">
                      variants
                    </Badge>
                  )}
                  {r.featured && (
                    <Badge className="absolute top-1.5 right-1.5 text-[9px]" variant="secondary">
                      featured
                    </Badge>
                  )}
                </div>
                <div className="p-2.5 space-y-1.5">
                  <p className="text-xs font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {r.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize truncate">
                    {formatCategory(r.category || r.masterCategoryId)}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 capitalize">
                      {r.protein}
                    </Badge>
                    {r.platingType && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {r.platingType}
                      </Badge>
                    )}
                    {r.imageIntegrityScore != null && (
                      <Badge
                        variant={r.imageIntegrityPass ? "secondary" : "destructive"}
                        className="text-[9px] px-1 py-0 tabular-nums"
                      >
                        img {r.imageIntegrityScore}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <Sheet open={!!selectedSlug} onOpenChange={(open) => !open && setSelectedSlug(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {detailLoading && !detail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading text-left pr-8 leading-snug">
                  {detail?.title ?? selectedManifest?.title ?? "Recipe"}
                </SheetTitle>
                <SheetDescription className="text-left capitalize">
                  {formatCategory(
                    detail?.category ??
                      selectedManifest?.category ??
                      selectedManifest?.masterCategoryId ??
                      "",
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 aspect-video rounded-lg overflow-hidden border bg-muted">
                {selectedSlug && (
                  <CatalogHeroImage
                    slug={selectedSlug}
                    alt={detail?.title ?? selectedSlug}
                    available={detail?.heroAvailable !== false}
                  />
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={statusBadgeVariant(detail?.status ?? "unseeded")} className="capitalize">
                  {statusLabel(detail?.status ?? "unseeded")}
                </Badge>
                {detail?.protein && (
                  <Badge variant="secondary" className="capitalize">
                    {detail.protein}
                  </Badge>
                )}
                {detail?.cuisine && (
                  <Badge variant="outline" className="capitalize">
                    {detail.cuisine}
                  </Badge>
                )}
              </div>

              {(detail?.hookLine ?? selectedManifest?.hookLine) && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {detail?.hookLine ?? selectedManifest?.hookLine}
                </p>
              )}

              {detail?.curated?.summary && (
                <p className="mt-2 text-sm">{detail.curated.summary}</p>
              )}

              {(detail?.realismScore != null || detail?.firefighterScore != null) && (
                <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Image integrity</dt>
                    <dd className="font-medium">
                      {selectedManifest?.imageIntegrityScore ?? "—"}
                      {selectedManifest?.imageIntegrityPass === false ? " · mismatch" : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Plating lock</dt>
                    <dd className="font-medium capitalize">
                      {selectedManifest?.platingType ?? "—"}
                      {selectedManifest?.depictedPlating &&
                      selectedManifest.depictedPlating !== selectedManifest.platingType
                        ? ` → depicts ${selectedManifest.depictedPlating}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Realism</dt>
                    <dd className="font-medium">{detail?.realismScore ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Hall score</dt>
                    <dd className="font-medium">{detail?.firefighterScore ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Page</dt>
                    <dd className="font-medium">{detail?.pageComplete ? "complete" : "missing"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Assets</dt>
                    <dd className="font-medium">
                      {detail?.assetsComplete
                        ? "all variants"
                        : detail?.missingAssets?.join(", ") || "hero only"}
                    </dd>
                  </div>
                </dl>
              )}

              {detail?.curated && (
                <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Prep + cook</dt>
                    <dd className="font-medium">
                      {detail.curated.totalMinutes} min
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Ingredients</dt>
                    <dd className="font-medium">{detail.curated.ingredients.length}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Quality</dt>
                    <dd className="font-medium">{detail.curated.scores.quality}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Source</dt>
                    <dd className="font-medium truncate">{detail.curated.source.name}</dd>
                  </div>
                </dl>
              )}

              <p className="mt-4 text-[10px] font-mono text-muted-foreground break-all">
                {selectedSlug}
                {detail?.recipeId ? ` · ${detail.recipeId}` : ""}
              </p>

              <div className="mt-6 flex flex-col gap-2">
                {selectedSlug && (
                  <Link href={`/recipes/${selectedSlug}`}>
                    <Button className="w-full" variant="default">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Preview recipe page
                    </Button>
                  </Link>
                )}
                {detail?.status === "published" && selectedSlug && (
                  <Link href={`/package/${selectedSlug}`}>
                    <Button className="w-full" variant="outline">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View crew package
                    </Button>
                  </Link>
                )}
                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  Regenerate: npm run catalog:generate-pages -- --only={selectedSlug}
                  <br />
                  Images: npm run catalog:generate-images -- --only={selectedSlug}
                </p>
                {detail?.curated?.source?.url && (
                  <a
                    href={detail.curated.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full" variant="outline">
                      Source attribution
                    </Button>
                  </a>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
