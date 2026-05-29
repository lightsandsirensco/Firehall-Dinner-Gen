#!/usr/bin/env tsx
/**
 * Full editorial + catalog audit for the merged hall catalog (Golden 100 + Performance Meals).
 *
 * Checks:
 * - title duplication / repeated words
 * - AI-sounding hype phrases
 * - awkward structures (e.g. "sheet pan bowls", repeated "sheet pan")
 * - overly long / ingredient-stuffed titles
 *
 * Usage:
 *   npx tsx scripts/audit-hall-catalog.ts
 *   npx tsx scripts/audit-hall-catalog.ts --json
 */

import { loadMergedHallCatalogIndex } from "../server/meal-catalog/load-index.js";

const args = process.argv.slice(2);
const asJson = args.includes("--json");

const BANNED_PHRASES = [
  "ultimate",
  "flavor packed",
  "flavor-packed",
  "packed with flavor",
  "explosion",
  "perfect",
  "power bowl",
  "protein packed",
  "protein-packed",
  "meal prep",
  "clean eating",
  "macro",
  "optimize",
  "recovery fuel",
] as const;

const BAD_PATTERNS: Array<{ id: string; rx: RegExp; note: string }> = [
  {
    id: "dup_word",
    rx: /\b(\w+)\s+\1\b/i,
    note: "duplicate word (e.g. 'Sheet Pan Sheet Pan')",
  },
  {
    id: "sheet_pan_bowls",
    rx: /\bsheet\s*pan\s*bowls?\b/i,
    note: "avoid 'sheet pan bowls' phrasing",
  },
  {
    id: "double_sheet_pan",
    rx: /\bsheet\s*pan\b.*\bsheet\s*pan\b/i,
    note: "repeats 'sheet pan' twice",
  },
  {
    id: "ingredient_stuffed_amp",
    rx: /\bwith\b.*\b&\b.*\b&\b/i,
    note: "ingredient-stuffed 'with X & Y & Z' structure",
  },
];

function normalizeTitle(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/–/g, "-")
    .replace(/[’']/g, "'")
    .toLowerCase();
}

function repeatedWords(title: string): string[] {
  const words = normalizeTitle(title)
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const repeats: string[] = [];
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1]) repeats.push(words[i]!);
  }
  return [...new Set(repeats)];
}

function bannedHits(title: string): string[] {
  const t = normalizeTitle(title);
  return BANNED_PHRASES.filter((p) => t.includes(p));
}

function scoreTitle(title: string): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const dup = repeatedWords(title);
  if (dup.length) issues.push(`duplicate_words:${dup.join(",")}`);

  const banned = bannedHits(title);
  if (banned.length) issues.push(`banned_phrases:${banned.join(",")}`);

  for (const p of BAD_PATTERNS) {
    if (p.rx.test(title)) issues.push(`${p.id}`);
  }

  if (title.length > 52) issues.push("title_too_long");
  if (title.split(" ").length >= 9) issues.push("title_too_many_words");

  return { ok: issues.length === 0, issues };
}

function main(): void {
  const merged = loadMergedHallCatalogIndex();
  const rows = merged.recipes;

  const flagged: Array<{ slug: string; title: string; issues: string[] }> = [];
  for (const r of rows) {
    const check = scoreTitle(r.title);
    if (!check.ok) flagged.push({ slug: r.slug, title: r.title, issues: check.issues });
  }

  // Duplicate titles (exact, normalized)
  const byTitle = new Map<string, Array<{ slug: string; title: string }>>();
  for (const r of rows) {
    const key = normalizeTitle(r.title);
    const list = byTitle.get(key) ?? [];
    list.push({ slug: r.slug, title: r.title });
    byTitle.set(key, list);
  }
  const duplicateTitleGroups = [...byTitle.entries()]
    .map(([k, v]) => ({ key: k, entries: v }))
    .filter((g) => g.entries.length > 1);

  const report = {
    recipeCount: rows.length,
    flaggedCount: flagged.length,
    duplicatesCount: duplicateTitleGroups.length,
    flagged,
    duplicateTitleGroups,
  };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(flagged.length > 0 ? 1 : 0);
  }

  console.log(`[audit:hall-catalog] recipes=${rows.length}`);
  console.log(`[audit:hall-catalog] flagged_titles=${flagged.length}`);
  if (duplicateTitleGroups.length) {
    console.log(`[audit:hall-catalog] duplicate_titles=${duplicateTitleGroups.length}`);
    for (const g of duplicateTitleGroups.slice(0, 12)) {
      console.log(`  - "${g.entries[0]!.title}": ${g.entries.map((e) => e.slug).join(", ")}`);
    }
  }

  if (flagged.length) {
    console.log(`\nFlagged titles (top 40):`);
    for (const f of flagged.slice(0, 40)) {
      console.log(`  - ${f.slug}: "${f.title}" → ${f.issues.join(", ")}`);
    }
    process.exit(1);
  }

  console.log("[audit:hall-catalog] OK — no title issues detected by current rules");
}

main();

