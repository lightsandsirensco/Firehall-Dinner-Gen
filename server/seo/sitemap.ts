/**
 * Dynamic sitemap + robots for Golden 100 and core marketing routes.
 */

import fs from "node:fs";
import path from "node:path";
import { GOLDEN_CATALOG_PUBLIC_DIR } from "../golden-100/page-store.js";
import { PERFORMANCE_CATALOG_PUBLIC_DIR } from "../performance-meals/page-store.js";
import { HALL_EXPANSION_CATALOG_PUBLIC_DIR } from "../hall-expansion/page-store.js";
import { SMOOTHIE_CATALOG_PUBLIC_DIR } from "../fuel-catalog/page-store.js";
import { SEO_CANONICAL_ORIGIN } from "../../shared/seo/constants.js";
import { normalizePublicSiteOrigin } from "../../shared/seo/urls.js";
import { allSeoLandingPagePaths } from "../../shared/seo/landing-pages-data.js";
import { allProductSeoPagePaths } from "../../shared/seo/product-pages-data.js";
import { EDITORIAL_PUBLIC_DIR } from "../editorial/page-store.js";
import { PIZZA_NIGHT_CATALOG_PUBLIC_DIR } from "../pizza-night/page-store.js";
import { guidePath } from "../../shared/editorial/content-schema.js";
import { approvedCatalogRecipePath } from "../../shared/approved-catalog.js";
import { smoothieRecipePath } from "../../shared/fuel-catalog/paths.js";
import { PHASE5_REMOVED_SLUGS } from "../../shared/catalog-consolidation/phase5-redirects.js";

export function resolvePublicSiteOrigin(reqHost?: string, forwardedProto?: string): string {
  const fromEnv =
    process.env.PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.REPLIT_DEPLOYMENT_URL?.trim();
  if (fromEnv) {
    const base = fromEnv.replace(/\/+$/, "");
    const origin = /^https?:\/\//i.test(base) ? base : `https://${base}`;
    return normalizePublicSiteOrigin(origin);
  }
  if (reqHost) {
    const proto = forwardedProto === "http" ? "http" : "https";
    return normalizePublicSiteOrigin(`${proto}://${reqHost.replace(/\/+$/, "")}`);
  }
  return SEO_CANONICAL_ORIGIN;
}

function readGoldenSlugs(): Array<{ slug: string; generatedAt?: string }> {
  const indexFile = path.join(GOLDEN_CATALOG_PUBLIC_DIR, "index.json");
  if (!fs.existsSync(indexFile)) return [];
  try {
    const index = JSON.parse(fs.readFileSync(indexFile, "utf8")) as {
      generatedAt?: string;
      recipes?: Array<{ slug: string }>;
    };
    const generatedAt = index.generatedAt;
    return (index.recipes ?? []).map((r) => ({ slug: r.slug, generatedAt }));
  } catch {
    return [];
  }
}

const STATIC_PATHS: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/explore", changefreq: "daily", priority: "0.95" },
  { path: "/top-rated-recipes", changefreq: "weekly", priority: "0.85" },
  { path: "/hall-of-fame", changefreq: "daily", priority: "0.85" },
  { path: "/generator", changefreq: "weekly", priority: "0.7" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/guides", changefreq: "weekly", priority: "0.85" },
  { path: "/guides/topic/firefighter-meals", changefreq: "weekly", priority: "0.8" },
  { path: "/guides/topic/firehall-dinners", changefreq: "weekly", priority: "0.8" },
  { path: "/guides/topic/firefighter-nutrition", changefreq: "weekly", priority: "0.8" },
  { path: "/guides/topic/station-cooking", changefreq: "weekly", priority: "0.8" },
  { path: "/pizza", changefreq: "weekly", priority: "0.7" },
  { path: "/wheel", changefreq: "weekly", priority: "0.7" },
  { path: "/smoothies", changefreq: "weekly", priority: "0.85" },
  { path: "/breakfast", changefreq: "weekly", priority: "0.8" },
  { path: "/breakfast/performance", changefreq: "weekly", priority: "0.7" },
  { path: "/firefighter-red-lead-recipe", changefreq: "monthly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/how-we-test-recipes", changefreq: "monthly", priority: "0.55" },
  ...allSeoLandingPagePaths().map((path) => ({
    path,
    changefreq: "weekly",
    priority: "0.9",
  })),
  ...allProductSeoPagePaths().map((path) => ({
    path,
    changefreq: "weekly",
    priority: "0.85",
  })),
];

function readSmoothieSlugs(): Array<{ slug: string; generatedAt?: string }> {
  const indexFile = path.join(SMOOTHIE_CATALOG_PUBLIC_DIR, "index.json");
  if (!fs.existsSync(indexFile)) return [];
  try {
    const index = JSON.parse(fs.readFileSync(indexFile, "utf8")) as {
      generatedAt?: string;
      recipes?: Array<{ slug: string }>;
    };
    const generatedAt = index.generatedAt;
    return (index.recipes ?? []).map((r) => ({ slug: r.slug, generatedAt }));
  } catch {
    return [];
  }
}

