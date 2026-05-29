#!/usr/bin/env tsx
/**
 * Full editorial audit of curated Golden 100 + Performance Meals on-disk pages.
 *
 *   npx tsx scripts/curated-full-editorial-audit.ts
 *   npx tsx scripts/curated-full-editorial-audit.ts --fix
 *   npx tsx scripts/curated-full-editorial-audit.ts --fix --rebuild-weak
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { buildGoldenRecipePage } from "../server/golden-100/recipe-page-builder.js";
import { buildPerformanceRecipePage } from "../server/performance-meals/page-builder.js";
import { getGoldenRecipeBySlug } from "../shared/golden-100/manifest.js";
import { getPerformanceRecipeBySlug } from "../shared/performance-meals/index.js";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import { auditGoldenRecipeContent } from "../shared/golden-100/recipe-quality/audit.js";
import { stepsFailQualityBar } from "../shared/golden-100/recipe-quality/placeholders.js";
import { normalizeGoldenRecipePageCopy, normalizeRecipeSpacing } from "../shared/recipe/spacing.js";
import { detectGenericAiWording } from "../shared/curated-recipe/qa-engine/wording.js";
import { isRoboticTitle } from "../shared/generation-reliability.js";
import { scoreRecipeTitle } from "../shared/recipe-title-quality.js";

type CatalogKind = "golden-100" | "performance-meals";
type Severity = "critical" | "warning" | "info";

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  field?: string;
  sample?: string;
};

type RecipeRow = {
  catalog: CatalogKind;
  slug: string;
  title: string;
  file: string;
  contentScore: number;
  contentPass: boolean;
  needsManualReview: boolean;
  findings: Finding[];
  fixed?: {
    titleChanged?: boolean;
    copyNormalized?: boolean;
    rebuiltFromManifest?: boolean;
  };
};

const ROOT = process.cwd();
const GOLDEN_DIR = path.join(ROOT, "client", "public", "catalog", "golden-100", "pages");
const PERF_DIR = path.join(ROOT, "client", "public", "catalog", "performance-meals", "pages");
const REVIEW_DIR = path.join(ROOT, "review");

const TITLE_DUP_WORD = /\b([A-Za-z]{3,})\s+\1\b/i;
const TITLE_WEAK = /\b(ultimate|flavor[- ]packed|perfect|best ever|restaurant[- ]quality|mouth[- ]watering)\b/i;
const TITLE_METADATA =
  /\b(plated\s+main|comfort\s+bowl|protein\s+skillet|any\s+\w+\s+(skillet|bowl)|performance\s+bowl)\b/i;
const FILLER_STEP = /^(cook until done|serve and enjoy|plate and serve|enjoy|serve hot|garnish and serve)\.?$/i;

function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .map((f) => path.join(dir, f));
}

function readJson(filePath: string): GoldenRecipePage {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as GoldenRecipePage;
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function titleFix(title: string): { next: string; changed: boolean } {
  const t = (title || "").replace(/\s+/g, " ").trim();
  if (!t) return { next: t, changed: false };
  let next = t.replace(TITLE_DUP_WORD, (_m, w) => `${w}`).replace(/\s{2,}/g, " ").trim();
  return { next, changed: next !== t };
}

function normalizePageCopy(page: GoldenRecipePage): GoldenRecipePage {
  return normalizeGoldenRecipePageCopy(page as unknown as Record<string, unknown>) as unknown as GoldenRecipePage;
}

const WATCH_COLOR_FILLER =
  /\s*Watch color and texture(?: at the pan)? — if it smells sharp or looks pale, give it another minute before moving on\.?/gi;

function polishPageCopy(page: GoldenRecipePage): GoldenRecipePage {
  const out = { ...page };
  if (typeof out.description === "string" && out.description.trim().length < 50) {
    const d = out.description.trim();
    const lead = /[.!?]$/.test(d) ? d : `${d}.`;
    out.description = `${lead} Sized for a full crew, with timing that still works when the kitchen gets interrupted.`;
    if (out.whyCrewsLikeIt && out.whyCrewsLikeIt.trim().length < 50) {
      out.whyCrewsLikeIt = out.description;
    }
  }
  if (Array.isArray(out.steps)) {
    out.steps = out.steps.map((s) => ({
      ...s,
      instruction: String(s.instruction || "").replace(WATCH_COLOR_FILLER, "").trim(),
    }));
  }
  return out;
}

function tokenizeIngredient(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);
}

/** Key ingredients that should appear somewhere in steps when listed. */
function findIngredientStepGaps(page: GoldenRecipePage): string[] {
  const stepText = page.steps.map((s) => `${s.title || ""} ${s.instruction}`).join(" ").toLowerCase();
  const gaps: string[] = [];
  const skip = /^(salt|pepper|water|oil|butter|garlic|onion|sugar|flour|rice)$/i;
  for (const ing of page.ingredients) {
    const name = (ing.name || "").trim();
    if (!name || skip.test(name.split(/\s+/)[0] || "")) continue;
    const tokens = tokenizeIngredient(name);
    const key = tokens[0];
    if (!key || key.length < 5) continue;
    if (/(sauce|cheese|seasoning|spice|herb)/i.test(name) && name.split(/\s+/).length <= 2) continue;
    if (!stepText.includes(key) && !stepText.includes(name.toLowerCase())) {
      gaps.push(name);
    }
  }
  return gaps.slice(0, 4);
}

