#!/usr/bin/env tsx
/**
 * Full SEO sitemap + indexing audit (10 phases).
 *
 *   npx tsx scripts/audit-seo-sitemap.ts
 *   npx tsx scripts/audit-seo-sitemap.ts --live
 *   npx tsx scripts/audit-seo-sitemap.ts --json
 */
import fs from "node:fs";
import path from "node:path";
import { buildRobotsTxt, buildSitemapXml, resolvePublicSiteOrigin } from "../server/seo/sitemap.js";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import { SEO_CANONICAL_ORIGIN } from "../shared/seo/constants.js";
import { absoluteUrl } from "../shared/seo/urls.js";
import { approvedCatalogRecipePath } from "../shared/approved-catalog.js";
import { smoothieRecipePath } from "../shared/fuel-catalog/paths.js";
import { guidePath } from "../shared/editorial/content-schema.js";
import { buildRecipePageSeo, buildGuideArticleSeo, buildHomeSeo, type PageSeoConfig } from "../shared/seo/metadata.js";
import {
  buildBreakfastRecipeSchema,
  buildBreakfastRecipeSeo,
  buildFuelRecipeSchema,
  buildSmoothieRecipeSeo,
} from "../shared/seo/fuel-metadata.js";
import {
  buildArticleSchema,
  buildOrganizationSchema,
  buildRecipeSchema,
  buildWebSiteSchema,
} from "../shared/seo/schema.js";
import { buildRecipeHeroAlt } from "../shared/seo/recipe-image-seo.js";
import { SEO_LANDING_PAGES } from "../shared/seo/landing-pages-data.js";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import type { EditorialArticle } from "../shared/editorial/content-schema.js";
import type { BreakfastRecipePage } from "../shared/breakfast-schema.js";
import type { FuelRecipePage } from "../shared/fuel-catalog/schema.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const JSON_OUT = path.join(ROOT, "review", "seo-sitemap-audit.json");
const MD_OUT = path.join(ROOT, "review", "seo-sitemap-audit.md");

const LIVE = process.argv.includes("--live");
const JSON_MODE = process.argv.includes("--json");

type Issue = { phase: string; code: string; message: string; slug?: string; url?: string };
type UrlAudit = {
  url: string;
  path: string;
  status?: number;
  redirectChain?: string[];
  canonical?: string;
  indexable: boolean;
  lastmod?: string;
  issues: string[];
};

const TARGET_KEYWORDS = [
  "firefighter meals",
  "firefighter recipes",
  "firehall meals",
  "firehouse meals",
  "fire station meals",
  "firefighter breakfast recipes",
  "firehall breakfast",
  "firefighter dinner ideas",
  "meals for firefighters",
  "meals for first responders",
  "shift worker meals",
] as const;

/** Static marketing paths that may appear in sitemap without catalog backing */
const STATIC_WHITELIST = new Set([
  "/",
  "/explore",
  "/generator",
  "/faq",
  "/guides",
  "/pizza",
  "/wheel",
  "/smoothies",
  "/breakfast",
  "/about",
  "/firefighter-red-lead-recipe",
  "/firefighter-meals",
  "/firefighter-recipes",
  "/firehouse-recipes",
  "/fire-station-meals",
  "/healthy-firefighter-meals",
  "/firefighter-breakfast-recipes",
  "/firefighter-bbq-recipes",
  "/guides/topic/firefighter-meals",
  "/guides/topic/firehall-dinners",
  "/guides/topic/firefighter-nutrition",
  "/guides/topic/station-cooking",
]);

