#!/usr/bin/env tsx
/**
 * Apply guarded recipe corrections to the served page JSON and write the
 * itemized change log.
 *
 *   npx tsx scripts/recipe-quality/corrections/apply.ts            # dry run: report only
 *   npx tsx scripts/recipe-quality/corrections/apply.ts --write    # write page JSON
 *   npx tsx scripts/recipe-quality/corrections/apply.ts --batch=B2-food-safety-01
 *
 * When ingredients change, re-run scripts/dietary-classify-catalog.ts so diet flags match.
 */
import fs from "node:fs";
import path from "node:path";
import type { CorrectionOp, RecipeCorrection } from "./types.js";
import { ALL_CORRECTIONS } from "./batches/index.js";

const WRITE = process.argv.includes("--write");
const batchArg = process.argv.find((a) => a.startsWith("--batch="))?.slice(8);
const CATALOG = path.join("client", "public", "catalog");
const OUT = path.join("review", "recipe-quality", "corrections");

type Json = Record<string, unknown>;

function readJson(file: string) {
  const raw = fs.readFileSync(file, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const indent = raw.match(/^\{\r?\n( +)/)?.[1].length ?? 0;
  const trailing = raw.endsWith(eol);
  const serialize = (v: unknown) => {
    let s = JSON.stringify(v, null, indent || undefined);
    if (eol === "\r\n") s = s.replace(/\n/g, "\r\n");
    return trailing ? s + eol : s;
  };
  return { raw, data: JSON.parse(raw) as Json, serialize };
}

function resolve(root: Json, p: string): { parent: any; key: string | number } {
  const parts = p.split(".");
  let cur: any = root;
  for (const part of parts.slice(0, -1)) {
    cur = cur?.[/^\d+$/.test(part) ? Number(part) : part];
    if (cur === undefined) throw new Error(`path not found: ${p}`);
  }
  const last = parts.at(-1)!;
  return { parent: cur, key: /^\d+$/.test(last) ? Number(last) : last };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Returns "applied" | "already" ; throws when the recipe no longer matches. */
function applyOp(page: Json, op: CorrectionOp): "applied" | "already" {
  const { parent, key } = resolve(page, op.path);
  switch (op.op) {
    case "replace": {
      const cur = parent[key];
      if (typeof cur !== "string") throw new Error(`${op.path} is not text`);
      if (op.replace !== "" && cur.includes(op.replace)) return "already";
      const count = cur.split(op.find).length - 1;
      if (count === 1) {
        parent[key] = cur.replace(op.find, () => op.replace);
        return "applied";
      }
      if (count === 0 && op.replace === "") return "already";
      throw new Error(`${op.path}: expected exactly one "${op.find.slice(0, 60)}", found ${count}`);
    }
    case "set": {
      if (same(parent[key], op.value)) return "already";
      if (!same(parent[key], op.expect)) throw new Error(`${op.path}: expected ${JSON.stringify(op.expect)}, found ${JSON.stringify(parent[key])}`);
      parent[key] = op.value;
      return "applied";
    }
    case "insert": {
      const arr = parent[key];
      if (!Array.isArray(arr)) throw new Error(`${op.path} is not a list`);
      const sansNumber = (v: unknown) => (v && typeof v === "object" ? { ...(v as Json), stepNumber: undefined } : v);
      if (arr.some((x) => same(sansNumber(x), sansNumber(op.value)))) return "already";
      arr.splice(op.index, 0, op.value);
      return "applied";
    }
    case "remove": {
      const arr = parent[key];
      if (!Array.isArray(arr)) throw new Error(`${op.path} is not a list`);
      const i = arr.findIndex((x) => x?.name === op.name);
      if (i < 0) return "already";
      arr.splice(i, 1);
      return "applied";
    }
  }
}

function describeOp(op: CorrectionOp): string {
  switch (op.op) {
    case "replace": return `${op.path}: "${op.find}" → "${op.replace}"`;
    case "set": return `${op.path}: ${JSON.stringify(op.expect)} → ${JSON.stringify(op.value)}`;
    case "insert": return `${op.path}: add ${JSON.stringify(op.value)}`;
    case "remove": return `${op.path}: remove "${op.name}"`;
  }
}

function renumberSteps(page: Json) {
  const steps = page.steps as Array<{ stepNumber?: number }> | undefined;
  steps?.forEach((s, i) => { if (typeof s.stepNumber === "number") s.stepNumber = i + 1; });
}

const selected = ALL_CORRECTIONS.filter((c) => !batchArg || c.batch === batchArg);
const seen = new Set<string>();
for (const c of selected) {
  const key = `${c.batch}:${c.slug}:${c.target ?? "page"}`;
  if (seen.has(key)) throw new Error(`duplicate correction entry ${key}`);
  seen.add(key);
}

type Result = { c: RecipeCorrection; status: "applied" | "already" | "failed"; detail: string };
const results: Result[] = [];
const pages = new Map<string, ReturnType<typeof readJson> & { file: string; changedIngredients: boolean }>();
const targetFile = (c: RecipeCorrection) =>
  c.target === "index" ? path.join(CATALOG, c.collection, "index.json") : path.join(CATALOG, c.collection, "pages", `${c.slug}.json`);

for (const c of selected) {
  const file = targetFile(c);
  if (!fs.existsSync(file)) { results.push({ c, status: "failed", detail: `file missing: ${file}` }); continue; }
  if (!pages.has(file)) pages.set(file, { ...readJson(file), file, changedIngredients: false });
  const entry = pages.get(file)!;
  // Apply to a scratch copy so a failing correction leaves the file untouched.
  const scratch = JSON.parse(JSON.stringify(entry.data)) as Json;
  try {
    const root = c.target === "index" ? ((scratch.recipes as Json[]) ?? []).find((r) => r.slug === c.slug) : scratch;
    if (!root) throw new Error(`no index entry for ${c.slug}`);
    const statuses = c.ops.map((op) => applyOp(root, op));
    if (c.ops.some((op) => (op.op === "insert" || op.op === "remove") && op.path === "steps")) renumberSteps(root);
    const applied = statuses.includes("applied");
    if (applied && c.ops.some((op) => op.path.startsWith("ingredients"))) entry.changedIngredients = true;
    entry.data = scratch;
    results.push({ c, status: applied ? "applied" : "already", detail: c.ops.map(describeOp).join("\n") });
  } catch (err) {
    results.push({ c, status: "failed", detail: (err as Error).message });
  }
}

let filesWritten = 0;
if (WRITE) {
  for (const entry of pages.values()) {
    const text = entry.serialize(entry.data);
    if (text !== entry.raw) { fs.writeFileSync(entry.file, text); filesWritten++; }
  }
}
const ingredientEdits = [...pages.values()].some((p) => p.changedIngredients);

// Change log (always regenerated from the full correction set, not just this run).
fs.mkdirSync(OUT, { recursive: true });
const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
const logRows = results.map((r) => [r.c.batch, r.c.slug, r.c.collection, r.c.category, r.c.findings.join("|"), r.status, r.c.summary, r.c.rationale, r.c.reference ?? "", r.detail.replace(/\n/g, " ¶ ")]);
if (!batchArg) {
  fs.writeFileSync(path.join(OUT, "change-log.csv"),
    ["batch,slug,collection,category,findings,status,summary,rationale,reference,edits", ...logRows.map((row) => row.map((v) => esc(String(v))).join(","))].join("\n") + "\n");
  const byBatch = new Map<string, Result[]>();
  for (const r of results) byBatch.set(r.c.batch, [...(byBatch.get(r.c.batch) ?? []), r]);
  const md = ["# Recipe correction change log", "", "Generated by `scripts/recipe-quality/corrections/apply.ts`. Every edit is guarded: it applies only when the recipe still contains the exact text it was written against. Recipe IDs (slugs) never change.", ""];
  for (const [batch, rs] of byBatch) {
    md.push(`## ${batch} (${rs.length} recipes)`, "");
    for (const r of rs) {
      md.push(`### \`${r.c.slug}\` — ${r.c.summary}`, "", `- Collection: ${r.c.collection} · Category: ${r.c.category} · Resolves: ${r.c.findings.join(", ")} · Status: ${r.status}`, `- Why: ${r.c.rationale}`);
      if (r.c.reference) md.push(`- Reference: ${r.c.reference}`);
      md.push("- Edits:", ...r.c.ops.map((op) => `  - ${describeOp(op).replace(/\n/g, " ")}`), "");
    }
  }
  fs.writeFileSync(path.join(OUT, "CHANGE-LOG.md"), md.join("\n"));
}

const count = (s: Result["status"]) => results.filter((r) => r.status === s).length;
console.log(`[corrections] ${WRITE ? "WRITE" : "dry run"} — ${results.length} corrections: ${count("applied")} ${WRITE ? "applied" : "would apply"}, ${count("already")} already applied, ${count("failed")} failed; ${filesWritten} files written`);
for (const r of results.filter((x) => x.status === "failed")) console.log(`  FAILED ${r.c.batch} ${r.c.slug}: ${r.detail}`);
if (WRITE && ingredientEdits) console.log("[corrections] ingredients changed — run: npx tsx scripts/dietary-classify-catalog.ts");
process.exitCode = count("failed") ? 1 : 0;
