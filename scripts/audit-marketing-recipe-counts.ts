/**
 * Audit marketing surfaces for stale hard-coded recipe counts.
 * Fails on outdated 100/150/200 counts in user-facing client + SEO copy.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import {
  APPROVED_CATALOG_TOTAL,
  CURATED_RECIPE_MARKETING_FLOOR,
  marketingRecipeCount,
} from "../shared/meal-catalog/curated-count.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SCAN_DIRS = ["client/src", "shared/seo", "shared/meal-catalog"] as const;

const STALE_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "100+ recipes", regex: /\b100\+?\s*(?:firehall|firefighter|curated|hall|recipes|meals)/i },
  { label: "150+ recipes", regex: /\b150\+?\s*(?:firehall|firefighter|curated|recipes|meals)/i },
  { label: "200+ recipes", regex: /\b200\+?\s*(?:firehall|firefighter|curated|recipes|meals)/i },
  { label: "214 count fallback", regex: /\b214\b/ },
  { label: "172 catalog reference", regex: /\b172\s+(?:hall|recipes|curated)/i },
  { label: "100 Firehall Classics (marketing)", regex: /100\s+Firehall\s+Classics/i },
  { label: "150 Curated Recipes (marketing)", regex: /150\s+Curated\s+Recipes/i },
];

const IGNORE_PATH_PARTS = ["/admin", "/node_modules/", "\\admin\\"];

function collectFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const full = path.join(abs, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(path.relative(ROOT, full)));
      continue;
    }
    if (!/\.(tsx?|jsx?)$/.test(entry.name)) continue;
    out.push(path.relative(ROOT, full));
  }
  return out;
}

function shouldScan(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  if (IGNORE_PATH_PARTS.some((part) => normalized.includes(part.replace(/\\/g, "/")))) {
    return false;
  }
  return true;
}

function scanFile(relPath: string): string[] {
  const content = fs.readFileSync(path.join(ROOT, relPath), "utf8");
  const hits: string[] = [];
  for (const { label, regex } of STALE_PATTERNS) {
    if (regex.test(content)) {
      hits.push(`${label} in ${relPath}`);
    }
  }
  return hits;
}

function main() {
  const catalog = buildApprovedCatalog();
  const liveCount = marketingRecipeCount(catalog.recipeCount);
  const errors: string[] = [];

  if (catalog.recipeCount !== APPROVED_CATALOG_TOTAL) {
    errors.push(
      `Approved catalog mismatch: expected ${APPROVED_CATALOG_TOTAL}, got ${catalog.recipeCount}`,
    );
  }

  if (CURATED_RECIPE_MARKETING_FLOOR !== 250) {
    errors.push(`Marketing floor should be 250, got ${CURATED_RECIPE_MARKETING_FLOOR}`);
  }

  if (liveCount < 250) {
    errors.push(`Marketing count below floor: ${liveCount}`);
  }

  const files = SCAN_DIRS.flatMap((dir) => collectFiles(dir)).filter(shouldScan);
  const staleHits = files.flatMap(scanFile);
  errors.push(...staleHits);

  const reportPath = path.join(ROOT, "review", "marketing-recipe-count-audit.md");
  const body = [
    "# Marketing recipe count audit",
    "",
    `Generated: **${new Date().toISOString()}**`,
    "",
    "## Catalog",
    "",
    `- Approved recipes: **${catalog.recipeCount}**`,
    `- Marketing display: **${liveCount}+**`,
    `- Floor: **${CURATED_RECIPE_MARKETING_FLOOR}+**`,
    "",
    "## Stale copy scan",
    "",
    staleHits.length === 0
      ? "- No stale hard-coded counts found in scanned surfaces."
      : staleHits.map((hit) => `- ${hit}`).join("\n"),
    "",
    "## Result",
    "",
    errors.length === 0 ? "**PASS**" : `**FAIL** — ${errors.length} issue(s)`,
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, body, "utf8");

  if (errors.length > 0) {
    console.error("[audit:marketing-recipe-counts] FAIL");
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log(
    `[audit:marketing-recipe-counts] PASS — ${catalog.recipeCount} approved, marketing ${liveCount}+`,
  );
}

main();