function readJson<T>(file: string): T | null {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function catalogSlugs(dir: string): Array<{ slug: string; generatedAt?: string }> {
  const index = readJson<{ recipes?: Array<{ slug: string }>; generatedAt?: string }>(
    path.join(dir, "index.json"),
  );
  if (!index?.recipes) return [];
  return index.recipes.map((r) => ({ slug: r.slug, generatedAt: index.generatedAt }));
}

function loadRecipePage(rel: string): GoldenRecipePage | null {
  return readJson<GoldenRecipePage>(path.join(PUBLIC, rel));
}

function loadArticle(slug: string): EditorialArticle | null {
  return readJson<EditorialArticle>(path.join(PUBLIC, "content", "guides", "pages", `${slug}.json`));
}

function parseSitemapLocs(xml: string): Array<{ url: string; path: string; lastmod?: string }> {
  const rows: Array<{ url: string; path: string; lastmod?: string }> = [];
  const blocks = xml.split("<url>").slice(1);
  for (const block of blocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    try {
      const u = new URL(loc);
      rows.push({ url: loc, path: u.pathname.replace(/\/+$/, "") || "/", lastmod });
    } catch {
      rows.push({ url: loc, path: loc, lastmod });
    }
  }
  return rows;
}

function pageJsonPathForSlug(slug: string, collection: string): string | null {
  const map: Record<string, string> = {
    golden: `catalog/golden-100/pages/${slug}.json`,
    performance: `catalog/performance-meals/pages/${slug}.json`,
    expansion: `catalog/hall-expansion/pages/${slug}.json`,
    breakfast: `catalog/breakfast/pages/${slug}.json`,
    smoothie: `catalog/smoothies/pages/${slug}.json`,
    pizza: `catalog/pizza-night/pages/${slug}.json`,
    bbq: `catalog/bbq/pages/${slug}.json`,
  };
  return map[collection] ?? null;
}

function resolveRecipePagePath(slug: string): string | null {
  for (const collection of ["pizza", "golden", "performance", "expansion", "breakfast", "smoothie", "bbq"]) {
    const rel = pageJsonPathForSlug(slug, collection);
    if (rel && fs.existsSync(path.join(PUBLIC, rel))) return rel;
  }
  return null;
}

function loadBreakfastPage(slug: string): BreakfastRecipePage | null {
  return readJson<BreakfastRecipePage>(path.join(PUBLIC, "catalog", "breakfast", "pages", `${slug}.json`));
}

function loadSmoothiePage(slug: string): FuelRecipePage | null {
  return readJson<FuelRecipePage>(path.join(PUBLIC, "catalog", "smoothies", "pages", `${slug}.json`));
}

function buildRecipeSeoForCollection(
  collection: string,
  slug: string,
  origin: string,
): { seo: PageSeoConfig; schema: Record<string, unknown>; title: string; heroImage?: string; imageAlt?: string } | null {
  if (collection === "breakfast") {
    const page = loadBreakfastPage(slug);
    if (!page) return null;
    return {
      seo: buildBreakfastRecipeSeo(page),
      schema: buildBreakfastRecipeSchema(origin, page) as Record<string, unknown>,
      title: page.title,
      heroImage: page.heroImage,
      imageAlt: page.imageAlt,
    };
  }
  if (collection === "smoothie") {
    const page = loadSmoothiePage(slug);
    if (!page) return null;
    return {
      seo: buildSmoothieRecipeSeo(page),
      schema: buildFuelRecipeSchema(origin, page, smoothieRecipePath(slug)) as Record<string, unknown>,
      title: page.title,
      heroImage: page.heroImage,
    };
  }

  const pageRel = pageJsonPathForSlug(slug, collection);
  const page = pageRel ? loadRecipePage(pageRel) : null;
  if (!page) return null;
  return {
    seo: buildRecipePageSeo(page, origin),
    schema: buildRecipeSchema(origin, page) as Record<string, unknown>,
    title: page.title,
    heroImage: page.heroImage,
  };
}

function heroFileExists(heroImage?: string): boolean {
  if (!heroImage?.trim()) return false;
  if (/^https?:\/\//i.test(heroImage)) return true;
  const rel = heroImage.startsWith("/") ? heroImage.slice(1) : heroImage;
  return fs.existsSync(path.join(PUBLIC, rel));
}

function validateRecipeSchema(slug: string, schema: Record<string, unknown>): Issue[] {
  const issues: Issue[] = [];
  const required = [
    "name",
    "image",
    "author",
    "recipeYield",
    "prepTime",
    "cookTime",
    "totalTime",
    "nutrition",
    "recipeIngredient",
    "recipeInstructions",
  ];
  for (const key of required) {
    if (schema[key] == null || schema[key] === "") {
      issues.push({ phase: "structured-data", code: "recipe_schema_missing", message: `Missing ${key}`, slug });
    }
  }
  return issues;
}

function countArticleWords(article: EditorialArticle): number {
  const chunks: string[] = [article.intro ?? "", article.description ?? ""];
  for (const section of article.sections ?? []) {
    chunks.push(section.heading, ...section.paragraphs);
  }
  for (const tip of article.practicalAdvice ?? []) chunks.push(tip);
  for (const rec of article.mealRecommendations ?? []) {
    chunks.push(rec.title, rec.blurb);
  }
  for (const faq of article.faqs ?? []) {
    chunks.push(faq.question, faq.answer);
  }
  for (const block of article.embeddedRecipes ?? []) {
    chunks.push(block.title, block.blurb);
  }
  return chunks.join(" ").split(/\s+/).filter(Boolean).length;
}

async function fetchUrlAudit(url: string): Promise<UrlAudit> {
  const u = new URL(url);
  const base: UrlAudit = {
    url,
    path: u.pathname.replace(/\/+$/, "") || "/",
    indexable: true,
    issues: [],
  };

  if (!LIVE) return base;

  const chain: string[] = [];
  let current = url;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(current, { redirect: "manual" });
      base.status = res.status;
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) break;
        const next = new URL(loc, current).href;
        chain.push(`${current} → ${next}`);
        current = next;
        continue;
      }
      break;
    } catch (e) {
      base.issues.push(`fetch_error:${e instanceof Error ? e.message : String(e)}`);
      base.indexable = false;
      return base;
    }
  }

  if (chain.length) {
    base.redirectChain = chain;
    base.issues.push("redirect");
    base.indexable = false;
  }
  if (base.status === 404) {
    base.issues.push("404");
    base.indexable = false;
  }
  if (base.status && base.status >= 500) {
    base.issues.push("5xx");
    base.indexable = false;
  }

  return base;
}

