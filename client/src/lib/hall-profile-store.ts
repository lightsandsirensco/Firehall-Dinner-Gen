import {
  HALL_PROFILE_SCHEMA_VERSION,
  type HallProfile,
  type HallProfileStore,
} from "@shared/hall-profile/types";

const STORAGE_KEY = "firehall_hall_profile_v1";
const HALL_ID_KEY = "firehall_hall_id_v1";

export const HALL_PROFILE_CHANGED_EVENT = "hall-profile-changed";

function readFiltersCrewSize(): number {
  try {
    const raw = localStorage.getItem("firehall_filters");
    if (!raw) return 6;
    const parsed = JSON.parse(raw) as { crew_size?: number };
    const size = parsed.crew_size;
    return typeof size === "number" && size >= 2 && size <= 20 ? size : 6;
  } catch {
    return 6;
  }
}

function ensureHallId(): string {
  try {
    const existing = localStorage.getItem(HALL_ID_KEY);
    if (existing?.trim()) return existing.trim();
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `hall_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(HALL_ID_KEY, id);
    return id;
  } catch {
    return `hall_${Date.now()}`;
  }
}

function defaultProfile(): HallProfile {
  const now = new Date().toISOString();
  return {
    schemaVersion: HALL_PROFILE_SCHEMA_VERSION,
    hallId: ensureHallId(),
    defaultCrewSize: readFiltersCrewSize(),
    updatedAt: now,
  };
}

function parseProfile(raw: string): HallProfile | null {
  try {
    const parsed = JSON.parse(raw) as HallProfile;
    if (parsed?.schemaVersion !== HALL_PROFILE_SCHEMA_VERSION) return null;
    if (!parsed.hallId?.trim()) return null;
    const crew = parsed.defaultCrewSize;
    if (typeof crew !== "number" || crew < 2 || crew > 20) return null;
    return parsed;
  } catch {
    return null;
  }
}

function dispatchChanged(): void {
  window.dispatchEvent(new Event(HALL_PROFILE_CHANGED_EVENT));
}

export function getHallProfile(): HallProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    const profile = parseProfile(raw);
    if (!profile) return defaultProfile();
    return profile;
  } catch {
    return defaultProfile();
  }
}

export function saveHallProfile(profile: HallProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(HALL_ID_KEY, profile.hallId);
    dispatchChanged();
  } catch {
    /* quota / private mode */
  }
}

export function updateHallProfile(
  patch: Partial<Pick<HallProfile, "hallName" | "shiftLabel" | "defaultCrewSize">>,
): HallProfile {
  const current = getHallProfile();
  const next: HallProfile = {
    ...current,
    hallName: patch.hallName !== undefined ? patch.hallName.trim() || undefined : current.hallName,
    shiftLabel:
      patch.shiftLabel !== undefined ? patch.shiftLabel.trim() || undefined : current.shiftLabel,
    defaultCrewSize:
      patch.defaultCrewSize != null && patch.defaultCrewSize >= 2 && patch.defaultCrewSize <= 20
        ? patch.defaultCrewSize
        : current.defaultCrewSize,
    updatedAt: new Date().toISOString(),
  };
  saveHallProfile(next);
  return next;
}

/** Sync crew size from generator filters when profile has no explicit override. */
export function syncHallProfileCrewSizeFromFilters(crewSize: number): void {
  if (crewSize < 2 || crewSize > 20) return;
  const current = getHallProfile();
  if (current.defaultCrewSize === crewSize) return;
  saveHallProfile({ ...current, defaultCrewSize: crewSize, updatedAt: new Date().toISOString() });
}

export const localHallProfileStore: HallProfileStore = {
  getProfile: getHallProfile,
  updateProfile: updateHallProfile,
};
