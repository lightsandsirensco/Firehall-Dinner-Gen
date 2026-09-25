#!/usr/bin/env tsx
/**
 * SEO FIX PHASE 2 — internal recipe link coverage regression test.
 *
 * Crawls the RAW (non-JS) server-rendered HTML — exactly what a non-JS
 * crawler and Google's initial crawl/link-graph pass see, not the hydrated
 * React DOM — starting from the homepage, following every real `<a href>`
 * it finds (hub pages, landing pages, guides, and every recipe/breakfast/
 * smoothie detail page's own content snapshot). For every indexable recipe
 * across every catalog (Golden 100, Performance, Hall Expansion, BBQ, Pizza
 * Night, Breakfast, Breakfast Performance, Smoothies) it reports:
 *
 *   - total indexable recipes
 *   - recipes reachable via at least one internal link (any source: hub,
 *     landing page, guide, or another recipe's related-recipe section)
 *   - recipes reachable specifically via a "Related recipes" link on
 *     another recipe/breakfast/smoothie page (the related-recipe system
 *     audited/fixed in this phase)
 *   - orphaned recipes (zero inbound links from anywhere in the crawl)
 *   - links pointing at a recipe-shaped path that doesn't resolve to any
 *     known catalog slug ("broken recipe links")
 *
 * This intentionally does NOT assert an exact link count per recipe (that
 * would be brittle) — it only catches the regressions that actually matter:
 * large swaths of the catalog going unlinked, or link targets rotting.
 *
 * Usage:
 *   npm run build && NODE_ENV=production PORT=5051 node dist/index.cjs &
 *   TARGET_BASE_URL=http://localhost:5051 npx tsx scripts/test-internal-link-coverage.ts
 *
 *   # or against a `npm run dev` server (the injection layer runs in dev too):
 *   TARGET_BASE_URL=http://localhost:5051 npx tsx scripts/test-internal-link-coverage.ts
 */
import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.TARGET_BASE_URL || "http://localhost:5051").replace(/\/+$/, "");
const CONCURRENCY = Number(process.env.CRAWL_CONCURRENCY || 10);
const FETCH_TIMEOUT_MS = Number(process.env.CRAWL_TIMEOUT_MS || 20000);
const MAX_PAGES = Number(process.env.CRAWL_MAX_PAGES || 3000);

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const JSON_OUT = path.join(ROOT, "review", "internal-link-coverage.json");
const MD_OUT = path.join(ROOT, "review", "internal-link-coverage.md");

// ---------------------------------------------------------------------------
// 1. Canonical recipe universe (straight from the static catalog indexes —
//    the same source of truth every catalog's own route/link builder uses).
// ---------------------------------------------------------------------------

interface RecipeRef {
  slug: string;
  title: string;
  path: string;
  catalog: string;
}

function readIndexEntries(rel: string): Array<{ slug: string; title: string }> {
  const file = path.join(PUBLIC, rel);
  if (!fs.existsSync(file)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf8")) as { recipes?: Array<{ slug: string; title: string }> };
    return j.recipes ?? [];
  } catch {
    return [];
  }
}

function buildRecipeUniverse(): RecipeRef[] {
  const out: RecipeRef[] = [];
  const add = (rel: string, catalog: string, toPath: (slug: string) => string) => {
    for (const e of readIndexEntries(rel)) out.push({ slug: e.slug, title: e.title, path: toPath(e.slug), catalog });
  };
  add("catalog/golden-100/index.json", "golden-100", (s) => `/recipes/${s}`);
  add("catalog/performance-meals/index.json", "performance-meals", (s) => `/recipes/${s}`);
  add("catalog/hall-expansion/index.json", "hall-expansion", (s) => `/recipes/${s}`);
  add("catalog/bbq/index.json", "bbq", (s) => `/recipes/${s}`);
  add("catalog/pizza-night/index.json", "pizza-night", (s) => `/recipes/${s}`);
  add("catalog/breakfast/index.json", "breakfast", (s) => `/breakfast/${s}`);
  add("catalog/breakfast/performance/index.json", "breakfast-performance", (s) => `/breakfast/performance/${s}`);
  add("catalog/smoothies/index.json", "smoothies", (s) => `/smoothies/${s}`);
  return out;
}

