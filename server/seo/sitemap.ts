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
import { EDITORIAL_PUBLIC_DIR } from "../editorial/page-store.js";
import { guidePath } from "../../shared/editorial/content-schema.js";

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
  { path: "/recipes", changefreq: "daily", priority: "0.95" },
  { path: "/explore", changefreq: "daily", priority: "0.95" },
  { path: "/generator", changefreq: "weekly", priority: "0.7" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/categories/crew_favorites", changefreq: "weekly", priority: "0.85" },
  { path: "/categories/quick_meals", changefreq: "weekly", priority: "0.85" },
  { path: "/categories/comfort_food", changefreq: "weekly", priority: "0.85" },
  { path: "/categories/high_protein", changefreq: "weekly", priority: "0.85" },
  { path: "/categories/bbq_smoker", changefreq: "weekly", priority: "0.85" },
  { path: "/categories/breakfast", changefreq: "weekly", priority: "0.85" },
  { path: "/categories/healthy_options", changefreq: "weekly", priority: "0.85" },
  { path: "/categories/easy_cleanup", changefreq: "weekly", priority: "0.85" },
  { path: "/categories/feed_a_crowd", changefreq: "weekly", priority: "0.85" },
  { path: "/categories/game_day", changefreq: "weekly", priority: "0.85" },
  { path: "/guides", changefreq: "weekly", priority: "0.85" },
  { path: "/guides/topic/firefighter-meals", changefreq: "weekly", priority: "0.8" },
  { path: "/guides/topic/firehall-dinners", changefreq: "weekly", priority: "0.8" },
  { path: "/guides/topic/firefighter-nutrition", changefreq: "weekly", priority: "0.8" },
  { path: "/guides/topic/station-cooking", changefreq: "weekly", priority: "0.8" },
  { path: "/pizza", changefreq: "weekly", priority: "0.7" },
  { path: "/wheel", changefreq: "weekly", priority: "0.7" },
  { path: "/smoothies", changefreq: "weekly", priority: "0.85" },
  { path: "/breakfast", changefreq: "weekly", priority: "0.8" },
  { path: "/firefighter-red-lead-recipe", changefreq: "monthly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  ...allSeoLandingPagePaths().map((path) => ({
    path,
    changefreq: "weekly",
    priority: "0.9",
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
  return s
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

function readHallRecipeSlugs(): Array<{ slug: string; generatedAt?: string }> {
  const golden = readGoldenSlugs();
  const bySlug = new Map(golden.map((r) => [r.slug, r]));
  for (const row of readPerformanceSlugs()) {
    if (!bySlug.has(row.slug)) bySlug.set(row.slug, row);
  }
  for (const row of readExpansionSlugs()) {
    if (!bySlug.has(row.slug)) bySlug.set(row.slug, row);
  }
  return [...bySlug.values()];
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

  const urls: string[] = [];

  for (const row of STATIC_PATHS) {
    urls.push(`  <url>
    <loc>${xmlEscape(`${base}${row.path}`)}</loc>
    <lastmod>${toLastmod(indexGeneratedAt)}</lastmod>
    <changefreq>${row.changefreq}</changefreq>
    <priority>${row.priority}</priority>
  </url>`);
  }

  for (const { slug, generatedAt } of recipes) {
    urls.push(`  <url>
    <loc>${xmlEscape(`${base}/recipes/${slug}`)}</loc>
    <lastmod>${toLastmod(generatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  for (const { slug, generatedAt } of readSmoothieSlugs()) {
    urls.push(`  <url>
    <loc>${xmlEscape(`${base}/smoothies/${slug}`)}</loc>
    <lastmod>${toLastmod(generatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  for (const { slug, generatedAt } of readBreakfastSlugs()) {
    urls.push(`  <url>
    <loc>${xmlEscape(`${base}/breakfast/${slug}`)}</loc>
    <lastmod>${toLastmod(generatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  for (const { slug, publishedAt } of readGuideSlugs()) {
    urls.push(`  <url>
    <loc>${xmlEscape(`${base}${guidePath(slug)}`)}</loc>
    <lastmod>${toLastmod(publishedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

export function buildRobotsTxt(origin: string): string {
  const base = origin.replace(/\/+$/, "");
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /vote/

Sitemap: ${base}/sitemap.xml
`;
}
