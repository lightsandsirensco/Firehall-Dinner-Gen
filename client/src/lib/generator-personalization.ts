/**
 * Client-side generator personalization — localStorage + auth/hall merge.
 */

import type { UserPreferences } from "@shared/auth/types";
import type { HallRecord } from "@shared/hall-membership/types";
import {
  createDefaultSimplifiedFilters,
  migrateLegacyFilterState,
  type SimplifiedGeneratorFilters,
} from "@shared/generator-simplified";
import {
  parsePersonalPrefs,
  personalPrefsFromFilters,
  resolveGeneratorFilters,
  type GeneratorPersonalPrefs,
} from "@shared/generator-personalization";
import { getHallProfile } from "@/lib/hall-profile-store";

const SESSION_KEY = "firehall_generator_v2";
const PERSONAL_KEY = "firehall_generator_personal_v1";
const LEGACY_KEY = "firehall_filters";
const HAS_USED_KEY = "firehall_generator_has_used";

export function isReturningGeneratorUser(): boolean {
  try {
    if (localStorage.getItem(HAS_USED_KEY) === "1") return true;
    if (localStorage.getItem(PERSONAL_KEY)) return true;
    if (localStorage.getItem(SESSION_KEY)) return true;
    return false;
  } catch {
    return false;
  }
}

export function markGeneratorUsed(): void {
  try {
    localStorage.setItem(HAS_USED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function readPersonalGeneratorPrefs(): GeneratorPersonalPrefs | null {
  try {
    const raw = localStorage.getItem(PERSONAL_KEY);
    if (!raw) return null;
    return parsePersonalPrefs(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function savePersonalGeneratorPrefs(filters: SimplifiedGeneratorFilters): void {
  try {
    localStorage.setItem(PERSONAL_KEY, JSON.stringify(personalPrefsFromFilters(filters)));
  } catch {
    /* ignore */
  }
}

export function readSessionGeneratorFilters(): SimplifiedGeneratorFilters | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SimplifiedGeneratorFilters;
    if (!parsed?.crew_bucket || !parsed?.protein) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadInitialGeneratorFilters(): SimplifiedGeneratorFilters {
  const personal = readPersonalGeneratorPrefs();
  const session = readSessionGeneratorFilters();
  if (!session) {
    try {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        return resolveGeneratorFilters({
          personal,
          session: migrateLegacyFilterState(JSON.parse(legacy)),
          preferences: null,
          hall: null,
          hallLinked: false,
          localCrewSize: getHallProfile().defaultCrewSize,
        });
      }
    } catch {
      /* ignore */
    }
  }

  return resolveGeneratorFilters({
    personal,
    session,
    preferences: null,
    hall: null,
    hallLinked: false,
    localCrewSize: getHallProfile().defaultCrewSize,
  });
}

export function mergeAuthAndHallIntoFilters(
  current: SimplifiedGeneratorFilters,
  options: {
    preferences: UserPreferences | null;
    hall: Pick<HallRecord, "crew_size" | "appliances"> | null;
    hallLinked: boolean;
  },
): SimplifiedGeneratorFilters {
  const personal = readPersonalGeneratorPrefs();
  return resolveGeneratorFilters({
    personal,
    session: current,
    preferences: options.preferences,
    hall: options.hall,
    hallLinked: options.hallLinked,
    localCrewSize: getHallProfile().defaultCrewSize,
  });
}

export function persistGeneratorSession(filters: SimplifiedGeneratorFilters): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(filters));
  } catch {
    /* ignore */
  }
}

export function persistGeneratorSelections(filters: SimplifiedGeneratorFilters): void {
  persistGeneratorSession(filters);
  savePersonalGeneratorPrefs(filters);
  markGeneratorUsed();
}