const RECIPE_UNIVERSE = buildRecipeUniverse();
const PATH_TO_RECIPE = new Map(RECIPE_UNIVERSE.map((r) => [r.path, r]));

/** Path shapes that LOOK like a recipe detail link — used to flag broken
 * links (a href pointing at a slug that doesn't resolve to any catalog). */
const RECIPE_SHAPED_PATH_RE = /^\/(recipes|breakfast|breakfast\/performance|smoothies)\/[a-z0-9-]+\/?$/i;
/** Bare collection-hub paths that match the regex's prefix but aren't recipe
 * links at all (e.g. "/breakfast/performance" the hub, not a slug). */
const HUB_PATHS = new Set(["/recipes", "/breakfast", "/breakfast/performance", "/smoothies"]);

function normalizePath(p: string): string {
  const noQuery = p.split("?")[0].split("#")[0];
  const trimmed = noQuery.replace(/\/+$/, "");
  return trimmed || "/";
}

// ---------------------------------------------------------------------------
// 2. Fetch + link/related-link extraction
// ---------------------------------------------------------------------------

const ASSET_EXT_RE = /\.(js|css|ico|png|jpe?g|svg|webp|gif|webmanifest|xml|txt|json|woff2?|ttf|map)$/i;
const NOCRAWL_PREFIXES = ["/admin", "/api", "/vote", "/me", "/hall", "/halls", "/settings", "/profile", "/tonight", "/onboarding", "/account", "/plans", "/favorites"];

