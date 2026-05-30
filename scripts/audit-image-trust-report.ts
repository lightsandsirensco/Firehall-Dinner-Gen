#!/usr/bin/env tsx
/**
 * User-trust image report — wrong meal (P0), within-category dupes (P1),
 * cross-category accurate dupes (P2). Optimizes for meal identification, not uniqueness.
 *
 *   npm run audit:image-trust
 *
 * Outputs:
 *   review/image-trust-report.json
 *   review/image-trust-report.md
 */
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import { BREAKFAST_IMAGE_DONOR_PLAN, GOLDEN_100_BREAKFAST_SLUGS, BREAKFAST_CANONICAL_UNIQUE_SLUGS } from "../shared/breakfast-catalog/image-donor-plan.js";
import { PERFORMANCE_MEAL_IMAGE_DONOR_OVERRIDES } from "../shared/performance-meals/image-donor-overrides.js";
import { EXPLORE_IMAGE_SLUG_OVERRIDES } from "../shared/curated-image-governance/explore-image-overrides.js";
import { TRUST_FIRST_EXPLORE_DONORS } from "../shared/curated-image-governance/trust-first-explore-donors.js";
import { HALL_EXPANSION_IMAGE_DONOR_OVERRIDES } from "../shared/hall-expansion/image-donor-overrides.js";
import { CATALOG_IMAGE_DONOR_OVERRIDES } from "../shared/catalog-image-donor-overrides.js";
import { auditTitlePathKeywords } from "../shared/curated-image-governance/image-accuracy-rules.js";
import { auditBreakfastFormatRules } from "../shared/curated-image-governance/breakfast-image-rules.js";

type Category =
  | "golden_100"
  | "performance_meals"
  | "hall_expansion"
  | "breakfast"
  | "pizza_night"
  | "explore_curated"
  | "smoothies";

type TrustRow = {
  collection: Category;
  slug: string;
  title: string;
  heroImage: string;
  heroMd5?: string;
  donorSlug?: string;
  userFacing: boolean;
  cuisine?: string;
};

const JSON_OUT = path.join("review", "image-trust-report.json");
const MD_OUT = path.join("review", "image-trust-report.md");

const TRUST_CRITICAL_CODES = new Set([
  "title_path_keyword_conflict",
  "category_mismatch",
  "missing_image_file",
]);

const FOOD_STOP = new Set([
  "with",
  "and",
  "the",
  "for",
  "recipe",
  "firehall",
  "hall",
  "breakfast",
  "dinner",
  "easy",
  "best",
  "classic",
  "style",
  "light",
  "lite",
  "bar",
  "night",
  "feed",
  "tray",
  "skillet",
  "sheet",
  "pan",
  "bake",
  "baked",
  "casserole",
  "soup",
  "stew",
  "pot",
  "one",
]);

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .filter((t) => t.length > 2 && !FOOD_STOP.has(t)),
  );
}

function tokenOverlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.max(ta.size, tb.size);
}

function buildTrustApprovedDonorPairs(): Set<string> {
  const pairs = new Set<string>();
  const add = (map: Record<string, string>) => {
    for (const [slug, donor] of Object.entries(map)) pairs.add(`${slug}:${donor}`);
  };
  add(BREAKFAST_IMAGE_DONOR_PLAN);
  add(TRUST_FIRST_EXPLORE_DONORS);
  add(HALL_EXPANSION_IMAGE_DONOR_OVERRIDES);
  add(PERFORMANCE_MEAL_IMAGE_DONOR_OVERRIDES);
  add(EXPLORE_IMAGE_SLUG_OVERRIDES);
  for (const [slug, override] of Object.entries(CATALOG_IMAGE_DONOR_OVERRIDES)) {
    pairs.add(`${slug}:${override.donorSlug}`);
  }
  return pairs;
}

const TRUST_APPROVED_DONOR_PAIRS = buildTrustApprovedDonorPairs();

function isTrustApprovedDonor(slug: string, donorSlug: string): boolean {
  return TRUST_APPROVED_DONOR_PAIRS.has(`${slug}:${donorSlug}`);
}

function shouldApplyBreakfastFormatRules(row: TrustRow): boolean {
  if (row.collection === "breakfast") return true;
  if (BREAKFAST_IMAGE_DONOR_PLAN[row.slug] || BREAKFAST_CANONICAL_UNIQUE_SLUGS.has(row.slug)) return true;
  if (GOLDEN_100_BREAKFAST_SLUGS.has(row.slug)) return true;
  return false;
}

