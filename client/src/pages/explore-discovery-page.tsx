import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Flame, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  ExploreDiscoverySection,
  ExploreDiscoverySectionSkeleton,
} from "@/components/explore-discovery-section";
import { fetchExploreSections } from "@/lib/explore-sections-api";
import {
  type ExploreRecipeCard,
  ExploreRecipeCardRegistry,
} from "@/lib/explore-recipe";
import { normalizeExploreRecipeId } from "@/lib/explore-api";
import { getSavedCount } from "@/lib/saved-meals";
import { getWheelClassicBySlug, buildPackageUrl } from "@/lib/firehall-classics-wheel";
import { resolveExploreCardNavigation } from "@/lib/explore-navigation";
import { preloadExploreImages } from "@/lib/explore-image-preload";

const DEFAULT_CREW_SIZE = 6;
const EXPLORE_QUERY_KEY = ["/api/explore/sections", "publisher-v1"] as const;

export interface ExploreDiscoveryPageProps {
  registryRef: RefObject<ExploreRecipeCardRegistry>;
}

export function ExploreDiscoveryPage({ registryRef }: ExploreDiscoveryPageProps) {
  const [, navigate] = useLocation();
  const favCount = getSavedCount();
  const preloadedRef = useRef(false);

  const {
    data: editorialData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...EXPLORE_QUERY_KEY],
    queryFn: () => fetchExploreSections(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const sections = useMemo(
    () => editorialData?.sections ?? [],
    [editorialData?.sections],
  );

  const recipeCount = useMemo(
    () => editorialData?._meta?.totalRecipes ?? sections.reduce((n, s) => n + s.recipes.length, 0),
    [editorialData?._meta?.totalRecipes, sections],
  );

  const curatedPublished = editorialData?._meta?.curatedPublished;

  useEffect(() => {
    if (!editorialData?.sections?.length || preloadedRef.current) return;
    const allRecipes = editorialData.sections.flatMap((s) => s.recipes);
    if (allRecipes.length === 0) return;

    registryRef.current?.register(allRecipes);
    const preloadUrls = editorialData.sections
      .slice(0, 4)
      .flatMap((s) => s.recipes.slice(0, 2).map((r) => r.image));
    preloadExploreImages(preloadUrls, 10);
    preloadedRef.current = true;
  }, [editorialData, registryRef]);

  const wheelClassicTriggered = useRef(false);
  useEffect(() => {
    if (wheelClassicTriggered.current) return;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("classic");
    if (!slug) return;
    const classic = getWheelClassicBySlug(slug);
    if (!classic) return;
    wheelClassicTriggered.current = true;
    window.history.replaceState({}, "", "/explore");
    navigate(buildPackageUrl(classic));
  }, [navigate]);

  const openCard = useCallback(
    (card: ExploreRecipeCard) => {
      const id = normalizeExploreRecipeId(card.id);
      if (import.meta.env.DEV) {
        console.debug("[explore] card click", {
          id,
          title: card.title,
          curatedRecipeId: card.curatedRecipeId,
          curatedSlug: card._curatedSlug,
          fromCuratedDb: card.fromCuratedDb,
          publisherMedia: card.publisherMedia,
        });
      }

      registryRef.current?.register([card]);

      const target = resolveExploreCardNavigation(card);
      if (!target) {
        console.warn("[explore] Could not resolve navigation for card", card.id, card.title);
        return;
      }

      if (import.meta.env.DEV) {
        console.debug("[explore] navigate", target);
      }
      navigate(target.path);
    },
    [navigate, registryRef],
  );

  return (
    <div className="min-h-screen bg-background pb-safe">
      <SiteHeader activePage="explore" favCount={favCount} />

      <header className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-background" aria-hidden />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(234,88,12,0.22),transparent)]"
          aria-hidden
        />
        <div className="relative max-w-[1320px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-7 sm:pb-9">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
              <Flame className="w-3 h-3" />
              Curated for the hall
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <ShieldCheck className="w-3 h-3 text-emerald-500/80" />
              Real recipes · crew-tested
            </span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-[2.75rem] tracking-wide text-foreground max-w-2xl leading-[1.08]">
            Tonight&apos;s crew dinner inspiration
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-3 max-w-lg leading-relaxed">
            Scroll like a feed, cook like a hall. Curated meals with real photos — no random AI plates.
          </p>
        </div>
      </header>

      <main className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isLoading && (
          <div data-testid="explore-discovery-loading" className="space-y-11">
            {Array.from({ length: 6 }).map((_, i) => (
              <ExploreDiscoverySectionSkeleton key={i} layout="rail" />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-20" data-testid="explore-sections-error">
            <p className="text-destructive font-medium">{(error as Error).message}</p>
            <Button variant="outline" className="mt-4 min-h-11" onClick={() => refetch()} data-testid="button-retry-sections">
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !error && sections.length > 0 && (
          <div data-testid="explore-discovery-feed">
            {sections.map((section, sectionIndex) => (
              <ExploreDiscoverySection
                key={section.id}
                section={section}
                crewSize={DEFAULT_CREW_SIZE}
                priorityImageCount={
                  sectionIndex === 0 ? 3 : sectionIndex === 1 ? 2 : 0
                }
                onRecipeClick={openCard}
              />
            ))}

            <footer className="text-center pt-8 pb-4 space-y-1">
              <p className="text-xs text-muted-foreground/70">
                {recipeCount} curated picks
                {curatedPublished != null ? ` · ${curatedPublished} in catalog` : ""}
                {editorialData?._meta?.curatedOnly ? " · curated feed" : ""}
              </p>
              <p className="text-[10px] text-muted-foreground/45 uppercase tracking-widest">
                Firehall Meals
              </p>
            </footer>
          </div>
        )}

        {!isLoading && !error && sections.length === 0 && (
          <div className="text-center py-20" data-testid="explore-sections-empty">
            <p className="font-heading tracking-wide text-foreground text-xl">Kitchen&apos;s warming up</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Run ingestion to fill the curated catalog, or refresh to pull from backup rails.
            </p>
            <Button variant="outline" className="mt-4 min-h-11" onClick={() => refetch()} data-testid="button-refresh-sections-empty">
              Refresh feed
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
