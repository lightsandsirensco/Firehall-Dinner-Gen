import { Suspense, useEffect, useRef } from "react";
import { lazyWithRetry } from "@/lib/lazy-with-retry";
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
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { MeasurementSystemProvider } from "@/lib/measurement-preference";
import { HallFeedbackShell } from "@/components/hall-feedback/hall-feedback-shell";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { PwaOfflineBanner } from "@/components/pwa/pwa-offline-banner";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";
import { PageTransition } from "@/components/page-transition";
import { SkipToContent } from "@/components/skip-to-content";
import Home from "@/pages/home";
import { getRetiredGuide } from "@shared/editorial/retired-guides";
const Generator = lazyWithRetry(() => import("@/pages/generator"));
const ShiftPlannerPage = lazyWithRetry(() => import("@/pages/shift-planner"));
const AdminGolden100Page = lazyWithRetry(() => import("@/pages/admin-golden-100"));
const AdminCatalogPage = lazyWithRetry(() => import("@/pages/admin-catalog"));

const PizzaNight = lazyWithRetry(() => import("@/pages/pizza-night"));
const ExplorePage = lazyWithRetry(() => import("@/pages/explore"));
const AdminPage = lazyWithRetry(() => import("@/pages/admin"));
const AdminIngestionPage = lazyWithRetry(() => import("@/pages/admin-ingestion"));
const AdminRecipeRatingsPage = lazyWithRetry(() => import("@/pages/admin-recipe-ratings"));
const AdminAnalyticsPage = lazyWithRetry(() => import("@/pages/admin-analytics"));
const AdminErrorsPage = lazyWithRetry(() => import("@/pages/admin-errors"));
const AdminGrowthDashboardPage = lazyWithRetry(() => import("@/pages/admin-growth-dashboard"));
const VotePage = lazyWithRetry(() => import("@/pages/vote"));
const FavoritesPage = lazyWithRetry(() => import("@/pages/favorites"));
const ClassicsWheelPage = lazyWithRetry(() => import("@/pages/classics-wheel"));
const CuratedPackagePage = lazyWithRetry(() => import("@/pages/curated-package"));
const CatalogRecipePage = lazyWithRetry(() => import("@/pages/catalog-recipe-page"));
const AboutPage = lazyWithRetry(() => import("@/pages/about"));
const PrivacyPage = lazyWithRetry(() => import("@/pages/privacy-page"));
const TermsPage = lazyWithRetry(() => import("@/pages/terms-page"));
const HowWeTestRecipesPage = lazyWithRetry(() => import("@/pages/how-we-test-recipes"));
const FaqPage = lazyWithRetry(() => import("@/pages/faq"));
const RecipesIndexPage = lazyWithRetry(() => import("@/pages/explore-browse-redirect"));
const GuidesIndexPage = lazyWithRetry(() => import("@/pages/guides-index"));
const GuidesClusterPage = lazyWithRetry(() => import("@/pages/guides-cluster"));
const GuideArticlePage = lazyWithRetry(() => import("@/pages/guide-article-page"));
const FirehallCategoryRedirect = lazyWithRetry(() => import("@/pages/firehall-category-redirect"));
const FamiliesIndexPage = lazyWithRetry(() => import("@/pages/families-index"));
const SmoothiesIndexPage = lazyWithRetry(() => import("@/pages/smoothies-index"));
const SmoothieRecipePage = lazyWithRetry(() => import("@/pages/smoothie-recipe-page"));
const BreakfastIndexPage = lazyWithRetry(() => import("@/pages/breakfast-index"));
const BreakfastPerformanceIndexPage = lazyWithRetry(() => import("@/pages/breakfast-performance-index"));
const BreakfastRecipePage = lazyWithRetry(() => import("@/pages/breakfast-recipe-page"));
const PerformanceFuelRedirect = lazyWithRetry(() => import("@/pages/performance-fuel-redirect"));
const SeoLandingPage = lazyWithRetry(() => import("@/pages/seo-landing-page"));
const SeoProductPage = lazyWithRetry(() => import("@/pages/seo-product-page"));
const FirefighterRedLeadRecipePage = lazyWithRetry(() => import("@/pages/firefighter-red-lead-recipe-page"));
const TopRatedRecipesPage = lazyWithRetry(() => import("@/pages/top-rated-recipes-page"));
const HallOfFamePage = lazyWithRetry(() => import("@/pages/hall-of-fame-page"));
const HallPrivateBetaPage = lazyWithRetry(() => import("@/pages/hall-private-beta-page"));
const OnboardingHallPage = lazyWithRetry(() => import("@/pages/onboarding-hall-page"));
const AccountPage = lazyWithRetry(() => import("@/pages/account-page"));
const PlansPage = lazyWithRetry(() => import("@/pages/plans-page"));
const AdminBillingPage = lazyWithRetry(() => import("@/pages/admin-billing"));
const AdminUsersPage = lazyWithRetry(() => import("@/pages/admin-users"));
const AdminSignupsPage = lazyWithRetry(() => import("@/pages/admin-signups-page"));
const AdminUserDetailPage = lazyWithRetry(() => import("@/pages/admin-user-detail"));
const AdminLeadsPage = lazyWithRetry(() => import("@/pages/admin-leads"));
const AdminDealsPage = lazyWithRetry(() => import("@/pages/admin-deals"));
const ShopPage = lazyWithRetry(() => import("@/pages/shop"));
const ShopProductPage = lazyWithRetry(() => import("@/pages/shop-product"));
const ShopOrderSuccessPage = lazyWithRetry(() => import("@/pages/shop-order-success"));
const AdminShopPage = lazyWithRetry(() => import("@/pages/admin-shop"));
const AdminShopProductEditorPage = lazyWithRetry(() => import("@/pages/admin-shop-product-editor"));
const AdminShopOrdersPage = lazyWithRetry(() => import("@/pages/admin-shop-orders"));
const TonightDashboardPage = lazyWithRetry(() => import("@/pages/app-home-page"));
const MePage = lazyWithRetry(() => import("@/pages/me-page"));
const MeHistoryPage = lazyWithRetry(() => import("@/pages/me-history-page"));
const MeProgressPage = lazyWithRetry(() => import("@/pages/me-progress-page"));
const MeInsightsPage = lazyWithRetry(() => import("@/pages/me-insights-page"));
const MeSettingsPage = lazyWithRetry(() => import("@/pages/me-settings-page"));
const MeShoppingListPage = lazyWithRetry(() => import("@/pages/me-shopping-list-page"));
const MePantryPage = lazyWithRetry(() => import("@/pages/me-pantry-page"));
const NotFound = lazyWithRetry(() => import("@/pages/not-found"));

