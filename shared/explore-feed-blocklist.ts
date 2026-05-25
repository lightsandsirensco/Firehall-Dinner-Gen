/**
 * Explore feed exclusions — weak or off-brand meals that should never surface in rails.
 */

const EXPLORE_TITLE_BLOCKLIST: RegExp[] = [
  /plantain\s*pizza/i,
  /pizza.*plantain/i,
  /mac\s*(and|&)\s*cheese\s*pizza/i,
  /plantain.*flatbread/i,
];

export function isExploreFeedBlocked(title: string): boolean {
  const t = title.trim();
  if (!t) return false;
  return EXPLORE_TITLE_BLOCKLIST.some((re) => re.test(t));
}

export function filterBlockedExploreTitles<T extends { title: string }>(items: T[]): T[] {
  return items.filter((item) => !isExploreFeedBlocked(item.title));
}
