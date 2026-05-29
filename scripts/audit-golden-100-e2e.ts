#!/usr/bin/env tsx
/**
 * End-to-end audit for Golden 100 public recipe pages.
 *
 * Checks (per slug):
 * - page JSON exists and validates against schema
 * - required fields present (via schema)
 * - hero + thumb paths: no route-relative `images/...`
 * - local /images paths exist on disk
 * - related slugs resolve to page JSON
 * - Golden page content quality gate (beginner-friendly-ish heuristics)
 * - curated DB status for slug (published) when expected
 * - ensures the public app recipe page does not contain a hardcoded "Editorial QA" block
 */

import fs from "node:fs";
import path from "node:path";
import { goldenRecipePageSchema } from "../shared/golden-100/recipe-page-schema.js";
import { validateGoldenRecipePage } from "../server/golden-100/recipe-page-validator.js";
import { initCuratedRecipeStore, getCuratedRecipeById } from "../server/curated-recipe-store.js";
import { getSharedLocalDb } from "../server/sqlite.js";

type Severity = "fail" | "warn";

type Issue = {
  slug: string;
  severity: Severity;
  code: string;
  message: string;
  path?: string;
  fix?: string;
};

function isAbsoluteHttp(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isRouteRelative(url: string): boolean {
  return /^images\//i.test(url.trim());
}

function diskPathForPublicImages(url: string): string | null {
  if (!url.startsWith("/images/")) return null;
  const rel = url.replace(/^\/images\//, "");
  return path.join(process.cwd(), "client", "public", "images", rel);
}

async function checkExternalUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const head = await fetch(url, { method: "HEAD", signal: controller.signal });
    if (head.ok) {
      clearTimeout(t);
      return true;
    }
    const get = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Range: "bytes=0-0" },
    });
    clearTimeout(t);
    return get.ok;
  } catch {
    return false;
  }
}

