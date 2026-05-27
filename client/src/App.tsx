import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { prefetchLikelyRoutes } from "@/lib/route-prefetch";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";
import { PageTransition } from "@/components/page-transition";
import Home from "@/pages/home";
/** Eager — admin catalog must work on direct URL / refresh without lazy chunk race */
import AdminGolden100Page from "@/pages/admin-golden-100";

const PizzaNight = lazy(() => import("@/pages/pizza-night"));
const ExplorePage = lazy(() => import("@/pages/explore"));
const AdminPage = lazy(() => import("@/pages/admin"));
const AdminIngestionPage = lazy(() => import("@/pages/admin-ingestion"));
const VotePage = lazy(() => import("@/pages/vote"));
const FavoritesPage = lazy(() => import("@/pages/favorites"));
const ClassicsWheelPage = lazy(() => import("@/pages/classics-wheel"));
const CuratedPackagePage = lazy(() => import("@/pages/curated-package"));
const GoldenRecipePage = lazy(() => import("@/pages/golden-recipe-page"));
const NotFound = lazy(() => import("@/pages/not-found"));

function AppRoutes() {
  const [location] = useLocation();

  return (
    <Switch location={location}>
      <Route path="/" component={Home} />
      <Route path="/pizza" component={PizzaNight} />
      <Route path="/explore/recipe/:id" component={ExplorePage} />
      <Route path="/explore" component={ExplorePage} />
      <Route path="/wheel" component={ClassicsWheelPage} />
      <Route path="/package/:slug" component={CuratedPackagePage} />
      <Route path="/recipes/:slug" component={GoldenRecipePage} />
      {/* Admin: longest paths first — never let /admin swallow sub-routes */}
      <Route path="/admin/golden-100" component={AdminGolden100Page} />
      <Route path="/admin/ingestion" component={AdminIngestionPage} />
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
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
