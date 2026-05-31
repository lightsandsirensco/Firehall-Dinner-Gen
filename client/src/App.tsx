import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { prefetchLikelyRoutes } from "@/lib/route-prefetch";
import { trackAnalyticsPageView } from "@/lib/analytics-deferred";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { HallFeedbackProvider } from "@/lib/hall-feedback/context";
import { HallFeedbackShell } from "@/components/hall-feedback/hall-feedback-shell";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";
import { PageTransition } from "@/components/page-transition";
import Home from "@/pages/home";
import Generator from "@/pages/generator";
/** Eager — admin catalog must work on direct URL / refresh without lazy chunk race */
import AdminGolden100Page from "@/pages/admin-golden-100";

const PizzaNight = lazy(() => import("@/pages/pizza-night"));
const ExplorePage = lazy(() => import("@/pages/explore"));
const AdminPage = lazy(() => import("@/pages/admin"));
const AdminIngestionPage = lazy(() => import("@/pages/admin-ingestion"));
const AdminRecipeRatingsPage = lazy(() => import("@/pages/admin-recipe-ratings"));
const VotePage = lazy(() => import("@/pages/vote"));
const FavoritesPage = lazy(() => import("@/pages/favorites"));
const ClassicsWheelPage = lazy(() => import("@/pages/classics-wheel"));
const CuratedPackagePage = lazy(() => import("@/pages/curated-package"));
const CatalogRecipePage = lazy(() => import("@/pages/catalog-recipe-page"));
const AboutPage = lazy(() => import("@/pages/about"));
const FaqPage = lazy(() => import("@/pages/faq"));
const RecipesIndexPage = lazy(() => import("@/pages/recipes-index"));
const GuidesIndexPage = lazy(() => import("@/pages/guides-index"));
const GuidesClusterPage = lazy(() => import("@/pages/guides-cluster"));
const GuideArticlePage = lazy(() => import("@/pages/guide-article-page"));
const FirehallCategoryPage = lazy(() => import("@/pages/firehall-category-page"));
const FamiliesIndexPage = lazy(() => import("@/pages/families-index"));
const SmoothiesIndexPage = lazy(() => import("@/pages/smoothies-index"));
const SmoothieRecipePage = lazy(() => import("@/pages/smoothie-recipe-page"));
const BreakfastIndexPage = lazy(() => import("@/pages/breakfast-index"));
const BreakfastRecipePage = lazy(() => import("@/pages/breakfast-recipe-page"));
const PerformanceFuelRedirect = lazy(() => import("@/pages/performance-fuel-redirect"));
const SeoLandingPage = lazy(() => import("@/pages/seo-landing-page"));
const FirefighterRedLeadRecipePage = lazy(() => import("@/pages/firefighter-red-lead-recipe-page"));
const TopRatedRecipesPage = lazy(() => import("@/pages/top-rated-recipes-page"));
const NotFound = lazy(() => import("@/pages/not-found"));

function AppRoutes() {
  const [location] = useLocation();

  return (
    <Switch location={location}>
      <Route path="/" component={Home} />
      <Route path="/generator" component={Generator} />
      <Route path="/faq" component={FaqPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/pizza" component={PizzaNight} />
      <Route path="/explore/recipe/:id" component={ExplorePage} />
      <Route path="/explore" component={ExplorePage} />
      <Route path="/categories/:categoryId" component={FirehallCategoryPage} />
      <Route path="/wheel" component={ClassicsWheelPage} />
      <Route path="/classics-wheel" component={ClassicsWheelPage} />
      <Route path="/package/:slug" component={CuratedPackagePage} />
      <Route path="/recipes" component={RecipesIndexPage} />
      <Route path="/top-rated-recipes" component={TopRatedRecipesPage} />
      <Route path="/recipes/:slug" component={CatalogRecipePage} />
      <Route path="/smoothies" component={SmoothiesIndexPage} />
      <Route path="/smoothies/:slug" component={SmoothieRecipePage} />
      <Route path="/breakfast" component={BreakfastIndexPage} />
      <Route path="/breakfast/:slug" component={BreakfastRecipePage} />
      <Route path="/performance-fuel/:slug?" component={PerformanceFuelRedirect} />
      <Route path="/firefighter-meals">{() => <SeoLandingPage slug="firefighter-meals" />}</Route>
      <Route path="/firefighter-recipes">{() => <SeoLandingPage slug="firefighter-recipes" />}</Route>
      <Route path="/firehouse-recipes">{() => <SeoLandingPage slug="firehouse-recipes" />}</Route>
      <Route path="/fire-station-meals">{() => <SeoLandingPage slug="fire-station-meals" />}</Route>
      <Route path="/healthy-firefighter-meals">{() => <SeoLandingPage slug="healthy-firefighter-meals" />}</Route>
      <Route path="/firefighter-breakfast-recipes">{() => <SeoLandingPage slug="firefighter-breakfast-recipes" />}</Route>
      <Route path="/firefighter-red-lead-recipe" component={FirefighterRedLeadRecipePage} />
      <Route path="/firefighter-bbq-recipes">{() => <SeoLandingPage slug="firefighter-bbq-recipes" />}</Route>
      <Route path="/guides" component={GuidesIndexPage} />
      <Route path="/guides/topic/:clusterId" component={GuidesClusterPage} />
      <Route path="/guides/:slug" component={GuideArticlePage} />
      <Route path="/blog/:slug" component={GuideArticlePage} />
      <Route path="/families" component={FamiliesIndexPage} />
      {/* Admin: longest paths first — never let /admin swallow sub-routes */}
      <Route path="/admin/golden-100" component={AdminGolden100Page} />
      <Route path="/admin/ingestion" component={AdminIngestionPage} />
      <Route path="/admin/recipe-ratings" component={AdminRecipeRatingsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/vote/:voteId" component={VotePage} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    prefetchLikelyRoutes(location);
  }, [location]);

  useEffect(() => {
    trackAnalyticsPageView(location);
  }, [location]);

  return (
    <PageTransition>
      <Suspense fallback={<RouteLoadingFallback />}>
        <AppRoutes />
      </Suspense>
    </PageTransition>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HallFeedbackProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <HallFeedbackShell />
          </TooltipProvider>
        </HallFeedbackProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
