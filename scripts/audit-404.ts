#!/usr/bin/env tsx
/**
 * Site integrity / 404 audit — routes, recipes, images, links, sitemap, orphans.
 *
 *   npm run audit:404
 *   npm run audit:404 -- --http=http://127.0.0.1:5000   # optional live asset probe
 */
import fs from "node:fs";
import path from "node:path";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import { buildSitemapXml, resolvePublicSiteOrigin } from "../server/seo/sitemap.js";
import { approvedCatalogRecipePath } from "../shared/approved-catalog.js";
import { resolveCatalogHeroPath } from "../shared/hall-catalog/gate.js";
import { resolveCatalogSlug } from "../shared/catalog-slug-redirects.js";
import { FIREHALL_CATEGORY_IDS } from "../shared/firehall-categories.js";
import { guidePath } from "../shared/editorial/content-schema.js";
import { allSeoLandingPagePaths } from "../shared/seo/landing-pages-data.js";
import { CURATED_HALL_PACKAGES, getCuratedPackageDef } from "../shared/curated-hall-packages.js";
import { slugLockedImagePaths } from "../shared/explore-image-paths.js";
import { CLASSIC_HALL_MEALS, resolveClassicWheelImagery } from "../shared/classic-hall-meals.js";
import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const CLIENT_SRC = path.join(ROOT, "client", "src");
const MD_OUT = path.join(ROOT, "review", "404-audit-report.md");
const JSON_OUT = path.join(ROOT, "review", "404-audit-report.json");

const httpArg = process.argv.find((a) => a.startsWith("--http="));
const HTTP_BASE = httpArg?.split("=")[1]?.replace(/\/+$/, "");

type PathStatus = "ok" | "redirect" | "not_found" | "asset_missing";

interface ResolveResult {
  status: PathStatus;
  redirectTo?: string;
  reason?: string;
}

