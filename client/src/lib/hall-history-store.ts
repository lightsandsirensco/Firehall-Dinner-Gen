import {
  HALL_HISTORY_SCHEMA_VERSION,
  HALL_REPEAT_COOLDOWN_DAYS,
  type HallHistoryEntry,
  type HallHistoryEntryType,
  type HallHistorySnapshot,
  type HallHistoryStore,
} from "@shared/hall-profile/types";
import { daysSinceCooked, isWithinRepeatCooldown } from "@shared/hall-profile/history-format";
import { getHallProfile } from "@/lib/hall-profile-store";
import { trackMealCooked } from "@/lib/analytics";

const STORAGE_KEY = "firehall_hall_history_v1";
const MAX_ENTRIES = 80;

export const HALL_HISTORY_CHANGED_EVENT = "hall-history-changed";

function newEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `hh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function dispatchChanged(): void {
  window.dispatchEvent(new Event(HALL_HISTORY_CHANGED_EVENT));
}

function emptySnapshot(hallId: string): HallHistorySnapshot {
  return {
    schemaVersion: HALL_HISTORY_SCHEMA_VERSION,
    hallId,
    entries: [],
    updatedAt: new Date().toISOString(),
  };
}

function parseSnapshot(raw: string, hallId: string): HallHistorySnapshot {
  try {
    const parsed = JSON.parse(raw) as HallHistorySnapshot;
    if (parsed?.schemaVersion !== HALL_HISTORY_SCHEMA_VERSION) return emptySnapshot(hallId);
    if (parsed.hallId !== hallId) return emptySnapshot(hallId);
    if (!Array.isArray(parsed.entries)) return emptySnapshot(hallId);
    const entries = parsed.entries.filter(
      (e): e is HallHistoryEntry =>
        !!e &&
        typeof e.id === "string" &&
        typeof e.type === "string" &&
        typeof e.at === "string" &&
        typeof e.title === "string" &&
        typeof e.source === "string",
    );
    return { ...parsed, entries: entries.slice(0, MAX_ENTRIES) };
  } catch {
    return emptySnapshot(hallId);
  }
}

function writeSnapshot(snapshot: HallHistorySnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    dispatchChanged();
  } catch {
    /* quota / private mode */
  }
}

export function getHallHistorySnapshot(): HallHistorySnapshot {
  const hallId = getHallProfile().hallId;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySnapshot(hallId);
    return parseSnapshot(raw, hallId);
  } catch {
    return emptySnapshot(hallId);
  }
}

export function getHallHistoryEntries(): HallHistoryEntry[] {
  return getHallHistorySnapshot().entries;
}

export function replaceHallHistorySnapshot(snapshot: HallHistorySnapshot): void {
  writeSnapshot({
    ...snapshot,
    entries: snapshot.entries.slice(0, MAX_ENTRIES),
    updatedAt: new Date().toISOString(),
  });
}

export function appendHallHistoryEntry(
  input: Omit<HallHistoryEntry, "id" | "at"> & { at?: string },
): HallHistoryEntry {
  const profile = getHallProfile();
  const entry: HallHistoryEntry = {
    id: newEntryId(),
    at: input.at ?? new Date().toISOString(),
    type: input.type,
    title: input.title.trim(),
    recipeSlug: input.recipeSlug?.trim().toLowerCase() || undefined,
    recipePath: input.recipePath,
    crewSize: input.crewSize,
    shiftLabel: input.shiftLabel ?? profile.shiftLabel,
    hallName: input.hallName ?? profile.hallName,
    source: input.source,
    meta: input.meta,
  };

  const snapshot = getHallHistorySnapshot();
  const entries = [entry, ...snapshot.entries].slice(0, MAX_ENTRIES);
  writeSnapshot({
    ...snapshot,
    hallId: profile.hallId,
    entries,
    updatedAt: new Date().toISOString(),
  });
  return entry;
}

export function recordMealCooked(input: {
  title: string;
  recipeSlug?: string;
  recipePath?: string;
  crewSize?: number;
  source: string;
}): HallHistoryEntry {
  const entry = appendHallHistoryEntry({
    type: "meal_cooked",
    title: input.title,
    recipeSlug: input.recipeSlug,
    recipePath: input.recipePath,
    crewSize: input.crewSize ?? getHallProfile().defaultCrewSize,
    source: input.source,
  });
  trackMealCooked({
    recipe_title: input.title,
    recipe_slug: input.recipeSlug,
    source: input.source,
    crew_size: entry.crewSize,
  });
  return entry;
}

export function recordMealGenerated(input: {
  title: string;
  recipeSlug?: string;
  crewSize?: number;
  source?: string;
}): HallHistoryEntry {
  return appendHallHistoryEntry({
    type: "meal_generated",
    title: input.title,
    recipeSlug: input.recipeSlug,
    crewSize: input.crewSize ?? getHallProfile().defaultCrewSize,
    source: input.source ?? "generator",
  });
}

export function recordWheelResult(input: {
  title: string;
  recipeSlug: string;
  recipePath?: string;
  segmentIndex?: number;
}): HallHistoryEntry {
  const entry = appendHallHistoryEntry({
    type: "wheel_result",
    title: input.title,
    recipeSlug: input.recipeSlug,
    recipePath: input.recipePath,
    source: "classics_wheel",
    meta: { segmentIndex: input.segmentIndex },
  });
  return entry;
}

export function recordHallVoteCreated(input: {
  voteId: string;
  title: string;
  optionCount: number;
  source?: string;
}): HallHistoryEntry {
  const entry = appendHallHistoryEntry({
    type: "hall_vote",
    title: input.title,
    source: input.source ?? "hall_vote",
    meta: { voteId: input.voteId, optionCount: input.optionCount },
  });
  return entry;
}

function slugKey(slug: string | undefined): string | undefined {
  const s = slug?.trim().toLowerCase();
  return s || undefined;
}

export function getLastEntryForSlug(
  slug: string,
  types: HallHistoryEntryType[] = ["meal_cooked"],
): HallHistoryEntry | undefined {
  const key = slugKey(slug);
  if (!key) return undefined;
  return getHallHistoryEntries().find(
    (e) => types.includes(e.type) && slugKey(e.recipeSlug) === key,
  );
}

export function countHistoryByType(type: HallHistoryEntryType): number {
  return getHallHistoryEntries().filter((e) => e.type === type).length;
}

export function countMealsCookedThisMonth(): number {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return getHallHistoryEntries().filter((e) => {
    if (e.type !== "meal_cooked") return false;
    const cooked = new Date(e.at);
    return !Number.isNaN(cooked.getTime()) && cooked.getMonth() === month && cooked.getFullYear() === year;
  }).length;
}

export function getMostCookedMeals(limit = 5): Array<{
  slug?: string;
  title: string;
  recipePath?: string;
  cookCount: number;
  lastCookedAt: string;
}> {
  const counts = new Map<
    string,
    { slug?: string; title: string; recipePath?: string; count: number; lastAt: string }
  >();

  for (const entry of getHallHistoryEntries()) {
    if (entry.type !== "meal_cooked") continue;
    const key = slugKey(entry.recipeSlug) ?? entry.title.trim().toLowerCase();
    const prev = counts.get(key);
    if (!prev) {
      counts.set(key, {
        slug: entry.recipeSlug,
        title: entry.title,
        recipePath: entry.recipePath,
        count: 1,
        lastAt: entry.at,
      });
    } else {
      prev.count += 1;
      if (entry.at > prev.lastAt) prev.lastAt = entry.at;
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt))
    .slice(0, limit)
    .map((row) => ({
      slug: row.slug,
      title: row.title,
      recipePath: row.recipePath,
      cookCount: row.count,
      lastCookedAt: row.lastAt,
    }));
}

export function getRecentlyCooked(limit = 8): HallHistoryEntry[] {
  const seen = new Set<string>();
  const rows: HallHistoryEntry[] = [];
  for (const entry of getHallHistoryEntries()) {
    if (entry.type !== "meal_cooked") continue;
    const key = slugKey(entry.recipeSlug) ?? entry.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(entry);
    if (rows.length >= limit) break;
  }
  return rows;
}

export function getRecentWheelResults(limit = 5): HallHistoryEntry[] {
  return getHallHistoryEntries().filter((e) => e.type === "wheel_result").slice(0, limit);
}

export function getRecentHallVotes(limit = 5): HallHistoryEntry[] {
  return getHallHistoryEntries().filter((e) => e.type === "hall_vote").slice(0, limit);
}

export function getLastMealCooked(): HallHistoryEntry | undefined {
  return getHallHistoryEntries().find((e) => e.type === "meal_cooked");
}

function localDateKey(iso: string): string | undefined {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function previousLocalDateKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

export function getMostCookedThisMonth(limit = 1): Array<{
  slug?: string;
  title: string;
  recipePath?: string;
  cookCount: number;
  lastCookedAt: string;
}> {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const counts = new Map<
    string,
    { slug?: string; title: string; recipePath?: string; count: number; lastAt: string }
  >();

  for (const entry of getHallHistoryEntries()) {
    if (entry.type !== "meal_cooked") continue;
    const cooked = new Date(entry.at);
    if (Number.isNaN(cooked.getTime())) continue;
    if (cooked.getMonth() !== month || cooked.getFullYear() !== year) continue;
    const key = slugKey(entry.recipeSlug) ?? entry.title.trim().toLowerCase();
    const prev = counts.get(key);
    if (!prev) {
      counts.set(key, {
        slug: entry.recipeSlug,
        title: entry.title,
        recipePath: entry.recipePath,
        count: 1,
        lastAt: entry.at,
      });
    } else {
      prev.count += 1;
      if (entry.at > prev.lastAt) prev.lastAt = entry.at;
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt))
    .slice(0, limit)
    .map((row) => ({
      slug: row.slug,
      title: row.title,
      recipePath: row.recipePath,
      cookCount: row.count,
      lastCookedAt: row.lastAt,
    }));
}

export function getMostGeneratedMeals(limit = 5): Array<{
  slug?: string;
  title: string;
  generateCount: number;
  lastGeneratedAt: string;
}> {
  const counts = new Map<
    string,
    { slug?: string; title: string; count: number; lastAt: string }
  >();

  for (const entry of getHallHistoryEntries()) {
    if (entry.type !== "meal_generated") continue;
    const key = slugKey(entry.recipeSlug) ?? entry.title.trim().toLowerCase();
    const prev = counts.get(key);
    if (!prev) {
      counts.set(key, {
        slug: entry.recipeSlug,
        title: entry.title,
        count: 1,
        lastAt: entry.at,
      });
    } else {
      prev.count += 1;
      if (entry.at > prev.lastAt) prev.lastAt = entry.at;
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt))
    .slice(0, limit)
    .map((row) => ({
      slug: row.slug,
      title: row.title,
      generateCount: row.count,
      lastGeneratedAt: row.lastAt,
    }));
}

export function shouldAvoidRepeat(
  slug: string | undefined,
  cooldownDays = HALL_REPEAT_COOLDOWN_DAYS,
): { avoid: boolean; entry?: HallHistoryEntry; daysSince?: number } {
  const key = slugKey(slug);
  if (!key) return { avoid: false };
  const entry = getLastEntryForSlug(key, ["meal_cooked"]);
  if (!entry) return { avoid: false };
  const daysSince = daysSinceCooked(entry);
  return {
    avoid: isWithinRepeatCooldown(entry, cooldownDays),
    entry,
    daysSince,
  };
}

export const localHallHistoryStore: HallHistoryStore = {
  getSnapshot: getHallHistorySnapshot,
  getEntries: getHallHistoryEntries,
  appendEntry: appendHallHistoryEntry,
  replaceSnapshot: replaceHallHistorySnapshot,
};
