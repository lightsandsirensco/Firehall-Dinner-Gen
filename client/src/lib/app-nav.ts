export type AppTab = "home" | "tonight" | "explore" | "hall" | "me";

export const APP_TABS: Array<{
  id: AppTab;
  label: string;
  href: string;
  testId: string;
}> = [
  { id: "home", label: "Home", href: "/home", testId: "tab-home" },
  { id: "tonight", label: "Tonight", href: "/tonight", testId: "tab-tonight" },
  { id: "explore", label: "Explore", href: "/explore", testId: "tab-explore" },
  { id: "hall", label: "Hall", href: "/hall", testId: "tab-hall" },
  { id: "me", label: "Me", href: "/me", testId: "tab-me" },
];

const HOME_PREFIXES = ["/home", "/generator", "/wheel", "/classics-wheel", "/onboarding"];

const TONIGHT_PREFIXES = ["/tonight", "/vote/"];

const EXPLORE_PREFIXES = [
  "/explore",
  "/recipes",
  "/top-rated-recipes",
  "/hall-of-fame",
  "/smoothies",
  "/breakfast",
  "/pizza",
  "/guides",
  "/families",
  "/package/",
  "/categories/",
];

const HALL_PREFIXES = ["/hall", "/halls/"];

const ME_PREFIXES = ["/me", "/account", "/favorites", "/plans"];

const SHELL_EXCLUDED_PREFIXES = [
  "/admin",
  "/about",
  "/faq",
  "/firefighter-meals",
  "/firefighter-recipes",
  "/firehouse-recipes",
  "/fire-station-meals",
  "/healthy-firefighter-meals",
  "/firefighter-breakfast-recipes",
  "/firefighter-bbq-recipes",
  "/firefighter-red-lead-recipe",
  "/performance-fuel",
  "/blog/",
];

export function shouldShowAppShell(pathname: string): boolean {
  if (pathname === "/") return false;
  if (SHELL_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  return resolveAppTab(pathname) !== null;
}

export function resolveAppTab(pathname: string): AppTab | null {
  if (ME_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "me";
  }
  if (HALL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "hall";
  }
  if (TONIGHT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return "tonight";
  }
  if (HOME_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return "home";
  }
  if (EXPLORE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return "explore";
  }
  return null;
}

export function isTabActive(tab: AppTab, pathname: string): boolean {
  return resolveAppTab(pathname) === tab;
}
