#!/usr/bin/env tsx
/**
 * Recipe-discovery duplicate screen for candidate dishes (local only, no APIs).
 *
 *   npx tsx scripts/recipe-discovery.ts <candidates.csv|candidates.json> [--inventory <path>]
 *
 * Input fields (CSV header or JSON object keys):
 *   name (required), cuisine, source_url, main_protein,
 *   main_ingredients (CSV: separated by ";" or "|"; JSON: array or string)
 *
 * Writes data/recipe-discovery/results/<input-name>-review.csv and -results.json.
 * Never touches production recipes.
 */
import fs from "node:fs";
import path from "node:path";

const DEFAULT_INVENTORY = "data/recipe-discovery/existing-recipes.json";
const RESULTS_DIR = "data/recipe-discovery/results";

const LEVENSHTEIN_POSSIBLE = 0.85;
const JACCARD_POSSIBLE = 0.75;
const INGREDIENT_OVERLAP_FLAG = 0.6;
/** Name tokens shared before a strong ingredient overlap escalates to POSSIBLE DUPLICATE. */
const JACCARD_WITH_INGREDIENTS = 0.34;

type Status = "NEW" | "POSSIBLE DUPLICATE" | "DUPLICATE";

interface Candidate {
  name: string;
  cuisine: string;
  sourceUrl: string;
  mainProtein: string;
  mainIngredients: string[];
}

interface ExistingRecipe {
  id: string;
  name: string;
  collection: string;
  mainProtein: string | null;
  ingredients: string[];
}

interface Indexed {
  ref: string;
  name: string;
  lower: string;
  slug: string;
  canonical: string;
  sortedTokens: string;
  tokens: Set<string>;
  protein: string;
  ingredientTokens: string[][];
}

