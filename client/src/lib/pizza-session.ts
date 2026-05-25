const RECENT_KEY = "fh_pizza_recent";
const MAX_RECENT = 6;

export function getRecentPizzaStyleIds(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function recordPizzaStyleId(id: string): void {
  if (!id) return;
  const prev = getRecentPizzaStyleIds().filter((x) => x !== id);
  const next = [id, ...prev].slice(0, MAX_RECENT);
  try {
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}