function resolveDonorSlug(row: TrustRow): string | undefined {
  if (TRUST_FIRST_EXPLORE_DONORS[row.slug]) return TRUST_FIRST_EXPLORE_DONORS[row.slug];
  if (HALL_EXPANSION_IMAGE_DONOR_OVERRIDES[row.slug]) return HALL_EXPANSION_IMAGE_DONOR_OVERRIDES[row.slug];
  if (BREAKFAST_IMAGE_DONOR_PLAN[row.slug]) return BREAKFAST_IMAGE_DONOR_PLAN[row.slug];
  if (PERFORMANCE_MEAL_IMAGE_DONOR_OVERRIDES[row.slug]) return PERFORMANCE_MEAL_IMAGE_DONOR_OVERRIDES[row.slug];
  if (EXPLORE_IMAGE_SLUG_OVERRIDES[row.slug]) return EXPLORE_IMAGE_SLUG_OVERRIDES[row.slug];
  const heroSlug = row.heroImage.split("/").pop()?.replace(/\.jpg$/, "") ?? "";
  if (heroSlug && heroSlug !== row.slug) return heroSlug;
  return undefined;
}

function semanticMismatch(row: TrustRow, donorSlug: string): { fail: boolean; reason: string; confidence: number } {
  if (donorSlug === row.slug) return { fail: false, reason: "self", confidence: 0 };
  if (isTrustApprovedDonor(row.slug, donorSlug)) {
    return { fail: false, reason: "trust-approved donor mapping", confidence: 20 };
  }

  const overlap = tokenOverlap(row.title, donorSlug.replace(/-/g, " "));
  const slugOverlap = tokenOverlap(row.slug.replace(/-/g, " "), donorSlug.replace(/-/g, " "));

  if (overlap >= 0.35 || slugOverlap >= 0.4) {
    return { fail: false, reason: "donor tokens align with title", confidence: 30 };
  }

  const titleBlob = `${row.title} ${row.slug}`.toLowerCase();
  const donorBlob = donorSlug.toLowerCase();

  const pairs: Array<[RegExp, RegExp, string]> = [
    [/\bhash\b/i, /\b(hash|potato|skillet|loaded-potato|sausage-egg)\b/i, "hash recipe needs potato/skillet donor"],
    [/\bpancake\b/i, /\b(pancake|french-toast|waffle|pinwheel)\b/i, "pancake recipe needs griddle breakfast donor"],
    [/\boats?\b|\boatmeal\b/i, /\b(oats?|oatmeal|savory-oats)\b/i, "oats recipe needs oatmeal donor"],
    [/\bburrito\b|\bbowl\b/i, /\b(burrito|tortilla|wrap|crunchwrap|enchilada|fajita|taco|bowl)\b/i, "burrito/bowl needs handheld or bowl donor"],
    [/\btaco\b/i, /\b(taco|quesadilla|tortilla|enchilada)\b/i, "taco needs tortilla donor"],
    [/\bsalmon\b/i, /\b(salmon|fish|cedar|ginger-salmon|herb-salmon)\b/i, "salmon needs fish donor"],
    [/\bbrisket\b|\bsmoked\b/i, /\b(brisket|smoked|bbq|pulled|corned|burnt-ends)\b/i, "smokehouse recipe needs BBQ donor"],
    [/\bsoup\b|\bchili\b/i, /\b(soup|chili|broth|barley|dumpling|noodle)\b/i, "soup/chili needs liquid meal donor"],
    [/\bpizza\b/i, /\b(pizza)\b/i, "pizza needs pizza donor"],
    [/\bparfait\b/i, /\b(parfait|yogurt|poutine|bowl)\b/i, "parfait needs bowl-style donor"],
    [/\bfrench toast\b/i, /\b(french-toast|toast|monte-cristo)\b/i, "french toast needs toast donor"],
    [/\bbiscuit\b|\bgravy\b/i, /\b(biscuit|gravy|sausage|monte-cristo|sandwich|slider)\b/i, "biscuits and gravy donor mismatch"],
    [/\bnachos?\b/i, /\bnachos?\b/i, "nacho recipe needs nacho-style donor"],
    [/\bchicken thigh\b/i, /\b(thigh|chicken|roasted|grill|tray)\b/i, "thigh plate needs chicken donor"],
    [/\bsteak\b/i, /\b(steak|beef|stroganoff|pepper-steak|hanger)\b/i, "steak recipe needs beef donor"],
  ];

  for (const [titleRe, donorRe, msg] of pairs) {
    if (titleRe.test(titleBlob) && !donorRe.test(donorBlob)) {
      return { fail: true, reason: msg, confidence: 88 };
    }
  }

  if (overlap < 0.12 && slugOverlap < 0.15) {
    return {
      fail: true,
      reason: `donor "${donorSlug}" shares no meal tokens with "${row.title}"`,
      confidence: 82,
    };
  }

  return { fail: false, reason: "weak overlap but no hard rule hit", confidence: 45 };
}