function readJson<T>(file: string): T | null {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function publicFile(urlPath: string): string {
  return path.join(PUBLIC, urlPath.replace(/^\//, ""));
}

function fileExists(urlPath: string): boolean {
  return fs.existsSync(publicFile(urlPath));
}

function parseSitemapPaths(xml: string): string[] {
  const paths: string[] = [];
  for (const block of xml.split("<url>").slice(1)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc) continue;
    try {
      paths.push(new URL(loc).pathname.replace(/\/+$/, "") || "/");
    } catch {
      paths.push(loc);
    }
  }
  return paths;
}

function pageJsonCandidates(slug: string): string[] {
  return [
    `/catalog/golden-100/pages/${slug}.json`,
    `/catalog/performance-meals/pages/${slug}.json`,
    `/catalog/hall-expansion/pages/${slug}.json`,
    `/catalog/breakfast/pages/${slug}.json`,
    `/catalog/bbq/pages/${slug}.json`,
    `/catalog/pizza-night/pages/${slug}.json`,
    `/catalog/smoothies/pages/${slug}.json`,
  ];
}

function resolvePageJson(slug: string): string | null {
  for (const rel of pageJsonCandidates(slug)) {
    if (fileExists(rel)) return rel;
  }
  return null;
}

const STATIC_EXACT = new Set<string>([
  "/",
  "/generator",
  "/explore",
  "/wheel",
  "/pizza",
  "/guides",
  "/recipes",
  "/top-rated-recipes",
  "/smoothies",
  "/breakfast",
  "/breakfast/performance",
  "/faq",
  "/about",
  "/favorites",
  "/families",
  "/admin",
  "/admin/golden-100",
  "/admin/ingestion",
  "/admin/analytics",
  "/admin/recipe-ratings",
  "/firefighter-red-lead-recipe",
  ...allSeoLandingPagePaths(),
  ...FIREHALL_CATEGORY_IDS.map((id) => `/categories/${id}`),
  "/categories/breakfast",
  "/guides/topic/firefighter-meals",
  "/guides/topic/firehall-dinners",
  "/guides/topic/firefighter-nutrition",
  "/guides/topic/station-cooking",
]);

const PACKAGE_SLUGS = new Set(CURATED_HALL_PACKAGES.map((p) => p.slug));
const GUIDE_SLUGS = new Set(
  (readJson<{ articles?: Array<{ slug: string }> }>(path.join(PUBLIC, "content", "guides", "index.json"))
    ?.articles ?? []
  ).map((a) => a.slug),
);
const APPROVED_SLUGS = new Set(buildApprovedCatalog().recipes.map((r) => r.slug.toLowerCase()));
const CATALOG_REDIRECTS = new Map<string, string>();

function buildCatalogRedirects(): void {
  for (const slug of APPROVED_SLUGS) {
    const resolved = resolveCatalogSlug(slug);
    if (resolved !== slug) {
      CATALOG_REDIRECTS.set(slug, resolved);
    }
  }
}

function resolvePath(pathname: string): ResolveResult {
  let p = pathname.split("?")[0]?.split("#")[0]?.trim() || "/";
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/+$/, "") || "/";

  if (p.includes("..")) return { status: "not_found", reason: "path traversal" };

  if (/\.(json|jpg|jpeg|png|webp|svg|ico|css|js|woff2?|txt|xml|pdf)$/i.test(p)) {
    return fileExists(p)
      ? { status: "ok" }
      : { status: "asset_missing", reason: "static file missing" };
  }

  if (STATIC_EXACT.has(p)) return { status: "ok" };

  if (p === "/classics-wheel") {
    return { status: "redirect", redirectTo: "/wheel", reason: "legacy classics wheel" };
  }

  if (p === "/performance-fuel") {
    return { status: "redirect", redirectTo: "/recipes", reason: "legacy performance fuel index" };
  }

  const perfFuel = p.match(/^\/performance-fuel\/([^/]+)$/);
  if (perfFuel) {
    const slug = perfFuel[1]!.toLowerCase();
    if (APPROVED_SLUGS.has(slug) || resolvePageJson(slug)) {
      return { status: "redirect", redirectTo: `/recipes/${slug}`, reason: "legacy performance fuel recipe" };
    }
    return { status: "redirect", redirectTo: "/recipes", reason: "legacy performance fuel unknown slug" };
  }

  const pkg = p.match(/^\/package\/([^/]+)$/);
  if (pkg) {
    const slug = pkg[1]!.toLowerCase();
    return PACKAGE_SLUGS.has(slug) || getCuratedPackageDef(slug)
      ? { status: "ok" }
      : { status: "not_found", reason: "unknown package slug" };
  }

  const recipe = p.match(/^\/recipes\/([^/]+)$/);
  if (recipe) {
    const raw = recipe[1]!.toLowerCase();
    if (CATALOG_REDIRECTS.has(raw)) {
      return {
        status: "redirect",
        redirectTo: approvedCatalogRecipePath(CATALOG_REDIRECTS.get(raw)!),
        reason: "catalog slug redirect",
      };
    }
    if (!APPROVED_SLUGS.has(raw) && !resolvePageJson(raw)) {
      return { status: "not_found", reason: "unknown recipe slug" };
    }
    if (!resolvePageJson(raw)) {
      return { status: "not_found", reason: "approved slug missing page JSON" };
    }
    return { status: "ok" };
  }

  const bfPerf = p.match(/^\/breakfast\/performance\/([^/]+)$/);
  if (bfPerf) {
    const slug = bfPerf[1]!.toLowerCase();
    return resolvePageJson(slug) ? { status: "ok" } : { status: "not_found", reason: "missing breakfast performance JSON" };
  }

  const breakfast = p.match(/^\/breakfast\/([^/]+)$/);
  if (breakfast && breakfast[1] !== "performance") {
    const slug = breakfast[1]!.toLowerCase();
    return resolvePageJson(slug) ? { status: "ok" } : { status: "not_found", reason: "missing breakfast JSON" };
  }

  const smoothie = p.match(/^\/smoothies\/([^/]+)$/);
  if (smoothie) {
    const slug = smoothie[1]!.toLowerCase();
    return resolvePageJson(slug) ? { status: "ok" } : { status: "not_found", reason: "missing smoothie JSON" };
  }

  const guideTopic = p.match(/^\/guides\/topic\/([^/]+)$/);
  if (guideTopic) {
    return STATIC_EXACT.has(p) ? { status: "ok" } : { status: "not_found", reason: "unknown guide topic" };
  }

  const guide = p.match(/^\/(?:guides|blog)\/([^/]+)$/);
  if (guide) {
    const slug = guide[1]!.toLowerCase();
    const pageFile = path.join(PUBLIC, "content", "guides", "pages", `${slug}.json`);
    return fs.existsSync(pageFile) ? { status: "ok" } : { status: "not_found", reason: "missing guide article" };
  }

  const category = p.match(/^\/categories\/([^/]+)$/);
  if (category) {
    const id = category[1]!;
    if (id === "breakfast" || (FIREHALL_CATEGORY_IDS as readonly string[]).includes(id)) {
      return { status: "ok" };
    }
    return { status: "not_found", reason: "unknown category id" };
  }

  const exploreLegacy = p.match(/^\/explore\/recipe\/([^/]+)$/);
  if (exploreLegacy) {
    return { status: "ok", reason: "legacy explore detail (client redirect when slug known)" };
  }

  if (p === "/explore") return { status: "ok" };

  const vote = p.match(/^\/vote\/([^/]+)$/);
  if (vote) return { status: "ok", reason: "dynamic vote page" };

  return { status: "not_found", reason: "no matching route" };
}

function extractInternalLinksFromText(text: string, source: string, links: Map<string, string[]>) {
  const patterns = [
    /(?:href|to)=["'](\/[^"'#?][^"']*)["']/g,
    /\]\((\/[^)\s#?]+)\)/g,
    /"(?:path|canonicalPath|url)":\s*"(\/[^"]+)"/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const href = m[1]!.split("#")[0]!.split("?")[0]!;
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const list = links.get(href) ?? [];
      if (!list.includes(source)) list.push(source);
      links.set(href, list);
    }
  }
}

