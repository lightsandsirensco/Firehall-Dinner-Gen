const FIRST_SHIFT_KEY = "firehall_first_shift_tip_dismissed";
const LAST_ROUTE_KEY = "firehall_last_route";

export function shouldShowFirstShiftTip(): boolean {
  try {
    return localStorage.getItem(FIRST_SHIFT_KEY) !== "1";
  } catch {
    return false;
  }
}

export function dismissFirstShiftTip(): void {
  try {
    localStorage.setItem(FIRST_SHIFT_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Remember last in-app route for return visits (optional analytics / future resume) */
export function rememberLastRoute(path: string): void {
  if (!path || path.startsWith("/admin") || path.startsWith("/vote")) return;
  try {
    localStorage.setItem(LAST_ROUTE_KEY, path);
  } catch {
    /* ignore */
  }
}

export function getLastRoute(): string | null {
  try {
    return localStorage.getItem(LAST_ROUTE_KEY);
  } catch {
    return null;
  }
}
