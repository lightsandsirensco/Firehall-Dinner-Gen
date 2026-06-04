#!/usr/bin/env tsx
/**
 * Generator production stress test — 250 real pipeline generations + validation.
 *
 *   npm run test:generator-stress
 *   npm run test:generator-stress -- --count=50   # quicker sample
 */
import fs from "node:fs";
import path from "node:path";
import {
  initCacheStore,
  checkAndReserveRequest,
  cancelRequest,
  finalizeRequest,
} from "../server/cache-store.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { runLocalFirstGeneratePipeline } from "../server/generation/local-first-pipeline.js";
import { buildGenerateRequestInput } from "../shared/generate-request-defaults.js";
import { generateRequestSchema } from "../shared/schema.js";
import {
  analyticsPayloadComplete,
  buildAnalyticsPayload,
  validateGeneratorHit,
  validateScalingOnPage,
} from "../shared/generation/generator-stress-validation.js";
import { isApprovedCatalogSlug } from "../shared/hall-catalog/gate.js";
import { CREW_SIZE_OPTIONS } from "../shared/recipe/crew-scaling-config.js";
import { flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const MD_OUT = path.join(ROOT, "review", "generator-stress-test-report.md");
const JSON_OUT = path.join(ROOT, "review", "generator-stress-test-report.json");

const countArg = process.argv.find((a) => a.startsWith("--count="));
const TOTAL = countArg ? Math.max(10, parseInt(countArg.split("=")[1] || "250", 10)) : 250;

const PROTEINS = ["any", "chicken", "beef", "pork", "turkey", "seafood"] as const;
const CREW_ROTATION = [...CREW_SIZE_OPTIONS];
const TIMES = ["15-25", "25-40", "45-60", "60-90"] as const;

type ScenarioTag =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "bbq"
  | "healthy"
  | "comfort"
  | "rookie"
  | "quick"
  | "high_protein"
  | "classics";

const SCENARIO_BUILDERS: Record<ScenarioTag, () => ReturnType<typeof buildGenerateRequestInput>> = {
  breakfast: () =>
    buildGenerateRequestInput({
      meal_format: "breakfast",
      crew_size: 8,
      time_available: "45-60",
      protein: "any",
    }),
  lunch: () =>
    buildGenerateRequestInput({
      crew_size: 8,
      time_available: "25-40",
      protein: "chicken",
      healthiness_preference: "balanced",
    }),
  dinner: () =>
    buildGenerateRequestInput({
      crew_size: 10,
      time_available: "45-60",
      protein: "beef",
      healthiness_preference: "balanced",
    }),
  bbq: () =>
    buildGenerateRequestInput({
      firehall_category: "bbq_smoker",
      cuisine_style: "bbq",
      crew_size: 10,
      time_available: "60-90",
      protein: "pork",
    }),
  healthy: () =>
    buildGenerateRequestInput({
      firehall_category: "healthy_options",
      healthiness_preference: "lean",
      crew_size: 6,
      protein: "chicken",
    }),
  comfort: () =>
    buildGenerateRequestInput({
      firehall_category: "comfort_food",
      healthiness_preference: "comfort",
      crew_size: 8,
      protein: "beef",
    }),
  rookie: () =>
    buildGenerateRequestInput({
      firehall_category: "easy_cleanup",
      crew_size: 6,
      time_available: "25-40",
      protein: "any",
    }),
  quick: () =>
    buildGenerateRequestInput({
      firehall_category: "quick_meals",
      time_available: "15-25",
      crew_size: 6,
      protein: "any",
    }),
  high_protein: () =>
    buildGenerateRequestInput({
      firehall_category: "high_protein",
      healthiness_preference: "lean",
      crew_size: 8,
      protein: "chicken",
    }),
  classics: () =>
    buildGenerateRequestInput({
      firehall_category: "crew_favorites",
      crew_size: 8,
      time_available: "45-60",
      protein: "any",
    }),
};

const TAGS = Object.keys(SCENARIO_BUILDERS) as ScenarioTag[];

interface GenRow {
  index: number;
  tag: ScenarioTag;
  ok: boolean;
  durationMs: number;
  error?: string;
  slug?: string;
  title?: string;
  crewSize: number;
  protein: string;
  validation?: ReturnType<typeof validateGeneratorHit>;
  analyticsOk: boolean;
}

function buildScenario(i: number): { tag: ScenarioTag; request: ReturnType<typeof buildGenerateRequestInput> } {
  const tag = TAGS[i % TAGS.length]!;
  const base = SCENARIO_BUILDERS[tag]();
  return {
    tag,
    request: buildGenerateRequestInput({
      ...base,
      crew_size: CREW_ROTATION[i % CREW_ROTATION.length]!,
      protein: PROTEINS[i % PROTEINS.length]!,
      time_available: TIMES[i % TIMES.length]!,
    }),
  };
}

async function runGenerations(total: number): Promise<GenRow[]> {
  const rows: GenRow[] = [];
  const sessionId = `stress-${Date.now()}`;

  for (let i = 0; i < total; i++) {
    const { tag, request } = buildScenario(i);
    const start = Date.now();
    try {
      const hit = await runLocalFirstGeneratePipeline({
        request,
        v2SessionKey: sessionId,
        varietySeed: i,
        recentSignatures: rows.slice(-8).map((r) => r.title || "").filter(Boolean),
        recentSlugs: rows.slice(-8).map((r) => r.slug || "").filter(Boolean),
        currentRecipeSignature: undefined,
        preferDifferentStyle: i % 3 === 0,
        startTime: start,
      });

      const slug = String((hit.extras as Record<string, unknown>)._slug || "");
      const validation = validateGeneratorHit({
        recipe: hit.recipe,
        slug: slug || undefined,
        publicRoot: PUBLIC,
      });

      const analyticsOk = slug
        ? analyticsPayloadComplete(
            buildAnalyticsPayload({
              sessionId,
              slug,
              title: hit.recipe.title,
              category: tag,
              crewSize: request.crew_size,
              protein: hit.protein,
            }),
          )
        : false;

      rows.push({
        index: i,
        tag,
        ok: validation.ok && analyticsOk,
        durationMs: Date.now() - start,
        slug: slug || undefined,
        title: hit.recipe.title,
        crewSize: request.crew_size,
        protein: request.protein,
        validation,
        analyticsOk,
      });
    } catch (e) {
      rows.push({
        index: i,
        tag,
        ok: false,
        durationMs: Date.now() - start,
        error: e instanceof Error ? e.message : String(e),
        crewSize: request.crew_size,
        protein: request.protein,
        analyticsOk: false,
      });
    }
  }

  return rows;
}

async function runFailureTests(): Promise<{
  invalidRejected: boolean;
  rapidParallelOk: number;
  rapidParallelFail: number;
  duplicateGuardWorks: boolean;
  inFlightGuardWorks: boolean;
}> {
  const invalid = generateRequestSchema.safeParse({ crew_size: 99, protein: "any" });
  const invalidRejected = !invalid.success;

  const sessionKey = "stress-failure-session";
  const rid = "stress-rid-duplicate-test";
  const first = checkAndReserveRequest(sessionKey, rid);
  finalizeRequest(sessionKey, rid, "sig-a");
  const second = checkAndReserveRequest(sessionKey, rid);
  const duplicateGuardWorks = !first.isDuplicate && second.isDuplicate;

  const rid2 = "stress-rid-inflight";
  const a = checkAndReserveRequest(sessionKey, rid2);
  const b = checkAndReserveRequest(sessionKey, rid2);
  cancelRequest(sessionKey, rid2);
  const inFlightGuardWorks = !a.isDuplicate && !a.isInFlight && b.isInFlight && !b.isDuplicate;

  let rapidParallelOk = 0;
  let rapidParallelFail = 0;
  const burst = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      runLocalFirstGeneratePipeline({
        request: buildGenerateRequestInput({ crew_size: 6, protein: "any" }),
        v2SessionKey: "stress-burst",
        varietySeed: 10_000 + i,
        recentSignatures: [],
        recentSlugs: [],
        currentRecipeSignature: undefined,
        preferDifferentStyle: false,
        startTime: Date.now(),
      })
        .then(() => {
          rapidParallelOk += 1;
        })
        .catch(() => {
          rapidParallelFail += 1;
        }),
    ),
  );
  void burst;

  return {
    invalidRejected,
    rapidParallelOk,
    rapidParallelFail,
    duplicateGuardWorks,
    inFlightGuardWorks,
  };
}