function shouldCrawlFurther(p: string): boolean {
  return !NOCRAWL_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

interface FetchedPage {
  status: number;
  allLinks: string[];
  relatedLinks: string[];
}

function extractHrefs(html: string, pageUrl: string): string[] {
  const hrefs = [...html.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const out = new Set<string>();
  for (const raw of hrefs) {
    const href = raw.trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    let resolved: URL;
    try {
      resolved = new URL(href, pageUrl);
    } catch {
      continue;
    }
    if (resolved.origin !== new URL(BASE).origin) continue;
    if (ASSET_EXT_RE.test(resolved.pathname)) continue;
    out.add(normalizePath(resolved.pathname));
  }
  return [...out];
}

/** The pre-hydration recipe/breakfast/smoothie snapshot (see
 * `server/seo/content-snapshot.ts`) always renders a `<h2>Related
 * recipes</h2>` immediately followed by its `<ul class="fh-linklist">` when
 * the page has any related links — isolate just that block so "linked from
 * a hub page" and "linked from another recipe's related-recipe section"
 * stay distinct signals. */
function extractRelatedSectionHrefs(html: string, pageUrl: string): string[] {
  const match = /<h2>Related recipes<\/h2>\s*<ul class="fh-linklist">([\s\S]*?)<\/ul>/.exec(html);
  if (!match) return [];
  return extractHrefs(match[1], pageUrl);
}

async function fetchPage(p: string): Promise<FetchedPage | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${p}`, {
      redirect: "manual",
      headers: { "User-Agent": "curl/8.0 (internal-link-coverage-test; no-js)" },
      signal: controller.signal,
    });
    if (res.status >= 300 && res.status < 400) return { status: res.status, allLinks: [], relatedLinks: [] };
    const html = await res.text();
    const pageUrl = `${BASE}${p}`;
    return { status: res.status, allLinks: extractHrefs(html, pageUrl), relatedLinks: extractRelatedSectionHrefs(html, pageUrl) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// 3. BFS crawl from "/", recording every edge (source -> target) plus which
//    edges came specifically from a "Related recipes" section.
// ---------------------------------------------------------------------------

interface CrawlResult {
  visitedStatus: Map<string, number | "unreachable">;
  inboundAny: Map<string, Set<string>>;
  inboundRelated: Map<string, Set<string>>;
  brokenTargets: Map<string, Set<string>>; // recipe-shaped target path -> pages linking to it
}

async function crawl(): Promise<CrawlResult> {
  const visitedStatus = new Map<string, number | "unreachable">();
  const inboundAny = new Map<string, Set<string>>();
  const inboundRelated = new Map<string, Set<string>>();
  const brokenTargets = new Map<string, Set<string>>();

  const queue: string[] = ["/"];
  const queued = new Set<string>(["/"]);
  let active = 0;
  let processed = 0;

  function recordEdge(from: string, to: string, related: boolean) {
    if (RECIPE_SHAPED_PATH_RE.test(to) && !HUB_PATHS.has(to) && !PATH_TO_RECIPE.has(to)) {
      const set = brokenTargets.get(to) ?? new Set<string>();
      set.add(from);
      brokenTargets.set(to, set);
    }
    const anySet = inboundAny.get(to) ?? new Set<string>();
    anySet.add(from);
    inboundAny.set(to, anySet);
    if (related) {
      const relSet = inboundRelated.get(to) ?? new Set<string>();
      relSet.add(from);
      inboundRelated.set(to, relSet);
    }
  }

  return new Promise((resolve) => {
    function pump() {
      if (queue.length === 0 && active === 0) {
        resolve({ visitedStatus, inboundAny, inboundRelated, brokenTargets });
        return;
      }
      while (active < CONCURRENCY && queue.length > 0 && processed < MAX_PAGES) {
        const p = queue.shift()!;
        active++;
        processed++;
        (async () => {
          const page = await fetchPage(p);
          visitedStatus.set(p, page?.status ?? "unreachable");

          if (page && page.status === 200 && shouldCrawlFurther(p)) {
            const relatedSet = new Set(page.relatedLinks);
            for (const link of page.allLinks) {
              recordEdge(p, link, relatedSet.has(link));
              if (!queued.has(link)) {
                queued.add(link);
                queue.push(link);
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
// 4. Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`[test-internal-link-coverage] target=${BASE}`);
  console.log(`Indexable recipe universe: ${RECIPE_UNIVERSE.length}`);
  for (const [catalog, count] of Object.entries(
    RECIPE_UNIVERSE.reduce<Record<string, number>>((acc, r) => ((acc[r.catalog] = (acc[r.catalog] ?? 0) + 1), acc), {}),
  )) {
    console.log(`  - ${catalog}: ${count}`);
  }
  console.log(`\nCrawling from homepage (concurrency=${CONCURRENCY})...`);

  const t0 = Date.now();
  const { visitedStatus, inboundAny, inboundRelated, brokenTargets } = await crawl();
  const elapsedMs = Date.now() - t0;
  console.log(`Crawled ${visitedStatus.size} unique internal URLs in ${(elapsedMs / 1000).toFixed(1)}s\n`);

  const perRecipe = RECIPE_UNIVERSE.map((r) => ({
    ...r,
    status: visitedStatus.get(r.path) ?? "not-crawled",
    inboundAny: inboundAny.get(r.path)?.size ?? 0,
    inboundRelated: inboundRelated.get(r.path)?.size ?? 0,
  }));

  const withAnyLink = perRecipe.filter((r) => r.inboundAny > 0);
  const withRelatedLink = perRecipe.filter((r) => r.inboundRelated > 0);
  const orphans = perRecipe.filter((r) => r.inboundAny === 0);
  const brokenLinks = [...brokenTargets.entries()].map(([target, sources]) => ({ target, linkedFrom: [...sources] }));

  const byCatalog = new Map<string, { total: number; withAnyLink: number; withRelatedLink: number; orphans: number }>();
  for (const r of perRecipe) {
    const b = byCatalog.get(r.catalog) ?? { total: 0, withAnyLink: 0, withRelatedLink: 0, orphans: 0 };
    b.total++;
    if (r.inboundAny > 0) b.withAnyLink++;
    if (r.inboundRelated > 0) b.withRelatedLink++;
    if (r.inboundAny === 0) b.orphans++;
    byCatalog.set(r.catalog, b);
  }

  console.log("Per-catalog coverage:");
  console.log("catalog".padEnd(24), "total".padEnd(8), "any-link".padEnd(10), "related-link".padEnd(14), "orphans");
  for (const [catalog, b] of byCatalog) {
    console.log(catalog.padEnd(24), String(b.total).padEnd(8), String(b.withAnyLink).padEnd(10), String(b.withRelatedLink).padEnd(14), String(b.orphans));
  }

  console.log("\nTotals:");
  console.log(`  Indexable recipes:              ${perRecipe.length}`);
  console.log(`  Recipes with >=1 internal link:  ${withAnyLink.length} (${((withAnyLink.length / perRecipe.length) * 100).toFixed(1)}%)`);
  console.log(`  Recipes with related-recipe link: ${withRelatedLink.length} (${((withRelatedLink.length / perRecipe.length) * 100).toFixed(1)}%)`);
  console.log(`  Orphaned recipes (0 inbound):     ${orphans.length}`);
  console.log(`  Broken recipe-shaped links:       ${brokenLinks.length}`);

  if (orphans.length > 0) {
    console.log("\nOrphaned recipes:");
    for (const o of orphans.slice(0, 50)) console.log(`  - [${o.catalog}] ${o.slug} (${o.path}) status=${o.status}`);
    if (orphans.length > 50) console.log(`  ...and ${orphans.length - 50} more`);
  }

  if (brokenLinks.length > 0) {
    console.log("\nBroken recipe-shaped links (target doesn't resolve to any known catalog slug):");
    for (const b of brokenLinks.slice(0, 50)) console.log(`  - ${b.target} <- linked from ${b.linkedFrom.slice(0, 3).join(", ")}${b.linkedFrom.length > 3 ? ` (+${b.linkedFrom.length - 3} more)` : ""}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    target: BASE,
    elapsedMs,
    totals: {
      indexableRecipes: perRecipe.length,
      withAnyInternalLink: withAnyLink.length,
      withRelatedRecipeLink: withRelatedLink.length,
      orphans: orphans.length,
      brokenRecipeLinks: brokenLinks.length,
      crawledUniqueUrls: visitedStatus.size,
    },
    byCatalog: Object.fromEntries(byCatalog),
    orphanedRecipes: orphans.map((o) => ({ catalog: o.catalog, slug: o.slug, path: o.path, status: o.status })),
    brokenLinks,
    perRecipe: perRecipe.map((r) => ({ catalog: r.catalog, slug: r.slug, path: r.path, status: r.status, inboundAny: r.inboundAny, inboundRelated: r.inboundRelated })),
  };

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2), "utf8");

  const catalogRows = [...byCatalog.entries()]
    .map(([name, b]) => `| ${name} | ${b.total} | ${b.withAnyLink} | ${b.withRelatedLink} | ${b.orphans} |`)
    .join("\n");

  const md = `# Internal Link Coverage — Phase 2

Generated: ${report.generatedAt}
Target: ${BASE}

## Totals

| Metric | Value |
| --- | --- |
| Indexable recipes | ${perRecipe.length} |
| Recipes with >=1 internal link | ${withAnyLink.length} (${((withAnyLink.length / perRecipe.length) * 100).toFixed(1)}%) |
| Recipes with a related-recipe link | ${withRelatedLink.length} (${((withRelatedLink.length / perRecipe.length) * 100).toFixed(1)}%) |
| Orphaned recipes | ${orphans.length} |
| Broken recipe-shaped links | ${brokenLinks.length} |

## Per-catalog

| Catalog | Total | Any link | Related link | Orphans |
| --- | --- | --- | --- | --- |
${catalogRows}

${orphans.length ? `## Orphaned recipes\n\n${orphans.map((o) => `- [${o.catalog}] \`${o.slug}\` (${o.path})`).join("\n")}\n` : ""}
${brokenLinks.length ? `## Broken links\n\n${brokenLinks.map((b) => `- \`${b.target}\` linked from ${b.linkedFrom.map((s) => `\`${s}\``).join(", ")}`).join("\n")}\n` : ""}
`;
  fs.writeFileSync(MD_OUT, md, "utf8");
  console.log(`\nReport written to ${path.relative(ROOT, JSON_OUT)} and ${path.relative(ROOT, MD_OUT)}`);

  // Fail only on unambiguous regressions — never a brittle exact-N rule.
  let fail = false;
  if (brokenLinks.length > 0) {
    console.error(`\n[test-internal-link-coverage] FAIL — ${brokenLinks.length} broken recipe-shaped link target(s).`);
    fail = true;
  }
  const orphanRate = orphans.length / perRecipe.length;
  if (orphanRate > 0.1) {
    console.error(`\n[test-internal-link-coverage] FAIL — orphan rate ${(orphanRate * 100).toFixed(1)}% exceeds 10% threshold.`);
    fail = true;
  }
  if (fail) process.exit(1);
  console.log(`\n[test-internal-link-coverage] OK`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