function editorialFindings(page: GoldenRecipePage): Finding[] {
  const findings: Finding[] = [];
  const title = page.displayTitle || page.title || "";

  if (!title.trim()) {
    findings.push({ severity: "critical", code: "title_missing", message: "missing title", field: "title" });
  } else {
    if (TITLE_DUP_WORD.test(title)) {
      findings.push({
        severity: "critical",
        code: "title_duplicate_wording",
        message: "duplicate word in title",
        field: "title",
        sample: title,
      });
    }
    if (TITLE_WEAK.test(title)) {
      findings.push({
        severity: "warning",
        code: "title_ai_phrase",
        message: "AI-sounding marketing phrasing in title",
        field: "title",
        sample: title,
      });
    }
    if (TITLE_METADATA.test(title)) {
      findings.push({
        severity: "critical",
        code: "title_metadata",
        message: "title reads like internal metadata",
        field: "title",
        sample: title,
      });
    } else if (isRoboticTitle(title)) {
      findings.push({
        severity: "info",
        code: "title_robotic",
        message: "title is generic (optional flavor cue)",
        field: "title",
        sample: title,
      });
    }
    const score = scoreRecipeTitle(title, {
      mealFormat: page.tags?.find((t) => t.startsWith("format:"))?.replace("format:", ""),
      protein: page.tags?.find((t) => t.startsWith("protein:"))?.replace("protein:", ""),
      cuisine: page.cuisine,
    });
    if (!score.pass) {
      findings.push({
        severity: "info",
        code: "title_quality_gate",
        message: "title quality gate suggests optional rewrite",
        field: "title",
        sample: score.suggestedTitle || title,
      });
    }
  }

  const desc = String(page.description || "");
  if (!desc.trim() || desc.trim().length < 40) {
    findings.push({
      severity: "warning",
      code: "intro_thin",
      message: "intro/description is too short",
      field: "description",
      sample: desc.trim().slice(0, 120),
    });
  }
  const introHits = detectGenericAiWording(`${page.subtitle || ""} ${desc}`);
  if (introHits.length > 0) {
    findings.push({
      severity: "info",
      code: "intro_generic_ai_wording",
      message: `generic phrasing: ${introHits.join(", ")}`,
      field: "description",
    });
  }

  if (stepsFailQualityBar(page.steps)) {
    findings.push({
      severity: "critical",
      code: "steps_quality_bar",
      message: "steps fail crew instruction quality bar (generic, short, or grill template)",
      field: "steps",
    });
  }

  for (let i = 0; i < page.steps.length; i++) {
    const body = String(page.steps[i]?.instruction || "").trim();
    if (!body) {
      findings.push({
        severity: "critical",
        code: "step_missing",
        message: `step ${i + 1} missing instruction`,
        field: "steps",
      });
    } else if (FILLER_STEP.test(body)) {
      findings.push({
        severity: "warning",
        code: "step_generic",
        message: `step ${i + 1} is filler`,
        field: "steps",
        sample: body,
      });
    }
  }

  const gaps = findIngredientStepGaps(page);
  if (gaps.length >= 2) {
    findings.push({
      severity: "warning",
      code: "ingredient_step_gap",
      message: `key ingredients not referenced in steps: ${gaps.join(", ")}`,
      field: "steps",
    });
  }

  return findings;
}