function collectIndexableRecipePaths(origin: string): Map<string, { slug: string; collection: string }> {
  const paths = new Map<string, { slug: string; collection: string }>();

  const catalogs: Array<[string, string, (slug: string) => string]> = [
    ["golden", path.join(PUBLIC, "catalog", "golden-100"), (s) => approvedCatalogRecipePath(s)],
    ["performance", path.join(PUBLIC, "catalog", "performance-meals"), (s) => approvedCatalogRecipePath(s)],
    ["expansion", path.join(PUBLIC, "catalog", "hall-expansion"), (s) => approvedCatalogRecipePath(s)],
    ["pizza", path.join(PUBLIC, "catalog", "pizza-night"), (s) => approvedCatalogRecipePath(s)],
    ["breakfast", path.join(PUBLIC, "catalog", "breakfast"), (s) => approvedCatalogRecipePath(s)],
    ["smoothie", path.join(PUBLIC, "catalog", "smoothies"), (s) => smoothieRecipePath(s)],
    ["bbq", path.join(PUBLIC, "catalog", "bbq"), (s) => approvedCatalogRecipePath(s)],
  ];

  for (const [collection, dir, pathFn] of catalogs) {
    for (const { slug } of catalogSlugs(dir)) {
      const p = pathFn(slug);
      if (!paths.has(p)) paths.set(p, { slug, collection });
    }
  }

  return paths;
}

function keywordPages(origin: string): Record<string, string[]> {
  const map: Record<string, Set<string>> = Object.fromEntries(
    TARGET_KEYWORDS.map((k) => [k, new Set<string>()]),
  ) as Record<string, Set<string>>;

  function add(keyword: string, pagePath: string): void {
    const k = keyword.toLowerCase();
    for (const target of TARGET_KEYWORDS) {
      if (k.includes(target) || target.includes(k)) {
        map[target].add(pagePath);
      }
    }
  }

  add("firefighter meals", "/");
  add("firefighter recipes", "/");
  add("firehall meals", "/");
  for (const page of SEO_LANDING_PAGES) {
    for (const kw of page.keywords) add(kw, page.path);
    for (const kw of TARGET_KEYWORDS) {
      if (page.title.toLowerCase().includes(kw) || page.h1.toLowerCase().includes(kw)) {
        map[kw].add(page.path);
      }
    }
  }

  add("firefighter breakfast recipes", "/breakfast");
  add("firehall breakfast", "/breakfast");
  add("firefighter breakfast recipes", "/firefighter-breakfast-recipes");

  const guidesIndex = readJson<{ articles?: EditorialArticle[] }>(
    path.join(PUBLIC, "content", "guides", "index.json"),
  );
  for (const article of guidesIndex?.articles ?? []) {
    for (const kw of article.keywords ?? []) add(kw, guidePath(article.slug));
    if (article.slug.includes("breakfast")) {
      add("firefighter breakfast recipes", guidePath(article.slug));
      add("firehall breakfast", guidePath(article.slug));
    }
  }

  const result: Record<string, string[]> = {};
  for (const [kw, set] of Object.entries(map)) {
    result[kw] = [...set].sort();
  }
  return result;
}

