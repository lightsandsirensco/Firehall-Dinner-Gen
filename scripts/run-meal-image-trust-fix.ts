#!/usr/bin/env tsx
/**
 * Full meal image trust fix loop — audit → regen failures → re-audit → final report.
 *
 *   npx tsx scripts/run-meal-image-trust-fix.ts --vision --apply --limit=20
 *   npx tsx scripts/run-meal-image-trust-fix.ts --audit-only
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FINAL_MD = path.join("review", "meal-image-trust-final-report.md");

function run(cmd: string, args: string[]): void {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function parseArgs(argv: string[]) {
  return {
    vision: argv.includes("--vision"),
    apply: argv.includes("--apply"),
    auditOnly: argv.includes("--audit-only"),
    limit: argv.find((a) => a.startsWith("--limit="))?.replace("--limit=", "") || "30",
    maxRounds: parseInt(argv.find((a) => a.startsWith("--rounds="))?.replace("--rounds=", "") || "3", 10),
  };
}

function writeFinalReport(): void {
  const auditPath = path.join("review", "meal-image-trust-audit.json");
  const regenPath = path.join("review", "meal-image-trust-regen-report.json");
  if (!fs.existsSync(auditPath)) return;

  const audit = JSON.parse(fs.readFileSync(auditPath, "utf8")) as {
    generatedAt: string;
    totals: Record<string, number>;
    failedRecipes: Array<{
      recipe: string;
      slug: string;
      reasonFailed: string;
      replacementGenerated: boolean;
      qaPass: boolean | null;
    }>;
  };

  const regen = fs.existsSync(regenPath)
    ? (JSON.parse(fs.readFileSync(regenPath, "utf8")) as { results: Array<Record<string, unknown>> })
    : { results: [] };

  const lines = [
    "# Meal Image Trust Fix — Final Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Recipes audited: **${audit.totals.audited ?? 0}**`,
    `- Passed: **${audit.totals.passed ?? 0}**`,
    `- Failed: **${audit.totals.failed ?? 0}**`,
    `- Title ingredient mismatches: **${audit.totals.titleIngredientMismatches ?? 0}**`,
    `- Missing side dishes: **${audit.totals.missingSideDishes ?? 0}**`,
    `- Protein-only heroes: **${audit.totals.proteinOnlyHeroes ?? 0}**`,
    "",
    "## Results",
    "",
    "| Recipe | Reason failed | Replacement generated | QA pass/fail |",
    "| --- | --- | --- | --- |",
  ];

  const regenBySlug = new Map(regen.results.map((r) => [String(r.slug), r]));

  for (const row of audit.failedRecipes ?? []) {
    const reg = regenBySlug.get(row.slug);
    const replaced = row.replacementGenerated || reg?.replacementGenerated === true;
    const qa =
      row.qaPass === true || reg?.qaPass === true
        ? "pass"
        : row.qaPass === false || reg?.qaPass === false
          ? "fail"
          : "—";
    lines.push(
      `| ${row.recipe} | ${(row.reasonFailed || "—").replace(/\|/g, "/").slice(0, 120)} | ${replaced ? "yes" : "no"} | ${qa} |`,
    );
  }

  if ((audit.failedRecipes ?? []).length === 0) {
    lines.push("| _All recipes passed_ | — | — | pass |");
  }

  fs.writeFileSync(FINAL_MD, lines.join("\n"));
  console.log(`\n[trust-fix] final report → ${FINAL_MD}`);
}

async function main(): Promise<void> {
  const { vision, apply, auditOnly, limit, maxRounds } = parseArgs(process.argv);

  const auditArgs = ["tsx", "scripts/audit-meal-image-trust.ts"];
  if (vision) auditArgs.push("--vision");

  run("npx", auditArgs);

  if (auditOnly) {
    writeFinalReport();
    return;
  }

  for (let round = 1; round <= maxRounds; round++) {
    const audit = JSON.parse(
      fs.readFileSync(path.join("review", "meal-image-trust-audit.json"), "utf8"),
    ) as { totals: { failed: number } };
    if (audit.totals.failed === 0) {
      console.log(`[trust-fix] round ${round}: 0 failures — done`);
      break;
    }

    if (!apply) {
      console.log(`[trust-fix] ${audit.totals.failed} failures — pass --apply to regenerate`);
      break;
    }

    console.log(`\n[trust-fix] round ${round}/${maxRounds} — regen up to ${limit} failures`);
    run("npx", [
      "tsx",
      "scripts/regen-meal-image-trust.ts",
      "--apply",
      `--limit=${limit}`,
      "--skip-qa-fail",
      "--force",
    ]);

    run("npx", auditArgs);
  }

  writeFinalReport();
}

main();