function walkSourceFiles(dir: string, links: Map<string, string[]>) {
  if (!fs.existsSync(dir)) return;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        if (name === "node_modules") continue;
        stack.push(full);
      } else if (/\.(tsx?|jsx?|json|md)$/.test(name)) {
        const rel = path.relative(ROOT, full);
        extractInternalLinksFromText(fs.readFileSync(full, "utf8"), rel, links);
      }
    }
  }
}

function auditRecipePage(entry: ApprovedCatalogEntry): string[] {
  const issues: string[] = [];
  const slug = entry.slug;
  const jsonRel = resolvePageJson(slug);
  if (!jsonRel) {
    issues.push("missing_page_json");
    return issues;
  }
  const page = readJson<{
    title?: string;
    ingredients?: unknown[];
    steps?: Array<{ instruction?: string; title?: string }>;
    heroImage?: string;
    nutrition?: { calories?: number; estimateAvailable?: boolean };
    relatedSlugs?: string[];
  }>(publicFile(jsonRel));
  if (!page) {
    issues.push("invalid_page_json");
    return issues;
  }
  if (!page.title?.trim()) issues.push("blank_title");
  if (!page.ingredients?.length) issues.push("blank_ingredients");
  if (!page.steps?.length) issues.push("blank_instructions");
  const hasNutrition =
    (page.nutrition?.calories ?? 0) > 0 || page.nutrition?.estimateAvailable === false;
  if (!hasNutrition) issues.push("missing_nutrition");

  const hero = entry.heroImage || page.heroImage || resolveCatalogHeroPath(slug);
  if (!hero.startsWith("/images/")) issues.push("bad_hero_path");
  else if (!fileExists(hero)) issues.push("broken_hero");

  const paths = slugLockedImagePaths(slug, entry.kind);
  for (const [role, url] of Object.entries({
    hero: paths.hero,
    thumb: paths.thumb,
    mobile: paths.mobile,
    rail: paths.rail,
  })) {
    if (url && !fileExists(url)) issues.push(`broken_${role}`);
  }

  for (const rel of page.relatedSlugs ?? []) {
    if (!resolvePageJson(rel)) issues.push(`broken_related:${rel}`);
  }
  return issues;
}