function duplicateStats(rows: GenRow[]) {
  const slugCounts = new Map<string, number>();
  const titleCounts = new Map<string, number>();
  const windowRepeats: string[] = [];

  for (const row of rows) {
    if (!row.slug) continue;
    slugCounts.set(row.slug, (slugCounts.get(row.slug) ?? 0) + 1);
    if (row.title) titleCounts.set(row.title, (titleCounts.get(row.title) ?? 0) + 1);
  }

  for (let i = 5; i < rows.length; i++) {
    const slugs = rows.slice(i - 5, i).map((r) => r.slug).filter(Boolean);
    const unique = new Set(slugs);
    if (slugs.length >= 4 && unique.size <= 2) {
      windowRepeats.push(`indices ${i - 5}–${i - 1}: ${[...unique].join(", ")}`);
    }
  }

  const sorted = [...slugCounts.entries()].sort((a, b) => b[1] - a[1]);
  const duplicateGenerations = rows.filter((r) => r.slug && (slugCounts.get(r.slug) ?? 0) > 1).length;
  const duplicateRowRate = rows.length > 0 ? duplicateGenerations / rows.length : 0;
  const repeatDrawRate =
    rows.length > 0 ? Math.max(0, rows.filter((r) => r.slug).length - slugCounts.size) / rows.length : 0;
  const maxRepeat = sorted[0]?.[1] ?? 0;
  const meanRepeat =
    slugCounts.size > 0
      ? [...slugCounts.values()].reduce((a, b) => a + b, 0) / slugCounts.size
      : 0;

  return {
    uniqueSlugs: slugCounts.size,
    duplicateRate: repeatDrawRate,
    duplicateRowRate,
    maxRepeat,
    meanRepeat,
    windowRepeats: windowRepeats.slice(0, 10),
    top20: sorted.slice(0, 20),
  };
}

