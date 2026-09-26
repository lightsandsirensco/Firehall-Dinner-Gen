/**
 * SEO Phase 5, Section A verification: fetches raw (non-JS) HTML for a
 * representative sample of routes and asserts NO JSON-LD `@type` appears
 * more than once across ALL `<script type="application/ld+json">` blocks
 * on that page (whether from the static `client/index.html` fallback or
 * any per-route injector) — the objective, verifiable definition of
 * "duplicate JSON-LD" this phase is fixing.
 *
 * Usage:
 *   TARGET_BASE_URL=http://localhost:5052 npx tsx scripts/verify-no-duplicate-jsonld.ts
 */

const BASE = process.env.TARGET_BASE_URL || "http://localhost:5051";

const ROUTES = [
  "/",
  "/explore",
  "/recipes/baked-ziti",
  "/recipes/honey-chipotle-chicken-thighs",
  "/recipes/smoked-turkey-breast",
  "/recipes/asian-chicken-lettuce-cups",
  "/recipes/bbq-chicken-pizza",
  "/smoothies/blueberry-almond",
  "/smoothies",
  "/breakfast/bagel-lox-breakfast-board",
  "/breakfast",
  "/guides/feeding-a-firehall-crew",
  "/guides",
  "/pizza",
  "/about",
  "/privacy",
  "/terms",
  "/wheel",
  "/firefighter-meals",
  "/firefighter-bbq-recipes",
  "/families",
  "/top-rated-recipes",
  "/hall-of-fame",
  "/generator",
  "/hall-meal-planner",
  "/firefighter-red-lead-recipe",
  "/faq",
  "/guides/topic/firefighter-meals",
];

function extractTopLevelTypes(html: string): string[] {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  const types: string[] = [];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1]!);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of entries) {
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          if (typeof entry["@type"] === "string") types.push(entry["@type"]);
          // Also walk one level into @graph (the static default block shape).
          if (Array.isArray(entry["@graph"])) {
            for (const g of entry["@graph"]) {
              if (g && typeof g === "object" && typeof g["@type"] === "string") types.push(g["@type"]);
            }
          }
        }
      }
    } catch {
      types.push("PARSE_ERROR");
    }
  }
  return types;
}

async function main() {
  console.log(`Verifying no duplicate JSON-LD @type entities against ${BASE}\n`);
  let failed = false;

  for (const path of ROUTES) {
    const res = await fetch(`${BASE}${path}`);
    const html = await res.text();
    const types = extractTopLevelTypes(html);
    const counts = new Map<string, number>();
    for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
    const dupes = [...counts.entries()].filter(([, n]) => n > 1);
    if (dupes.length) {
      failed = true;
      console.log(`✗ [${path}] duplicate types: ${dupes.map(([t, n]) => `${t}x${n}`).join(", ")} (all: ${types.join(",")})`);
    } else {
      console.log(`✓ [${path}] ${types.join(",") || "(none)"}`);
    }
  }

  if (failed) {
    console.error("\nFAILED — duplicate JSON-LD entities found.");
    process.exit(1);
  }
  console.log("\nPASSED — no duplicate JSON-LD @type entities on any checked route.");
}

main();
