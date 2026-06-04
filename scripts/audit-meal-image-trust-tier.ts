#!/usr/bin/env tsx
/**
 * Meal image trust tier audit (P0 / P1 / P2).
 *
 *   npx tsx scripts/audit-meal-image-trust-tier.ts
 *
 * Outputs:
 *   review/meal-image-trust-tier-report.json
 *   review/meal-image-trust-tier-report.md
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { auditTitlePathKeywords } from "../shared/curated-image-governance/image-accuracy-rules.js";
import {
  auditTitlePrimarySideAlignment,
  hasImageTitleMismatch,
} from "../shared/curated-image-governance/title-primary-side-rules.js";
import { heroPathConflictsTitle, inferVisualSignalsFromTitle } from "../shared/meal-image-title-match.js";
import {
  inferPlatingType,
  inferPlatingTypeFromHeroPath,
  platingTypesConflict,
} from "../shared/plating-type.js";

const PUBLIC = path.join(process.cwd(), "client", "public");
const JSON_OUT = path.join("review", "meal-image-trust-tier-report.json");
const MD_OUT = path.join("review", "meal-image-trust-tier-report.md");

type Tier = "P0" | "P1" | "P2";

type Row = {
  tier: Tier;
  slug: string;
  title: string;
  collection: string;
  heroImage: string;
  thumbImage?: string;
  mealFormat?: string;
  reasons: string[];
  heroMd5: string | null;
};

function md5Public(rel: string): string | null {
  const abs = path.join(PUBLIC, rel.replace(/^\//, ""));
  try {
    return crypto.createHash("md5").update(fs.readFileSync(abs)).digest("hex");
  } catch {
    return null;
  }
}

function walkPages(root: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walkPages(p));
    else if (entry.name.endsWith(".json") && entry.name !== "index.json") out.push(p);
  }
  return out;
}

function saladBowlPathConflict(title: string, heroPath: string, mealFormat?: string): string | null {
  if (!/\bsalad\b/i.test(title) && inferPlatingType(title, mealFormat) !== "salad") return null;
  const blob = heroPath.toLowerCase();
  if (/\b(rice-bowl|grain-bowl|bibimbap|burrito-bowl|chicken-bowl|greek-chicken-bowls|teriyaki-chicken-bowls)\b/.test(blob)) {
    return "salad title but hero path depicts grain/rice bowl";
  }
  const depicted = inferPlatingTypeFromHeroPath(heroPath);
  if (depicted === "bowl" && !/\bsalad\b/.test(blob)) {
    return "salad title but hero path signals deep grain bowl (not salad greens)";
  }
  return null;
}

function wrapBowlConflict(title: string, heroPath: string): string | null {
  if (!/\b(wrap|lettuce cup)\b/i.test(title)) return null;
  if (/\b(bowl|rice-bowl|grain-bowl)\b/i.test(heroPath.toLowerCase()) && !/wrap/.test(heroPath.toLowerCase())) {
    return "wrap title but hero path suggests bowl";
  }
  return null;
}

function tacoBurritoConflict(title: string, heroPath: string): string | null {
  if (!/\btaco\b/i.test(title) || /\bburrito\b/i.test(title)) return null;
  if (/\bburrito\b/i.test(heroPath.toLowerCase()) && !/\btaco\b/i.test(heroPath.toLowerCase())) {
    return "taco title but hero path suggests burrito";
  }
  return null;
}

function soupStewConflict(title: string, heroPath: string): string | null {
  const isSoup = /\b(soup|chowder|bisque)\b/i.test(title);
  const isStew = /\bstew\b/i.test(title);
  if (!isSoup && !isStew) return null;
  if (isSoup && /\bstew\b/i.test(heroPath.toLowerCase()) && !/\bsoup\b/i.test(heroPath.toLowerCase())) {
    return "soup title but hero path suggests stew";
  }
  if (isStew && /\bsoup\b/i.test(heroPath.toLowerCase()) && !/\bstew\b/i.test(heroPath.toLowerCase())) {
    return "stew title but hero path suggests soup";
  }
  return null;
}

function sandwichMeatConflict(title: string, heroPath: string): string | null {
  if (!/\b(sandwich|sub|hoagie|dip)\b/i.test(title)) return null;
  const blob = heroPath.toLowerCase();
  if (/\b(brisket-platter|pulled-pork|ribs|steak-tacos|whole-chicken)\b/.test(blob)) {
    return "sandwich title but hero path suggests unrelated plated meat";
  }
  return null;
}

function pastaSaladConflict(title: string, heroPath: string): string | null {
  if (!/\bsalad\b/i.test(title) || /\bpasta\b/i.test(title)) return null;
  const blob = heroPath.toLowerCase();
  if (/\b(pasta|spaghetti|penne|rigatoni|lasagna|macaroni)\b/.test(blob) && !/\bsalad\b/.test(blob)) {
    return "salad title but hero path suggests pasta dish";
  }
  return null;
}

function classifyRow(input: {
  slug: string;
  title: string;
  collection: string;
  heroImage: string;
  thumbImage?: string;
  mealFormat?: string;
  heroAlt?: string;
}): Row {
  const reasons: string[] = [];
  const { slug, title, heroImage, mealFormat, heroAlt } = input;

  for (const issue of auditTitlePathKeywords(title, heroImage, heroAlt || "")) {
    if (issue.severity === "critical") reasons.push(issue.message);
  }
  const sideIssues = auditTitlePrimarySideAlignment({
    slug,
    title,
    mealFormat,
    heroPath: heroImage,
    heroAlt,
  });
  if (hasImageTitleMismatch(sideIssues)) {
    for (const i of sideIssues.filter((x) => x.severity === "critical")) reasons.push(i.message);
  }

  const platingExpected = inferPlatingType(title, mealFormat);
  const platingDepicted = inferPlatingTypeFromHeroPath(heroImage, heroAlt || "");
  if (platingDepicted && platingTypesConflict(platingExpected, platingDepicted)) {
    reasons.push(`plating mismatch: title expects ${platingExpected}, path suggests ${platingDepicted}`);
  }

  for (const fn of [
    saladBowlPathConflict,
    wrapBowlConflict,
    tacoBurritoConflict,
    soupStewConflict,
    sandwichMeatConflict,
    pastaSaladConflict,
  ]) {
    const msg = fn(title, heroImage, mealFormat);
    if (msg) reasons.push(msg);
  }

  // Strict title/path conflict only when dominant title signal is clear
  const titleSignals = inferVisualSignalsFromTitle(title, mealFormat);
  const dominant = [...titleSignals].find((s) => s !== "generic");
  if (
    dominant &&
    heroPathConflictsTitle(heroImage, title, mealFormat) &&
    !heroImage.toLowerCase().includes(slug.replace(/-crew$/, "").slice(0, 12))
  ) {
    const pathSignals = [...inferVisualSignalsFromTitle(heroImage, "")];
    if (dominant && pathSignals.length > 0 && !pathSignals.includes(dominant)) {
      reasons.push(`hero path meal type (${pathSignals.join(",")}) conflicts with title (${dominant})`);
    }
  }

  if (!md5Public(heroImage)) reasons.push("missing hero image file on disk");

  let tier: Tier = "P2";
  if (reasons.length > 0) tier = "P0";
  else {
    const warnings = auditTitlePathKeywords(title, heroImage, heroAlt || "").filter(
      (i) => i.severity === "warning",
    );
    if (warnings.length > 0) tier = "P1";
  }

  return {
    tier,
    slug,
    title,
    collection: input.collection,
    heroImage,
    thumbImage: input.thumbImage,
    mealFormat,
    reasons,
    heroMd5: md5Public(heroImage),
  };
}

function main(): void {
  const catalogs: Array<[string, string]> = [
    ["golden_100", "catalog/golden-100/pages"],
    ["performance_meals", "catalog/performance-meals/pages"],
    ["hall_expansion", "catalog/hall-expansion/pages"],
    ["breakfast", "catalog/breakfast/pages"],
    ["bbq", "catalog/bbq/pages"],
  ];

  const rows: Row[] = [];
  for (const [collection, rel] of catalogs) {
    for (const file of walkPages(path.join(PUBLIC, rel))) {
      const page = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      rows.push(
        classifyRow({
          slug: String(page.slug || path.basename(file, ".json")),
          title: String(page.title || page.displayTitle || ""),
          collection,
          heroImage: String(page.heroImage || ""),
          thumbImage: page.thumbImage ? String(page.thumbImage) : undefined,
          mealFormat: page.mealFormat ? String(page.mealFormat) : page.format ? String(page.format) : undefined,
          heroAlt: page.heroImageAlt ? String(page.heroImageAlt) : undefined,
        }),
      );
    }
  }

  const p0 = rows.filter((r) => r.tier === "P0");
  const p1 = rows.filter((r) => r.tier === "P1");
  const p2 = rows.filter((r) => r.tier === "P2");

  const byMd5 = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.heroMd5) continue;
    const list = byMd5.get(r.heroMd5) ?? [];
    list.push(r);
    byMd5.set(r.heroMd5, list);
  }

  const duplicateGroups = [...byMd5.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([hash, list]) => ({
      hash,
      count: list.length,
      slugs: list.map((r) => r.slug),
      titles: list.map((r) => r.title),
      collections: list.map((r) => r.collection),
      p0Risk:
        list.length >= 2 &&
        new Set(list.map((r) => inferPlatingType(r.title, r.mealFormat))).size > 1,
    }))
    .sort((a, b) => b.count - a.count);

  const chickenBowlDupes = duplicateGroups.filter(
    (g) =>
      g.count >= 2 &&
      g.slugs.some((s) => /bowl|rice-bowl|greek-chicken|teriyaki|bibimbap/i.test(s)) &&
      g.p0Risk,
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    totals: {
      scanned: rows.length,
      p0: p0.length,
      p1: p1.length,
      p2: p2.length,
      duplicateHeroGroups: duplicateGroups.length,
      highRiskDuplicateGroups: duplicateGroups.filter((g) => g.p0Risk).length,
    },
    p0,
    p1,
    duplicateGroups: duplicateGroups.slice(0, 80),
    chickenBowlDuplicateGroups: chickenBowlDupes,
    warmSpinach: rows.find((r) => r.slug === "warm-spinach-chicken-salad"),
  };

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(payload, null, 2));

  const md: string[] = [
    "# Meal Image Trust Tier Report",
    "",
    `Generated: ${payload.generatedAt}`,
    "",
    "## Summary",
    "",
    `| Tier | Count |`,
    `| --- | ---: |`,
    `| P0 — wrong meal / missing file | ${p0.length} |`,
    `| P1 — category warning | ${p1.length} |`,
    `| P2 — acceptable | ${p2.length} |`,
    `| Duplicate hero groups | ${duplicateGroups.length} |`,
    `| High-risk duplicate groups | ${duplicateGroups.filter((g) => g.p0Risk).length} |`,
    "",
    "## Warm Spinach Chicken Salad",
    "",
  ];

  if (payload.warmSpinach) {
    const w = payload.warmSpinach;
    md.push(
      `- **Tier:** ${w.tier}`,
      `- **Hero:** \`${w.heroImage}\``,
      `- **Thumb:** \`${w.thumbImage || "—"}\``,
      `- **MD5:** \`${w.heroMd5 || "missing"}\``,
      w.reasons.length ? `- **Issues:** ${w.reasons.join("; ")}` : "- **Issues:** none (path/heuristic)",
      "",
    );
  }

  md.push("## P0 — fix immediately", "");
  if (p0.length === 0) md.push("_None flagged._", "");
  else {
    md.push("| Recipe | Collection | Hero | Reason |", "| --- | --- | --- | --- |");
    for (const r of p0.slice(0, 60)) {
      md.push(
        `| ${r.title} | ${r.collection} | \`${r.heroImage}\` | ${r.reasons[0]?.slice(0, 100) || "—"} |`,
      );
    }
    if (p0.length > 60) md.push(`| … | +${p0.length - 60} more | | |`, "");
  }

  md.push("", "## High-risk duplicate heroes (same image, different meal types)", "");
  for (const g of duplicateGroups.filter((x) => x.p0Risk).slice(0, 25)) {
    md.push(`- \`${g.hash.slice(0, 8)}…\` (${g.count}): ${g.titles.join(" · ")}`);
  }

  fs.writeFileSync(MD_OUT, md.join("\n"));
  console.log(`[audit:meal-image-trust-tier] P0=${p0.length} P1=${p1.length} → ${JSON_OUT}`);
}

main();
