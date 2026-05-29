import fs from "node:fs";
import path from "node:path";
import { normalizeGoldenRecipePageCopy, normalizeRecipeSpacing } from "../shared/recipe/spacing.js";
import { isRoboticTitle } from "../shared/generation-reliability.js";
import { detectGenericAiWording } from "../shared/curated-recipe/qa-engine/wording.js";
import { scoreRecipeTitle } from "../shared/recipe-title-quality.js";

type Severity = "critical" | "warning" | "info";

type CatalogKind = "golden-100" | "performance-meals";

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  field?: string;
  sample?: string;
};

type RecipeAuditRow = {
  catalog: CatalogKind;
  slug: string;
  title: string;
  file: string;
  findings: Finding[];
  fixed?: {
    titleChanged?: boolean;
    copyNormalized?: boolean;
  };
};

const ROOT = path.resolve(process.cwd());
const GOLDEN_DIR = path.join(ROOT, "client", "public", "catalog", "golden-100", "pages");
const PERF_DIR = path.join(ROOT, "client", "public", "catalog", "performance-meals", "pages");
const PUBLIC_DIR = path.join(ROOT, "client", "public");

const TITLE_DUP_WORD = /\b([A-Za-z]{3,})\s+\1\b/i;
const TITLE_WEAK = /\b(ultimate|flavor[- ]packed|perfect|best ever|restaurant[- ]quality|mouth[- ]watering)\b/i;
const TITLE_METADATA = /\b(plated\s+main|comfort\s+bowl|protein\s+skillet|any\s+\w+\s+(skillet|bowl)|performance\s+bowl)\b/i;
const GENERIC_ING = /\b(spices|seasoning|sauce|oil|cheese|greens|vegetables)\b/i;
const VAGUE_AMOUNT = /\b(to taste|as needed|as desired)\b/i;
const FILLER_STEP = /^(cook until done|serve and enjoy|plate and serve|enjoy|serve hot|garnish and serve)\.?$/i;
const WEAK_STEP = /^(cook|heat|prepare|make)\s+(the\s+)?(meal|food|dish)\.?$/i;

function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .map((f) => path.join(dir, f));
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath: string, data: any): void {
  const text = JSON.stringify(data, null, 2) + "\n";
  fs.writeFileSync(filePath, text, "utf8");
}

