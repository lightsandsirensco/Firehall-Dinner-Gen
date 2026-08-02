#!/usr/bin/env tsx
/**
 * Crawlability / internal-linking audit.
 *
 * Starts at the homepage and follows only real `<a href>` links found in
 * the RAW (non-JS) HTML response — exactly what a non-JS crawler (and,
 * more importantly, what Google's own link-graph/crawl-prioritization
 * signals) sees, as opposed to what a hydrated React app renders. Compares
 * the resulting link graph against `sitemap.xml` to find:
 *
 *   - sitemap-only URLs (in the sitemap, zero crawlable inbound links)
 *   - orphan URLs (no path from the homepage at all)
 *   - click depth for every reachable URL
 *   - per-collection crawlability (breakfast, smoothies, guides, recipes…)
 *
 * This directly investigates Google Search Console's "Discovered — currently
 * not indexed" bucket: pages Google knows exist (via sitemap.xml) but hasn't
 * prioritized crawling, which strongly correlates with weak/absent internal
 * linking.
 *
 * Usage:
 *   npx tsx scripts/audit-crawlability.ts
 *   TARGET_BASE_URL=http://localhost:5051 npx tsx scripts/audit-crawlability.ts
 *   npx tsx scripts/audit-crawlability.ts --json
 */
import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.TARGET_BASE_URL || "https://www.firehallmeals.com").replace(/\/+$/, "");
const MAX_PAGES = Number(process.env.CRAWL_MAX_PAGES || 5000);
const CONCURRENCY = Number(process.env.CRAWL_CONCURRENCY || 8);
const FETCH_TIMEOUT_MS = Number(process.env.CRAWL_TIMEOUT_MS || 20000);
const JSON_MODE = process.argv.includes("--json");

const ROOT = process.cwd();
const JSON_OUT = path.join(ROOT, "review", "crawlability-audit.json");
const MD_OUT = path.join(ROOT, "review", "crawlability-audit.md");

// ---------------------------------------------------------------------------
// Sitemap parsing
// ---------------------------------------------------------------------------

interface SitemapEntry {
  loc: string;
  path: string;
  lastmod?: string;
}

function parseSitemap(xml: string): SitemapEntry[] {
  const rows: SitemapEntry[] = [];
  for (const block of xml.split("<url>").slice(1)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    try {
      const u = new URL(loc);
      rows.push({ loc, path: normalizePath(u.pathname), lastmod });
    } catch {
      rows.push({ loc, path: normalizePath(loc), lastmod });
    }
  }
  return rows;
}

function normalizePath(p: string): string {
  const noQuery = p.split("?")[0].split("#")[0];
  const trimmed = noQuery.replace(/\/+$/, "");
  return trimmed || "/";
}

// ---------------------------------------------------------------------------
// Paths we intentionally never crawl further (private/app/auth surfaces —
// see `NOINDEX_PATH_PREFIXES` in server/seo/sitemap.ts). We still record
// that a link to one exists (for completeness) but never fetch it.
// ---------------------------------------------------------------------------

const NOCRAWL_PREFIXES = [
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
];