function contentFindings(page: GoldenRecipePage): {
  pass: boolean;
  score: number;
  needsManualReview: boolean;
  findings: Finding[];
} {
  const audit = auditGoldenRecipeContent(page);
  const findings: Finding[] = audit.issues.map((i) => ({
    severity: i.severity === "error" ? "critical" : i.severity === "warn" ? "warning" : "info",
    code: i.code,
    message: i.message,
    field: "content",
  }));
  return {
    pass: audit.pass,
    score: audit.score,
    needsManualReview: audit.needsManualReview,
    findings,
  };
}

function findDuplicateTitles(rows: RecipeRow[]): Finding[] {
  const byNorm = new Map<string, RecipeRow[]>();
  for (const r of rows) {
    const key = r.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key) continue;
    const list = byNorm.get(key) || [];
    list.push(r);
    byNorm.set(key, list);
  }
  const dupes: Finding[] = [];
  for (const [, list] of byNorm) {
    if (list.length < 2) continue;
    dupes.push({
      severity: "warning",
      code: "duplicate_title",
      message: `duplicate title across: ${list.map((r) => `${r.catalog}/${r.slug}`).join(", ")}`,
    });
  }
  return dupes;
}

function auditFile(
  catalog: CatalogKind,
  filePath: string,
  fix: boolean,
  rebuildWeak: boolean,
): RecipeRow {
  let page = readJson(filePath);
  const slug = page.slug || path.basename(filePath, ".json");
  const fixed: RecipeRow["fixed"] = {};

  const content = contentFindings(page);
  const findings = [...editorialFindings(page), ...content.findings];

  if (fix) {
    const tf = titleFix(page.title || "");
    if (tf.changed) {
      page.title = tf.next;
      if (page.displayTitle) page.displayTitle = tf.next;
      fixed.titleChanged = true;
    }
    const normalized = normalizePageCopy(page);
    const polished = polishPageCopy(normalized);
    if (JSON.stringify(polished) !== JSON.stringify(page)) {
      page = polished;
      fixed.copyNormalized = true;
    }
  }

  const shouldRebuild = rebuildWeak && fix && (stepsFailQualityBar(page.steps) || !content.pass);

  if (shouldRebuild) {
    const built =
      catalog === "golden-100"
        ? (() => {
            const def = getGoldenRecipeBySlug(slug);
            return def ? buildGoldenRecipePage(def) : null;
          })()
        : (() => {
            const def = getPerformanceRecipeBySlug(slug);
            return def ? buildPerformanceRecipePage(def) : null;
          })();

    if (built) {
      const builtAudit = auditGoldenRecipeContent(built);
      const diskAudit = auditGoldenRecipeContent(page);
      const builtBetter =
        builtAudit.score > diskAudit.score ||
        (builtAudit.pass && !diskAudit.pass) ||
        (stepsFailQualityBar(page.steps) && !stepsFailQualityBar(built.steps));
      if (builtBetter) {
        page = { ...built, heroImage: page.heroImage, thumbImage: page.thumbImage };
        fixed.rebuiltFromManifest = true;
      }
    }
  }

  if (fix && (fixed.titleChanged || fixed.copyNormalized || fixed.rebuiltFromManifest)) {
    writeJson(filePath, page);
  }

  const finalContent = contentFindings(page);
  const finalEditorial = editorialFindings(page);
  const allFindings = [...finalEditorial, ...finalContent.findings];

  return {
    catalog,
    slug,
    title: page.displayTitle || page.title || slug,
    file: path.relative(ROOT, filePath),
    contentScore: finalContent.score,
    contentPass: finalContent.pass,
    needsManualReview: finalContent.needsManualReview || allFindings.some((f) => f.severity === "critical"),
    findings: allFindings,
    fixed: Object.keys(fixed).length ? fixed : undefined,
  };
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const fix = args.has("--fix");
  const rebuildWeak = args.has("--rebuild-weak");

  if (rebuildWeak) await initCuratedRecipeStore();

  const goldenFiles = listJsonFiles(GOLDEN_DIR);
  const perfFiles = listJsonFiles(PERF_DIR);
  const rows: RecipeRow[] = [];

  for (const fp of goldenFiles) rows.push(auditFile("golden-100", fp, fix, rebuildWeak));
  for (const fp of perfFiles) rows.push(auditFile("performance-meals", fp, fix, rebuildWeak));

  const duplicateTitleFindings = findDuplicateTitles(rows);
  const fixedRows = rows.filter((r) => r.fixed);
  const critical = rows.filter((r) => r.findings.some((f) => f.severity === "critical"));
  const manual = rows.filter((r) => r.needsManualReview);
  const contentFail = rows.filter((r) => !r.contentPass);

  if (!fs.existsSync(REVIEW_DIR)) fs.mkdirSync(REVIEW_DIR, { recursive: true });

  const summary = {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    mode: fix ? (rebuildWeak ? "fix+rebuild-weak" : "fix") : "audit",
    fixedCount: fixedRows.length,
    criticalRecipeCount: critical.length,
    contentFailCount: contentFail.length,
    manualReviewCount: manual.length,
    duplicateTitles: duplicateTitleFindings,
    fixed: fixedRows.map((r) => ({ catalog: r.catalog, slug: r.slug, ...r.fixed })),
    critical: critical.map((r) => ({
      catalog: r.catalog,
      slug: r.slug,
      title: r.title,
      findings: r.findings.filter((f) => f.severity === "critical"),
    })),
    manualReview: manual.map((r) => ({
      catalog: r.catalog,
      slug: r.slug,
      title: r.title,
      score: r.contentScore,
      findings: r.findings.filter((f) => f.severity !== "info").slice(0, 8),
    })),
  };

  const jsonPath = path.join(REVIEW_DIR, "full-editorial-audit.json");
  fs.writeFileSync(jsonPath, JSON.stringify({ summary, rows }, null, 2) + "\n", "utf8");

  const md: string[] = [
    "# Full curated editorial audit",
    "",
    `Generated: ${summary.generatedAt}`,
    "",
    "| Metric | Count |",
    "|--------|------:|",
    `| Total recipes | ${summary.total} |`,
    `| Auto-fixed | ${summary.fixedCount} |`,
    `| Content audit fail | ${summary.contentFailCount} |`,
    `| Critical findings | ${summary.criticalRecipeCount} |`,
    `| Manual review queue | ${summary.manualReviewCount} |`,
    `| Mode | ${summary.mode} |`,
    "",
    "## Recipes fixed",
    "",
    ...(fixedRows.length
      ? fixedRows.map(
          (r) =>
            `- \`${r.catalog}/${r.slug}\` — ${JSON.stringify(r.fixed)}`,
        )
      : ["- (none)"]),
    "",
    "## Duplicate titles",
    "",
    ...(duplicateTitleFindings.length
      ? duplicateTitleFindings.map((f) => `- ${f.message}`)
      : ["- None detected"]),
    "",
    "## Still requiring intervention",
    "",
    ...(manual.length
      ? manual.map((r) => {
          const issues = r.findings
            .filter((f) => f.severity !== "info")
            .map((f) => `\`${f.code}\`: ${f.message}`)
            .join("; ");
          return `- \`${r.catalog}/${r.slug}\` — **${r.title}** (score ${r.contentScore}) — ${issues || "review"}`;
        })
      : ["- All recipes pass content bar after fixes"]),
    "",
    "## Critical blockers",
    "",
    ...(critical.length
      ? critical.map((r) => {
          const codes = r.findings
            .filter((f) => f.severity === "critical")
            .map((f) => f.code)
            .join(", ");
          return `- \`${r.slug}\` (${r.catalog}) — ${codes}`;
        })
      : ["- None"]),
  ];

  const mdPath = path.join(REVIEW_DIR, "full-editorial-audit.md");
  fs.writeFileSync(mdPath, md.join("\n") + "\n", "utf8");

  console.log(`[curated-full-editorial-audit] total=${rows.length} fixed=${fixedRows.length} critical=${critical.length} manual=${manual.length}`);
  console.log(`[curated-full-editorial-audit] report → ${path.relative(ROOT, mdPath)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
