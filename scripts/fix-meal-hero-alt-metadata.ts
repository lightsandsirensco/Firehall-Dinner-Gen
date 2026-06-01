#!/usr/bin/env tsx
/**
 * Add heroImageAlt metadata to recipes failing image completeness audit.
 *
 *   npm run fix:meal-hero-alt
 */
import fs from "node:fs";
import path from "node:path";
import {
  extractMealImageRequirements,
} from "../shared/curated-image-governance/meal-image-completeness.js";
import {
  loadTrustAuditTargets,
  type TrustAuditTarget,
} from "../shared/curated-image-governance/trust-audit-targets.js";

const AUDIT_PATH = path.join("review", "meal-image-trust-audit.json");
const PUBLIC = path.join(process.cwd(), "client/public");

function buildHeroImageAlt(target: TrustAuditTarget): string {
  const req = extractMealImageRequirements({
    title: target.title,
    mealFormat: target.mealFormat,
    ingredients: target.ingredients,
    tonightSpread: target.tonightSpread,
  });

  const visible =
    req.requiredVisible.length > 0
      ? req.requiredVisible.slice(0, 4).join(", ")
      : target.ingredients
          .slice(0, 4)
          .map((i) => i.name)
          .join(", ");

  const alt = `${target.title} — wide family-style firehall platter showing ${visible} on a crew prep table`;
  return alt.slice(0, 160);
}

function pagePathForTarget(t: TrustAuditTarget): string | null {
  const candidates = [
    t.collection === "breakfast" ? `catalog/breakfast/pages/${t.slug}.json` : null,
    t.collection === "pizza_night" ? `catalog/pizza-night/pages/${t.slug}.json` : null,
    t.collection === "smoothies" ? `catalog/smoothies/pages/${t.slug}.json` : null,
    t.collection === "performance_meals" ? `catalog/performance-meals/pages/${t.slug}.json` : null,
    t.collection === "hall_expansion" ? `catalog/hall-expansion/pages/${t.slug}.json` : null,
    `catalog/golden-100/pages/${t.slug}.json`,
  ].filter(Boolean) as string[];

  for (const rel of candidates) {
    const abs = path.join(PUBLIC, rel);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function main(): void {
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error("Run npm run audit:meal-image-trust first");
    process.exit(1);
  }

  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8")) as {
    rows: Array<{ slug: string; pass: boolean }>;
  };
  const failedSlugs = new Set(audit.rows.filter((r) => !r.pass).map((r) => r.slug));
  const targets = loadTrustAuditTargets().filter((t) => failedSlugs.has(t.slug));

  let updated = 0;
  for (const t of targets) {
    const file = pagePathForTarget(t);
    if (!file) continue;

    const page = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
    const nextAlt = buildHeroImageAlt(t);
    if (page.heroImageAlt === nextAlt) continue;

    page.heroImageAlt = nextAlt;
    fs.writeFileSync(file, `${JSON.stringify(page, null, 2)}\n`, "utf8");
    updated++;
    console.log(`[fix:meal-hero-alt] ${t.slug}`);
  }

  console.log(`[fix:meal-hero-alt] updated=${updated} targets=${targets.length}`);
}

main();
