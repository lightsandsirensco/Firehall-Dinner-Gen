#!/usr/bin/env tsx
/**
 * SEO FIX PHASE 1 — CRAWL + INDEXING CORRECTNESS regression tests.
 *
 * Covers the specific defects fixed in this phase:
 *   1. robots.txt "Disallow: /hall" prefix over-blocking "/hall-of-fame" and
 *      "/hall-meal-planner" (fixed to "/hall$" + "/hall/").
 *   2. Unknown public URLs (e.g. "/this-does-not-exist",
 *      "/guides/topic/bogus") getting a real HTTP 404 — with a real 404
 *      title/description, no homepage canonical, and a noindex robots tag —
 *      instead of a "soft 404" (200 + homepage shell).
 *   3. "/privacy" and "/terms" getting real server-rendered SEO metadata
 *      instead of the untouched homepage shell.
 *   4. "/guides/topic/:clusterId" with an invalid id returning a real 404.
 *   5. "/blog/:slug" permanently redirecting to "/guides/:slug" when the
 *      slug resolves to a real article (and NOT redirecting to a 404 when it
 *      doesn't — a direct 404 instead).
 *
 * Part 1 (no server required) unit-tests `buildRobotsTxt()`'s raw output
 * with a small robots.txt matcher mirroring real crawler prefix-matching
 * semantics (including the Google/Bing "$" end-anchor extension).
 *
 * Part 2 (requires a running built server) exercises the actual HTTP
 * behavior end-to-end — the same non-JS-crawler view `verify-seo-raw-html.ts`
 * checks for other routes.
 *
 * Usage:
 *   npx tsx scripts/test-seo-crawl-indexing-phase1.ts          # unit tests only
 *
 *   npm run build && NODE_ENV=production PORT=5051 node dist/index.cjs &
 *   TARGET_BASE_URL=http://localhost:5051 npx tsx scripts/test-seo-crawl-indexing-phase1.ts
 */
import assert from "node:assert/strict";
import { buildRobotsTxt } from "../server/seo/sitemap.js";

