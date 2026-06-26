import {
  PWA_SESSION_MARKED_KEY,
  PWA_VISIT_COUNT_KEY,
} from "@shared/pwa/constants";

export function recordPwaSessionVisit(): number {
  if (typeof window === "undefined") return 0;
  try {
    if (sessionStorage.getItem(PWA_SESSION_MARKED_KEY)) {
      return Number(localStorage.getItem(PWA_VISIT_COUNT_KEY) ?? "1") || 1;
    }
    const next = (Number(localStorage.getItem(PWA_VISIT_COUNT_KEY) ?? "0") || 0) + 1;
    localStorage.setItem(PWA_VISIT_COUNT_KEY, String(next));
    sessionStorage.setItem(PWA_SESSION_MARKED_KEY, "1");
    return next;
  } catch {
    return 1;
  }
}

export function getPwaVisitCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(PWA_VISIT_COUNT_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}
