#!/usr/bin/env tsx
/**
 * Build gate — fail when published curated images exceed mismatch threshold.
 *
 * Usage:
 *   npm run validate:image-governance
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const reportPath = path.join(process.cwd(), "review", "curated-image-governance-report.json");

execSync("tsx scripts/audit-curated-image-governance.ts", { stdio: "inherit" });

if (!fs.existsSync(reportPath)) {
  console.error("[validate:image-governance] report missing after audit");
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
  totals: { buildBlockers: number };
  buildBlockers: Array<{ slug: string; title: string; source: string }>;
};

/** Hall catalog (150) must pass — Explore failures are reported but do not block deploy yet. */
const hallBlockers = report.buildBlockers.filter((b) => b.source === "hall_catalog");

if (hallBlockers.length > 0) {
  console.error(
    `[validate:image-governance] FAIL — ${hallBlockers.length} hall catalog recipe(s) exceed image governance threshold`,
  );
  for (const b of hallBlockers.slice(0, 25)) {
    console.error(`  - ${b.source}:${b.slug} "${b.title}"`);
  }
  console.error("See review/curated-image-governance-report.md");
  process.exit(1);
}

const exploreBlockers = report.buildBlockers.filter((b) => b.source === "explore_curated");

if (exploreBlockers.length > 0) {
  console.error(
    `[validate:image-governance] FAIL — ${exploreBlockers.length} Explore curated row(s) exceed image governance threshold`,
  );
  for (const b of exploreBlockers.slice(0, 25)) {
    console.error(`  - ${b.source}:${b.slug} "${b.title}"`);
  }
  console.error("See review/curated-image-governance-report.md");
  process.exit(1);
}

const exploreSoftFails =
  (report as { totals?: { failed?: number }; rows?: Array<{ source: string; pass: boolean }> }).totals
    ?.failed ?? 0;
const exploreFailedRows =
  (report as { rows: Array<{ source: string; pass: boolean }> }).rows?.filter(
    (r) => r.source === "explore_curated" && !r.pass,
  ).length ?? 0;

if (exploreFailedRows > 0) {
  console.warn(
    `[validate:image-governance] NOTE — ${exploreFailedRows} Explore row(s) in review/draft still need imagery (non-blocking if unpublished)`,
  );
}

console.log("[validate:image-governance] OK");
process.exit(0);
