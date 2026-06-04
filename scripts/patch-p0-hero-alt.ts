#!/usr/bin/env tsx
/**
 * Patch heroImageAlt / imageAlt for the 12 remaining image-trust failures.
 */
import fs from "node:fs";
import path from "node:path";
import { buildFirehallHeroImageAlt } from "../shared/curated-image-governance/firehall-hero-alt.js";
import { loadTrustAuditTargets } from "../shared/curated-image-governance/trust-audit-targets.js";

const SLUGS = fs
  .readFileSync(path.join(process.cwd(), "review", "p0-remaining-12-image-slugs.txt"), "utf8")
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const PUBLIC = path.join(process.cwd(), "client", "public");

function patchJson(rel: string, alt: string): boolean {
  const abs = path.join(PUBLIC, rel.replace(/^\//, ""));
  if (!fs.existsSync(abs)) return false;
  const page = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
  if ("imageAlt" in page) page.imageAlt = alt;
  page.heroImageAlt = alt;
  fs.writeFileSync(abs, `${JSON.stringify(page, null, 2)}\n`, "utf8");
  return true;
}

function main(): void {
  const targets = new Map(loadTrustAuditTargets().map((t) => [t.slug, t]));
  for (const slug of SLUGS) {
    const t = targets.get(slug);
    if (!t) {
      console.warn(`skip ${slug} — no audit target`);
      continue;
    }
    const alt = buildFirehallHeroImageAlt(t.title, t.tonightSpread);
    const rel =
      t.collection === "breakfast"
        ? `/catalog/breakfast/pages/${slug}.json`
        : t.collection === "performance_meals"
          ? `/catalog/performance-meals/pages/${slug}.json`
          : t.collection === "hall_expansion"
            ? `/catalog/hall-expansion/pages/${slug}.json`
            : `/catalog/golden-100/pages/${slug}.json`;
    if (patchJson(rel, alt)) console.log(`  ✓ ${slug}`);
    else console.warn(`  ✗ ${slug} — page missing`);
  }
}

main();