function shouldCrawlFurther(p: string): boolean {
  return !NOCRAWL_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

const ASSET_EXT_RE = /\.(js|css|ico|png|jpe?g|svg|webp|gif|webmanifest|xml|txt|json|woff2?|ttf|map)$/i;

function extractInternalLinks(html: string, pageUrl: string): string[] {
  const hrefs = [...html.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const out = new Set<string>();
  for (const raw of hrefs) {
    const href = raw.trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      continue;
    }
    let resolved: URL;
    try {
      resolved = new URL(href, pageUrl);
    } catch {
      continue;
    }
    if (resolved.origin !== new URL(BASE).origin) continue; // external link
    if (ASSET_EXT_RE.test(resolved.pathname)) continue; // static asset, not a page
    out.add(normalizePath(resolved.pathname));
  }
  return [...out];
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

interface FetchedPage {
  status: number;
  html: string;
  h1: string | null;
  canonical: string | null;
  canonicalCount: number;
  rootEmpty: boolean;
  title: string | null;
}

async function fetchPage(p: string): Promise<FetchedPage | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${p}`, {
      redirect: "manual",
      headers: { "User-Agent": "curl/8.0 (crawlability-audit; no-js)" },
      signal: controller.signal,
    });
    if (res.status >= 300 && res.status < 400) {
      return { status: res.status, html: "", h1: null, canonical: null, canonicalCount: 0, rootEmpty: true, title: null };
    }
    const html = await res.text();
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? null;
    const canonical = /<link\s+rel="canonical"\s+href="([^"]*)"/.exec(html)?.[1] ?? null;
    const canonicalCount = (html.match(/<link\s+rel="canonical"/g) || []).length;
    const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? null;
    const rootStart = html.indexOf('<div id="root">');
    const rootBody = rootStart >= 0 ? html.slice(rootStart + 15, html.indexOf("<script", rootStart)) : "";
    const rootEmpty = rootBody.replace(/<[^>]+>/g, "").trim().length < 20;
    return { status: res.status, html, h1, canonical, canonicalCount, rootEmpty, title };
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// BFS crawl
// ---------------------------------------------------------------------------

interface VisitedPage {
  depth: number;
  status: number | "unreachable";
  h1: string | null;
  hasContent: boolean;
  canonicalOk: boolean;
  inboundFrom: Set<string>;
}

async function crawl(): Promise<Map<string, VisitedPage>> {
  const visited = new Map<string, VisitedPage>();
  const queue: Array<{ p: string; depth: number; from: string | null }> = [{ p: "/", depth: 0, from: null }];
  const queued = new Set<string>(["/"]);
  let active = 0;
  let processed = 0;

  return new Promise((resolve) => {
    function pump() {
      if (queue.length === 0 && active === 0) {
        resolve(visited);
        return;
      }
      while (active < CONCURRENCY && queue.length > 0 && processed < MAX_PAGES) {
        const item = queue.shift()!;
        active++;
        processed++;
        (async () => {
          const existing = visited.get(item.p);
          if (existing) {
            if (item.from) existing.inboundFrom.add(item.from);
            if (item.depth < existing.depth) existing.depth = item.depth;
            active--;
            pump();
            return;
          }

          const page = await fetchPage(item.p);
          const entry: VisitedPage = {
            depth: item.depth,
            status: page?.status ?? "unreachable",
            h1: page?.h1 ?? null,
            hasContent: page ? !page.rootEmpty : false,
            canonicalOk: page ? page.canonicalCount === 1 : false,
            inboundFrom: new Set(item.from ? [item.from] : []),
          };
          visited.set(item.p, entry);

          if (page && page.status === 200 && shouldCrawlFurther(item.p)) {
            const links = extractInternalLinks(page.html, `${BASE}${item.p}`);
            for (const link of links) {
              const already = visited.get(link);
              if (already) {
                already.inboundFrom.add(item.p);
              } else if (!queued.has(link)) {
                queued.add(link);
                queue.push({ p: link, depth: item.depth + 1, from: item.p });
              } else {
                // already queued at a possibly-deeper depth; inbound tracked on visit
              }
            }
          }

          active--;
          pump();
        })();
      }
    }
    pump();
  });
}

// ---------------------------------------------------------------------------
// Collection classification (local catalog data — collection membership
// doesn't depend on live vs local, only reachability/content does)
// ---------------------------------------------------------------------------

const PUBLIC = path.join(ROOT, "client", "public");

function readIndexSlugs(rel: string): string[] {
  const file = path.join(PUBLIC, rel);
  if (!fs.existsSync(file)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf8")) as { recipes?: Array<{ slug: string }> };
    return (j.recipes ?? []).map((r) => r.slug);
  } catch {
    return [];
  }
}

function classifyPath(p: string): string {
  if (p === "/") return "home";
  if (p === "/explore") return "explore-hub";
  if (p === "/breakfast") return "breakfast-hub";
  if (p === "/breakfast/performance") return "breakfast-performance-hub";
  if (p.startsWith("/breakfast/performance/")) return "breakfast-performance-recipe";
  if (p.startsWith("/breakfast/")) return "breakfast-recipe";
  if (p === "/smoothies") return "smoothies-hub";
  if (p.startsWith("/smoothies/")) return "smoothie-recipe";
  if (p === "/pizza") return "pizza-hub";
  if (p === "/guides") return "guides-hub";
  if (p.startsWith("/guides/topic/")) return "guides-cluster";
  if (p.startsWith("/guides/")) return "guide";
  if (p.startsWith("/recipes/")) {
    const slug = p.slice("/recipes/".length);
    if (goldenSlugs.has(slug) || performanceSlugs.has(slug) || expansionSlugs.has(slug)) return "recipe-dinner";
    if (pizzaSlugs.has(slug)) return "recipe-pizza";
    if (bbqSlugs.has(slug)) return "recipe-bbq";
    return "recipe-other";
  }
  return "static-other";
}

const goldenSlugs = new Set(readIndexSlugs("catalog/golden-100/index.json"));
const performanceSlugs = new Set(readIndexSlugs("catalog/performance-meals/index.json"));
const expansionSlugs = new Set(readIndexSlugs("catalog/hall-expansion/index.json"));
const pizzaSlugs = new Set(readIndexSlugs("catalog/pizza-night/index.json"));
const bbqSlugs = new Set(readIndexSlugs("catalog/bbq/index.json"));
const breakfastSlugs = new Set(readIndexSlugs("catalog/breakfast/index.json"));
const breakfastPerfSlugs = new Set(readIndexSlugs("catalog/breakfast/performance/index.json"));
const smoothieSlugs = new Set(readIndexSlugs("catalog/smoothies/index.json"));

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`[audit-crawlability] target=${BASE}\n`);

  const sitemapRes = await fetch(`${BASE}/sitemap.xml`);
  const sitemapXml = await sitemapRes.text();
  const sitemapEntries = parseSitemap(sitemapXml);
  const sitemapPaths = new Set(sitemapEntries.map((e) => e.path));

  console.log(`Sitemap URLs: ${sitemapEntries.length}`);
  console.log(`Crawling from homepage (concurrency=${CONCURRENCY}, max=${MAX_PAGES})...`);

  const t0 = Date.now();
  const visited = await crawl();
  const elapsedMs = Date.now() - t0;

  console.log(`Crawled ${visited.size} unique internal URLs in ${(elapsedMs / 1000).toFixed(1)}s\n`);

  // ---- depth distribution (sitemap URLs only) ----
  const depthBuckets: Record<string, number> = { "0": 0, "1": 0, "2": 0, "3": 0, "4+": 0 };
  const sitemapOnly: SitemapEntry[] = [];
  const orphans: SitemapEntry[] = [];
  const perUrl: Array<Record<string, unknown>> = [];

  for (const entry of sitemapEntries) {
    const v = visited.get(entry.path);
    const collection = classifyPath(entry.path);
    if (!v) {
      sitemapOnly.push(entry);
      orphans.push(entry);
      perUrl.push({
        path: entry.path,
        collection,
        sitemapStatus: "in_sitemap",
        crawled: false,
        depth: null,
        inboundLinks: 0,
        lastmod: entry.lastmod,
      });
      continue;
    }
    const bucket = v.depth >= 4 ? "4+" : String(v.depth);
    depthBuckets[bucket] = (depthBuckets[bucket] ?? 0) + 1;
    const inbound = v.inboundFrom.size;
    if (inbound === 0 && entry.path !== "/") {
      sitemapOnly.push(entry);
    }
    perUrl.push({
      path: entry.path,
      collection,
      sitemapStatus: "in_sitemap",
      crawled: true,
      status: v.status,
      depth: v.depth,
      inboundLinks: inbound,
      hasContent: v.hasContent,
      h1: v.h1,
      canonicalOk: v.canonicalOk,
      lastmod: entry.lastmod,
    });
  }

  // ---- extra pages discovered by crawl but not in sitemap ----
  const notInSitemap = [...visited.keys()].filter((p) => !sitemapPaths.has(p) && shouldCrawlFurther(p));

  // ---- per-collection breakdown ----
  const collections = new Map<string, { total: number; crawlable: number; sitemapOnly: number; depths: number[] }>();
  for (const row of perUrl) {
    const c = row.collection as string;
    const bucket = collections.get(c) ?? { total: 0, crawlable: 0, sitemapOnly: 0, depths: [] };
    bucket.total++;
    if (row.crawled && (row.inboundLinks as number) > 0) bucket.crawlable++;
    if (!row.crawled || (row.inboundLinks as number) === 0) bucket.sitemapOnly++;
    if (typeof row.depth === "number") bucket.depths.push(row.depth);
    collections.set(c, bucket);
  }

  // ---- broken/redirect/5xx internal links found during crawl ----
  const brokenLinks = [...visited.entries()]
    .filter(([, v]) => v.status !== 200 && typeof v.status === "number")
    .map(([p, v]) => ({ path: p, status: v.status, linkedFrom: [...v.inboundFrom] }));
  const unreachable = [...visited.entries()].filter(([, v]) => v.status === "unreachable");

  const report = {
    generatedAt: new Date().toISOString(),
    target: BASE,
    elapsedMs,
    totals: {
      sitemapUrls: sitemapEntries.length,
      crawledUnique: visited.size,
      internallyDiscoverable: perUrl.filter((r) => r.crawled && (r.inboundLinks as number) > 0).length,
      sitemapOnly: sitemapOnly.length,
      orphans: orphans.length,
      notInSitemapButCrawled: notInSitemap.length,
      brokenInternalLinks: brokenLinks.length,
      unreachableInternalLinks: unreachable.length,
    },
    depthDistribution: depthBuckets,
    collections: Object.fromEntries(
      [...collections.entries()].map(([name, b]) => [
        name,
        {
          total: b.total,
          crawlable: b.crawlable,
          sitemapOnly: b.sitemapOnly,
          avgDepth: b.depths.length ? Number((b.depths.reduce((a, x) => a + x, 0) / b.depths.length).toFixed(2)) : null,
          maxDepth: b.depths.length ? Math.max(...b.depths) : null,
        },
      ]),
    ),
    sitemapOnlyUrls: sitemapOnly.map((e) => ({ path: e.path, collection: classifyPath(e.path) })),
    brokenInternalLinks: brokenLinks,
    notInSitemapButCrawled: notInSitemap,
    perUrl,
  };

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2), "utf8");

  const collectionRows = [...collections.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(
      ([name, b]) =>
        `| ${name} | ${b.total} | ${b.crawlable} | ${b.sitemapOnly} | ${b.depths.length ? (b.depths.reduce((a, x) => a + x, 0) / b.depths.length).toFixed(2) : "—"} |`,
    )
    .join("\n");

  const md = `# Crawlability Audit

Generated: ${report.generatedAt}
Target: ${BASE}

## Summary

| Metric | Value |
| --- | --- |
| Sitemap URLs | ${report.totals.sitemapUrls} |
| Crawled unique internal URLs | ${report.totals.crawledUnique} |
| Internally discoverable (sitemap ∩ crawl, inbound > 0) | ${report.totals.internallyDiscoverable} |
| Sitemap-only / orphan URLs (0 inbound crawlable links) | ${report.totals.sitemapOnly} |
| Broken internal links found | ${report.totals.brokenInternalLinks} |
| Crawled-but-not-in-sitemap | ${report.totals.notInSitemapButCrawled} |

## Click depth (sitemap URLs)

| Depth | Count |
| --- | --- |
| 0 (home) | ${depthBuckets["0"]} |
| 1 | ${depthBuckets["1"]} |
| 2 | ${depthBuckets["2"]} |
| 3 | ${depthBuckets["3"]} |
| 4+ / unreached | ${depthBuckets["4+"] + sitemapOnly.length} |

## Per-collection

| Collection | Total | Crawlable (inbound>0) | Sitemap-only | Avg depth |
| --- | --- | --- | --- | --- |
${collectionRows}

## Sitemap-only URLs (${sitemapOnly.length})

${sitemapOnly.length ? sitemapOnly.slice(0, 60).map((e) => `- ${e.path}`).join("\n") : "_None_"}
${sitemapOnly.length > 60 ? `\n… and ${sitemapOnly.length - 60} more (see JSON).` : ""}
`;

  fs.writeFileSync(MD_OUT, md, "utf8");

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Sitemap URLs: ${report.totals.sitemapUrls}`);
    console.log(`Internally discoverable: ${report.totals.internallyDiscoverable}`);
    console.log(`Sitemap-only / orphans: ${report.totals.sitemapOnly}`);
    console.log(`Broken internal links: ${report.totals.brokenInternalLinks}`);
    console.log(`\nDepth distribution: 0=${depthBuckets["0"]} 1=${depthBuckets["1"]} 2=${depthBuckets["2"]} 3=${depthBuckets["3"]} 4+=${depthBuckets["4+"]}`);
    console.log(`\nPer collection:`);
    for (const [name, b] of [...collections.entries()].sort((a, b) => b[1].total - a[1].total)) {
      console.log(`  ${name}: total=${b.total} crawlable=${b.crawlable} sitemapOnly=${b.sitemapOnly}`);
    }
    console.log(`\nReports written:\n  ${JSON_OUT}\n  ${MD_OUT}`);
  }
}

main().catch((err) => {
  console.error("audit-crawlability crashed:", err);
  process.exit(1);
});
