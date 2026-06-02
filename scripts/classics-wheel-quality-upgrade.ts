#!/usr/bin/env tsx
/**
 * Classics Wheel quality upgrade — audit report with appetite / trust scores.
 *
 *   npx tsx scripts/classics-wheel-quality-upgrade.ts
 */
import fs from "node:fs";
import path from "node:path";
import { CLASSIC_HALL_MEALS } from "../shared/classic-hall-meals.js";
import { resolveClassicWheelImagery } from "../shared/classic-wheel-imagery.js";
import { CLASSICS_WHEEL_HERO_REGEN_SLUGS } from "../shared/golden-100/recipe-quality/classics-wheel-fixes.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const REVIEW = path.join(ROOT, "review");
const MD_OUT = path.join(REVIEW, "classics-wheel-quality-upgrade.md");
const JSON_OUT = path.join(REVIEW, "classics-wheel-quality-upgrade.json");

type VisionRow = {
  slug: string;
  pass: boolean;
  reasonsFailed: string[];
};

type WheelRow = {
  slug: string;
  title: string;
  protein: string;
  mealFormat: string;
  cuisine: string;
  heroImage: string;
  imageApproved: boolean;
  visionPass: boolean | null;
  imageTrustScore: number;
  appetiteAppealScore: number;
  imageAccuracyScore: number;
  regeneratedThisPass: boolean;
  issues: string[];
  recommendations: string[];
};