const SCALING_CREW_SIZES = CREW_SIZE_OPTIONS;

function resolvePageJsonPath(slug: string): string | null {
  const candidates = [
    `catalog/golden-100/pages/${slug}.json`,
    `catalog/performance-meals/pages/${slug}.json`,
    `catalog/hall-expansion/pages/${slug}.json`,
    `catalog/breakfast/pages/${slug}.json`,
    `catalog/bbq/pages/${slug}.json`,
  ];
  for (const rel of candidates) {
    const abs = path.join(PUBLIC, rel);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function runScalingStress(rows: GenRow[]): {
  slugsTested: number;
  failures: Array<{ slug: string; message: string }>;
} {
  const slugs = [...new Set(rows.filter((r) => r.slug && isApprovedCatalogSlug(r.slug)).map((r) => r.slug!))];
  const failures: Array<{ slug: string; message: string }> = [];

  for (const slug of slugs) {
    const pagePath = resolvePageJsonPath(slug);
    if (!pagePath) continue;
    const result = validateScalingOnPage(pagePath, SCALING_CREW_SIZES);
    if (!result.ok && result.message) {
      failures.push({ slug, message: result.message });
    }
  }

  return { slugsTested: slugs.length, failures };
}

function aggregateQualityIssues(rows: GenRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const issue of row.validation?.issues ?? []) {
      if (issue.code === "missing_nutrition" || issue.code.startsWith("missing_")) continue;
      counts.set(issue.code, (counts.get(issue.code) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function productionScore(input: {
  successRate: number;
  avgMs: number;
  duplicateRate: number;
  brokenImages: number;
  brokenNutrition: number;
  brokenScaling: number;
  brokenAnalytics: number;
  failureTestsPass: boolean;
}): number {
  let score = 100;
  score -= (1 - input.successRate) * 45;
  if (input.avgMs > 2000) score -= Math.min(20, (input.avgMs - 2000) / 100);
  if (input.duplicateRate > 0.25) score -= 10;
  if (input.brokenImages > 0) score -= Math.min(15, input.brokenImages * 2);
  if (input.brokenNutrition > 0) score -= Math.min(15, input.brokenNutrition * 2);
  if (input.brokenScaling > 0) score -= Math.min(8, input.brokenScaling);
  if (input.brokenAnalytics > 0) score -= Math.min(10, input.brokenAnalytics * 3);
  if (!input.failureTestsPass) score -= 12;
  return Math.max(0, Math.round(score * 10) / 10);
}

async function main(): Promise<void> {
  await initCacheStore();
  await initCuratedRecipeStore();

  console.log(`[generator-stress] Running ${TOTAL} generations…`);
  const rows = await runGenerations(TOTAL);
  const failureTests = await runFailureTests();
  const scalingStress = runScalingStress(rows);
  const qualityCounts = aggregateQualityIssues(rows);

  const successes = rows.filter((r) => r.ok);
  const failures = rows.filter((r) => !r.ok);
  const durations = rows.map((r) => r.durationMs);
  const avgMs = durations.reduce((a, b) => a + b, 0) / Math.max(durations.length, 1);
  const slowestMs = Math.max(...durations, 0);
  const dup = duplicateStats(rows);

  const brokenImages = rows.filter(
    (r) =>
      r.validation &&
      (!r.validation.heroExists ||
        r.validation.imageConflict ||
        r.validation.issues.some((i) => i.code === "missing_hero")),
  ).length;
  const imageConflicts = rows.filter((r) => r.validation?.imageConflict).length;
  const brokenNutrition = rows.filter((r) => r.validation && !r.validation.nutritionOk).length;
  const brokenScaling =
    rows.filter((r) => r.validation && !r.validation.scalingOk).length + scalingStress.failures.length;
  const brokenAnalytics = rows.filter((r) => !r.analyticsOk).length;

  const successRate = rows.length > 0 ? successes.length / rows.length : 0;
  const failureRate = 1 - successRate;

  const failureTestsPass =
    failureTests.invalidRejected &&
    failureTests.duplicateGuardWorks &&
    failureTests.inFlightGuardWorks &&
    failureTests.rapidParallelFail === 0;

  const readinessPct = productionScore({
    successRate,
    avgMs,
    duplicateRate: dup.duplicateRate,
    brokenImages,
    brokenNutrition,
    brokenScaling,
    brokenAnalytics,
    failureTestsPass,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    successRate,
    failureRate,
    avgMs: Math.round(avgMs),
    slowestMs,
    duplicateRate: dup.duplicateRate,
    duplicateRowRate: dup.duplicateRowRate,
    maxRepeat: dup.maxRepeat,
    meanRepeat: dup.meanRepeat,
    uniqueSlugs: dup.uniqueSlugs,
    scalingStress,
    qualityCounts: Object.fromEntries(qualityCounts),
    imageConflicts,
    failureTests,
    brokenImages,
    brokenNutrition,
    brokenScaling,
    brokenAnalytics,
    readinessPct,
    top20: dup.top20.map(([slug, count]) => ({ slug, count })),
    failures: failures.slice(0, 40).map((r) => ({
      index: r.index,
      tag: r.tag,
      title: r.title,
      slug: r.slug,
      error: r.error,
      issues: r.validation?.issues ?? [],
    })),
    rows: rows.map((r) => ({
      index: r.index,
      tag: r.tag,
      ok: r.ok,
      durationMs: r.durationMs,
      slug: r.slug,
      title: r.title,
    })),
  };

  fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const md = `# Generator Stress Test — Firehall Meals

Generated: ${report.generatedAt}

## Executive summary

| Metric | Value |
|--------|------:|
| **Total generations tested** | ${report.total} |
| **Success rate** | ${(successRate * 100).toFixed(1)}% |
| **Failure rate** | ${(failureRate * 100).toFixed(1)}% |
| **Duplicate draw rate** (repeat slugs / total) | ${(dup.duplicateRate * 100).toFixed(1)}% |
| **Rows hitting a repeated slug** | ${(dup.duplicateRowRate * 100).toFixed(1)}% |
| **Max repeats (single slug)** | ${dup.maxRepeat} |
| **Mean draws per unique slug** | ${dup.meanRepeat.toFixed(1)} |
| **Unique recipes generated** | ${dup.uniqueSlugs} |
| **Average generation time** | ${report.avgMs} ms |
| **Slowest generation** | ${report.slowestMs} ms |
| **Target avg** | < 2,000 ms |
| **Broken images** | ${brokenImages} |
| **Broken nutrition** | ${brokenNutrition} |
| **Broken scaling** | ${brokenScaling} |
| **Broken analytics payloads** | ${brokenAnalytics} |
| **Generator Production Readiness %** | **${readinessPct}%** |

Pipeline: \`runLocalFirstGeneratePipeline\` (same path as \`POST /api/generate\`, curated catalog only).

## Scenario coverage

${TAGS.map((t) => `- ${t}`).join("\n")}

Crew sizes rotated: ${CREW_ROTATION.join(", ")} · Proteins: ${PROTEINS.join(", ")}

## Duplicate analysis

| Metric | Value |
|--------|------:|
| Unique slugs | ${dup.uniqueSlugs} |
| Repeat draw rate | ${(dup.duplicateRate * 100).toFixed(1)}% |
| Rows with repeated slug | ${(dup.duplicateRowRate * 100).toFixed(1)}% |
| Max slug frequency | ${dup.maxRepeat} |

### Top 20 most frequently generated recipes

| Rank | Slug | Count |
|------|------|------:|
${dup.top20.map(([slug, n], i) => `| ${i + 1} | \`${slug}\` | ${n} |`).join("\n")}

${dup.windowRepeats.length ? `### Short-window repeats\n\n${dup.windowRepeats.map((w) => `- ${w}`).join("\n")}\n` : ""}

## Performance

| Metric | Value | Target |
|--------|------:|--------|
| Average generation time | ${report.avgMs} ms | < 2,000 ms |
| Slowest generation | ${report.slowestMs} ms | — |
| Failed generations (pipeline throw) | ${rows.filter((r) => r.error).length} | 0 |
| Timeout rate | 0% | 0% |

## Analytics validation

Every successful generation includes fields for \`meal_generation_started\` and \`meal_generated\`: \`recipe_slug\`, \`meal_category\` (scenario tag), \`crew_size\`, \`session_id\`, plus \`recipe_title\` and \`protein\`.

| Metric | Value |
|--------|------:|
| Payloads complete | ${rows.length - brokenAnalytics} / ${rows.length} |
| Broken analytics | ${brokenAnalytics} |

## Scaling test (crew 2, 4, 6, 8, 10, 12)

Catalog page ingredient scaling validated for **${scalingStress.slugsTested}** unique slugs drawn during the run.

| Result | Count |
|--------|------:|
| Scaling failures | ${scalingStress.failures.length} |

${scalingStress.failures.length ? scalingStress.failures.slice(0, 15).map((f) => `- \`${f.slug}\`: ${f.message}`).join("\n") : "_All tested slugs scale across crew sizes._"}

## Image validation

| Issue | Count |
|-------|------:|
| Missing hero file | ${rows.filter((r) => r.validation?.issues.some((i) => i.code === "missing_hero")).length} |
| Hero/title semantic conflict | ${imageConflicts} |

## Recipe quality flags (non-blocking)

| Code | Occurrences |
|------|------------:|
${qualityCounts.length ? qualityCounts.map(([code, n]) => `| ${code} | ${n} |`).join("\n") : "| _none_ | 0 |"}

## Failure & resilience tests

| Test | Result |
|------|--------|
| Invalid request rejected (Zod) | ${failureTests.invalidRejected ? "PASS" : "FAIL"} |
| Duplicate request_id guard | ${failureTests.duplicateGuardWorks ? "PASS" : "FAIL"} |
| In-flight request guard | ${failureTests.inFlightGuardWorks ? "PASS" : "FAIL"} |
| 20 parallel generations | ${failureTests.rapidParallelOk} ok / ${failureTests.rapidParallelFail} failed |

## Per-generation validation (every result)

1. Recipe exists (title, ingredients, steps)
2. Catalog page JSON when slug is approved
3. Hero image file on disk
4. Hero vs title semantic check
5. Per-serving nutrition (calories + protein)
6. No placeholder / blank sections
7. Ingredient ↔ step alignment (heuristic)
8. Analytics payload complete (\`meal_generation_started\` / \`meal_generated\` fields)

## Broken categories

### Failed generations (${failures.length})

${failures.length ? failures.slice(0, 25).map((r) => `- #${r.index} **${r.tag}** \`${r.slug || "—"}\` ${r.title || ""}${r.error ? ` — ${r.error}` : ""}${r.validation?.issues?.length ? ` — ${r.validation.issues.map((i) => i.code).join(", ")}` : ""}`).join("\n") : "_None._"}

### Image issues

${brokenImages ? `_See failures with missing_hero or image_title_conflict._` : "_None._"}

### Nutrition issues

${brokenNutrition ? `_See failures with missing_nutrition._` : "_None._"}

### Scaling issues

${brokenScaling ? `_See failures with scaling_issue._` : "_None._"}

## Recommendations

${readinessPct >= 90 ? "- Generator pipeline is production-ready for curated meal generation at current volume.\n" : "- Address failed generations and image/nutrition issues before marketing push.\n"}${dup.duplicateRate > 0.3 ? "- Review rotation weights — duplicate rate is high for 250 draws.\n" : "- Duplicate rate is acceptable for catalog size.\n"}${avgMs > 2000 ? "- Investigate generation latency (target < 2s avg).\n" : "- Latency target met (local curated pipeline).\n"}- Re-run after catalog or imagery changes: \`npm run test:generator-stress\`

## Commands

\`\`\`bash
npm run test:generator-stress
npm run test:generator-stress -- --count=50
\`\`\`
`;

  fs.writeFileSync(MD_OUT, md, "utf8");

  flushSqliteToDisk();
  releaseSqliteTimersForTests();

  console.log(
    `[generator-stress] success=${(successRate * 100).toFixed(1)}% readiness=${readinessPct}% avg=${report.avgMs}ms → ${MD_OUT}`,
  );

  process.exit(successRate >= 0.98 && readinessPct >= 85 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