function fileExistsMaybe(p: string | null): boolean {
  if (!p) return false;
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function loadJson(abs: string): unknown {
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

async function main(): Promise<void> {
  const issues: Issue[] = [];

  // Guard: ensure we didn't accidentally re-introduce the public checklist in the recipe page component.
  const recipePagePath = path.join(process.cwd(), "client", "src", "pages", "golden-recipe-page.tsx");
  const recipePageSrc = fs.readFileSync(recipePagePath, "utf8");
  for (const needle of ["Editorial QA", "publish approved", "firefighter appropriate"]) {
    if (recipePageSrc.includes(needle)) {
      issues.push({
        slug: "__app__",
        severity: "fail",
        code: "public_editorial_qa_render",
        message: `Found "${needle}" in golden recipe page React component`,
        path: recipePagePath,
        fix: "Remove public-facing checklist block from the component.",
      });
    }
  }

  const indexPath = path.join(process.cwd(), "client", "public", "catalog", "golden-100", "index.json");
  const index = loadJson(indexPath) as any;
  const slugs: string[] = Array.isArray(index?.recipes) ? index.recipes.map((r: any) => String(r.slug)) : [];
  if (slugs.length !== 100) {
    issues.push({
      slug: "__index__",
      severity: "fail",
      code: "index_invalid",
      message: `index.json recipes length=${slugs.length} (expected 100)`,
      path: indexPath,
      fix: "Regenerate Golden 100 index.json.",
    });
  }

  // Load curated DB mapping slug -> recipe_id (and status)
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();
  const rows = db
    .prepare(`SELECT recipe_id, slug, status FROM curated_recipes WHERE status != 'archived'`)
    .all() as Array<{ recipe_id: string; slug: string; status: string }>;
  const bySlug = new Map(rows.map((r) => [String(r.slug), { recipeId: String(r.recipe_id), status: String(r.status) }]));

  const pagesDir = path.join(process.cwd(), "client", "public", "catalog", "golden-100", "pages");

  let pass = 0;
  let fail = 0;
  let warn = 0;

  for (const slug of slugs) {
    const pagePath = path.join(pagesDir, `${slug}.json`);
    if (!fs.existsSync(pagePath)) {
      issues.push({
        slug,
        severity: "fail",
        code: "page_missing",
        message: "page JSON missing",
        path: pagePath,
        fix: "Run: npm run catalog:generate-pages",
      });
      fail++;
      continue;
    }

    const raw = loadJson(pagePath);
    const schema = goldenRecipePageSchema.safeParse(raw);
    if (!schema.success) {
      const msg = schema.error.issues[0]
        ? `${schema.error.issues[0].path.join(".")}: ${schema.error.issues[0].message}`
        : "schema validation failed";
      issues.push({
        slug,
        severity: "fail",
        code: "schema",
        message: msg,
        path: pagePath,
        fix: "Regenerate or repair page JSON to match goldenRecipePageSchema.",
      });
      fail++;
      continue;
    }

    // Content quality gate (beginner-friendly-ish)
    const v = validateGoldenRecipePage(schema.data);
    for (const i of v.issues) {
      issues.push({
        slug,
        severity: i.severity === "error" ? "fail" : "warn",
        code: `page_${i.code}`,
        message: i.message,
        path: pagePath,
        fix: "Regenerate page copy or manually edit weak steps/title.",
      });
    }

    // Images
    for (const field of ["heroImage", "thumbImage"] as const) {
      const url = String((schema.data as any)[field] || "");
      if (!url) {
        issues.push({
          slug,
          severity: "fail",
          code: `${field}_missing`,
          message: `${field} missing`,
          path: pagePath,
          fix: "Run: npm run catalog:generate-images",
        });
        continue;
      }
      if (isRouteRelative(url)) {
        issues.push({
          slug,
          severity: "fail",
          code: `${field}_route_relative`,
          message: `${field} is route-relative (${url})`,
          path: pagePath,
          fix: `Change to "/${url}" (site-root)`,
        });
        continue;
      }
      if (url.startsWith("/images/")) {
        const disk = diskPathForPublicImages(url);
        if (!fileExistsMaybe(disk)) {
          issues.push({
            slug,
            severity: "fail",
            code: `${field}_missing_local_file`,
            message: `${field} points to missing file (${url})`,
            path: disk || url,
            fix: "Generate or add the image under client/public/images/ (run catalog:generate-images).",
          });
        }
      } else if (isAbsoluteHttp(url)) {
        const ok = await checkExternalUrl(url);
        if (!ok) {
          issues.push({
            slug,
            severity: "warn",
            code: `${field}_external_unreachable`,
            message: `${field} external URL not reachable from this machine`,
            path: url,
            fix: "Prefer local /images assets for Golden 100; or ensure external URL is stable.",
          });
        }
      } else {
        issues.push({
          slug,
          severity: "fail",
          code: `${field}_invalid_url`,
          message: `${field} is neither /images/... nor http(s)`,
          path: pagePath,
          fix: "Fix path to be site-root or absolute URL.",
        });
      }
    }

    // Related recipes resolve
    const related: string[] = Array.isArray((schema.data as any).relatedSlugs)
      ? (schema.data as any).relatedSlugs.map(String)
      : [];
    for (const rel of related) {
      const relPath = path.join(pagesDir, `${rel}.json`);
      if (!fs.existsSync(relPath)) {
        issues.push({
          slug,
          severity: "warn",
          code: "related_missing_page",
          message: `related slug missing page JSON: ${rel}`,
          path: relPath,
          fix: "Regenerate pages or remove dead related slug.",
        });
      }
    }

    // Duplicate status / publish status in curated DB (expected for deploy)
    const dbRow = bySlug.get(slug);
    if (!dbRow) {
      issues.push({
        slug,
        severity: "fail",
        code: "db_not_seeded",
        message: "slug not present in curated_recipes",
        fix: "Seed curated DB for this slug (golden-100 seeding step).",
      });
    } else if (dbRow.status !== "published") {
      issues.push({
        slug,
        severity: "fail",
        code: "db_not_published",
        message: `curated_recipes.status=${dbRow.status} (expected published)`,
        fix: "Publish the recipe in curated_recipes (or seed/publish Golden 100 set).",
      });
    } else {
      // Ensure recipe can be hydrated.
      const hydrated = getCuratedRecipeById(dbRow.recipeId);
      if (!hydrated) {
        issues.push({
          slug,
          severity: "fail",
          code: "db_hydration_failed",
          message: "could not hydrate recipe from DB id",
          fix: "Investigate curated-recipe-store hydration for this recipe_id.",
        });
      }
    }

    const myIssues = issues.filter((i) => i.slug === slug);
    const hasFail = myIssues.some((i) => i.severity === "fail");
    const hasWarn = myIssues.some((i) => i.severity === "warn");
    if (!hasFail && !hasWarn) pass++;
    else {
      if (hasFail) fail++;
      if (hasWarn) warn++;
    }
  }

  const outDir = path.join(process.cwd(), "review");
  fs.mkdirSync(outDir, { recursive: true });
  const outJson = path.join(outDir, "golden-100-e2e-audit.json");
  const outMd = path.join(outDir, "golden-100-e2e-audit.md");

  fs.writeFileSync(
    outJson,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        pass,
        fail,
        warn,
        total: slugs.length,
        issues,
      },
      null,
      2,
    ),
  );

  const md: string[] = [];
  md.push("# Golden 100 — E2E audit report", "");
  md.push(`Generated: **${new Date().toISOString()}**`, "");
  md.push(`- **PASS**: ${pass}`, `- **FAIL**: ${fail}`, `- **WARN**: ${warn}`, `- **TOTAL**: ${slugs.length}`, "");
  md.push("## Issues", "");
  if (!issues.length) {
    md.push("_No issues found._", "");
  } else {
    const bySlugIssues = new Map<string, Issue[]>();
    for (const i of issues) {
      const arr = bySlugIssues.get(i.slug) ?? [];
      arr.push(i);
      bySlugIssues.set(i.slug, arr);
    }
    for (const [slug, arr] of [...bySlugIssues.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      md.push(`### ${slug}`, "");
      for (const i of arr) {
        md.push(
          `- **${i.severity.toUpperCase()}** \`${i.code}\`: ${i.message}${
            i.path ? `\n  - **path**: \`${i.path}\`` : ""
          }${i.fix ? `\n  - **fix**: ${i.fix}` : ""}`,
        );
      }
      md.push("");
    }
  }
  fs.writeFileSync(outMd, `${md.join("\n")}\n`);

  console.log(`[golden-100-e2e] wrote ${outJson}`);
  console.log(`[golden-100-e2e] wrote ${outMd}`);
  console.log(`[golden-100-e2e] PASS=${pass} FAIL=${fail} WARN=${warn} TOTAL=${slugs.length}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