function existsInPublic(p: string): boolean {
  const raw = String(p || "").trim();
  if (!raw) return false;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return true;
  if (!raw.startsWith("/")) return false;
  const abs = path.join(PUBLIC_DIR, raw.replace(/^\//, ""));
  return fs.existsSync(abs);
}

function titleFix(title: string): { next: string; changed: boolean } {
  const t = (title || "").replace(/\s+/g, " ").trim();
  if (!t) return { next: t, changed: false };
  let next = t;
  next = next.replace(TITLE_DUP_WORD, (_m, w) => `${w}`);
  next = next.replace(/\bSheet Pan\b\s+\bSheet Pan\b/i, "Sheet Pan");
  next = next.replace(/\bSkillet\b\s+\bSkillet\b/i, "Skillet");
  next = next.replace(/\bBowl(s)?\b\s+\bBowl(s)?\b/i, "Bowls");
  next = next.replace(/\s{2,}/g, " ").trim();
  return { next, changed: next !== t };
}

function normalizePerformancePageCopy(page: Record<string, unknown>): Record<string, unknown> {
  // Performance pages match Golden-100 schema for editorial fields.
  const out = { ...page };
  const norm = (v: unknown) => (typeof v === "string" ? normalizeRecipeSpacing(v) : v);
  if (typeof out.title === "string") out.title = norm(out.title);
  if (typeof out.subtitle === "string") out.subtitle = norm(out.subtitle);
  if (typeof out.description === "string") out.description = norm(out.description);
  for (const key of ["proTips", "tonightSpread", "leftovers"] as const) {
    if (Array.isArray(out[key])) out[key] = (out[key] as unknown[]).map(norm);
  }
  if (Array.isArray(out.steps)) {
    out.steps = (out.steps as unknown[]).map((s) => {
      if (!s || typeof s !== "object") return s;
      const step = { ...(s as Record<string, unknown>) };
      if (typeof step.title === "string") step.title = norm(step.title);
      if (typeof step.instruction === "string") step.instruction = norm(step.instruction);
      return step;
    });
  }
  return out;
}

function auditOne(
  catalog: CatalogKind,
  filePath: string,
  fix: boolean,
): RecipeAuditRow {
  const page = readJson(filePath);
  const slug = String(page.slug || path.basename(filePath, ".json"));
  const title = String(page.title || "");
  const findings: Finding[] = [];
  const fixed: RecipeAuditRow["fixed"] = {};

  // Title quality
  if (!title.trim()) {
    findings.push({ severity: "critical", code: "title_missing", message: "missing title", field: "title" });
  } else {
    if (TITLE_DUP_WORD.test(title)) {
      findings.push({ severity: "critical", code: "title_duplicate_wording", message: "duplicate word in title", field: "title", sample: title });
    }
    if (TITLE_WEAK.test(title)) {
      findings.push({ severity: "warning", code: "title_ai_phrase", message: "AI-sounding marketing phrasing in title", field: "title", sample: title });
    }
    if (TITLE_METADATA.test(title)) {
      findings.push({ severity: "critical", code: "title_metadata", message: "title reads like internal metadata", field: "title", sample: title });
    } else if (isRoboticTitle(title)) {
      // Many human titles are short by design; treat robotic signal as a warning unless it matches hard metadata patterns.
      findings.push({ severity: "warning", code: "title_robotic", message: "title is very generic (consider adding a specific flavor cue)", field: "title", sample: title });
    }
    const score = scoreRecipeTitle(title, { mealFormat: String(page.mealFormat || ""), protein: String(page.protein || "") });
    if (!score.pass) {
      findings.push({ severity: "warning", code: "title_quality_gate", message: "title quality gate suggests a rewrite", field: "title", sample: score.suggestedTitle || title });
    }
  }

  // Intro / description
  const desc = String(page.description || "");
  if (!desc.trim() || desc.trim().length < 40) {
    findings.push({ severity: "warning", code: "intro_thin", message: "intro/description is too short", field: "description", sample: desc.trim().slice(0, 120) });
  }
  const introHits = detectGenericAiWording(`${page.subtitle || ""} ${page.shortDescription || ""} ${desc}`);
  if (introHits.length > 0) {
    findings.push({ severity: "info", code: "intro_generic_ai_wording", message: `generic phrasing: ${introHits.join(", ")}`, field: "description" });
  }

  // Ingredients specificity
  const ingredients = Array.isArray(page.ingredients) ? page.ingredients : [];
  if (ingredients.length < 6) {
    findings.push({ severity: "warning", code: "ingredients_thin", message: `only ${ingredients.length} ingredients`, field: "ingredients" });
  }
  for (const ing of ingredients) {
    const name = String(ing?.name || "").trim();
    const unit = String(ing?.unit || "").trim();
    const qty = String(ing?.quantity || "").trim();
    if (!name) {
      findings.push({ severity: "critical", code: "ingredient_missing_name", message: "ingredient missing name", field: "ingredients" });
      continue;
    }
    if (GENERIC_ING.test(name) && name.split(/\s+/).length <= 2) {
      findings.push({ severity: "warning", code: "ingredient_vague", message: `vague ingredient: "${name}"`, field: "ingredients", sample: name });
    }
    if (VAGUE_AMOUNT.test(`${qty} ${unit} ${ing?.notes || ""}`)) {
      findings.push({ severity: "info", code: "ingredient_vague_amount", message: `vague amount: "${name}"`, field: "ingredients", sample: `${qty} ${unit}`.trim() });
    }
  }

  // Steps realism + specificity
  const steps = Array.isArray(page.steps) ? page.steps : [];
  if (steps.length < 4) {
    findings.push({ severity: "warning", code: "steps_thin", message: `only ${steps.length} steps`, field: "steps" });
  }
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i] || {};
    const body = String(s.instruction || "").trim();
    if (!body) {
      findings.push({ severity: "critical", code: "step_missing", message: `step ${i + 1} missing instruction`, field: "steps" });
      continue;
    }
    if (FILLER_STEP.test(body) || WEAK_STEP.test(body)) {
      findings.push({ severity: "warning", code: "step_generic", message: `step ${i + 1} is generic`, field: "steps", sample: body });
    }
    const hits = detectGenericAiWording(`${s.title || ""} ${body}`);
    if (hits.length >= 2) {
      findings.push({ severity: "info", code: "step_ai_wording", message: `generic phrasing in step ${i + 1}: ${hits.join(", ")}`, field: "steps", sample: body.slice(0, 140) });
    }
  }

  // Scaling sanity
  const baseServings = Number(page.baseServings || page.baseServings === 0 ? page.baseServings : page.baseServings);
  const crewSize = Number(page.crewSize || 0);
  if (Number.isFinite(crewSize) && crewSize > 0 && Number.isFinite(baseServings) && baseServings > 0) {
    if (Math.abs(crewSize - baseServings) >= 8) {
      findings.push({ severity: "info", code: "scaling_check", message: `crewSize (${crewSize}) far from baseServings (${baseServings})`, field: "scaling" });
    }
  }

  // Imagery presence + file existence
  const hero = String(page.heroImage || "").trim();
  const thumb = String(page.thumbImage || "").trim();
  if (!hero) {
    findings.push({ severity: "critical", code: "hero_missing", message: "missing heroImage", field: "imagery" });
  } else if (hero.startsWith("/images/") && !existsInPublic(hero)) {
    findings.push({ severity: "critical", code: "hero_missing_file", message: "heroImage file missing in client/public", field: "imagery", sample: hero });
  }
  if (thumb && thumb.startsWith("/images/") && !existsInPublic(thumb)) {
    findings.push({ severity: "warning", code: "thumb_missing_file", message: "thumbImage file missing in client/public", field: "imagery", sample: thumb });
  }

  // Safe auto-fixes
  if (fix) {
    let nextPage: any = page;

    const tf = titleFix(String(nextPage.title || ""));
    if (tf.changed) {
      nextPage.title = tf.next;
      if (typeof nextPage.displayTitle === "string") nextPage.displayTitle = tf.next;
      if (typeof nextPage.seoTitle === "string") {
        nextPage.seoTitle = nextPage.seoTitle.replace(String(page.title || ""), tf.next);
      }
      fixed.titleChanged = true;
    }

    const normalized =
      catalog === "golden-100"
        ? normalizeGoldenRecipePageCopy(nextPage)
        : normalizePerformancePageCopy(nextPage);
    const changedCopy = JSON.stringify(normalized) !== JSON.stringify(nextPage);
    if (changedCopy) {
      nextPage = normalized;
      fixed.copyNormalized = true;
    }

    if (fixed.titleChanged || fixed.copyNormalized) {
      writeJson(filePath, nextPage);
    }
  }

  return {
    catalog,
    slug,
    title: String((fix ? readJson(filePath).title : page.title) || title),
    file: path.relative(ROOT, filePath),
    findings,
    fixed: Object.keys(fixed).length ? fixed : undefined,
  };
}