function loadAuditRows(): TrustRow[] {
  const file = path.join("review", "image-accuracy-audit.json");
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
    rows: Array<{
      collection: Category;
      slug: string;
      title: string;
      heroImage: string;
      heroMd5?: string;
      category?: string;
    }>;
  };
  return raw.rows.map((r) => ({
    collection: r.collection,
    slug: r.slug,
    title: r.title,
    heroImage: r.heroImage,
    heroMd5: r.heroMd5,
    cuisine: r.category,
    userFacing: true,
  }));
}

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const catalog = buildApprovedCatalog();
  const explorePublished = new Set(catalog.recipes.map((r) => r.slug));

  const rows = loadAuditRows();
  if (rows.length === 0) {
    console.error("[audit:image-trust] Run npm run audit:image-accuracy first");
    process.exit(1);
  }

  for (const row of rows) {
    if (row.collection === "explore_curated") {
      row.userFacing = explorePublished.has(row.slug);
    }
  }

  const userFacing = rows.filter((r) => r.userFacing && r.collection !== "smoothies");

  type P0Issue = {
    collection: Category;
    slug: string;
    title: string;
    heroImage: string;
    donorSlug?: string;
    code: string;
    message: string;
    confidence: number;
  };

  const p0: P0Issue[] = [];

  for (const row of userFacing) {
    for (const issue of auditTitlePathKeywords(row.title, row.heroImage)) {
      if (issue.severity === "critical" && TRUST_CRITICAL_CODES.has(issue.code)) {
        p0.push({
          collection: row.collection,
          slug: row.slug,
          title: row.title,
          heroImage: row.heroImage,
          code: issue.code,
          message: issue.message,
          confidence: issue.confidence,
        });
      }
    }

    if (row.collection === "breakfast" || row.collection === "explore_curated") {
      if (shouldApplyBreakfastFormatRules(row)) {
        for (const issue of auditBreakfastFormatRules(row.title, row.heroImage)) {
          if (issue.severity === "critical") {
            p0.push({
              collection: row.collection,
              slug: row.slug,
              title: row.title,
              heroImage: row.heroImage,
              code: issue.code,
              message: issue.message,
              confidence: issue.confidence,
            });
          }
        }
      }
    }

    const donor = resolveDonorSlug(row);
    if (donor) {
      const sem = semanticMismatch(row, donor);
      if (sem.fail) {
        p0.push({
          collection: row.collection,
          slug: row.slug,
          title: row.title,
          heroImage: row.heroImage,
          donorSlug: donor,
          code: "semantic_donor_mismatch",
          message: sem.reason,
          confidence: sem.confidence,
        });
      }
    }
  }

  const p0Deduped = new Map<string, P0Issue>();
  for (const issue of p0) {
    p0Deduped.set(`${issue.collection}:${issue.slug}:${issue.code}`, issue);
  }
  const p0List = [...p0Deduped.values()].sort(
    (a, b) => b.confidence - a.confidence || a.collection.localeCompare(b.collection),
  );

  const byHash = new Map<string, TrustRow[]>();
  for (const row of userFacing) {
    if (!row.heroMd5) continue;
    const list = byHash.get(row.heroMd5) || [];
    list.push(row);
    byHash.set(row.heroMd5, list);
  }

  const p1Categories: Category[] = ["breakfast", "pizza_night", "explore_curated"];
  type DupeGroup = {
    collection: Category;
    hash: string;
    count: number;
    slugs: string[];
    titles: string[];
    trustRisk: "high" | "medium" | "low";
  };

  const p1Groups: DupeGroup[] = [];
  for (const [hash, group] of byHash) {
    for (const col of p1Categories) {
      const inCat = group.filter((r) => r.collection === col);
      if (inCat.length < 2) continue;
      const titles = inCat.map((r) => r.title);
      const tokenSets = titles.map((t) => tokens(t));
      let sharedCore = true;
      const first = tokenSets[0]!;
      for (let i = 1; i < tokenSets.length; i++) {
        const overlap = [...first].filter((t) => tokenSets[i]!.has(t)).length;
        if (overlap < 2) {
          sharedCore = false;
          break;
        }
      }
      p1Groups.push({
        collection: col,
        hash,
        count: inCat.length,
        slugs: inCat.map((r) => r.slug),
        titles,
        trustRisk: sharedCore ? "low" : inCat.length >= 4 ? "high" : "medium",
      });
    }
  }
  p1Groups.sort((a, b) => b.count - a.count);

  const p1RecipeSlugs = new Set<string>();
  for (const g of p1Groups) for (const s of g.slugs) p1RecipeSlugs.add(`${g.collection}:${s}`);

  type P2Group = {
    hash: string;
    count: number;
    collections: string[];
    slugs: string[];
    accurate: boolean;
  };

  const p2Groups: P2Group[] = [];
  for (const [hash, group] of byHash) {
    if (group.length < 2) continue;
    const cats = [...new Set(group.map((r) => r.collection))];
    if (cats.length < 2) continue;
    const anyP0 = group.some((r) => p0List.some((i) => i.slug === r.slug && i.collection === r.collection));
    p2Groups.push({
      hash,
      count: group.length,
      collections: cats,
      slugs: group.map((r) => `${r.collection}:${r.slug}`),
      accurate: !anyP0,
    });
  }
  p2Groups.sort((a, b) => b.count - a.count);

  const p0ByCollection: Record<string, number> = {};
  for (const i of p0List) {
    p0ByCollection[i.collection] = (p0ByCollection[i.collection] || 0) + 1;
  }

  const p1High = p1Groups.filter((g) => g.trustRisk === "high");
  const p1Medium = p1Groups.filter((g) => g.trustRisk === "medium");
  const p2Accurate = p2Groups.filter((g) => g.accurate);
  const p2Suspect = p2Groups.filter((g) => !g.accurate);

  const exploreP0 = p0List.filter((i) => i.collection === "explore_curated").length;
  const breakfastP0 = p0List.filter((i) => i.collection === "breakfast").length;
  const goldenP0 = p0List.filter((i) => i.collection === "golden_100").length;

  let trustImpact: "critical" | "elevated" | "moderate" | "low" = "low";
  if (p0List.length >= 25 || exploreP0 >= 20) trustImpact = "critical";
  else if (p0List.length >= 10 || p1High.length >= 5) trustImpact = "elevated";
  else if (p0List.length > 0 || p1High.length > 0) trustImpact = "moderate";

  const payload = {
    generatedAt: new Date().toISOString(),
    successMetric: "0 incorrect meal representations (not hero uniqueness)",
    totals: {
      userFacingRecipes: userFacing.length,
      p0IncorrectMeal: p0List.length,
      p0ByCollection,
      p1WithinCategoryGroups: p1Groups.length,
      p1WithinCategoryRecipes: p1RecipeSlugs.size,
      p1HighRiskGroups: p1High.length,
      p2CrossCategoryGroups: p2Groups.length,
      p2CrossCategoryAccurateGroups: p2Accurate.length,
      p2CrossCategorySuspectGroups: p2Suspect.length,
      estimatedTrustImpact: trustImpact,
    },
    p0IncorrectMeals: p0List,
    p1WithinCategoryDuplicates: p1Groups,
    p2CrossCategoryDuplicates: {
      accurate: p2Accurate.slice(0, 40),
      suspect: p2Suspect.slice(0, 40),
      accurateGroupCount: p2Accurate.length,
      suspectGroupCount: p2Suspect.length,
      accurateRecipeCount: p2Accurate.reduce((n, g) => n + g.count, 0),
      suspectRecipeCount: p2Suspect.reduce((n, g) => n + g.count, 0),
    },
    notes: [
      "P0 includes path/format heuristics plus semantic donor mismatch (interim copy images).",
      "P1 high-risk = same hero reused for clearly different meal titles within one category.",
      "P2 accurate = same hero across categories where no P0 flagged (e.g. Golden 100 ↔ Explore same dish).",
      "Do not regen solely for uniqueness when P0 is clear and image matches the meal.",
    ],
  };

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(payload, null, 2));

  const md: string[] = [
    "# Image Trust Report",
    "",
    `Generated: ${payload.generatedAt}`,
    "",
    "**Success metric:** A firefighter can identify the meal from the hero without opening the recipe — not 49/49 unique hashes.",
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| User-facing recipes scanned | ${payload.totals.userFacingRecipes} |`,
    `| **P0 — Incorrect meal representations** | **${payload.totals.p0IncorrectMeal}** |`,
    `| P1 — Within-category duplicate groups | ${payload.totals.p1WithinCategoryGroups} (${payload.totals.p1WithinCategoryRecipes} recipe slots) |`,
    `| P1 — High-risk duplicate groups | ${payload.totals.p1HighRiskGroups} |`,
    `| P2 — Cross-category duplicate groups (accurate) | ${payload.totals.p2CrossCategoryAccurateGroups} |`,
    `| P2 — Cross-category duplicate groups (suspect) | ${payload.totals.p2CrossCategorySuspectGroups} |`,
    `| **Estimated trust impact** | **${trustImpact.toUpperCase()}** |`,
    "",
    "### P0 by collection",
    "",
  ];

  for (const [col, n] of Object.entries(p0ByCollection).sort((a, b) => b[1] - a[1])) {
    md.push(`- \`${col}\`: ${n}`);
  }

  md.push("", "## P0 — Incorrect meal images remaining", "");
  if (p0List.length === 0) {
    md.push("_None flagged by path/format rules and donor semantic checks._");
  } else {
    md.push("| Collection | Recipe | Donor | Issue | Confidence |", "| --- | --- | --- | --- | ---: |");
    for (const i of p0List.slice(0, 60)) {
      md.push(
        `| ${i.collection} | \`${i.slug}\` | ${i.donorSlug ? `\`${i.donorSlug}\`` : "—"} | ${i.message.replace(/\|/g, "/")} | ${i.confidence} |`,
      );
    }
    if (p0List.length > 60) md.push(`| … | … | … | _${p0List.length - 60} more in JSON_ | |`);
  }

  md.push("", "## P1 — User-facing within-category duplicates", "");
  md.push(
    "Same hero visible twice+ in **Breakfast**, **Pizza Night**, or **Explore** — trust risk rises when titles diverge.",
    "",
  );
  md.push("| Collection | Recipes | Risk | Example slugs |", "| --- | ---: | --- | --- |");
  for (const g of p1Groups.slice(0, 25)) {
    md.push(`| ${g.collection} | ${g.count} | ${g.trustRisk} | ${g.slugs.slice(0, 4).map((s) => `\`${s}\``).join(", ")} |`);
  }

  md.push("", "## P2 — Cross-category duplicates", "");
  md.push(
    `- **Accurate (OK temporarily):** ${payload.totals.p2CrossCategoryAccurateGroups} groups, ~${payload.p2CrossCategoryDuplicates.accurateRecipeCount} recipe slots — same dish in Golden 100 / Hall / Explore.`,
    `- **Suspect:** ${payload.totals.p2CrossCategorySuspectGroups} groups overlap with P0 donor mismatches.`,
    "",
  );

  md.push("## Estimated trust impact", "");
  const impactText: Record<typeof trustImpact, string> = {
    critical:
      "Many published cards likely show the wrong meal type (especially Explore interim donors). Firefighters will not trust card images until P0 is cleared.",
    elevated:
      "Several categories have misleading heroes or high-risk duplicate clusters. Browse experience feels generic or wrong before click-through.",
    moderate:
      "Limited wrong-meal cases; duplicates exist but mostly same-dish or low-traffic rows. Production browse is usable with known weak spots.",
    low: "No major wrong-meal flags; remaining work is polish and intentional cross-listing duplicates.",
  };
  md.push(impactText[trustImpact]);
  md.push("");
  md.push("## Recommended fix order", "");
  md.push("1. **P0 only** — regen or slug-lock donors until title and hero align.");
  md.push("2. **P1 high-risk** — split heroes where different meals share one image in the same category.");
  md.push("3. **P2 accurate** — leave until AI regen; cross-listing the same correct dish is acceptable.");
  md.push("4. **Do not** regen accurate images merely to reduce duplicate counts.");

  fs.writeFileSync(MD_OUT, md.join("\n"));

  console.log(`[audit:image-trust] wrote ${JSON_OUT}`);
  console.log(`[audit:image-trust] wrote ${MD_OUT}`);
  console.log(
    `[audit:image-trust] P0=${p0List.length} P1_groups=${p1Groups.length} P2_accurate=${p2Accurate.length} impact=${trustImpact}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
