import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import Home from "@/pages/home";
import PizzaNight from "@/pages/pizza-night";
import ExplorePage from "@/pages/explore";
import AdminPage from "@/pages/admin";
import VotePage from "@/pages/vote";
import FavoritesPage from "@/pages/favorites";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pizza" component={PizzaNight} />
      <Route path="/explore" component={ExplorePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/vote/:voteId" component={VotePage} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route component={NotFound} />
    </Switch>
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
