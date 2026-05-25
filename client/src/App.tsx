import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";
import Home from "@/pages/home";

const PizzaNight = lazy(() => import("@/pages/pizza-night"));
const ExplorePage = lazy(() => import("@/pages/explore"));
const AdminPage = lazy(() => import("@/pages/admin"));
const AdminIngestionPage = lazy(() => import("@/pages/admin-ingestion"));
const VotePage = lazy(() => import("@/pages/vote"));
const FavoritesPage = lazy(() => import("@/pages/favorites"));
const ClassicsWheelPage = lazy(() => import("@/pages/classics-wheel"));
const CuratedPackagePage = lazy(() => import("@/pages/curated-package"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/pizza" component={PizzaNight} />
        <Route path="/explore/recipe/:id" component={ExplorePage} />
        <Route path="/explore" component={ExplorePage} />
        <Route path="/wheel" component={ClassicsWheelPage} />
        <Route path="/package/:slug" component={CuratedPackagePage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/admin/ingestion" component={AdminIngestionPage} />
        <Route path="/vote/:voteId" component={VotePage} />
        <Route path="/favorites" component={FavoritesPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
