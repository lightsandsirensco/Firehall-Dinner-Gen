#!/usr/bin/env tsx
/**
 * Phase 1/2 report — 100 candidates, 50 selected (internal editorial).
 */
import {
  PERFORMANCE_SOURCE_CANDIDATES,
  PERFORMANCE_SOURCE_SELECTED,
} from "../shared/performance-meals/source-registry.js";

console.log("# Performance Meals — curation report\n");
console.log(`Candidates: ${PERFORMANCE_SOURCE_CANDIDATES.length}`);
console.log(`Selected: ${PERFORMANCE_SOURCE_SELECTED.length}\n`);

console.log("## Selected for Firehall adaptation\n");
console.log("| Slug | Publisher | Inspiration | Score |");
console.log("|------|-----------|-------------|-------|");
for (const s of PERFORMANCE_SOURCE_SELECTED.sort((a, b) => (b.selectionScore ?? 0) - (a.selectionScore ?? 0))) {
  console.log(
    `| ${s.firehallSlug} | ${s.publisher} | ${s.inspirationTitle} | ${s.selectionScore ?? "—"} |`,
  );
}

console.log("\n## Reserve pool (not selected)\n");
const reserve = PERFORMANCE_SOURCE_CANDIDATES.filter((c) => !c.selected);
for (const s of reserve.slice(0, 20)) {
  console.log(`- ${s.inspirationTitle} (${s.publisher}) — ${s.selectionRationale ?? "reserve"}`);
}
if (reserve.length > 20) {
  console.log(`- … ${reserve.length - 20} more`);
}