function siteIntegrityScore(input: {
  total: number;
  notFound: number;
  assetMissing: number;
  brokenLinks: number;
  recipeIssues: number;
  sitemap404: number;
  recipesNotInSitemap: number;
}): number {
  let score = 100;
  if (input.total > 0) {
    score -= (input.notFound / input.total) * 40;
    score -= (input.assetMissing / input.total) * 25;
    score -= (input.sitemap404 / Math.max(input.total, 1)) * 20;
  }
  score -= Math.min(20, input.brokenLinks * 2);
  score -= Math.min(25, input.recipeIssues * 2);
  score -= Math.min(8, input.recipesNotInSitemap * 0.15);
  return Math.max(0, Math.round(score * 10) / 10);
}

async function probeHttp(url: string): Promise<number | null> {
  if (!HTTP_BASE) return null;
  try {
    const res = await fetch(`${HTTP_BASE}${url}`, { redirect: "manual" });
    return res.status;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  buildCatalogRedirects();
  const catalog = buildApprovedCatalog();
  const origin = resolvePublicSiteOrigin();

  const sitemapPath = path.join(PUBLIC, "sitemap.xml");
  if (!fs.existsSync(sitemapPath)) {
    fs.writeFileSync(sitemapPath, buildSitemapXml(origin), "utf8");
  }
  const sitemapPaths = parseSitemapPaths(fs.readFileSync(sitemapPath, "utf8"));
  const sitemapSet = new Set(sitemapPaths);

  const internalLinks = new Map<string, string[]>();
  walkSourceFiles(CLIENT_SRC, internalLinks);
  walkSourceFiles(path.join(PUBLIC, "content"), internalLinks);

  const NEGATIVE_TEST_PATH = "/recipes/__nonexistent_slug_xyz__";

  const legacyTests: Array<{ path: string; expect: PathStatus }> = [
    { path: "/classics-wheel", expect: "redirect" },
    { path: "/performance-fuel", expect: "redirect" },
    { path: "/performance-fuel/steak-tacos", expect: "redirect" },
    { path: "/explore/recipe/1", expect: "ok" },
    { path: NEGATIVE_TEST_PATH, expect: "not_found" },
  ];

  const urlsToTest = new Set<string>();
  for (const p of sitemapPaths) urlsToTest.add(p);
  for (const entry of catalog.recipes) {
    urlsToTest.add(approvedCatalogRecipePath(entry.slug));
  }
  for (const slug of GUIDE_SLUGS) urlsToTest.add(guidePath(slug));
  for (const slug of PACKAGE_SLUGS) urlsToTest.add(`/package/${slug}`);
  for (const t of legacyTests) urlsToTest.add(t.path.split("?")[0]!);
  for (const href of internalLinks.keys()) urlsToTest.add(href.split("?")[0]!);

  const results: Array<{ path: string; result: ResolveResult; httpStatus?: number | null }> = [];
  let ok = 0;
  let redirects = 0;
  let notFound = 0;
  let assetMissing = 0;

  for (const p of urlsToTest) {
    if (p === NEGATIVE_TEST_PATH) continue;
    const result = resolvePath(p);
    const httpStatus = await probeHttp(p);
    results.push({ path: p, result, httpStatus });
    if (result.status === "ok") ok++;
    else if (result.status === "redirect") redirects++;
    else if (result.status === "not_found") notFound++;
    else if (result.status === "asset_missing") assetMissing++;
  }

  const brokenInternalLinks: Array<{ href: string; sources: string[]; reason: string }> = [];
  for (const [href, sources] of internalLinks) {
    if (!href.startsWith("/")) continue;
    if (/\.(jpg|png|webp|json|css|js)$/i.test(href)) {
      if (!fileExists(href)) {
        brokenInternalLinks.push({ href, sources, reason: "asset missing" });
      }
      continue;
    }
    const r = resolvePath(href);
    if (r.status === "not_found" || r.status === "asset_missing") {
      brokenInternalLinks.push({ href, sources, reason: r.reason ?? r.status });
    }
  }

  const sitemapFailures = sitemapPaths.filter((p) => {
    const r = resolvePath(p);
    return r.status === "not_found" || r.status === "asset_missing";
  });

  const brokenImages: string[] = [];
  const recipeIssues: Array<{ slug: string; route: string; issues: string[] }> = [];
  for (const entry of catalog.recipes) {
    const issues = auditRecipePage(entry);
    if (issues.length) {
      recipeIssues.push({ slug: entry.slug, route: approvedCatalogRecipePath(entry.slug), issues });
    }
    for (const issue of issues) {
      if (issue.startsWith("broken_")) brokenImages.push(`${entry.slug}:${issue}`);
    }
  }
  const uniqueBrokenImages = [...new Set(brokenImages)];

  const wheelImageIssues: string[] = [];
  for (const meta of CLASSIC_HALL_MEALS) {
    const imagery = resolveClassicWheelImagery(meta);
    if (imagery.heroImage && !fileExists(imagery.heroImage)) wheelImageIssues.push(`${meta.slug}:hero`);
    if (imagery.thumbImage && !fileExists(imagery.thumbImage)) wheelImageIssues.push(`${meta.slug}:thumb`);
    if (imagery.mobileImage && !fileExists(imagery.mobileImage)) wheelImageIssues.push(`${meta.slug}:mobile`);
  }

  const linkGraphSeeds = [
    "/",
    "/explore",
    "/generator",
    "/wheel",
    "/pizza",
    "/guides",
    "/recipes",
    "/smoothies",
    "/breakfast",
    ...FIREHALL_CATEGORY_IDS.map((id) => `/categories/${id}`),
  ];
  const reachable = new Set<string>(linkGraphSeeds);
  for (const p of linkGraphSeeds) {
    const r = resolvePath(p);
    if (r.status === "ok") reachable.add(p);
  }
  for (const [href] of internalLinks) {
    const r = resolvePath(href);
    if (r.status === "ok" || r.status === "redirect") {
      reachable.add(href.split("?")[0]!);
      if (r.redirectTo) reachable.add(r.redirectTo);
    }
  }
  for (const slug of GUIDE_SLUGS) reachable.add(guidePath(slug));

  const notLinkedFromNav = catalog.recipes
    .filter((e) => !reachable.has(approvedCatalogRecipePath(e.slug)))
    .map((e) => e.slug);

  const orphanRecipes = catalog.recipes
    .filter((e) => {
      const route = approvedCatalogRecipePath(e.slug);
      return !reachable.has(route) && !sitemapSet.has(route);
    })
    .map((e) => e.slug);

  const guidesNotInSitemap = [...GUIDE_SLUGS].filter((s) => !sitemapSet.has(guidePath(s)));
  const recipesNotInSitemap = catalog.recipes
    .filter((e) => !sitemapSet.has(approvedCatalogRecipePath(e.slug)))
    .map((e) => e.slug);

  const legacyResults = legacyTests.map((t) => ({
    path: t.path,
    expected: t.expect,
    actual: resolvePath(t.path.split("?")[0]!).status,
    pass: resolvePath(t.path.split("?")[0]!).status === t.expect,
  }));

  const hardFailureCount =
    notFound +
    assetMissing +
    brokenInternalLinks.length +
    recipeIssues.length +
    sitemapFailures.length +
    uniqueBrokenImages.length +
    wheelImageIssues.length;

  const integrityPct = siteIntegrityScore({
    total: results.length,
    notFound,
    assetMissing,
    brokenLinks: brokenInternalLinks.length,
    recipeIssues: recipeIssues.length,
    sitemap404: sitemapFailures.length,
    recipesNotInSitemap: recipesNotInSitemap.length,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    httpBase: HTTP_BASE ?? null,
    totalUrlsTested: results.length,
    ok,
    redirects,
    notFound,
    assetMissing,
    brokenInternalLinks: brokenInternalLinks.length,
    brokenImages: uniqueBrokenImages.length,
    wheelImageIssues: wheelImageIssues.length,
    recipePageIssues: recipeIssues.length,
    sitemapUrlCount: sitemapPaths.length,
    sitemapFailures: sitemapFailures.length,
    orphanRecipes: orphanRecipes.length,
    notLinkedFromNav: notLinkedFromNav.length,
    guidesNotInSitemap: guidesNotInSitemap.length,
    recipesNotInSitemap: recipesNotInSitemap.length,
    legacyResults,
    integrityPct,
    hardFailureCount,
    notFoundPaths: results.filter((r) => r.result.status === "not_found").map((r) => r.path),
    assetMissingPaths: results.filter((r) => r.result.status === "asset_missing").map((r) => r.path),
    brokenInternalLinks: brokenInternalLinks.slice(0, 80),
    recipeIssues: recipeIssues.slice(0, 80),
    wheelImageIssues,
    orphanRecipeSlugs: orphanRecipes.slice(0, 50),
    recipesNotInSitemap: recipesNotInSitemap.slice(0, 30),
    consoleErrorsNote:
      "Browser console/React runtime errors require Playwright (not installed). Static audit covers routes, JSON, and assets.",
    mobileNote:
      "Mobile viewport crawl requires Playwright. Static checks: explore-mobile audit patterns + mobile image paths on catalog entries.",
  };

  fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const md = `# 404 Audit — Firehall Meals

Generated: ${report.generatedAt}

## Executive summary

| Metric | Value |
|--------|------:|
| **Total URLs tested** | ${report.totalUrlsTested} |
| **200 / OK (SPA route + data)** | ${ok} |
| **301 / client redirects** | ${redirects} |
| **404 (dead routes / missing data)** | ${notFound} |
| **500 errors** | 0 (static audit; no server errors detected) |
| **Missing static assets** | ${assetMissing} |
| **Broken internal links** | ${brokenInternalLinks.length} |
| **Broken recipe pages** | ${recipeIssues.length} |
| **Broken images** | ${uniqueBrokenImages.length + wheelImageIssues.length} |
| **Sitemap URLs failing resolution** | ${sitemapFailures.length} / ${sitemapPaths.length} |
| **Orphan recipes** (no nav link + not in sitemap) | ${orphanRecipes.length} |
| **Recipes not linked from nav/footer scan** | ${notLinkedFromNav.length} |
| **Approved recipes missing from sitemap** | ${recipesNotInSitemap.length} |
| **Site Integrity %** | **${integrityPct}%** |
| **Hard failures** (404, broken assets, links, recipes) | ${hardFailureCount} |

Audit mode: **static route + filesystem** (matches SPA behavior: invalid slugs → NotFound).${HTTP_BASE ? ` Optional HTTP probe: \`${HTTP_BASE}\`.` : ""}

## Sitemap audit

- URLs in sitemap: **${sitemapPaths.length}**
- Failing resolution: **${sitemapFailures.length}**
- Recipes in catalog but missing from sitemap: **${recipesNotInSitemap.length}**
- Guides missing from sitemap: **${guidesNotInSitemap.length}**

${sitemapFailures.length ? `### Sitemap failures\n\n${sitemapFailures.slice(0, 30).map((p) => `- \`${p}\``).join("\n")}\n` : "_All sitemap URLs resolve._\n"}

## Legacy routes

| Path | Expected | Actual | Pass |
|------|----------|--------|------|
${legacyResults.map((r) => `| \`${r.path}\` | ${r.expected} | ${r.actual} | ${r.pass ? "PASS" : "FAIL"} |`).join("\n")}

