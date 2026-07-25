import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { prefetchLikelyRoutes } from "@/lib/route-prefetch";
import { trackAnalyticsPageView } from "@/lib/analytics-deferred";
import { shouldShowAppShell } from "@/lib/app-nav";
import { BottomTabBar } from "@/components/app-shell/bottom-tab-bar";
import { useShiftReminderAttribution } from "@/hooks/use-shift-reminder-attribution";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { HallFeedbackProvider } from "@/lib/hall-feedback/context";
import { AuthProvider } from "@/lib/auth/context";
import { HallMembershipProvider } from "@/lib/hall-membership/context";
import { CloudSyncProvider } from "@/lib/sync/provider";
import { SignInSheet } from "@/components/auth/sign-in-sheet";
import { AuthCompleteHandler } from "@/components/auth/auth-complete-handler";
import { HallActivationGate } from "@/components/hall-activation/hall-activation-gate";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { MeasurementSystemProvider } from "@/lib/measurement-preference";
import { HallFeedbackShell } from "@/components/hall-feedback/hall-feedback-shell";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { PwaOfflineBanner } from "@/components/pwa/pwa-offline-banner";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";
import { PageTransition } from "@/components/page-transition";
import Home from "@/pages/home";
const Generator = lazy(() => import("@/pages/generator"));
const AdminGolden100Page = lazy(() => import("@/pages/admin-golden-100"));