const PHRASE_ALIASES: Array<[RegExp, string]> = [
  [/\bbar b q\b|\bbar b que\b|\bbarbecue\b|\bbarbeque\b|\bbbq'?d\b/g, "bbq"],
  [/\bmacaroni (and )?cheese\b|\bmac (n |and )?cheese\b/g, "mac cheese"],
  [/\bk[ae]b[ao]bs?\b|\bkebobs?\b/g, "kebab"],
  [/\bchil(e|li)s?\b/g, "chili"],
  [/\bdoughnuts?\b/g, "donut"],
  [/\byoghurt\b/g, "yogurt"],
  [/\bparmigiana\b|\bparmesan\b|\bparmigiano\b/g, "parm"],
  [/\bstir fry\b|\bstir fried\b/g, "stirfry"],
  [/\bomelette\b/g, "omelet"],
  [/\bcheese steak\b/g, "cheesesteak"],
  [/\bspag bol\b/g, "spaghetti bolognese"],
  [/\bfajitas?\b/g, "fajita"],
  [/\bsloppy joes?\b/g, "sloppy joe"],
  [/\bpot pie\b/g, "potpie"],
  [/\bmeat balls?\b/g, "meatball"],
  [/\bsheet pan\b|\bsheetpan\b/g, "sheetpan"],
  [/\bone pot\b|\bone pan\b/g, ""],
];

const STOPWORDS = new Set([
  "the", "a", "an", "and", "with", "style", "firehall", "hall", "crew", "classic", "easy",
  "homemade", "best", "simple", "quick", "for", "of", "in", "on", "our", "night", "recipe",
]);

function baseNormalize(text: string): string {
  let s = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  for (const [re, to] of PHRASE_ALIASES) s = s.replace(re, to);
  return s.replace(/\s+/g, " ").trim();
}

function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(ss|x|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function tokensOf(text: string): string[] {
  return baseNormalize(text)
    .split(" ")
    .filter((t) => t && !STOPWORDS.has(t))
    .map(singular);
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/['\u2019]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[b.length]! / Math.max(a.length, b.length);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared);
}

function index(ref: string, name: string, protein: string | null, ingredients: string[]): Indexed {
  const toks = tokensOf(name);
  return {
    ref,
    name,
    lower: name.trim().toLowerCase(),
    slug: slugify(name),
    canonical: toks.join(" "),
    sortedTokens: [...toks].sort().join(" "),
    tokens: new Set(toks),
    protein: protein ? tokensOf(protein).join(" ") : "",
    ingredientTokens: ingredients.map(tokensOf).filter((t) => t.length),
  };
}

/** Share of the candidate's main ingredients found (all tokens present) in an existing recipe. */
function ingredientOverlap(cand: Indexed, existing: Indexed): { matched: number; total: number } {
  const total = cand.ingredientTokens.length;
  if (total < 2 || !existing.ingredientTokens.length) return { matched: 0, total };
  let matched = 0;
  for (const needle of cand.ingredientTokens) {
    const hit =
      existing.ingredientTokens.some((hay) => needle.every((t) => hay.includes(t))) ||
      (existing.protein !== "" && needle.join(" ") === existing.protein);
    if (hit) matched++;
  }
  return { matched, total };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function pick(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (obj[k] != null && obj[k] !== "") return obj[k];
  return undefined;
}

function toCandidate(raw: Record<string, unknown>): Candidate | null {
  const name = String(pick(raw, "name", "dish_name", "dish", "title") ?? "").trim();
  if (!name) return null;
  const ing = pick(raw, "main_ingredients", "mainIngredients", "ingredients");
  const mainIngredients = (Array.isArray(ing) ? ing.map(String) : String(ing ?? "").split(/[;|]/))
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    name,
    cuisine: String(pick(raw, "cuisine") ?? "").trim(),
    sourceUrl: String(pick(raw, "source_url", "sourceUrl", "url", "source") ?? "").trim(),
    mainProtein: String(pick(raw, "main_protein", "mainProtein", "protein") ?? "").trim(),
    mainIngredients,
  };
}

function loadCandidates(file: string): Candidate[] {
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  let records: Record<string, unknown>[];
  if (file.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(text);
    records = Array.isArray(parsed) ? parsed : (parsed.candidates ?? []);
  } else {
    const [header, ...rows] = parseCsv(text);
    if (!header) return [];
    const keys = header.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    records = rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
  }
  return records.map(toCandidate).filter((c): c is Candidate => c !== null);
}

function main() {
  const args = process.argv.slice(2);
  const input = args.find((a) => !a.startsWith("--"));
  const invFlag = args.indexOf("--inventory");
  const inventoryPath = invFlag >= 0 ? args[invFlag + 1]! : DEFAULT_INVENTORY;
  if (!input) {
    console.error("Usage: npx tsx scripts/recipe-discovery.ts <candidates.csv|json> [--inventory <path>]");
    process.exit(1);
  }

  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8")) as { recipes: ExistingRecipe[] };
  const existing = inventory.recipes.map((r) =>
    index(`${r.collection}/${r.id}`, r.name, r.mainProtein, r.ingredients ?? []),
  );
  const existingIds = new Set(inventory.recipes.map((r) => r.id.toLowerCase()));

  const candidates = loadCandidates(input);
  const accepted: Indexed[] = [];
  const results = candidates.map((cand, i) => {
    const ingredients = [...cand.mainIngredients, ...(cand.mainProtein ? [cand.mainProtein] : [])];
    const c = index(`candidate#${i + 1}`, cand.name, cand.mainProtein, ingredients);

    let status: Status = "NEW";
    let matched = "";
    let reason = "";
    let bestScore = 0;
    let overlapNote = "";
    let bestOverlap = 0;

    const consider = (pool: Indexed[], scope: string) => {
      for (const e of pool) {
        if (status === "DUPLICATE") return;
        if (c.lower === e.lower || (scope === "existing" && existingIds.has(c.slug) && c.slug === e.ref.split("/")[1])) {
          status = "DUPLICATE";
          matched = e.ref;
          reason = `exact ${c.lower === e.lower ? "name" : "slug"} match (${scope})`;
          return;
        }
        const lev = levenshteinRatio(c.canonical, e.canonical);
        const jac = jaccard(c.tokens, e.tokens);
        let why = "";
        let score = 0;
        if (c.canonical && c.canonical === e.canonical) [why, score] = ["same normalized name / spelling variant", 1];
        else if (c.sortedTokens && c.sortedTokens === e.sortedTokens) [why, score] = ["same words, different order", 0.99];
        else if (lev >= LEVENSHTEIN_POSSIBLE) [why, score] = [`similar spelling (${lev.toFixed(2)})`, lev];
        else if (jac >= JACCARD_POSSIBLE && c.tokens.size >= 2) [why, score] = [`shared name words (${jac.toFixed(2)})`, jac];

        if (scope === "existing") {
          const ov = ingredientOverlap(c, e);
          const ratio = ov.total ? ov.matched / ov.total : 0;
          if (ratio >= INGREDIENT_OVERLAP_FLAG && ratio > bestOverlap) {
            bestOverlap = ratio;
            overlapNote = `${e.ref} (${ov.matched}/${ov.total} main ingredients)`;
          }
          if (!why && ratio >= INGREDIENT_OVERLAP_FLAG && jac >= JACCARD_WITH_INGREDIENTS) {
            [why, score] = [`ingredient overlap ${ov.matched}/${ov.total} + shared name words`, 0.5 + ratio / 4];
          }
        }
        if (why && score > bestScore) {
          bestScore = score;
          status = "POSSIBLE DUPLICATE";
          matched = e.ref;
          reason = `${why} (${scope})`;
        }
      }
    };
    consider(existing, "existing");
    consider(accepted, "this batch");
    accepted.push(c);

    return {
      dish_name: cand.name,
      cuisine: cand.cuisine,
      source_url: cand.sourceUrl,
      duplicate_status: status,
      matched_recipe: matched,
      match_reason: reason,
      ingredient_overlap: overlapNote,
      review_status: status === "DUPLICATE" ? "REJECTED" : "PENDING REVIEW",
      reviewer_notes: "",
    };
  });

  const base = path.basename(input).replace(/\.(csv|json)$/i, "");
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const csvPath = path.join(RESULTS_DIR, `${base}-review.csv`);
  const jsonPath = path.join(RESULTS_DIR, `${base}-results.json`);
  const columns = Object.keys(results[0] ?? { dish_name: "" }) as Array<keyof (typeof results)[number]>;
  const csv = [columns.join(","), ...results.map((r) => columns.map((k) => csvCell(String(r[k] ?? ""))).join(","))];
  fs.writeFileSync(csvPath, `${csv.join("\n")}\n`);
  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), input, inventory: inventoryPath, results }, null, 2),
  );

  const count = (s: Status) => results.filter((r) => r.duplicate_status === s).length;
  console.log(
    JSON.stringify(
      {
        candidates: results.length,
        NEW: count("NEW"),
        "POSSIBLE DUPLICATE": count("POSSIBLE DUPLICATE"),
        DUPLICATE: count("DUPLICATE"),
        ingredientOverlapFlags: results.filter((r) => r.ingredient_overlap).length,
        reviewCsv: csvPath,
        resultsJson: jsonPath,
      },
      null,
      2,
    ),
  );
}

main();