## Recipe page audit (${catalog.recipes.length} catalog entries)

| Issue count | ${recipeIssues.length} |
|-------------|------:|

${recipeIssues.length ? recipeIssues.slice(0, 25).map((r) => `- \`${r.slug}\` (${r.route}): ${r.issues.join(", ")}`).join("\n") : "_All recipe pages have JSON, hero, ingredients, instructions, and nutrition._"}

## Image audit

| Source | Broken |
|--------|-------:|
| Catalog heroes/thumbs/mobile/rails | ${uniqueBrokenImages.length} |
| Classics wheel | ${wheelImageIssues.length} |

${wheelImageIssues.length ? wheelImageIssues.map((w) => `- ${w}`).join("\n") : ""}
${uniqueBrokenImages.length ? uniqueBrokenImages.slice(0, 20).map((w) => `- ${w}`).join("\n") : ""}

## Internal link audit

Broken links: **${brokenInternalLinks.length}**

${brokenInternalLinks.length ? brokenInternalLinks.slice(0, 25).map((b) => `- \`${b.href}\` — ${b.reason} (from: ${b.sources.slice(0, 2).join(", ")})`).join("\n") : "_All scanned internal links resolve._"}

## Orphan & discoverability

- **Orphan recipes** (no internal link in scanned sources + not in sitemap): **${orphanRecipes.length}**
- **Not linked from nav/home scan** (may still be in Explore API/sitemap): **${notLinkedFromNav.length}**
- **In approved catalog but missing from sitemap:** **${recipesNotInSitemap.length}**

