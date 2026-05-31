#!/usr/bin/env tsx
/**
 * Intensive image audit — runs all firehall photo / explore / governance checks
 * and writes a consolidated report.
 *
 * Usage:
 *   npm run audit:firehall-photo-intensive
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REVIEW = path.join(process.cwd(), "review");
const OUT_JSON = path.join(REVIEW, "firehall-photo-intensive-audit.json");
const OUT_MD = path.join(REVIEW, "firehall-photo-intensive-audit.md");

type AuditRun = {
  id: string;
  script: string;
  reportPath: string;
  ok: boolean;
  error?: string;
};

function readJson<T>(relPath: string): T | null {
  const abs = path.join(REVIEW, relPath);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as T;
  } catch {
    return null;
  }
}

function runAudit(id: string, npmScript: string, reportPath: string): AuditRun {
  try {
    execSync(`npm run ${npmScript}`, { stdio: "inherit", cwd: process.cwd() });
    return { id, script: npmScript, reportPath, ok: true };
  } catch (err) {
    return {
      id,
      script: npmScript,
      reportPath,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function main(): void {
  fs.mkdirSync(REVIEW, { recursive: true });

  const runs: AuditRun[] = [
    runAudit("firehall_photo_standard", "audit:firehall-photo-standard", "firehall-photo-standard-audit.json"),
    runAudit("image_accuracy", "audit:image-accuracy", "image-accuracy-audit.json"),
    runAudit("explore_image_mapping", "audit:explore-image-mapping", "explore-image-mapping-audit.json"),
    runAudit("image_governance", "audit:image-governance", "curated-image-governance-report.json"),
    runAudit("breakfast_images", "audit:breakfast-images", "breakfast-image-audit.json"),
  ];

  const standard = readJson<{
    totals: {
      recipesAudited: number;
      failed: number;
      queuedForReplacement: number;
      duplicateHeroGroups: number;
      donorOverrides: number;
    };
    replacementQueue: Array<{ slug: string; collection: string; priority: string }>;
  }>("firehall-photo-standard-audit.json");

  const accuracy = readJson<{
    totals: {
      recipesAudited: number;
      failed: number;
      duplicateHeroGroups: number;
    };
  }>("image-accuracy-audit.json");

  const explore = readJson<{
    totals: {
      recipes: number;
      exploreEligible: number;
      exploreExcluded: number;
      duplicateConflict: number;
      duplicateImageGroups: number;
    };
  }>("explore-image-mapping-audit.json");

  const governance = readJson<{
    totals: {
      recipes: number;
      failed: number;
      buildBlockers: number;
      duplicateHeroPaths: number;
    };
  }>("curated-image-governance-report.json");

  const breakfast = readJson<{
    totals?: {
      recipesAudited?: number;
      failed?: number;
      duplicateGroups?: number;
      missingHero?: number;
    };
  }>("breakfast-image-audit.json");

  const p0Count =
    standard?.replacementQueue.filter((q) => q.priority === "p0").length ?? 0;
  const p1Count =
    standard?.replacementQueue.filter((q) => q.priority === "p1").length ?? 0;

  const report = {
    generatedAt: new Date().toISOString(),
    auditRuns: runs,
    consolidated: {
      firehallPhotoStandard: standard?.totals ?? null,
      imageAccuracy: accuracy?.totals ?? null,
      exploreMapping: explore?.totals ?? null,
      imageGovernance: governance?.totals ?? null,
      breakfastImages: breakfast?.totals ?? null,
    },
    replacementBacklog: {
      totalQueued: standard?.totals.queuedForReplacement ?? 0,
      p0: p0Count,
      p1: p1Count,
    },
    exploreImpact: {
      eligible: explore?.totals.exploreEligible ?? 0,
      excluded: explore?.totals.exploreExcluded ?? 0,
      duplicateConflicts: explore?.totals.duplicateConflict ?? 0,
    },
    targets: {
      uniqueImagery: standard?.totals.failed === 0 ? "PASS" : "FAIL",
      exploreEligiblePct:
        explore?.totals.recipes && explore.totals.recipes > 0
          ? Math.round((explore.totals.exploreEligible / explore.totals.recipes) * 100)
          : 0,
    },
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  const md = [
    "# Firehall Photo Intensive Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Audit runs",
    "",
    ...runs.map(
      (r) =>
        `- **${r.id}** (\`${r.script}\`): ${r.ok ? "OK" : `FAIL — ${r.error}`}`,
    ),
    "",
    "## Consolidated totals",
    "",
    "| Metric | Value |",
    "|---|---:|",
    `| Recipes (photo standard) | ${standard?.totals.recipesAudited ?? "—"} |`,
    `| Failed photo standard | ${standard?.totals.failed ?? "—"} |`,
    `| Queued for replacement | ${standard?.totals.queuedForReplacement ?? "—"} |`,
    `| P0 replacement priority | ${p0Count} |`,
    `| P1 replacement priority | ${p1Count} |`,
    `| Duplicate hero groups (standard) | ${standard?.totals.duplicateHeroGroups ?? "—"} |`,
    `| Donor overrides | ${standard?.totals.donorOverrides ?? "—"} |`,
    `| Image accuracy failures | ${accuracy?.totals.failed ?? "—"} |`,
    `| Explore eligible | ${explore?.totals.exploreEligible ?? "—"} / ${explore?.totals.recipes ?? "—"} |`,
    `| Explore excluded (dupes) | ${explore?.totals.exploreExcluded ?? "—"} |`,
    `| Governance failures | ${governance?.totals.failed ?? "—"} |`,
    "",
    "## Next batch command",
    "",
    "```bash",
    "npm run batch:firehall-photo-replacements -- --batch-size=10 --priority=p0",
    "```",
    "",
  ].join("\n");

  fs.writeFileSync(OUT_MD, md);

  console.log(`[audit:firehall-photo-intensive] wrote ${OUT_JSON}`);
  console.log(`[audit:firehall-photo-intensive] wrote ${OUT_MD}`);

  const failedRuns = runs.filter((r) => !r.ok);
  if (failedRuns.length > 0) {
    console.error(`[audit:firehall-photo-intensive] ${failedRuns.length} sub-audit(s) failed`);
    process.exit(1);
  }
}

main();
