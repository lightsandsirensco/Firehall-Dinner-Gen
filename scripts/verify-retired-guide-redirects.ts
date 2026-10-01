#!/usr/bin/env tsx
/**
 * Live check for retired guides: every /guides/{slug} and /blog/{slug} for a
 * retired guide must answer in one hop (301 to a live 200 guide, or 410 when
 * the guide has no replacement), and every live guide must return 200 with a
 * self-referencing canonical and no noindex.
 *
 *   TARGET_BASE_URL=http://localhost:5051 npx tsx scripts/verify-retired-guide-redirects.ts
 */
import { EDITORIAL_ARTICLES } from "../shared/editorial/articles-data.js";
import { RETIRED_GUIDES } from "../shared/editorial/retired-guides.js";

const BASE = (process.env.TARGET_BASE_URL || "http://localhost:5051").replace(/\/+$/, "");
const problems: string[] = [];

async function head(path: string): Promise<Response> {
  return fetch(`${BASE}${path}`, { redirect: "manual" });
}

const retiredEntries = Object.entries(RETIRED_GUIDES).map(([slug, guide]) => ({ slug, ...guide }));

for (const retired of retiredEntries) {
  for (const prefix of ["/guides/", "/blog/"]) {
    const path = `${prefix}${retired.slug}`;
    const res = await head(path);
    if (retired.target === null) {
      if (res.status !== 410) problems.push(`${path}: expected 410, got ${res.status}`);
      continue;
    }
    const expected = `/guides/${retired.target}`;
    const location = res.headers.get("location") ?? "";
    if (res.status !== 301) problems.push(`${path}: expected 301, got ${res.status}`);
    else if (new URL(location, BASE).pathname !== expected) {
      problems.push(`${path}: redirects to ${location}, expected ${expected}`);
    } else {
      const hop = await head(expected);
      if (hop.status !== 200) problems.push(`${path}: target ${expected} returned ${hop.status} (chain or dead)`);
    }
  }
}

for (const article of EDITORIAL_ARTICLES) {
  const path = `/guides/${article.slug}`;
  const res = await head(path);
  const html = await res.text();
  if (res.status !== 200) {
    problems.push(`${path}: expected 200, got ${res.status}`);
    continue;
  }
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1];
  if (!canonical || new URL(canonical).pathname !== path) {
    problems.push(`${path}: canonical ${canonical ?? "missing"}`);
  }
  if (/<meta[^>]+name="robots"[^>]+noindex/i.test(html)) problems.push(`${path}: noindex`);
  for (const retired of retiredEntries) {
    if (html.includes(`/guides/${retired.slug}"`)) problems.push(`${path}: links retired /guides/${retired.slug}`);
  }
}

console.log(
  `[verify-retired-guide-redirects] ${retiredEntries.length} retired × 2 prefixes, ${EDITORIAL_ARTICLES.length} live guides, ${problems.length} problem(s)`,
);
for (const p of problems) console.log(`  - ${p}`);
process.exit(problems.length ? 1 : 0);