function readPerformanceSlugs(): Array<{ slug: string; generatedAt?: string }> {
  const indexFile = path.join(PERFORMANCE_CATALOG_PUBLIC_DIR, "index.json");
  if (!fs.existsSync(indexFile)) return [];
  try {
    const index = JSON.parse(fs.readFileSync(indexFile, "utf8")) as {
      generatedAt?: string;
      recipes?: Array<{ slug: string }>;
    };
    const generatedAt = index.generatedAt;
    return (index.recipes ?? []).map((r) => ({ slug: r.slug, generatedAt }));
  } catch {
    return [];
  }
}

function readGuideSlugs(): Array<{ slug: string; publishedAt?: string }> {
  const indexFile = path.join(EDITORIAL_PUBLIC_DIR, "index.json");
  if (!fs.existsSync(indexFile)) return [];
  try {
    const index = JSON.parse(fs.readFileSync(indexFile, "utf8")) as {
      articles?: Array<{ slug: string; publishedAt?: string }>;
    };
    return (index.articles ?? []).map((a) => ({ slug: a.slug, publishedAt: a.publishedAt }));
  } catch {
    return [];
  }
}

function xmlEscape(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toLastmod(iso?: string): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

const BREAKFAST_CATALOG_PUBLIC_DIR = path.join(process.cwd(), "client", "public", "catalog", "breakfast");
const BBQ_CATALOG_PUBLIC_DIR = path.join(process.cwd(), "client", "public", "catalog", "bbq");

function readBreakfastSlugs(): Array<{ slug: string; generatedAt?: string }> {
  const indexFile = path.join(BREAKFAST_CATALOG_PUBLIC_DIR, "index.json");
  if (!fs.existsSync(indexFile)) return [];
  try {
    const index = JSON.parse(fs.readFileSync(indexFile, "utf8")) as {
      generatedAt?: string;
      recipes?: Array<{ slug: string }>;
    };
    const generatedAt = index.generatedAt;
    return (index.recipes ?? []).map((r) => ({ slug: r.slug, generatedAt }));
  } catch {
    return [];
  }
}

const BREAKFAST_PERFORMANCE_PUBLIC_DIR = path.join(
  process.cwd(),
  "client",
  "public",
  "catalog",
  "breakfast",
  "performance",
);

/** Performance breakfasts (e.g. "protein-pancake-tray") live in their own
 * index (`/catalog/breakfast/performance/index.json`) — the plain breakfast
 * index never contained them, so they were previously entirely absent from
 * the sitemap (confirmed: 0 of 5 present) despite being real, indexable,
 * `/breakfast/performance/:slug` pages. */
function readBreakfastPerformanceSlugs(): Array<{ slug: string; generatedAt?: string }> {
  const indexFile = path.join(BREAKFAST_PERFORMANCE_PUBLIC_DIR, "index.json");
  if (!fs.existsSync(indexFile)) return [];
  try {
    const index = JSON.parse(fs.readFileSync(indexFile, "utf8")) as {
      generatedAt?: string;
      recipes?: Array<{ slug: string }>;
    };
    const generatedAt = index.generatedAt;
    return (index.recipes ?? []).map((r) => ({ slug: r.slug, generatedAt }));
  } catch {
    return [];
  }
}

function readBbqSlugs(): Array<{ slug: string; generatedAt?: string }> {
  const indexFile = path.join(BBQ_CATALOG_PUBLIC_DIR, "index.json");
  if (!fs.existsSync(indexFile)) return [];
  try {
    const index = JSON.parse(fs.readFileSync(indexFile, "utf8")) as {
      generatedAt?: string;
      recipes?: Array<{ slug: string }>;
    };
    const generatedAt = index.generatedAt;
    return (index.recipes ?? []).map((r) => ({ slug: r.slug, generatedAt }));
  } catch {
    return [];
  }
}

function readExpansionSlugs(): Array<{ slug: string; generatedAt?: string }> {
  const indexFile = path.join(HALL_EXPANSION_CATALOG_PUBLIC_DIR, "index.json");
  if (!fs.existsSync(indexFile)) return [];
  try {
    const index = JSON.parse(fs.readFileSync(indexFile, "utf8")) as {
      generatedAt?: string;
      recipes?: Array<{ slug: string }>;
    };
    const generatedAt = index.generatedAt;
    return (index.recipes ?? []).map((r) => ({ slug: r.slug, generatedAt }));
  } catch {
    return [];
  }
}

function readPizzaNightSlugs(): Array<{ slug: string; generatedAt?: string }> {
  const indexFile = path.join(PIZZA_NIGHT_CATALOG_PUBLIC_DIR, "index.json");
  if (!fs.existsSync(indexFile)) return [];
  try {
    const index = JSON.parse(fs.readFileSync(indexFile, "utf8")) as {
      generatedAt?: string;
      recipes?: Array<{ slug: string }>;
    };
    const generatedAt = index.generatedAt;
    return (index.recipes ?? []).map((r) => ({ slug: r.slug, generatedAt }));
  } catch {
    return [];
  }
}

function readHallRecipeSlugs(): Array<{ slug: string; generatedAt?: string }> {
  const golden = readGoldenSlugs();
  const bySlug = new Map(golden.map((r) => [r.slug, r]));
  for (const row of readPerformanceSlugs()) {
    if (!bySlug.has(row.slug)) bySlug.set(row.slug, row);
  }
  for (const row of readExpansionSlugs()) {
    if (!bySlug.has(row.slug)) bySlug.set(row.slug, row);
  }
  for (const row of readPizzaNightSlugs()) {
    if (!bySlug.has(row.slug)) bySlug.set(row.slug, row);
  }
  // A handful of on-disk catalog index files still contain an entry for a
  // slug that catalog-consolidation ("phase5") retired in favor of a
  // canonical replacement slug (see `PHASE5_REMOVED_SLUGS`) — without a
  // live 301 in place for these, keeping them in the sitemap would submit a
  // URL to Google that 404s. Drop them here so the sitemap only lists
  // currently-canonical recipe URLs.
  for (const removedSlug of PHASE5_REMOVED_SLUGS) {
    bySlug.delete(removedSlug);
  }
  return [...bySlug.values()];
}

type SitemapUrlEntry = {
  path: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
};

function renderSitemapUrl(base: string, entry: SitemapUrlEntry): string {
  return `  <url>
    <loc>${xmlEscape(`${base}${entry.path}`)}</loc>
    <lastmod>${toLastmod(entry.lastmod)}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
}

export function buildSitemapXml(origin: string): string {
  const base = origin.replace(/\/+$/, "");
  const recipes = readHallRecipeSlugs();
  const indexGeneratedAt = (() => {
    const indexFile = path.join(GOLDEN_CATALOG_PUBLIC_DIR, "index.json");
    if (!fs.existsSync(indexFile)) return undefined;
    try {
      return JSON.parse(fs.readFileSync(indexFile, "utf8")).generatedAt as string | undefined;
    } catch {
      return undefined;
    }
  })();

  const entries: SitemapUrlEntry[] = [];
  const seenPaths = new Set<string>();

  function addEntry(entry: SitemapUrlEntry): void {
    const normalized = entry.path.replace(/\/+$/, "") || "/";
    if (seenPaths.has(normalized)) return;
    seenPaths.add(normalized);
    entries.push({ ...entry, path: normalized });
  }

  for (const row of STATIC_PATHS) {
    addEntry({
      path: row.path,
      lastmod: indexGeneratedAt,
      changefreq: row.changefreq,
      priority: row.priority,
    });
  }

  for (const { slug, generatedAt } of recipes) {
    addEntry({
      path: approvedCatalogRecipePath(slug),
      lastmod: generatedAt,
      changefreq: "monthly",
      priority: "0.8",
    });
  }

  for (const { slug, generatedAt } of readSmoothieSlugs()) {
    addEntry({
      path: smoothieRecipePath(slug),
      lastmod: generatedAt,
      changefreq: "monthly",
      priority: "0.8",
    });
  }

  for (const { slug, generatedAt } of readBreakfastSlugs()) {
    addEntry({
      path: approvedCatalogRecipePath(slug),
      lastmod: generatedAt,
      changefreq: "monthly",
      priority: "0.8",
    });
  }

  for (const { slug, generatedAt } of readBreakfastPerformanceSlugs()) {
    addEntry({
      path: approvedCatalogRecipePath(slug),
      lastmod: generatedAt,
      changefreq: "monthly",
      priority: "0.8",
    });
  }

  for (const { slug, generatedAt } of readBbqSlugs()) {
    addEntry({
      path: approvedCatalogRecipePath(slug),
      lastmod: generatedAt,
      changefreq: "monthly",
      priority: "0.8",
    });
  }

  for (const { slug, publishedAt } of readGuideSlugs()) {
    addEntry({
      path: guidePath(slug),
      lastmod: publishedAt,
      changefreq: "monthly",
      priority: "0.75",
    });
  }

  const urls = entries.map((entry) => renderSitemapUrl(base, entry));

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

/** AI crawlers explicitly allowed the same public content as everyone else (see /llms.txt). */
const AI_CRAWLER_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Google-Extended",
  "GoogleOther",
  "CCBot",
  "anthropic-ai",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Applebot-Extended",
  "Bytespider",
];

export function buildRobotsTxt(origin: string): string {
  const base = origin.replace(/\/+$/, "");
  const disallowBlock = `Disallow: /admin
Disallow: /api/
Disallow: /vote/
Disallow: /me
Disallow: /hall
Disallow: /halls/
Disallow: /settings
Disallow: /profile
Disallow: /tonight
Disallow: /onboarding/
Disallow: /favorites`;

  const aiBlocks = AI_CRAWLER_USER_AGENTS.map(
    (agent) => `User-agent: ${agent}\nAllow: /\n${disallowBlock}`,
  ).join("\n\n");

  return `User-agent: *
Allow: /
${disallowBlock}

${aiBlocks}

Sitemap: ${base}/sitemap.xml
`;
}

/** Paths that must never be indexed (app shells, auth, admin, APIs). */
export const NOINDEX_PATH_PREFIXES = [
  "/admin",
  "/api",
  "/vote",
  "/me",
  "/hall",
  "/halls",
  "/settings",
  "/profile",
  "/tonight",
  "/onboarding",
  "/account",
  "/plans",
  "/favorites",
] as const;

export function pathShouldNoindex(pathname: string): boolean {
  const p = (pathname || "/").toLowerCase().split("?")[0] || "/";
  return NOINDEX_PATH_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  );
}

/**
 * `/llms.txt` — generated dynamically (like robots.txt/sitemap.xml above)
 * instead of a hand-maintained static file, so it can't drift out of sync as
 * new landing pages, product pages, or collections are added.
 */
export function buildLlmsTxt(origin: string): string {
  const base = origin.replace(/\/+$/, "");
  const recipeCount = readHallRecipeSlugs().length + readSmoothieSlugs().length;
  const guideCount = readGuideSlugs().length;
  const landingLinks = allSeoLandingPagePaths()
    .map((p) => `- [${base}${p}](${base}${p})`)
    .join("\n");
  const productLinks = allProductSeoPagePaths()
    .map((p) => `- [${base}${p}](${base}${p})`)
    .join("\n");

  return `# Firehall Meals

> Firehall Meals is a meal-planning app for firefighters — crew-sized recipes, shift-tested dinners, and tools built for station kitchens where the tones can drop mid-prep.

Firehall Meals publishes ${recipeCount}+ firefighter meal recipes (dinners, BBQ/smoker, breakfast, smoothies, pizza night, and healthy/performance meals) plus ${guideCount}+ guides on feeding a crew, along with planning tools like the Classics Wheel and a hall meal planner. Content is written for real fire station kitchens: crew scaling from 2–20+, beginner-friendly steps, and instructions that hold up when a call interrupts dinner.

## Docs

- [Sitemap](${base}/sitemap.xml): Full list of indexable recipe, guide, and landing page URLs
- [About](${base}/about): Who Firehall Meals is built for and how recipes are tested
- [How We Test Recipes](${base}/how-we-test-recipes): Recipe testing and quality methodology
- [FAQ](${base}/faq): Common questions about firefighter meals and using the app

## Recipe collections

- [Explore all recipes](${base}/explore): Full searchable recipe catalog
- [Recipe families](${base}/families): Recipes grouped by dish family
- [Classics Wheel](${base}/wheel): Spin-to-decide firehall classics
- [BBQ & Smoker](${base}/firefighter-bbq-recipes): Smoker and BBQ firefighter recipes
- [Breakfast](${base}/breakfast): Firefighter breakfast and shift-fuel recipes
- [Smoothies](${base}/smoothies): Healthy smoothies for firefighters
- [Pizza Night](${base}/pizza): Firehall pizza night recipes
- [Guides](${base}/guides): Articles on feeding a crew, shift nutrition, and station cooking

## Landing pages

${landingLinks}

## Tools

${productLinks}

## Notes

- Recipe pages include structured \`Recipe\` data (ingredients, instructions, times, nutrition) via schema.org JSON-LD, plus a plain-HTML content snapshot for non-JS clients.
- Guide pages include structured \`Article\` data and FAQ schema.
- Account pages, admin tooling, and API routes (\`/me\`, \`/admin\`, \`/api/\`, \`/hall\`, \`/vote/\`, \`/settings\`, \`/profile\`) are private and excluded from indexing — see \`/robots.txt\`.
`;
}

/** Best-effort static sitemap fallback when dynamic generation fails. */
export function readStaticSitemapFallback(): string | null {
  const candidates = [
    path.join(process.cwd(), "client", "public", "sitemap.xml"),
    path.join(process.cwd(), "dist", "public", "sitemap.xml"),
    path.join(process.cwd(), "dist", "sitemap.xml"),
  ];
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        const xml = fs.readFileSync(file, "utf8");
        if (xml.includes("<urlset") && xml.includes("<loc>")) return xml;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}