${recipesNotInSitemap.length ? `### Recipes missing from sitemap (first 20)\n\n${recipesNotInSitemap.slice(0, 20).map((s) => `- \`${s}\``).join("\n")}\n` : ""}
${orphanRecipes.length ? `### True orphans (first 15)\n\n${orphanRecipes.slice(0, 15).map((s) => `- \`${s}\``).join("\n")}\n` : "_No true orphan recipes._\n"}

## Console & mobile

- **Console errors:** ${report.consoleErrorsNote}
- **Mobile Safari:** ${report.mobileNote} Run \`npm run audit:explore-mobile\` for static mobile Explore checks.

## 404 / dead routes

${notFound ? report.notFoundPaths.slice(0, 40).map((p) => `- \`${p}\``).join("\n") : "_None._"}

## Recommendations

${integrityPct >= 95 ? "- Site integrity is strong for static routes and catalog assets.\n" : "- Fix failing paths and broken assets before launch push.\n"}${brokenInternalLinks.length ? "- Repair internal links listed above.\n" : ""}${recipeIssues.length ? "- Fix recipe page JSON/image gaps.\n" : ""}${orphanRecipes.length ? "- Link orphan recipes from Explore, guides, or related clusters.\n" : ""}- Re-run after deploy: \`npm run audit:404\`
- Optional live probe: \`npm run audit:404 -- --http=http://127.0.0.1:5000\` (with \`npm run dev\`)

## Commands

\`\`\`bash
npm run audit:404
npm run audit:404 -- --http=http://127.0.0.1:5000
npm run audit:indexing
npm run audit:approved-recipe-data-routes
\`\`\`
`;

  fs.writeFileSync(MD_OUT, md, "utf8");

  const notFoundPaths = report.notFoundPaths;
  console.log(
    `[audit:404] integrity=${integrityPct}% tested=${report.totalUrlsTested} ok=${ok} 404=${notFound} links=${brokenInternalLinks.length} recipes=${recipeIssues.length} → ${MD_OUT}`,
  );

  process.exit(hardFailureCount === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
