/**
 * Firehall Meals — one true Home.
 *
 * Home is the marketing landing page at "/". The brand logo always returns
 * there, from every page. The in-app dashboard is "Tonight" (/tonight):
 * the shift's meal-planning command center — not a second Home.
 *
 * One product. Four in-app destinations:
 *   Tonight · Explore · Hall · Me
 */

/** The one true Home — the landing page. Every logo links here. */
export const HOME = "/" as const;

export type AppTab = "tonight" | "explore" | "hall" | "me";

/** @deprecated Dual workspaces removed — kept for soft compat */
export type AppWorkspace = "meals" | "hall";
/** @deprecated Use AppWorkspace */
export type AppExperience = AppWorkspace;
/** @deprecated Use AppTab */
export type MealsTab = "tonight" | "explore" | "pick" | "saved";
/** @deprecated Use AppTab */
export type HallTab = "hall" | "tools";
/** @deprecated Use AppTab */
export type PublicTab = MealsTab;

/** The in-app dashboard — Tonight's meal planning. Not Home. */
export const TONIGHT = "/tonight" as const;

export const PRIMARY_TABS: Array<{
  id: AppTab;
  label: string;
  href: string;
  testId: string;
}> = [
  { id: "tonight", label: "Tonight", href: "/tonight", testId: "tab-tonight" },
  { id: "explore", label: "Explore", href: "/explore", testId: "tab-explore" },
  { id: "hall", label: "Hall", href: "/hall", testId: "tab-hall" },
  { id: "me", label: "Me", href: "/me", testId: "tab-me" },
];

/** @deprecated Use PRIMARY_TABS — Pick/Saved are actions, not peer tabs */
export const MEALS_TABS = PRIMARY_TABS;

/** @deprecated Tools folded into Hall manage */
export const HALL_TABS = [
  { id: "hall" as const, label: "Hall", href: "/hall", testId: "tab-hall" },
  { id: "tools" as const, label: "Tools", href: "/hall/tools", testId: "tab-hall-tools" },
];

/** @deprecated Use PRIMARY_TABS */
export const PUBLIC_TABS = PRIMARY_TABS;
/** @deprecated Use PRIMARY_TABS */
export const APP_TABS = PRIMARY_TABS;

export const WORKSPACE_LABEL = {
  meals: "Tonight",
  hall: "Hall",
} as const;

export const WORKSPACE_HOME = {
  meals: TONIGHT,
  hall: TONIGHT,
} as const;

const HALL_ROUTE_PREFIXES = ["/hall", "/halls/", "/vote/"];

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
  "/wheel",
  "/classics-wheel",
  "/generator",
];

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

const APP_SHELL_PREFIXES = [
  "/tonight",
  "/home", // legacy — redirects to /tonight
  "/onboarding",
  ...EXPLORE_PREFIXES,
  ...HALL_ROUTE_PREFIXES,
  ...ME_PREFIXES,
];

export function shouldShowAppShell(pathname: string): boolean {
  if (pathname === "/") return false;
  if (SHELL_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  if (pathname.startsWith("/hall-meal") || pathname.startsWith("/hall-program")) return false;
  if (pathname.startsWith("/hall-of-fame")) return true;
  return APP_SHELL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

/** @deprecated Shell is unified; retained for callers that still branch */
export function resolveWorkspace(pathname: string): AppWorkspace | null {
  if (!shouldShowAppShell(pathname)) return null;
  if (pathname.startsWith("/hall-of-fame")) return "meals";
  if (HALL_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return "hall";
  }
  return "meals";
}

/** @deprecated Use resolveWorkspace */
export const resolveExperience = resolveWorkspace;

export function resolveAppTab(pathname: string): AppTab | null {
  if (!shouldShowAppShell(pathname)) return null;

  if (
    pathname === "/me" ||
    pathname.startsWith("/me/") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/favorites") ||
    pathname.startsWith("/plans")
  ) {
    return "me";
  }

  if (pathname.startsWith("/hall-of-fame")) return "explore";

  if (
    HALL_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p)) &&
    !pathname.startsWith("/hall-of-fame")
  ) {
    return "hall";
  }

  if (EXPLORE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return "explore";
  }

  if (
    pathname.startsWith("/tonight") ||
    pathname.startsWith("/home") ||
    pathname.startsWith("/onboarding")
  ) {
    return "tonight";
  }

  return "tonight";
}

export function isTabActive(tabId: string, pathname: string): boolean {
  return resolveAppTab(pathname) === tabId;
}

/** In-app dashboard entry — Tonight. (The brand logo goes to HOME, not here.) */
export function workspaceHomeHref(_workspace?: AppWorkspace): string {
  return TONIGHT;
}

/** @deprecated Use workspaceHomeHref */
export const experienceHomeHref = workspaceHomeHref;

/** Hall tab entry — features for guests, manage for members. */
export function hallWorkspaceEntryHref(hasHallLink: boolean): string {
  return hasHallLink ? "/hall" : "/hall/features";
}

/** @deprecated Pick is an action from Home, not a tab */
export function resolveMealsTab(pathname: string): MealsTab | "me" | null {
  const tab = resolveAppTab(pathname);
  if (tab === "me") return "me";
  if (tab === "explore") {
    if (
      pathname.startsWith("/generator") ||
      pathname.startsWith("/wheel") ||
      pathname.startsWith("/classics-wheel")
    ) {
      return "pick";
    }
    return "explore";
  }
  if (tab === "tonight") return "tonight";
  if (pathname.startsWith("/me/saved") || pathname.startsWith("/favorites")) return "saved";
  return null;
}

/** @deprecated Use resolveMealsTab */
export const resolvePublicTab = resolveMealsTab;

/** @deprecated Hall deep pages are still Hall tab */
export function resolveHallTab(pathname: string): HallTab | null {
  if (resolveAppTab(pathname) !== "hall") return null;
  if (
    pathname === "/hall" ||
    pathname.startsWith("/hall?") ||
    pathname.startsWith("/hall/join") ||
    pathname.startsWith("/hall/welcome") ||
    pathname.startsWith("/hall/features") ||
    pathname.startsWith("/vote/")
  ) {
    return "hall";
  }
  return "tools";
}
