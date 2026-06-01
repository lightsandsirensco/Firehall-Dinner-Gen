#!/usr/bin/env tsx
/**
 * Apply automated Phase 1 copy fixes across curated catalog pages.
 *
 *   npm run apply:master-recipe-copy-fixes
 *   npm run apply:master-recipe-copy-fixes -- --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { stripBannedInstructionPhrases } from "../shared/firehall-instruction-voice.js";

const PUBLIC = path.join(process.cwd(), "client", "public", "catalog");

const COPY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\btonight'?s board\b/gi, "serving line"],
  [/\bperfect for\b/gi, "works for"],
  [/\bideal for\b/gi, "works for"],
  [/\bplate and serve\b/gi, "portion and serve"],
  [/\bserve and enjoy\b/gi, "serve while hot"],
  [/\buntil done\b/gi, "until fully cooked"],
  [/\bcook until done\b/gi, "cook to safe internal temperature"],
  [/\belevated?\b/gi, ""],
  [/\brestaurant-?quality\b/gi, "hall-style"],
  [/\bto perfection\b/gi, "until done right"],
  [/\bculinary\b/gi, ""],
  [/\bwhilst\b/gi, "while"],
  [/\butilize\b/gi, "use"],
];

const CATALOG_ROOTS = [
  "golden-100/pages",
  "performance-meals/pages",
  "hall-expansion/pages",
  "breakfast/pages",
  "breakfast/performance/pages",
  "bbq/pages",
  "pizza-night/pages",
  "smoothies/pages",
];

function walkJsonPages(root: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walkJsonPages(p));
    else if (entry.name.endsWith(".json") && entry.name !== "index.json") out.push(p);
  }
  return out;
}

function polishText(value: string): { text: string; changed: boolean } {
  let text = stripBannedInstructionPhrases(value);
  for (const [re, replacement] of COPY_REPLACEMENTS) {
    text = text.replace(re, replacement);
  }
  text = text.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();
  return { text, changed: text !== value };
}

function polishNode(node: unknown): { node: unknown; changed: boolean } {
  if (typeof node === "string") {
    const { text, changed } = polishText(node);
    return { node: text, changed };
  }
  if (Array.isArray(node)) {
    let changed = false;
    const out = node.map((item) => {
      const r = polishNode(item);
      if (r.changed) changed = true;
      return r.node;
    });
    return { node: out, changed };
  }
  if (node && typeof node === "object") {
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "slug" || k === "heroImage" || k === "mobileImage" || k === "thumbImage" || k === "railImage") {
        out[k] = v;
        continue;
      }
      const r = polishNode(v);
      if (r.changed) changed = true;
      out[k] = r.node;
    }
    return { node: out, changed };
  }
  return { node, changed: false };
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  const changedFiles: string[] = [];

  for (const rel of CATALOG_ROOTS) {
    for (const file of walkJsonPages(path.join(PUBLIC, rel))) {
      const raw = fs.readFileSync(file, "utf8");
      const page = JSON.parse(raw) as unknown;
      const { node, changed } = polishNode(page);
      if (!changed) continue;
      changedFiles.push(path.relative(process.cwd(), file));
      if (!dryRun) {
        fs.writeFileSync(file, `${JSON.stringify(node, null, 2)}\n`, "utf8");
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    filesChanged: changedFiles.length,
    files: changedFiles,
  };

  const outPath = path.join("review", "master-recipe-copy-fixes.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`[apply:master-recipe-copy-fixes] ${dryRun ? "would change" : "changed"} ${changedFiles.length} files`);
  if (changedFiles.length) console.log(changedFiles.slice(0, 20).join("\n"));
}

main();
