/**
 * Verifies that SEO-critical public routes return route-specific,
 * server-rendered HTML on the INITIAL HTTP response — no JavaScript
 * execution, no crawler user-agent required.
 *
 * Usage:
 *   npm run build && NODE_ENV=production PORT=5051 node dist/index.cjs &
 *   TARGET_BASE_URL=http://localhost:5051 npx tsx scripts/verify-seo-raw-html.ts
 *
 * This does a plain `fetch()` (no headless browser, no JS execution) against
 * each URL — exactly what a non-JS crawler (most social unfurlers, many AI
 * crawlers, curl, etc.) receives — and asserts the raw HTML it gets back.
 */

const BASE = process.env.TARGET_BASE_URL || "http://localhost:5051";

interface RouteCheck {
  label: string;
  path: string;
  /** Regex the canonical path must match (defaults to exact `path`). */
  expectCanonicalPath?: string;
  expectJsonLdTypes?: string[];
  minBodyLen?: number;
  expectH1?: boolean;
}

const ROUTES: RouteCheck[] = [
  { label: "home", path: "/", expectJsonLdTypes: ["Organization", "WebSite", "FAQPage"], minBodyLen: 500 },
  { label: "explore", path: "/explore", minBodyLen: 500 },
  { label: "recipe (golden-100)", path: "/recipes/baked-ziti", expectJsonLdTypes: ["Recipe"], minBodyLen: 500 },
  {
    label: "recipe (bbq)",
    path: "/recipes/honey-chipotle-chicken-thighs",
    expectJsonLdTypes: ["Recipe"],
    minBodyLen: 500,
  },
  { label: "recipe (hall-expansion)", path: "/recipes/smoked-turkey-breast", expectJsonLdTypes: ["Recipe"], minBodyLen: 300 },
  {
    label: "recipe (performance-meals)",
    path: "/recipes/asian-chicken-lettuce-cups",
    expectJsonLdTypes: ["Recipe"],
    minBodyLen: 300,
  },
  { label: "recipe (pizza-night)", path: "/recipes/bbq-chicken-pizza", expectJsonLdTypes: ["Recipe"], minBodyLen: 300 },
  { label: "smoothie", path: "/smoothies/blueberry-almond", expectJsonLdTypes: ["Recipe"], minBodyLen: 300 },
  { label: "smoothie 2", path: "/smoothies/chocolate-banana-recovery", expectJsonLdTypes: ["Recipe"], minBodyLen: 300 },
  { label: "smoothies index", path: "/smoothies", minBodyLen: 300 },
  { label: "breakfast", path: "/breakfast/bagel-lox-breakfast-board", expectJsonLdTypes: ["Recipe"], minBodyLen: 300 },
  { label: "breakfast index", path: "/breakfast", minBodyLen: 300 },
  { label: "guide 1", path: "/guides/feeding-a-firehall-crew", expectJsonLdTypes: ["Article"], minBodyLen: 500 },
  { label: "guide 2", path: "/guides/quick-meals-between-calls", expectJsonLdTypes: ["Article"], minBodyLen: 500 },
  { label: "guide 3", path: "/guides/bbq-night-at-the-station", expectJsonLdTypes: ["Article"], minBodyLen: 500 },
  { label: "guides index", path: "/guides", minBodyLen: 300 },
  { label: "pizza index", path: "/pizza", minBodyLen: 300 },
  { label: "about", path: "/about", minBodyLen: 100 },
  { label: "wheel", path: "/wheel", minBodyLen: 100 },
  { label: "seo landing page", path: "/firefighter-meals", minBodyLen: 100 },
];

interface Extracted {
  status: number;
  html: string;
  title: string | null;
  description: string | null;
  canonical: string | null;
  canonicalCount: number;
  ogUrl: string | null;
  ogTitle: string | null;
  twitterTitle: string | null;
  h1: string | null;
  jsonLdTypes: string[];
  bodyLen: number;
}

