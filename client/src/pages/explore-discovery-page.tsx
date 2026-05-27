import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { cn } from "@/lib/utils";

import { useQuery } from "@tanstack/react-query";

import { useLocation } from "wouter";

import { Flame, ShieldCheck, Sparkles } from "lucide-react";

import { SiteHeader } from "@/components/site-header";

import { AppPageHeader } from "@/components/mobile/app-page-header";

import { app } from "@/lib/design-tokens";

import { Button } from "@/components/ui/button";

import {

  ExploreDiscoverySection,

  ExploreDiscoverySectionSkeleton,

} from "@/components/explore-discovery-section";

import { fetchExploreSections } from "@/lib/explore-sections-api";

import { fetchExploreRecommendationContext } from "@/lib/explore-context-api";

import {

  type ExploreRecipeCard,

  ExploreRecipeCardRegistry,

} from "@/lib/explore-recipe";

import { normalizeExploreRecipeId } from "@/lib/explore-api";

import { getSavedCount } from "@/lib/saved-meals";

import { getWheelClassicBySlug, buildPackageUrl } from "@/lib/firehall-classics-wheel";

import { resolveExploreCardNavigation } from "@/lib/explore-navigation";

import { preloadExploreImages } from "@/lib/explore-image-preload";

import { ExploreCategoryNav } from "@/components/explore-category-nav";

import { ExploreRecommendationHero } from "@/components/explore-recommendation-hero";

import {

  detectExploreFeedContext,

  buildExploreHeroCopy,

  rankSectionsForShiftMode,

  getExploreSeenRecipeIds,

  recordExploreSeenRecipeId,

  performanceModeValue,

  maxReadyMinutesForMode,

  type ExploreShiftMode,

} from "@/lib/explore-recommendation-ux";

import { MASTER_CATEGORIES_BY_ID } from "@shared/categories/definitions";

import type { MasterCategoryId } from "@shared/categories/constants";



const DEFAULT_CREW_SIZE = 6;



function exploreQueryKey(mode: ExploreShiftMode) {

  return ["/api/explore/sections", "recommendation-ux-v1", mode] as const;

}



export interface ExploreDiscoveryPageProps {

  registryRef: RefObject<ExploreRecipeCardRegistry>;

}