const PizzaNight = lazy(() => import("@/pages/pizza-night"));
const ExplorePage = lazy(() => import("@/pages/explore"));
const AdminPage = lazy(() => import("@/pages/admin"));
const AdminIngestionPage = lazy(() => import("@/pages/admin-ingestion"));
const AdminRecipeRatingsPage = lazy(() => import("@/pages/admin-recipe-ratings"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin-analytics"));
const AdminErrorsPage = lazy(() => import("@/pages/admin-errors"));
const AdminGrowthDashboardPage = lazy(() => import("@/pages/admin-growth-dashboard"));
const VotePage = lazy(() => import("@/pages/vote"));
const FavoritesPage = lazy(() => import("@/pages/favorites"));
const ClassicsWheelPage = lazy(() => import("@/pages/classics-wheel"));
const CuratedPackagePage = lazy(() => import("@/pages/curated-package"));
const CatalogRecipePage = lazy(() => import("@/pages/catalog-recipe-page"));
const AboutPage = lazy(() => import("@/pages/about"));
const HowWeTestRecipesPage = lazy(() => import("@/pages/how-we-test-recipes"));
const FaqPage = lazy(() => import("@/pages/faq"));
const RecipesIndexPage = lazy(() => import("@/pages/explore-browse-redirect"));
const GuidesIndexPage = lazy(() => import("@/pages/guides-index"));
const GuidesClusterPage = lazy(() => import("@/pages/guides-cluster"));
const GuideArticlePage = lazy(() => import("@/pages/guide-article-page"));
const FirehallCategoryRedirect = lazy(() => import("@/pages/firehall-category-redirect"));
const FamiliesIndexPage = lazy(() => import("@/pages/families-index"));
const SmoothiesIndexPage = lazy(() => import("@/pages/smoothies-index"));
const SmoothieRecipePage = lazy(() => import("@/pages/smoothie-recipe-page"));
const BreakfastIndexPage = lazy(() => import("@/pages/breakfast-index"));
const BreakfastPerformanceIndexPage = lazy(() => import("@/pages/breakfast-performance-index"));
const BreakfastRecipePage = lazy(() => import("@/pages/breakfast-recipe-page"));
const PerformanceFuelRedirect = lazy(() => import("@/pages/performance-fuel-redirect"));
const SeoLandingPage = lazy(() => import("@/pages/seo-landing-page"));
const SeoProductPage = lazy(() => import("@/pages/seo-product-page"));
const FirefighterRedLeadRecipePage = lazy(() => import("@/pages/firefighter-red-lead-recipe-page"));
const TopRatedRecipesPage = lazy(() => import("@/pages/top-rated-recipes-page"));
const HallOfFamePage = lazy(() => import("@/pages/hall-of-fame-page"));
const HallHistoryPage = lazy(() => import("@/pages/hall-history-page"));
const HallPage = lazy(() => import("@/pages/hall-page"));
const HallCanteenPage = lazy(() => import("@/pages/hall-canteen-page"));
const HallDuesPage = lazy(() => import("@/pages/hall-dues-page"));
const HallLogbookPage = lazy(() => import("@/pages/hall-logbook-page"));
const HallToolsPage = lazy(() => import("@/pages/hall-tools-page"));
const HallJoinPage = lazy(() => import("@/pages/hall-join-page"));
const HallWelcomePage = lazy(() => import("@/pages/hall-welcome-page"));
const OnboardingHallPage = lazy(() => import("@/pages/onboarding-hall-page"));
const HallShiftPage = lazy(() => import("@/pages/hall-shift-page"));
const AccountPage = lazy(() => import("@/pages/account-page"));
const PlansPage = lazy(() => import("@/pages/plans-page"));
const AdminBillingPage = lazy(() => import("@/pages/admin-billing"));
const AdminUsersPage = lazy(() => import("@/pages/admin-users"));
const AdminSignupsPage = lazy(() => import("@/pages/admin-signups-page"));
const AdminUserDetailPage = lazy(() => import("@/pages/admin-user-detail"));
const AdminLeadsPage = lazy(() => import("@/pages/admin-leads"));
const AdminDealsPage = lazy(() => import("@/pages/admin-deals"));
const HallProteinDealsPage = lazy(() => import("@/pages/hall-protein-deals-page"));
const HallProteinDealsSetupPage = lazy(() => import("@/pages/hall-deals-setup-page"));
const HallShoppingListRedirect = lazy(() => import("@/pages/hall-shopping-list-redirect"));
const TonightDashboardPage = lazy(() => import("@/pages/app-home-page"));
const MePage = lazy(() => import("@/pages/me-page"));
const MeHistoryPage = lazy(() => import("@/pages/me-history-page"));
const MeSettingsPage = lazy(() => import("@/pages/me-settings-page"));
const HallFeaturesPage = lazy(() => import("@/pages/hall-features-page"));
const HallSettingsPage = lazy(() => import("@/pages/hall-settings-page"));
const NotFound = lazy(() => import("@/pages/not-found"));

function AppRoutes() {
  const [location] = useLocation();

  return (
    <Switch location={location}>
      <Route path="/" component={Home} />
      <Route path="/tonight" component={TonightDashboardPage} />
      {/* Legacy — the dashboard used to live at /home; the one true Home is "/" */}
      <Route path="/home">{() => <Redirect to="/tonight" />}</Route>
      <Route path="/discover">{() => <Redirect to="/tonight" />}</Route>
      <Route path="/hall/more">{() => <Redirect to="/hall#hall-tools" />}</Route>
      <Route path="/hall/tools" component={HallToolsPage} />
      <Route path="/me" component={MePage} />
      <Route path="/me/profile" component={AccountPage} />
      <Route path="/me/history" component={MeHistoryPage} />
      <Route path="/me/settings" component={MeSettingsPage} />
      <Route path="/profile">{() => <Redirect to="/me/profile" />}</Route>
      <Route path="/me/saved" component={FavoritesPage} />
      <Route path="/me/subscription" component={PlansPage} />
      <Route path="/hall/settings" component={HallSettingsPage} />
      <Route path="/hall/history" component={HallHistoryPage} />
      <Route path="/onboarding/hall" component={OnboardingHallPage} />
      <Route path="/generator" component={Generator} />
      <Route path="/faq" component={FaqPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/pizza" component={PizzaNight} />
      <Route path="/explore/recipe/:id" component={ExplorePage} />
      <Route path="/explore" component={ExplorePage} />
      <Route path="/categories/:categoryId" component={FirehallCategoryRedirect} />
      <Route path="/wheel" component={ClassicsWheelPage} />
      <Route path="/classics-wheel">{() => <SeoProductPage slug="classics-wheel" />}</Route>
      <Route path="/hall-meal-planner">{() => <SeoProductPage slug="hall-meal-planner" />}</Route>
      <Route path="/firefighter-dinner-vote">{() => <SeoProductPage slug="firefighter-dinner-vote" />}</Route>
      <Route path="/fire-hall-pantry">{() => <SeoProductPage slug="fire-hall-pantry" />}</Route>
      <Route path="/canteen-manager">{() => <SeoProductPage slug="canteen-manager" />}</Route>
      <Route path="/cost-per-plate-calculator">{() => <SeoProductPage slug="cost-per-plate-calculator" />}</Route>
      <Route path="/fire-hall-grocery-list">{() => <SeoProductPage slug="fire-hall-grocery-list" />}</Route>
      <Route path="/fire-station-kitchen-inventory">{() => <SeoProductPage slug="fire-station-kitchen-inventory" />}</Route>
      <Route path="/firefighter-meal-calendar">{() => <SeoProductPage slug="firefighter-meal-calendar" />}</Route>
      <Route path="/crew-grocery-budget">{() => <SeoProductPage slug="crew-grocery-budget" />}</Route>
      <Route path="/package/:slug" component={CuratedPackagePage} />
      <Route path="/recipes" component={RecipesIndexPage} />
      <Route path="/top-rated-recipes" component={TopRatedRecipesPage} />
      <Route path="/hall-of-fame" component={HallOfFamePage} />
      <Route path="/recipes/:slug" component={CatalogRecipePage} />
      <Route path="/smoothies" component={SmoothiesIndexPage} />
      <Route path="/smoothies/:slug" component={SmoothieRecipePage} />
      <Route path="/breakfast/performance/:slug" component={BreakfastRecipePage} />
      <Route path="/breakfast/performance" component={BreakfastPerformanceIndexPage} />
      <Route path="/breakfast/:slug" component={BreakfastRecipePage} />
      <Route path="/breakfast" component={BreakfastIndexPage} />
      <Route path="/performance-fuel/:slug?" component={PerformanceFuelRedirect} />
      <Route path="/firefighter-meals">{() => <SeoLandingPage slug="firefighter-meals" />}</Route>
      <Route path="/firefighter-recipes">{() => <SeoLandingPage slug="firefighter-recipes" />}</Route>
      <Route path="/firehouse-recipes">{() => <SeoLandingPage slug="firehouse-recipes" />}</Route>
      <Route path="/firehouse-meals">{() => <SeoLandingPage slug="firehouse-meals" />}</Route>
      <Route path="/firefighter-dinner-ideas">{() => <SeoLandingPage slug="firefighter-dinner-ideas" />}</Route>
      <Route path="/crew-meals">{() => <SeoLandingPage slug="crew-meals" />}</Route>
      <Route path="/fire-station-meals">{() => <SeoLandingPage slug="fire-station-meals" />}</Route>
      <Route path="/healthy-firefighter-meals">{() => <SeoLandingPage slug="healthy-firefighter-meals" />}</Route>
      <Route path="/firefighter-breakfast-recipes">{() => <SeoLandingPage slug="firefighter-breakfast-recipes" />}</Route>
      <Route path="/firefighter-red-lead-recipe" component={FirefighterRedLeadRecipePage} />
      <Route path="/firefighter-bbq-recipes">{() => <SeoLandingPage slug="firefighter-bbq-recipes" />}</Route>
      <Route path="/how-we-test-recipes" component={HowWeTestRecipesPage} />
      <Route path="/guides" component={GuidesIndexPage} />
      <Route path="/guides/topic/:clusterId" component={GuidesClusterPage} />
      <Route path="/guides/top-firehall-classics">
        {() => <Redirect to="/guides/10-classic-firehall-meals" />}
      </Route>
      <Route path="/blog/top-firehall-classics">
        {() => <Redirect to="/guides/10-classic-firehall-meals" />}
      </Route>
      <Route path="/guides/:slug" component={GuideArticlePage} />
      <Route path="/blog/:slug" component={GuideArticlePage} />
      <Route path="/families" component={FamiliesIndexPage} />
      {/* Admin: longest paths first — never let /admin swallow sub-routes */}
      <Route path="/admin/golden-100" component={AdminGolden100Page} />
      <Route path="/admin/ingestion" component={AdminIngestionPage} />
      <Route path="/admin/recipe-ratings" component={AdminRecipeRatingsPage} />
      <Route path="/admin/analytics" component={AdminAnalyticsPage} />
      <Route path="/admin/errors" component={AdminErrorsPage} />
      <Route path="/admin/growth" component={AdminGrowthDashboardPage} />
      <Route path="/admin/billing" component={AdminBillingPage} />
      <Route path="/admin/users/:userId" component={AdminUserDetailPage} />
      <Route path="/admin/signups" component={AdminSignupsPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/leads" component={AdminLeadsPage} />
      <Route path="/admin/deals" component={AdminDealsPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/vote/:voteId" component={VotePage} />
      <Route path="/favorites">{() => <Redirect to="/me/saved" />}</Route>
      <Route path="/account">{() => <Redirect to="/me/profile" />}</Route>
      <Route path="/plans">{() => <Redirect to="/me/subscription" />}</Route>
      <Route path="/hall-history">{() => <Redirect to="/hall/history" />}</Route>
      <Route path="/hall-program">{() => <Redirect to="/hall/join" />}</Route>
      <Route path="/hall/activity">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/leaderboard">{() => <Redirect to="/hall" />}</Route>
      <Route path="/halls/:hallId" component={HallSettingsPage} />
      <Route path="/hall/canteen" component={HallCanteenPage} />
      <Route path="/hall/dues" component={HallDuesPage} />
      <Route path="/hall/logbook" component={HallLogbookPage} />
      <Route path="/hall/shopping-list" component={HallShoppingListRedirect} />
      <Route path="/hall/protein-deals/setup" component={HallProteinDealsSetupPage} />
      <Route path="/hall/protein-deals" component={HallProteinDealsPage} />
      <Route path="/hall/deals/setup">{() => <Redirect to="/hall/protein-deals/setup" />}</Route>
      <Route path="/hall/deals">{() => <Redirect to="/hall/protein-deals" />}</Route>
      <Route path="/hall/join" component={HallJoinPage} />
      <Route path="/hall/welcome" component={HallWelcomePage} />
      <Route path="/hall/features" component={HallFeaturesPage} />
      <Route path="/hall/:hallId/shift/:shiftId" component={HallShiftPage} />
      <Route path="/hall" component={HallPage} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function Router() {
  const [location] = useLocation();
  useShiftReminderAttribution();

  useEffect(() => {
    prefetchLikelyRoutes(location);
  }, [location]);

  useEffect(() => {
    trackAnalyticsPageView(location);
  }, [location]);

  return (
    <>
      <PageTransition>
        <Suspense fallback={<RouteLoadingFallback />}>
          <AppRoutes />
        </Suspense>
      </PageTransition>
      {shouldShowAppShell(location) ? <BottomTabBar /> : null}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MeasurementSystemProvider>
          <AuthProvider>
            <CloudSyncProvider>
            <HallMembershipProvider>
            <HallFeedbackProvider>
              <TooltipProvider>
                <Toaster />
                <PwaOfflineBanner />
                <Router />
                <PwaInstallPrompt />
                <AuthCompleteHandler />
                <SignInSheet />
                <OnboardingGate />
                <HallActivationGate />
                <HallFeedbackShell />
              </TooltipProvider>
            </HallFeedbackProvider>
            </HallMembershipProvider>
            </CloudSyncProvider>
          </AuthProvider>
        </MeasurementSystemProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