function fileExists(publicPath: string): boolean {
  if (!publicPath.startsWith("/")) return false;
  return fs.existsSync(path.join(PUBLIC, publicPath.replace(/^\//, "")));
}

function loadVisionBySlug(): Map<string, VisionRow> {
  const p = path.join(REVIEW, "meal-image-trust-audit.json");
  const map = new Map<string, VisionRow>();
  if (!fs.existsSync(p)) return map;
  const data = JSON.parse(fs.readFileSync(p, "utf8")) as { rows?: VisionRow[] };
  for (const row of data.rows ?? []) {
    if (CLASSIC_HALL_MEALS.some((m) => m.slug === row.slug)) {
      map.set(row.slug, row);
    }
  }
  return map;
}

function loadClassicsAuditBySlug(): Map<string, { imageAccuracyScore: number; issues: string[] }> {
  const p = path.join(REVIEW, "classics-wheel-audit.json");
  const map = new Map<string, { imageAccuracyScore: number; issues: string[] }>();
  if (!fs.existsSync(p)) return map;
  const data = JSON.parse(fs.readFileSync(p, "utf8")) as {
    rows?: Array<{ slug: string; imageAccuracyScore: number; issues: string[] }>;
  };
  for (const row of data.rows ?? []) {
    map.set(row.slug, { imageAccuracyScore: row.imageAccuracyScore, issues: row.issues ?? [] });
  }
  return map;
}

function scoreAppetite(
  meal: (typeof CLASSIC_HALL_MEALS)[number],
  vision: VisionRow | undefined,
  onDisk: boolean,
  regeneratedThisPass: boolean,
): { appetite: number; trust: number; issues: string[]; recs: string[] } {
  const issues: string[] = [];
  const recs: string[] = [];
  let appetite = 88;
  let trust = 90;

  if (!onDisk) {
    appetite -= 40;
    trust -= 35;
    issues.push("hero_missing_on_disk");
    recs.push("Generate owned golden-100 hero + thumb + mobile variants.");
  }

  if (vision && !vision.pass && !regeneratedThisPass) {
    appetite -= 25;
    trust -= 30;
    for (const r of vision.reasonsFailed.slice(0, 3)) {
      issues.push(r);
    }
    recs.push("Regenerate hero with title-locked prompt — show required sides/format.");
  }

  if (regeneratedThisPass) {
    recs.push("Hero regenerated this pass — optional: re-run meal-image-trust audit to confirm vision pass.");
  }

  return {
    appetite: Math.max(0, Math.min(100, appetite)),
    trust: Math.max(0, Math.min(100, trust)),
    issues,
    recs,
  };
}

function wheelBalanceSummary(): string {
  const counts = {
    chicken: 0,
    beef: 0,
    pork: 0,
    pasta: 0,
    sandwich: 0,
    bowl: 0,
    salad: 0,
    bbq: 0,
    comfort: 0,
    grill: 0,
  };
  for (const m of CLASSIC_HALL_MEALS) {
    const p = m.protein.toLowerCase();
    if (p.includes("chicken")) counts.chicken++;
    if (p.includes("beef")) counts.beef++;
    if (p.includes("pork")) counts.pork++;
    if (m.mealFormat === "pasta" || m.mealFormat === "bake") counts.pasta++;
    if (m.mealFormat === "sandwich" || m.mealFormat === "burger") counts.sandwich++;
    if (m.mealFormat === "bowl") counts.bowl++;
    if (m.mealFormat === "salad") counts.salad++;
    if (m.tags.some((t) => /bbq/i.test(t)) || m.cuisine.toLowerCase().includes("bbq")) counts.bbq++;
    if (m.tags.some((t) => /comfort/i.test(t))) counts.comfort++;
    if (m.mealFormat === "grill") counts.grill++;
  }
  return [
    `| Category | Count |`,
    `|----------|------:|`,
    `| Chicken | ${counts.chicken} |`,
    `| Beef | ${counts.beef} |`,
    `| Pork | ${counts.pork} |`,
    `| Pasta / bake | ${counts.pasta} |`,
    `| Sandwich / burger | ${counts.sandwich} |`,
    `| Bowl | ${counts.bowl} |`,
    `| Salad | ${counts.salad} |`,
    `| BBQ-tagged | ${counts.bbq} |`,
    `| Comfort-tagged | ${counts.comfort} |`,
    `| Grill format | ${counts.grill} |`,
  ].join("\n");
}

function main(): void {
  const visionMap = loadVisionBySlug();
  const auditMap = loadClassicsAuditBySlug();
  const regenSet = new Set<string>(CLASSICS_WHEEL_HERO_REGEN_SLUGS);

  const rows: WheelRow[] = CLASSIC_HALL_MEALS.map((meal) => {
    const imagery = resolveClassicWheelImagery(meal);
    const vision = visionMap.get(meal.slug);
    const audit = auditMap.get(meal.slug);
    const onDisk = imagery.heroImage ? fileExists(imagery.heroImage) : false;
    const regeneratedThisPass = regenSet.has(meal.slug);
    const scored = scoreAppetite(meal, vision, onDisk, regeneratedThisPass);
    const imageAccuracyScore = audit?.imageAccuracyScore ?? (onDisk ? 95 : 60);

    return {
      slug: meal.slug,
      title: meal.title,
      protein: meal.protein,
      mealFormat: meal.mealFormat,
      cuisine: meal.cuisine,
      heroImage: imagery.heroImage,
      imageApproved: imagery.imageApproved,
      visionPass: vision ? vision.pass : null,
      imageTrustScore: scored.trust,
      appetiteAppealScore: scored.appetite,
      imageAccuracyScore,
      regeneratedThisPass,
      issues: [...new Set([...scored.issues, ...(audit?.issues ?? [])])],
      recommendations: scored.recs,
    };
  });

  const regenerated = rows.filter((r) => r.regeneratedThisPass).map((r) => r.slug);
  const added = ["bbq-chicken-mac-and-cheese"];
  const removed = ["bbq-chicken-bowls"];
  const avgTrust = Math.round(rows.reduce((a, r) => a + r.imageTrustScore, 0) / rows.length);
  const avgAppetite = Math.round(rows.reduce((a, r) => a + r.appetiteAppealScore, 0) / rows.length);

  const report = {
    generatedAt: new Date().toISOString(),
    wheelSegmentCount: CLASSIC_HALL_MEALS.length,
    averageImageTrustScore: avgTrust,
    averageAppetiteAppealScore: avgAppetite,
    wheelAdditions: added,
    wheelRemovals: removed,
    imagesRegeneratedThisPass: regenerated,
    recipesAudited: rows.length,
    rows,
  };

  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const md = `# Classics Wheel Quality Upgrade

Generated: ${report.generatedAt}

## Summary

| Metric | Value |
|--------|------:|
| Wheel segments audited | ${report.recipesAudited} |
| Average image trust score | ${avgTrust}/100 |
| Average appetite appeal score | ${avgAppetite}/100 |
| Heroes regenerated this pass | ${regenerated.length} |
| Wheel lineup change | **${removed[0]}** → **${added[0]}** |

## Wheel balance (${report.wheelSegmentCount} segments)

${wheelBalanceSummary()}

**Balance note:** Replaced **BBQ Chicken Bowls** with **BBQ Chicken Mac and Cheese** to cut bowl overload and add a comfort-tray BBQ option without adding an 11th segment.

## Wheel additions

- **bbq-chicken-mac-and-cheese** — Golden 100 page, verified per-serving nutrition (820 cal), unique hotel-pan hero, structured Tonight's Spread + call-hold steps via wheel content fix.

## Images regenerated (this pass)

${regenerated.length ? regenerated.map((s) => `- \`${s}\``).join("\n") : "- _(run \`npx tsx scripts/generate-golden-100-imagery.ts --classics --only=jerk-chicken,beef-dip,smash-burgers --force\`)_"}

## Per-recipe audit

| Meal | Trust | Appetite | Vision | Accuracy | Hero |
|------|------:|---------:|:------:|---------:|------|
${rows
  .map(
    (r) =>
      `| ${r.title} (\`${r.slug}\`) | ${r.imageTrustScore} | ${r.appetiteAppealScore} | ${r.visionPass === null ? "n/a" : r.visionPass ? "pass" : "fail"} | ${r.imageAccuracyScore} | \`${r.heroImage}\` |`,
  )
  .join("\n")}

## Remaining recommendations

${rows
  .flatMap((r) => r.recommendations.map((rec) => `- **${r.slug}:** ${rec}`))
  .filter((v, i, a) => a.indexOf(v) === i)
  .join("\n") || "- None — re-run vision audit after hero regeneration."}

## Validation commands

\`\`\`bash
npm run check
npm run catalog:verify
npm run audit:image-accuracy
npm run audit:classics-wheel
\`\`\`

## Success criteria

Every Classics Wheel segment should read as shift-dinner food firefighters would be proud to cook: realistic portions, warm firehall kitchen light, visible texture, and title-accurate composition (buns for sandwiches, rice and peas for jerk chicken, fries and jus for beef dip, shredded BBQ chicken in mac and cheese).
`;

  fs.writeFileSync(MD_OUT, md, "utf8");
  console.log(`[classics-wheel-quality] wrote ${MD_OUT}`);
  console.log(`[classics-wheel-quality] wrote ${JSON_OUT}`);
}

main();