function severityRank(s: Severity): number {
  return s === "critical" ? 0 : s === "warning" ? 1 : 2;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const fix = args.has("--fix");

  const goldenFiles = listJsonFiles(GOLDEN_DIR);
  const perfFiles = listJsonFiles(PERF_DIR);

  const rows: RecipeAuditRow[] = [];
  for (const fp of goldenFiles) rows.push(auditOne("golden-100", fp, fix));
  for (const fp of perfFiles) rows.push(auditOne("performance-meals", fp, fix));

  const total = rows.length;
  const bySeverity = { critical: 0, warning: 0, info: 0 };
  for (const r of rows) {
    for (const f of r.findings) (bySeverity as any)[f.severity] += 1;
  }

  rows.sort((a, b) => {
    const aMin = Math.min(...a.findings.map((f) => severityRank(f.severity)), 9);
    const bMin = Math.min(...b.findings.map((f) => severityRank(f.severity)), 9);
    if (aMin !== bMin) return aMin - bMin;
    return (a.slug || "").localeCompare(b.slug || "");
  });

  const outDir = path.join(ROOT, "review");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "editorial-audit-150.json");
  fs.writeFileSync(jsonPath, JSON.stringify({ total, bySeverity, rows }, null, 2) + "\n", "utf8");

  const md: string[] = [];
  md.push(`# Editorial Audit (150)\n`);
  md.push(`- Total recipes: **${total}**`);
  md.push(`- Findings: **${bySeverity.critical} critical**, **${bySeverity.warning} warning**, **${bySeverity.info} info**`);
  md.push(`- Mode: **${fix ? "fix + audit" : "audit only"}**\n`);

  const worst = rows.filter((r) => r.findings.some((f) => f.severity === "critical"));
  md.push(`## Critical blockers (${worst.length} recipes)\n`);
  for (const r of worst) {
    md.push(`- \`${r.catalog}\` \`${r.slug}\` — **${r.title}** (\`${r.file}\`)`);
    for (const f of r.findings.filter((x) => x.severity === "critical")) {
      md.push(`  - **${f.code}**: ${f.message}${f.sample ? ` — \`${String(f.sample).slice(0, 140)}\`` : ""}`);
    }
  }

  md.push(`\n## Full findings\n`);
  for (const r of rows) {
    if (r.findings.length === 0) continue;
    md.push(`### ${r.catalog} / ${r.slug}`);
    md.push(`- Title: **${r.title}**`);
    md.push(`- File: \`${r.file}\``);
    if (r.fixed) md.push(`- Auto-fixes: \`${JSON.stringify(r.fixed)}\``);
    for (const f of r.findings) {
      md.push(`- **${f.severity}** \`${f.code}\`${f.field ? ` (${f.field})` : ""}: ${f.message}${f.sample ? ` — \`${String(f.sample).slice(0, 160)}\`` : ""}`);
    }
    md.push("");
  }

  const mdPath = path.join(outDir, "editorial-audit-150.md");
  fs.writeFileSync(mdPath, md.join("\n") + "\n", "utf8");

  // eslint-disable-next-line no-console
  console.log("[audit-editorial-150] wrote", path.relative(ROOT, mdPath), "and", path.relative(ROOT, jsonPath));
  if (bySeverity.critical > 0) process.exitCode = 2;
}

main();