async function main(): Promise<void> {
  const origin = resolvePublicSiteOrigin();
  const issues: Issue[] = [];
  const sitemapPath = path.join(PUBLIC, "sitemap.xml");
  const robotsPath = path.join(PUBLIC, "robots.txt");

  const expectedSitemap = buildSitemapXml(origin);
  const expectedRobots = buildRobotsTxt(origin);

  if (!fs.existsSync(sitemapPath) || fs.readFileSync(sitemapPath, "utf8") !== expectedSitemap) {
    fs.mkdirSync(PUBLIC, { recursive: true });
    fs.writeFileSync(sitemapPath, expectedSitemap, "utf8");
    fs.writeFileSync(robotsPath, expectedRobots, "utf8");
  }

  const sitemapXml = fs.readFileSync(sitemapPath, "utf8");
  const sitemapLocs = parseSitemapLocs(sitemapXml);
  const sitemapPaths = new Set(sitemapLocs.map((r) => r.path));

  const recipePaths = collectIndexableRecipePaths(origin);
  const golden = catalogSlugs(path.join(PUBLIC, "catalog", "golden-100"));
  const performance = catalogSlugs(path.join(PUBLIC, "catalog", "performance-meals"));
  const expansion = catalogSlugs(path.join(PUBLIC, "catalog", "hall-expansion"));
  const breakfast = catalogSlugs(path.join(PUBLIC, "catalog", "breakfast"));
  const smoothies = catalogSlugs(path.join(PUBLIC, "catalog", "smoothies"));
  const pizza = catalogSlugs(path.join(PUBLIC, "catalog", "pizza-night"));
  const bbq = catalogSlugs(path.join(PUBLIC, "catalog", "bbq"));
  const approved = buildApprovedCatalog();

  const guidesIndex = readJson<{ articles?: EditorialArticle[] }>(
    path.join(PUBLIC, "content", "guides", "index.json"),
  );
  const articles = guidesIndex?.articles ?? [];

  // Phase 1 — sitemap audit
  const urlAudits: UrlAudit[] = [];
  const locCounts = new Map<string, number>();
  for (const row of sitemapLocs) {
    locCounts.set(row.url, (locCounts.get(row.url) ?? 0) + 1);
    if (!row.url.startsWith(SEO_CANONICAL_ORIGIN)) {
      issues.push({
        phase: "sitemap",
        code: "non_canonical_origin",
        message: `Sitemap loc not on ${SEO_CANONICAL_ORIGIN}`,
        url: row.url,
      });
    }
    if (LIVE) urlAudits.push(await fetchUrlAudit(row.url));
  }
  for (const [url, count] of locCounts) {
    if (count > 1) {
      issues.push({ phase: "sitemap", code: "duplicate_loc", message: `Duplicate sitemap loc (${count}x)`, url });
    }
  }

  for (const [p] of recipePaths) {
    const rel = p.replace(/^\//, "");
    const pageRel = resolveRecipePagePath(recipePaths.get(p)!.slug);
    if (!pageRel) {
      issues.push({
        phase: "sitemap",
        code: "missing_page_json",
        message: "Recipe path has no page JSON",
        slug: recipePaths.get(p)!.slug,
        url: absoluteUrl(origin, p),
      });
    }
  }

  const recipesMissingFromSitemap = [...recipePaths.keys()].filter((p) => !sitemapPaths.has(p));
  for (const p of recipesMissingFromSitemap) {
    issues.push({
      phase: "sitemap",
      code: "recipe_missing_from_sitemap",
      message: "Indexable recipe not in sitemap",
      slug: recipePaths.get(p)!.slug,
      url: absoluteUrl(origin, p),
    });
  }

  const recipePathsSet = new Set(recipePaths.keys());
  const articlePaths = new Set(articles.map((a) => guidePath(a.slug)));
  const orphanSitemapRecipes = sitemapLocs
    .filter((r) => r.path.startsWith("/recipes/") || r.path.startsWith("/breakfast/") || r.path.startsWith("/smoothies/"))
    .filter((r) => !recipePathsSet.has(r.path) && !STATIC_WHITELIST.has(r.path) && !articlePaths.has(r.path));
  for (const row of orphanSitemapRecipes) {
    issues.push({
      phase: "sitemap",
      code: "orphan_sitemap_url",
      message: "Sitemap recipe URL not in catalog indexes",
      url: row.url,
    });
  }

  // Phase 2 — recipe indexing
  const recipeTitles = new Map<string, string>();
  const recipeMetaTitles = new Map<string, string>();
  const recipeMetaDescriptions = new Map<string, string>();
  let imageIssues = 0;
  let schemaIssues = 0;

  for (const [p, { slug, collection }] of recipePaths) {
    const bundle = buildRecipeSeoForCollection(collection, slug, origin);
    if (!bundle) {
      issues.push({
        phase: "recipes",
        code: "missing_page_json",
        message: "Recipe page JSON missing",
        slug,
      });
      continue;
    }

    if (recipeTitles.has(bundle.title)) {
      issues.push({
        phase: "recipes",
        code: "duplicate_title",
        message: `Duplicate title with ${recipeTitles.get(bundle.title)}`,
        slug,
      });
    }
    recipeTitles.set(bundle.title, slug);

    const seo = bundle.seo;
    const canonical = absoluteUrl(origin, seo.canonicalPath);
    if (!canonical.startsWith(SEO_CANONICAL_ORIGIN)) {
      issues.push({ phase: "canonical", code: "bad_recipe_canonical", message: canonical, slug });
    }
    if (seo.canonicalPath !== p && collection !== "smoothie") {
      issues.push({
        phase: "canonical",
        code: "recipe_path_mismatch",
        message: `Expected ${p}, got ${seo.canonicalPath}`,
        slug,
      });
    }

    if (recipeMetaTitles.has(seo.title)) {
      issues.push({
        phase: "recipes",
        code: "duplicate_meta_title",
        message: `Duplicate meta title with ${recipeMetaTitles.get(seo.title)}`,
        slug,
      });
    }
    recipeMetaTitles.set(seo.title, slug);

    if (recipeMetaDescriptions.has(seo.description)) {
      issues.push({
        phase: "recipes",
        code: "duplicate_meta_description",
        message: `Duplicate meta description with ${recipeMetaDescriptions.get(seo.description)}`,
        slug,
      });
    }
    recipeMetaDescriptions.set(seo.description, slug);

    const schemaIssueList = validateRecipeSchema(slug, bundle.schema);
    schemaIssues += schemaIssueList.length;
    issues.push(...schemaIssueList);

    if (!heroFileExists(bundle.heroImage)) {
      imageIssues += 1;
      issues.push({ phase: "images", code: "missing_hero", message: "Hero image file missing", slug });
    }

    const alt = bundle.imageAlt?.trim() || buildRecipeHeroAlt(bundle.title);
    if (!alt.trim()) {
      imageIssues += 1;
      issues.push({ phase: "images", code: "missing_alt", message: "Hero alt text empty", slug });
    }
    if (!bundle.schema.image) {
      imageIssues += 1;
      issues.push({ phase: "images", code: "schema_image_missing", message: "Recipe schema missing image", slug });
    }
  }

  // Phase 3 — articles
  const articleH1s = new Map<string, string>();
  const articleTitles = new Map<string, string>();
  const articleDescriptions = new Map<string, string>();
  const articlesMissingFromSitemap = articles.filter((a) => !sitemapPaths.has(guidePath(a.slug)));

  for (const a of articlesMissingFromSitemap) {
    issues.push({
      phase: "articles",
      code: "article_missing_from_sitemap",
      message: "Article not in sitemap",
      slug: a.slug,
    });
  }

  for (const meta of articles) {
    const article = loadArticle(meta.slug);
    if (!article) {
      issues.push({ phase: "articles", code: "missing_article_json", message: "Article page JSON missing", slug: meta.slug });
      continue;
    }

    if (articleH1s.has(article.title)) {
      issues.push({
        phase: "articles",
        code: "duplicate_h1",
        message: `Duplicate H1 with ${articleH1s.get(article.title)}`,
        slug: article.slug,
      });
    }
    articleH1s.set(article.title, article.slug);

    const seo = buildGuideArticleSeo(article);
    if (articleTitles.has(seo.title)) {
      issues.push({
        phase: "articles",
        code: "duplicate_title_tag",
        message: `Duplicate title tag with ${articleTitles.get(seo.title)}`,
        slug: article.slug,
      });
    }
    articleTitles.set(seo.title, article.slug);

    if (articleDescriptions.has(seo.description)) {
      issues.push({
        phase: "articles",
        code: "duplicate_meta_description",
        message: `Duplicate meta description with ${articleDescriptions.get(seo.description)}`,
        slug: article.slug,
      });
    }
    articleDescriptions.set(seo.description, article.slug);

    const canonical = absoluteUrl(origin, seo.canonicalPath);
    if (!canonical.startsWith(SEO_CANONICAL_ORIGIN)) {
      issues.push({ phase: "canonical", code: "bad_article_canonical", message: canonical, slug: article.slug });
    }

    const schema = buildArticleSchema(origin, article) as Record<string, unknown>;
    for (const key of ["headline", "description", "datePublished", "author", "publisher"]) {
      if (!schema[key]) {
        schemaIssues += 1;
        issues.push({
          phase: "structured-data",
          code: "article_schema_missing",
          message: `Missing ${key}`,
          slug: article.slug,
        });
      }
    }

    const wordCount = countArticleWords(article);
    if (wordCount < 200) {
      issues.push({
        phase: "articles",
        code: "thin_content",
        message: `Thin content (~${wordCount} words)`,
        slug: article.slug,
      });
    }
  }

  // Phase 4 — canonical audit (key pages)
  const homeSeo = buildHomeSeo();
  if (absoluteUrl(origin, homeSeo.canonicalPath) !== `${SEO_CANONICAL_ORIGIN}/`) {
    issues.push({ phase: "canonical", code: "bad_home_canonical", message: homeSeo.canonicalPath });
  }
  const org = buildOrganizationSchema(origin) as Record<string, unknown>;
  const web = buildWebSiteSchema(origin) as Record<string, unknown>;
  if (!org.url?.toString().startsWith(SEO_CANONICAL_ORIGIN)) {
    issues.push({ phase: "structured-data", code: "org_schema_origin", message: String(org.url) });
  }
  if (!web.url?.toString().startsWith(SEO_CANONICAL_ORIGIN)) {
    issues.push({ phase: "structured-data", code: "website_schema_origin", message: String(web.url) });
  }

  // Phase 5 — robots
  const robots = fs.readFileSync(robotsPath, "utf8");
  const robotsOk =
    robots.includes("User-agent: *") &&
    robots.includes("Allow: /") &&
    robots.includes(`Sitemap: ${SEO_CANONICAL_ORIGIN}/sitemap.xml`) &&
    !robots.match(/Disallow: \/recipes/i) &&
    !robots.match(/Disallow: \/guides/i) &&
    !robots.match(/Disallow: .*\/images/i);

  if (!robotsOk) {
    issues.push({ phase: "robots", code: "robots_invalid", message: "robots.txt failed validation" });
  }

  const keywordReport = keywordPages(origin);
  const missingKeywordPages = TARGET_KEYWORDS.filter((kw) => keywordReport[kw].length === 0);

  const totalRecipes =
    golden.length + performance.length + expansion.length + breakfast.length + smoothies.length + pizza.length + bbq.length;
  const uniqueRecipeUrls = recipePaths.size;

  const report = {
    generatedAt: new Date().toISOString(),
    origin,
    liveFetch: LIVE,
    phase1: {
      totalUrlsAudited: sitemapLocs.length,
      duplicateLocs: [...locCounts.values()].filter((c) => c > 1).length,
      urlAudits: LIVE ? urlAudits : undefined,
    },
    phase2: {
      collections: {
        golden100: golden.length,
        performanceMeals: performance.length,
        hallExpansion: expansion.length,
        pizzaNight: pizza.length,
        breakfast: breakfast.length,
        smoothies: smoothies.length,
        bbq: bbq.length,
        approvedCatalog: approved.recipeCount,
        curatedCollections: approved.recipeCount + pizza.filter((p) => !approved.recipes.some((r) => r.slug === p.slug)).length,
      },
      totalRecipeUrls: uniqueRecipeUrls,
      recipesInSitemap: [...recipePaths.keys()].filter((p) => sitemapPaths.has(p)).length,
      recipesMissingFromSitemap: recipesMissingFromSitemap.length,
      recipesMissingSlugs: recipesMissingFromSitemap.map((p) => recipePaths.get(p)!.slug),
    },
    phase3: {
      articlesFound: articles.length,
      articlesInSitemap: articles.length - articlesMissingFromSitemap.length,
      articlesMissingFromSitemap: articlesMissingFromSitemap.length,
    },
    phase4: { canonicalOrigin: SEO_CANONICAL_ORIGIN, canonicalIssues: issues.filter((i) => i.phase === "canonical").length },
    phase5: { robotsOk, robotsPath: "/robots.txt", sitemapDeclaration: `${SEO_CANONICAL_ORIGIN}/sitemap.xml` },
    phase6: { structuredDataIssues: schemaIssues },
    phase7: { imageSeoIssues: imageIssues },
    phase8: { keywordTargets: keywordReport, missingKeywordPages },
    phase9: { finalSitemapUrlCount: sitemapLocs.length, invalidUrlsRemoved: orphanSitemapRecipes.length },
    issues,
    pass: issues.length === 0,
  };

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2), "utf8");

  const md = `# SEO Sitemap Audit Report

Generated: ${report.generatedAt}

## Summary

| Metric | Value |
| --- | --- |
| Total URLs audited | ${report.phase1.totalUrlsAudited} |
| Invalid URLs removed | ${report.phase9.invalidUrlsRemoved} |
| Recipes found (unique URLs) | ${report.phase2.totalRecipeUrls} |
| Recipes missing from sitemap | ${report.phase2.recipesMissingFromSitemap} |
| Articles found | ${report.phase3.articlesFound} |
| Articles missing from sitemap | ${report.phase3.articlesMissingFromSitemap} |
| Canonical issues | ${report.phase4.canonicalIssues} |
| Structured data issues | ${report.phase6.structuredDataIssues} |
| Image SEO issues | ${report.phase7.imageSeoIssues} |
| Final sitemap URL count | ${report.phase9.finalSitemapUrlCount} |
| Robots status | ${robotsOk ? "PASS" : "FAIL"} |
| Overall | ${report.pass ? "PASS" : "NEEDS WORK"} |

## Collection counts

- Golden 100: ${golden.length}
- Performance Meals: ${performance.length}
- Hall Expansion: ${expansion.length}
- Pizza Night: ${pizza.length}
- Breakfast: ${breakfast.length}
- Smoothies: ${smoothies.length}
- BBQ: ${bbq.length}
- Approved catalog: ${approved.recipeCount}

## Keyword opportunities

${TARGET_KEYWORDS.map((kw) => `- **${kw}**: ${keywordReport[kw].length ? keywordReport[kw].join(", ") : "_no dedicated page_"}`).join("\n")}

${missingKeywordPages.length ? `\nMissing dedicated pages for: ${missingKeywordPages.join(", ")}` : ""}

## Issues (${issues.length})

${issues.length ? issues.slice(0, 40).map((i) => `- [${i.phase}/${i.code}] ${i.slug ?? i.url ?? ""}: ${i.message}`).join("\n") : "_None_"}
${issues.length > 40 ? `\n… and ${issues.length - 40} more (see JSON).` : ""}
`;

  fs.writeFileSync(MD_OUT, md, "utf8");

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("[audit-seo-sitemap] SEO sitemap audit\n");
    console.log(`  Sitemap URLs: ${report.phase1.totalUrlsAudited}`);
    console.log(`  Recipe URLs: ${report.phase2.totalRecipeUrls} (${report.phase2.recipesMissingFromSitemap} missing)`);
    console.log(`  Articles: ${report.phase3.articlesFound} (${report.phase3.articlesMissingFromSitemap} missing)`);
    console.log(`  Issues: ${issues.length}`);
    console.log(`  Report: ${MD_OUT}`);
    console.log(`\n  Overall: ${report.pass ? "PASS" : "NEEDS WORK"}`);
  }

  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
