import type { EditorialQaReport } from "./types.js";

export interface EditorialQaSummary {
  recipeCount: number;
  publishSafe: number;
  blocked: number;
  totals: { critical: number; warning: number; info: number };
  blockedReasons: Record<string, number>;
}

export function summarizeEditorialQaReports(reports: EditorialQaReport[]): EditorialQaSummary {
  const blockedReasons: Record<string, number> = {};
  for (const r of reports) {
    for (const code of r.blockedReasons || []) {
      blockedReasons[code] = (blockedReasons[code] || 0) + 1;
    }
  }
  return {
    recipeCount: reports.length,
    publishSafe: reports.filter((r) => r.publishReady).length,
    blocked: reports.filter((r) => !r.publishReady).length,
    totals: {
      critical: reports.reduce((s, r) => s + (r.criticalCount || 0), 0),
      warning: reports.reduce((s, r) => s + (r.warningCount || 0), 0),
      info: reports.reduce((s, r) => s + (r.infoCount || 0), 0),
    },
    blockedReasons,
  };
}