export function ExploreDiscoveryPage({ registryRef }: ExploreDiscoveryPageProps) {

  const [, navigate] = useLocation();

  const favCount = getSavedCount();

  const preloadedRef = useRef(false);

  const [activeSectionId, setActiveSectionId] = useState<string | undefined>();

  const [shiftMode, setShiftMode] = useState<ExploreShiftMode>("default");



  const scrollToSection = useCallback((sectionId: string) => {

    setActiveSectionId(sectionId);

    const el = document.getElementById(`explore-section-${sectionId}`);

    el?.scrollIntoView({ behavior: "smooth", block: "start" });

  }, []);



  const [pullRefreshing, setPullRefreshing] = useState(false);

  const pullStartY = useRef(0);



  const { data: apiContext } = useQuery({

    queryKey: ["/api/recommendations/context", shiftMode, DEFAULT_CREW_SIZE],

    queryFn: () =>

      fetchExploreRecommendationContext({

        crewSize: DEFAULT_CREW_SIZE,

        maxReadyMinutes: maxReadyMinutesForMode(shiftMode),

        performanceMode: performanceModeValue(shiftMode),

      }),

    staleTime: 5 * 60 * 1000,

    refetchOnWindowFocus: false,

  });



  const {

    data: editorialData,

    isLoading,

    isFetching,

    error,

    refetch,

  } = useQuery({

    queryKey: exploreQueryKey(shiftMode),

    queryFn: () =>

      fetchExploreSections({

        seen: getExploreSeenRecipeIds(),

        crewSize: DEFAULT_CREW_SIZE,

        maxReadyMinutes: maxReadyMinutesForMode(shiftMode),

        performanceMode: performanceModeValue(shiftMode),

      }),

    staleTime: 10 * 60 * 1000,

    gcTime: 30 * 60 * 1000,

    refetchOnWindowFocus: false,

    refetchOnMount: false,

  });



  const feedContext = useMemo(

    () =>

      detectExploreFeedContext(

        editorialData?._meta?.contextHints ?? apiContext?.hooks ?? [],

        shiftMode,

      ),

    [editorialData?._meta?.contextHints, apiContext?.hooks, shiftMode],

  );



  const heroCopy = useMemo(() => buildExploreHeroCopy(feedContext), [feedContext]);



  const sections = useMemo(() => {

    const raw = editorialData?.sections ?? [];

    return rankSectionsForShiftMode(raw, feedContext, apiContext ?? undefined);

  }, [editorialData?.sections, feedContext, apiContext]);



  const categoryNavItems = useMemo(

    () =>

      sections.map((s) => {

        const catId = (s.masterCategoryId || s.id) as MasterCategoryId;

        const def = MASTER_CATEGORIES_BY_ID[catId];

        const label = (def?.displayName || s.title).replace(/^(Trending|Hall|Firehouse)\s*/i, "").slice(0, 16);

        return {

          id: s.id,

          label,

          emoji: def?.emoji,

        };

      }),

    [sections],

  );



  const recipeCount = useMemo(

    () => editorialData?._meta?.totalRecipes ?? sections.reduce((n, s) => n + s.recipes.length, 0),

    [editorialData?._meta?.totalRecipes, sections],

  );



  const curatedPublished = editorialData?._meta?.curatedPublished;

  const intelligenceLabel = editorialData?._recommendation

    ? `Shift-aware feed · v${editorialData._meta?.engineVersion ?? 1}`

    : undefined;



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



  useEffect(() => {

    const onTouchStart = (e: TouchEvent) => {

      if (window.scrollY <= 4) pullStartY.current = e.touches[0]?.clientY ?? 0;

    };

    const onTouchEnd = (e: TouchEvent) => {

      if (window.scrollY > 4 || isLoading || isFetching) return;

      const endY = e.changedTouches[0]?.clientY ?? 0;

      if (endY - pullStartY.current > 72) {

        setPullRefreshing(true);

        void refetch().finally(() => setPullRefreshing(false));

      }

    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });

    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {

      window.removeEventListener("touchstart", onTouchStart);

      window.removeEventListener("touchend", onTouchEnd);

    };

  }, [isLoading, isFetching, refetch]);



  const openCard = useCallback(

    (card: ExploreRecipeCard) => {

      const id = normalizeExploreRecipeId(card.id);

      if (id != null) recordExploreSeenRecipeId(id);



      if (import.meta.env.DEV) {

        console.debug("[explore] card click", {

          id,

          title: card.title,

          curatedRecipeId: card.curatedRecipeId,

        });

      }



      registryRef.current?.register([card]);



      const target = resolveExploreCardNavigation(card);

      if (!target) {

        console.warn("[explore] Could not resolve navigation for card", card.id, card.title);

        return;

      }



      navigate(target.path);

    },

    [navigate, registryRef],

  );



  return (

    <div className={cn(app.page, "pb-safe-nav")}>

      <SiteHeader activePage="explore" favCount={favCount} />



      {(pullRefreshing || (isFetching && !isLoading)) && (

        <div

          className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none explore-refresh-hint"

          style={{ top: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}

          aria-live="polite"

        >

          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary bg-primary/10 border border-primary/25 px-3 py-1.5 rounded-full backdrop-blur-sm">

            Refreshing picks for your shift

          </span>

        </div>

      )}



      <AppPageHeader

        variant="feed"

        title={heroCopy.title}

        subtitle={heroCopy.subtitle}

        eyebrow={

          <>

            <span className={app.eyebrow}>

              <Flame className="w-3 h-3" />

              {heroCopy.eyebrow}

            </span>

            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">

              <ShieldCheck className="w-3 h-3 text-emerald-500/80" />

              Curated · not random AI

            </span>

            {intelligenceLabel && (

              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 dark:text-violet-400">

                <Sparkles className="w-3 h-3" />

                {intelligenceLabel}

              </span>

            )}

          </>

        }

      >

        <ExploreRecommendationHero

          copy={heroCopy}

          activeMode={shiftMode}

          onModeChange={setShiftMode}

          className="mt-4"

        />

      </AppPageHeader>



      <main className={cn(app.mainFeed, app.sectionY)}>

        {!isLoading && !error && categoryNavItems.length > 1 && (

          <ExploreCategoryNav

            items={categoryNavItems}

            activeId={activeSectionId}

            onSelect={scrollToSection}

            className="mb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 top-14 sm:top-16"

          />

        )}



        {isLoading && (

          <div data-testid="explore-discovery-loading" className="space-y-10">

            <ExploreDiscoverySectionSkeleton layout="rail" />

            <ExploreDiscoverySectionSkeleton layout="rail" />

            <ExploreDiscoverySectionSkeleton layout="grid" />

            <ExploreDiscoverySectionSkeleton layout="rail" />

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

          <div data-testid="explore-discovery-feed" className={app.stagger}>

            {sections.map((section, sectionIndex) => (

              <ExploreDiscoverySection

                key={section.id}

                section={section}

                crewSize={DEFAULT_CREW_SIZE}

                feedContext={feedContext}

                sectionIndex={sectionIndex}

                priorityImageCount={

                  sectionIndex === 0 ? 3 : sectionIndex === 1 ? 2 : 0

                }

                onRecipeClick={openCard}

              />

            ))}



            <footer className="text-center pt-8 pb-4 space-y-1">

              <p className="text-xs text-muted-foreground/70">

                {recipeCount} picks ranked for your hall

                {curatedPublished != null ? ` · ${curatedPublished} in catalog` : ""}

                {shiftMode !== "default" ? ` · ${heroCopy.chips.find((c) => c.mode === shiftMode)?.label} mode` : ""}

              </p>

              <p className="text-[10px] text-muted-foreground/45 uppercase tracking-widest">

                Firehall Meals · recommendation feed

              </p>

            </footer>

          </div>

        )}



        {!isLoading && !error && sections.length === 0 && (

          <div className="text-center py-20" data-testid="explore-sections-empty">

            <p className="font-heading tracking-wide text-foreground text-xl">Kitchen&apos;s warming up</p>

            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">

              Run ingestion to fill the curated catalog, or refresh to pull fresh rails.

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