function extract(status: number, html: string): Extracted {
  const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? null;
  const description = /<meta\s+name="description"\s+content="([^"]*)"/.exec(html)?.[1] ?? null;
  const canonical = /<link\s+rel="canonical"\s+href="([^"]*)"/.exec(html)?.[1] ?? null;
  const canonicalCount = (html.match(/<link\s+rel="canonical"/g) || []).length;
  const ogUrl = /<meta\s+property="og:url"\s+content="([^"]*)"/.exec(html)?.[1] ?? null;
  const ogTitle = /<meta\s+property="og:title"\s+content="([^"]*)"/.exec(html)?.[1] ?? null;
  const twitterTitle = /<meta\s+name="twitter:title"\s+content="([^"]*)"/.exec(html)?.[1] ?? null;
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? null;
  const jsonLdTypes = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(
    (m) => {
      try {
        const j = JSON.parse(m[1]);
        const arr = Array.isArray(j) ? j : [j];
        return arr.map((x) => x["@type"]).filter(Boolean);
      } catch {
        return ["PARSE_ERROR"];
      }
    },
  );
  const rootStart = html.indexOf('<div id="root">');
  const scriptStart = html.indexOf("<script", rootStart);
  const bodyLen = rootStart >= 0 ? (scriptStart > rootStart ? scriptStart : html.length) - rootStart : 0;
  return { status, html, title, description, canonical, canonicalCount, ogUrl, ogTitle, twitterTitle, h1, jsonLdTypes, bodyLen };
}

async function fetchRaw(path: string): Promise<Extracted> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": "curl/8.0 (seo-verify-script; no-js)" },
  });
  const html = await res.text();
  return extract(res.status, html);
}

async function main() {
  console.log(`Verifying raw (non-JS) HTML against ${BASE}\n`);
  const failures: string[] = [];
  const results = new Map<string, Extracted>();

  for (const route of ROUTES) {
    const data = await fetchRaw(route.path);
    results.set(route.label, data);

    const prefix = `[${route.label} ${route.path}]`;
    if (data.status !== 200) failures.push(`${prefix} expected HTTP 200, got ${data.status}`);
    if (!data.title) failures.push(`${prefix} missing <title>`);
    if (!data.description) failures.push(`${prefix} missing <meta name="description">`);
    if (!data.canonical) failures.push(`${prefix} missing <link rel="canonical">`);
    if (data.canonicalCount > 1) failures.push(`${prefix} has ${data.canonicalCount} canonical tags (must be exactly 1)`);
    if (!data.ogUrl) failures.push(`${prefix} missing og:url`);
    if (!data.ogTitle) failures.push(`${prefix} missing og:title`);
    if (!data.twitterTitle) failures.push(`${prefix} missing twitter:title`);
    if (route.expectH1 !== false && !data.h1) failures.push(`${prefix} missing <h1>`);
    if (route.minBodyLen && data.bodyLen < route.minBodyLen) {
      failures.push(`${prefix} body content too thin (${data.bodyLen} bytes, expected >= ${route.minBodyLen}) — looks like an empty SPA shell`);
    }
    for (const t of route.expectJsonLdTypes ?? []) {
      if (!data.jsonLdTypes.includes(t)) {
        failures.push(`${prefix} missing expected JSON-LD type "${t}" (found: ${data.jsonLdTypes.join(", ") || "none"})`);
      }
    }

    console.log(
      `${data.status === 200 ? "✓" : "✗"} ${prefix} title="${data.title?.slice(0, 60)}" canonical=${data.canonical} h1="${data.h1?.slice(0, 40) ?? "MISSING"}" jsonLd=[${data.jsonLdTypes.join(",")}] body=${data.bodyLen}B`,
    );
  }

  // Cross-route identity + "same as homepage" checks.
  const home = results.get("home")!;
  for (const [label, data] of results) {
    if (label === "home") continue;
    if (data.html === home.html) failures.push(`[${label}] byte-identical to homepage HTML — same shell bug`);
    if (data.canonical && home.canonical && data.canonical === home.canonical) {
      failures.push(`[${label}] canonical matches homepage canonical (${data.canonical}) — hardcoded canonical bug`);
    }
    if (data.title && home.title && data.title === home.title) {
      failures.push(`[${label}] title matches homepage title — not route-specific`);
    }
    if (data.ogUrl && home.ogUrl && data.ogUrl === home.ogUrl) {
      failures.push(`[${label}] og:url matches homepage og:url — not route-specific`);
    }
  }
  const seen = new Map<string, string>();
  for (const [label, data] of results) {
    const prior = seen.get(data.html);
    if (prior) failures.push(`[${label}] byte-identical HTML to [${prior}]`);
    else seen.set(data.html, label);
  }

  console.log("");
  if (failures.length > 0) {
    console.error(`FAILED — ${failures.length} issue(s):\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`PASSED — all ${ROUTES.length} routes return unique, route-specific, server-rendered SEO HTML with no JS execution.`);
}

main().catch((err) => {
  console.error("verify-seo-raw-html crashed:", err);
  process.exit(1);
});