/** Mirrors the server's retired-guide 301/410 for in-app navigation. */
function RetiredGuideRedirectOr({ slug }: { slug: string }) {
  const retired = getRetiredGuide(slug.trim().toLowerCase());
  if (!retired) return <GuideArticlePage />;
  return retired.target ? <Redirect to={`/guides/${retired.target}`} /> : <NotFound />;
}

function AppRoutes() {
  const [location] = useLocation();

  return (
    <Switch location={location}>
      <Route path="/" component={Home} />
      <Route path="/tonight" component={TonightDashboardPage} />
      {/* Legacy — the dashboard used to live at /home; the one true Home is "/" */}
      <Route path="/home">{() => <Redirect to="/tonight" />}</Route>
      <Route path="/discover">{() => <Redirect to="/tonight" />}</Route>
      <Route path="/hall/more">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/tools">{() => <Redirect to="/hall" />}</Route>
      <Route path="/me" component={MePage} />
      <Route path="/me/profile" component={AccountPage} />
      <Route path="/me/history" component={MeHistoryPage} />
      <Route path="/me/progress" component={MeProgressPage} />
      <Route path="/me/insights" component={MeInsightsPage} />
      <Route path="/me/settings" component={MeSettingsPage} />
      <Route path="/profile">{() => <Redirect to="/me/profile" />}</Route>
      <Route path="/me/saved" component={FavoritesPage} />
      <Route path="/me/shopping-list" component={MeShoppingListPage} />
      <Route path="/me/pantry" component={MePantryPage} />
      <Route path="/me/subscription" component={PlansPage} />
      <Route path="/hall/settings">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/history">{() => <Redirect to="/hall" />}</Route>
      <Route path="/onboarding/hall" component={OnboardingHallPage} />
      <Route path="/generator" component={Generator} />
      <Route path="/shift-planner" component={ShiftPlannerPage} />
      <Route path="/faq" component={FaqPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/pizza" component={PizzaNight} />
      <Route path="/explore/recipe/:id" component={ExplorePage} />
      <Route path="/explore" component={ExplorePage} />
      <Route path="/categories/:categoryId" component={FirehallCategoryRedirect} />
      <Route path="/wheel" component={ClassicsWheelPage} />
      {/* /classics-wheel was a separate SEO explainer page for the same
          feature as /wheel — consolidated into the one real tool page (see
          server/routes.ts for the matching server-side 301). */}
      <Route path="/classics-wheel">{() => <Redirect to="/wheel" />}</Route>
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
      {/* /guides/firefighter-bbq-recipes targeted the same search intent and
          largely the same recipe set as the /firefighter-bbq-recipes landing
          page, which carries every BBQ recipe's internal "pillar" link (see
          shared/seo/recipe-authority-links.ts) — consolidated into it (see
          server/routes.ts for the matching server-side 301). */}
      <Route path="/guides/firefighter-bbq-recipes">
        {() => <Redirect to="/firefighter-bbq-recipes" />}
      </Route>
      <Route path="/guides/:slug">{(params) => <RetiredGuideRedirectOr slug={params.slug} />}</Route>
      <Route path="/blog/:slug">{(params) => <RetiredGuideRedirectOr slug={params.slug} />}</Route>
      <Route path="/families" component={FamiliesIndexPage} />
      {/* Firehall Meals Shop — literal routes before the /:slug catch-all */}
      <Route path="/shop/order-success" component={ShopOrderSuccessPage} />
      <Route path="/shop/:slug" component={ShopProductPage} />
      <Route path="/shop" component={ShopPage} />
      {/* Admin: longest paths first — never let /admin swallow sub-routes */}
      <Route path="/admin/shop/orders" component={AdminShopOrdersPage} />
      <Route path="/admin/shop/products/new" component={AdminShopProductEditorPage} />
      <Route path="/admin/shop/products/:id/edit" component={AdminShopProductEditorPage} />
      <Route path="/admin/shop" component={AdminShopPage} />
      <Route path="/admin/golden-100" component={AdminGolden100Page} />
      <Route path="/admin/catalog" component={AdminCatalogPage} />
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
      <Route path="/hall-history">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall-program">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/activity">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/leaderboard">{() => <Redirect to="/hall" />}</Route>
      <Route path="/halls/:hallId">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/canteen">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/dues">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/logbook">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/shopping-list">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/protein-deals/setup">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/protein-deals">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/deals/setup">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/deals">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/join">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/welcome">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/features">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall/:hallId/shift/:shiftId">{() => <Redirect to="/hall" />}</Route>
      <Route path="/hall" component={HallPrivateBetaPage} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function Router() {
  const [location] = useLocation();
  useShiftReminderAttribution();

  const initialLocation = useRef(location);
  useEffect(() => {
    // The landing route is warmed by initRoutePrefetch after first interaction.
    if (location === initialLocation.current) return;
    initialLocation.current = "";
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
                <SkipToContent />
                <Toaster />
                <PwaOfflineBanner />
                <Router />
                <PwaInstallPrompt />
                <AuthCompleteHandler />
                <SignInSheet />
                <OnboardingGate />
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
