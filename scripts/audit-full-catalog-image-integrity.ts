#!/usr/bin/env tsx
/**
 * FULL CATALOG IMAGE INTEGRITY AUDIT
 *
 * Ground-truth, filesystem-level audit across ALL seven recipe collections:
 *   Golden 100, Hall Expansion, Performance Meals, Breakfast, BBQ, Smoothies, Pizza Night
 *
 * Unlike scripts/audit-explore-image-mapping.ts (which only scans golden-100,
 * performance-meals, hall-expansion, breakfast, smoothies) this script also covers
 * BBQ and Pizza Night, which were previously excluded from the canonical Explore
 * image audit entirely — a root-cause coverage gap.
 *
 * For every recipe "page" JSON file, verifies:
 *   - hero image file exists on disk
 *   - thumb image file exists on disk
 *   - mobile image file exists on disk (if the field is present in the schema)
 *   - rail image file exists on disk (if the field is present in the schema)
 *   - hero file is not byte-identical (MD5) to another recipe's hero (cross-recipe reuse)
 *
 * Usage:
 *   npx tsx scripts/audit-full-catalog-image-integrity.ts
 *   npx tsx scripts/audit-full-catalog-image-integrity.ts --json
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PUBLIC = path.join(process.cwd(), "client", "public");
const asJson = process.argv.includes("--json");

type Collection = {
  key: string;
  label: string;
  pagesDir: string;
};

const COLLECTIONS: Collection[] = [
  { key: "golden-100", label: "Golden 100", pagesDir: "catalog/golden-100/pages" },
  { key: "hall-expansion", label: "Hall Expansion", pagesDir: "catalog/hall-expansion/pages" },
  { key: "performance-meals", label: "Performance Meals", pagesDir: "catalog/performance-meals/pages" },
  { key: "breakfast", label: "Breakfast", pagesDir: "catalog/breakfast/pages" },
  { key: "bbq", label: "BBQ", pagesDir: "catalog/bbq/pages" },
  { key: "smoothies", label: "Smoothies", pagesDir: "catalog/smoothies/pages" },
  { key: "pizza-night", label: "Pizza Night", pagesDir: "catalog/pizza-night/pages" },
];

type ImageField = "heroImage" | "thumbImage" | "mobileImage" | "railImage";
const IMAGE_FIELDS: ImageField[] = ["heroImage", "thumbImage", "mobileImage", "railImage"];

interface FieldResult {
  path: string | null;
  present: boolean;
  exists: boolean;
  md5?: string;
}

interface RecipeResult {
  collection: string;
  slug: string;
  title: string;
  file: string;
  fields: Record<ImageField, FieldResult>;
  ok: boolean;
}

function toAbsolute(publicPath: string): string {
  const rel = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return path.join(PUBLIC, rel.replace(/\//g, path.sep));
}

function fileMd5(absPath: string): string | undefined {
  try {
    const buf = fs.readFileSync(absPath);
    return crypto.createHash("md5").update(buf).digest("hex");
  } catch {
    return undefined;
  }
}

function checkField(raw: unknown): FieldResult {
  const p = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  if (!p) return { path: null, present: false, exists: false };
  const abs = toAbsolute(p);
  const exists = fs.existsSync(abs) && fs.statSync(abs).isFile();
  return { path: p, present: true, exists, md5: exists ? fileMd5(abs) : undefined };
}

function auditCollection(col: Collection): RecipeResult[] {
  const dir = path.join(PUBLIC, col.pagesDir);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const results: RecipeResult[] = [];

  for (const file of files) {
    const full = path.join(dir, file);
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (e) {
      results.push({
        collection: col.key,
        slug: file.replace(/\.json$/, ""),
        title: "(unparseable JSON)",
        file: full,
        fields: {
          heroImage: { path: null, present: false, exists: false },
          thumbImage: { path: null, present: false, exists: false },
          mobileImage: { path: null, present: false, exists: false },
          railImage: { path: null, present: false, exists: false },
        },
        ok: false,
      });
      continue;
    }

    const fields = {} as Record<ImageField, FieldResult>;
    for (const f of IMAGE_FIELDS) {
      fields[f] = checkField((data as any)[f]);
    }

    // Hero and thumb are always required. Mobile/rail only required if the
    // schema for this recipe actually declares the field (some collections,
    // e.g. breakfast, don't use mobile/rail variants).
    const heroOk = fields.heroImage.present && fields.heroImage.exists;
    const thumbOk = fields.thumbImage.present && fields.thumbImage.exists;
    const mobileOk = !fields.mobileImage.present || fields.mobileImage.exists;
    const railOk = !fields.railImage.present || fields.railImage.exists;

    results.push({
      collection: col.key,
      slug: String((data as any).slug || file.replace(/\.json$/, "")),
      title: String((data as any).title || ""),
      file: full,
      fields,
      ok: heroOk && thumbOk && mobileOk && railOk,
    });
  }

  return results;
}

function main(): void {
  const all: RecipeResult[] = [];
  for (const col of COLLECTIONS) {
    all.push(...auditCollection(col));
  }

  // Cross-recipe hero duplicate detection (MD5 across the ENTIRE catalog,
  // including cross-collection, since e.g. Pizza Night and Golden 100 share
  // the /images/golden-100/ directory).
  //
  // IMPORTANT: some recipes are intentionally cross-listed under the SAME
  // slug in two collections (e.g. golden-100/margherita-pizza and
  // pizza-night/margherita-pizza are the literal same dish, deliberately
  // sharing one hero image). That is not a bug — it's the same recipe,
  // filed under two catalog views. Only flag a duplicate group as a real
  // conflict when it contains two or more DISTINCT slugs (i.e. genuinely
  // different recipes sharing image bytes, the bootstrap-donor mass-copy
  // bug this audit exists to catch).
  const heroMd5ToSlugs = new Map<string, string[]>();
  for (const r of all) {
    const md5 = r.fields.heroImage.md5;
    if (!md5) continue;
    const list = heroMd5ToSlugs.get(md5) ?? [];
    list.push(`${r.collection}/${r.slug}`);
    heroMd5ToSlugs.set(md5, list);
  }
  const duplicateGroups = [...heroMd5ToSlugs.entries()].filter(([, members]) => {
    if (members.length <= 1) return false;
    const distinctSlugs = new Set(members.map((m) => m.split("/").slice(1).join("/")));
    return distinctSlugs.size > 1;
  });
  const duplicateMembers = new Set(duplicateGroups.flatMap(([, slugs]) => slugs));

  const missingHero = all.filter((r) => !r.fields.heroImage.exists);
  const missingThumb = all.filter((r) => !r.fields.thumbImage.exists);
  const missingMobile = all.filter((r) => r.fields.mobileImage.present && !r.fields.mobileImage.exists);
  const missingRail = all.filter((r) => r.fields.railImage.present && !r.fields.railImage.exists);
  const brokenAny = all.filter((r) => !r.ok || duplicateMembers.has(`${r.collection}/${r.slug}`));

  const byCollection = COLLECTIONS.map((col) => {
    const rows = all.filter((r) => r.collection === col.key);
    const bad = rows.filter((r) => !r.ok || duplicateMembers.has(`${r.collection}/${r.slug}`));
    return {
      collection: col.key,
      label: col.label,
      total: rows.length,
      ok: rows.length - bad.length,
      broken: bad.length,
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      recipes: all.length,
      ok: all.length - brokenAny.length,
      broken: brokenAny.length,
      missingHero: missingHero.length,
      missingThumb: missingThumb.length,
      missingMobile: missingMobile.length,
      missingRail: missingRail.length,
      duplicateGroups: duplicateGroups.length,
      duplicateMembers: duplicateMembers.size,
    },
    byCollection,
    issues: all
      .filter((r) => !r.ok || duplicateMembers.has(`${r.collection}/${r.slug}`))
      .map((r) => {
        const key = `${r.collection}/${r.slug}`;
        const reasons: string[] = [];
        if (!r.fields.heroImage.exists) reasons.push(`missing_hero:${r.fields.heroImage.path ?? "(no path)"}`);
        if (!r.fields.thumbImage.exists) reasons.push(`missing_thumb:${r.fields.thumbImage.path ?? "(no path)"}`);
        if (r.fields.mobileImage.present && !r.fields.mobileImage.exists)
          reasons.push(`missing_mobile:${r.fields.mobileImage.path}`);
        if (r.fields.railImage.present && !r.fields.railImage.exists)
          reasons.push(`missing_rail:${r.fields.railImage.path}`);
        if (duplicateMembers.has(key)) {
          const peers = (heroMd5ToSlugs.get(r.fields.heroImage.md5 || "") ?? []).filter((s) => s !== key);
          reasons.push(`duplicate_hero_bytes:${peers.join(",")}`);
        }
        return { collection: r.collection, slug: r.slug, title: r.title, reasons };
      }),
  };

  fs.mkdirSync(path.join(process.cwd(), "review"), { recursive: true });
  fs.writeFileSync(
    path.join(process.cwd(), "review", "full-catalog-image-integrity-audit.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("[audit:full-catalog-image-integrity] Summary");
  console.log(`  Total recipes:     ${report.totals.recipes}`);
  console.log(`  OK:                ${report.totals.ok}`);
  console.log(`  Broken:            ${report.totals.broken}`);
  console.log(`  Missing hero:      ${report.totals.missingHero}`);
  console.log(`  Missing thumb:     ${report.totals.missingThumb}`);
  console.log(`  Missing mobile:    ${report.totals.missingMobile}`);
  console.log(`  Missing rail:      ${report.totals.missingRail}`);
  console.log(`  Duplicate groups:  ${report.totals.duplicateGroups} (${report.totals.duplicateMembers} recipes)`);
  console.log("");
  console.log("  By collection:");
  for (const c of byCollection) {
    console.log(`    ${c.label.padEnd(20)} total=${c.total}  ok=${c.ok}  broken=${c.broken}`);
  }
  console.log("");
  console.log(`  Full report: review/full-catalog-image-integrity-audit.json`);
  if (report.issues.length > 0) {
    console.log("");
    console.log("  Issues:");
    for (const i of report.issues) {
      console.log(`    - [${i.collection}] ${i.slug} (${i.title}): ${i.reasons.join(" | ")}`);
    }
  }
}

main();