const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (!condition) {
    failures.push(message);
    console.error(`  ✗ ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

/** Minimal robots.txt Disallow matcher — mirrors Google/Bing's documented
 * path-matching semantics (prefix match, "$" = end-of-string anchor). Good
 * enough to catch the exact "/hall" vs "/hall-of-fame" prefix-collision bug
 * class without needing a full third-party robots.txt parser dependency. */
function isDisallowedFor(robotsTxt: string, userAgent: string, path: string): boolean {
  const lines = robotsTxt.split("\n").map((l) => l.trim());
  let inBlock = false;
  let matched = false;
  for (const line of lines) {
    if (/^User-agent:/i.test(line)) {
      const agent = line.split(":")[1]!.trim();
      inBlock = agent === "*" || agent.toLowerCase() === userAgent.toLowerCase();
      continue;
    }
    if (!inBlock) continue;
    const disallowMatch = /^Disallow:\s*(\S+)$/i.exec(line);
    if (!disallowMatch) continue;
    const rule = disallowMatch[1]!;
    const anchored = rule.endsWith("$");
    const prefix = anchored ? rule.slice(0, -1) : rule;
    if (anchored ? path === prefix : path.startsWith(prefix)) matched = true;
  }
  return matched;
}

function testRobotsTxt(): void {
  console.log("\n[1] robots.txt — \"/hall\" prefix over-block fix");
  const robots = buildRobotsTxt("https://www.firehallmeals.com");

  // The exact bug: "/hall-of-fame" and "/hall-meal-planner" are real public
  // pages that must stay crawlable.
  check(!isDisallowedFor(robots, "*", "/hall-of-fame"), '"/hall-of-fame" must NOT be disallowed');
  check(!isDisallowedFor(robots, "*", "/hall-meal-planner"), '"/hall-meal-planner" must NOT be disallowed');
  check(!isDisallowedFor(robots, "*", "/hall-history"), '"/hall-history" must NOT be disallowed (it 301s to "/hall" now)');
  check(!isDisallowedFor(robots, "*", "/hall-program"), '"/hall-program" must NOT be disallowed (it 301s to "/hall" now)');

  // The private route and its subpaths must still be fully blocked.
  check(isDisallowedFor(robots, "*", "/hall"), '"/hall" (private app shell, exact) must still be disallowed');
  check(isDisallowedFor(robots, "*", "/hall/settings"), '"/hall/settings" (private subpath) must still be disallowed');
  check(isDisallowedFor(robots, "*", "/hall/join"), '"/hall/join" (private subpath) must still be disallowed');

  // Unaffected neighboring rules.
  check(isDisallowedFor(robots, "*", "/halls/some-hall-id"), '"/halls/:id" must still be disallowed (separate rule)');
  check(!isDisallowedFor(robots, "*", "/recipes/baked-ziti"), '"/recipes/:slug" must never be disallowed');
  check(!isDisallowedFor(robots, "*", "/guides/feeding-a-firehall-crew"), '"/guides/:slug" must never be disallowed');

  // Same fix must apply identically to every AI-crawler block, not just "*".
  check(!isDisallowedFor(robots, "GPTBot", "/hall-of-fame"), 'GPTBot block: "/hall-of-fame" must NOT be disallowed');
  check(isDisallowedFor(robots, "GPTBot", "/hall"), 'GPTBot block: "/hall" must still be disallowed');

  assert.ok(robots.includes("Disallow: /hall$"), 'buildRobotsTxt() output must contain "Disallow: /hall$"');
  assert.ok(robots.includes("Disallow: /hall/"), 'buildRobotsTxt() output must contain "Disallow: /hall/"');
  assert.ok(!/Disallow: \/hall\n/.test(robots), 'buildRobotsTxt() must not contain the old bare "Disallow: /hall" rule');
}

interface HttpCheck {
  label: string;
  path: string;
  expectStatus: number;
  expectRedirectTo?: string;
  expectTitleContains?: string;
  expectNoCanonical?: boolean;
  expectNoindex?: boolean;
}

const HTTP_CHECKS: HttpCheck[] = [
  // Requirement 2 — real 404s for unknown public URLs.
  { label: "unknown top-level path", path: "/this-does-not-exist", expectStatus: 404, expectTitleContains: "Not Found", expectNoCanonical: true, expectNoindex: true },
  { label: "unknown nested path under a real prefix", path: "/guides/topic/bogus", expectStatus: 404, expectTitleContains: "Not Found", expectNoCanonical: true, expectNoindex: true },
  { label: "dead recipe slug", path: "/recipes/__nonexistent_slug_xyz__", expectStatus: 404, expectTitleContains: "Not Found" },
  { label: "dead blog/guide slug (no redirect-to-404)", path: "/blog/__nonexistent_slug_xyz__", expectStatus: 404, expectTitleContains: "Not Found" },
  // Requirement 4 — valid guide-topic clusters keep working.
  { label: "valid guide topic cluster", path: "/guides/topic/firefighter-meals", expectStatus: 200, expectTitleContains: "Firefighter Meals" },
  // Existing valid SPA/private routes must keep passing through as 200.
  { label: "private /me shell", path: "/me", expectStatus: 200 },
  { label: "private /hall shell", path: "/hall", expectStatus: 200 },
  { label: "private /tonight shell", path: "/tonight", expectStatus: 200 },
  { label: "private /admin shell", path: "/admin", expectStatus: 200 },
  { label: "private /vote/:id shell", path: "/vote/some-vote-id", expectStatus: 200 },
  // Requirement 3 — /privacy and /terms get real server-rendered metadata.
  { label: "/privacy raw HTML", path: "/privacy", expectStatus: 200, expectTitleContains: "Privacy Policy" },
  { label: "/terms raw HTML", path: "/terms", expectStatus: 200, expectTitleContains: "Terms of Service" },
  // Requirement 5 — legacy "/blog/:slug" -> "/guides/:slug" 301s.
  { label: "/blog/:slug -> /guides/:slug (deterministic mapping)", path: "/blog/feeding-a-firehall-crew", expectStatus: 301, expectRedirectTo: "/guides/feeding-a-firehall-crew" },
  { label: "/blog/top-firehall-classics special-case preserved", path: "/blog/top-firehall-classics", expectStatus: 301, expectRedirectTo: "/guides/10-classic-firehall-meals" },
  // Client-only legacy redirects promoted to real server 301s.
  { label: "/home -> /tonight", path: "/home", expectStatus: 301, expectRedirectTo: "/tonight" },
  { label: "/discover -> /tonight", path: "/discover", expectStatus: 301, expectRedirectTo: "/tonight" },
  { label: "/hall-history -> /hall", path: "/hall-history", expectStatus: 301, expectRedirectTo: "/hall" },
  { label: "/hall-program -> /hall", path: "/hall-program", expectStatus: 301, expectRedirectTo: "/hall" },
];

async function testLiveHttp(base: string): Promise<void> {
  console.log(`\n[2] Live HTTP checks against ${base}`);
  for (const c of HTTP_CHECKS) {
    const res = await fetch(`${base}${c.path}`, { redirect: "manual" });
    const prefix = `[${c.label} ${c.path}]`;
    if (res.status !== c.expectStatus) {
      check(false, `${prefix} expected HTTP ${c.expectStatus}, got ${res.status}`);
      continue;
    }
    if (c.expectRedirectTo) {
      const loc = res.headers.get("location") || "";
      check(loc.endsWith(c.expectRedirectTo), `${prefix} expected redirect to "${c.expectRedirectTo}", got "${loc}"`);
      continue;
    }
    const html = await res.text();
    const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? "";
    const hasCanonical = /<link\s+rel="canonical"/.test(html);
    const robotsMeta = /<meta\s+name="robots"\s+content="([^"]*)"/.exec(html)?.[1] ?? "";
    if (c.expectTitleContains) {
      check(title.includes(c.expectTitleContains), `${prefix} expected title to contain "${c.expectTitleContains}", got "${title}"`);
    }
    if (c.expectNoCanonical) {
      check(!hasCanonical, `${prefix} must not have a canonical tag on a 404`);
    }
    if (c.expectNoindex) {
      check(/noindex/i.test(robotsMeta), `${prefix} must have a noindex robots meta tag on a 404, got "${robotsMeta}"`);
    }
    check(res.status === c.expectStatus, `${prefix} HTTP ${res.status}`);
  }
}

async function main(): Promise<void> {
  console.log("SEO FIX PHASE 1 — crawl + indexing correctness tests");
  testRobotsTxt();

  const base = process.env.TARGET_BASE_URL;
  if (base) {
    await testLiveHttp(base.replace(/\/+$/, ""));
  } else {
    console.log(
      "\n[2] Skipped live HTTP checks — no TARGET_BASE_URL set.\n" +
        "    Run: npm run build && NODE_ENV=production PORT=5051 node dist/index.cjs &\n" +
        "         TARGET_BASE_URL=http://localhost:5051 npx tsx scripts/test-seo-crawl-indexing-phase1.ts",
    );
  }

  console.log("");
  if (failures.length > 0) {
    console.error(`FAILED — ${failures.length} issue(s).`);
    process.exit(1);
  }
  console.log("PASSED — all SEO Phase 1 crawl/indexing checks are correct.");
}

main().catch((err) => {
  console.error("test-seo-crawl-indexing-phase1 crashed:", err);
  process.exit(1);
});
