#!/usr/bin/env tsx
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { formatTemperaturesInText } from "../shared/measurements/temperature.js";
import { FIREFIGHTER_RED_LEAD_RECIPE } from "../shared/seo/firefighter-red-lead-recipe-data.js";
import { scaleGoldenIngredients } from "../shared/golden-100/recipe-quality/crew-scale.js";
import { formatIngredientAmount } from "../shared/measurements/convert.js";

const ROOT = process.cwd();
const CATALOG_DIRS = [
  join(ROOT, "client/public/catalog/golden-100/pages"),
  join(ROOT, "client/public/catalog/breakfast/pages"),
  join(ROOT, "client/public/catalog/hall-expansion/pages"),
  join(ROOT, "client/public/catalog/performance-meals/pages"),
];

const QA_SLUGS = new Set([
  "chicken-parm",
  "pulled-pork",
  "smoked-brisket",
  "monte-cristo-sandwiches",
  "hall-breakfast-burritos",
  "loaded-nacho-skillet",
  "chicken-caesar",
]);

const TEMP_F_RE =
  /(\d+(?:\.\d+)?)\s*(?:°\s*F|°F|\s+F\b|degrees?\s+F(?:ahrenheit)?)/i;

function stringNeedsDualDisplay(raw: string): boolean {
  const re =
    /(\d+(?:\.\d+)?)\s*(?:°\s*F|°F|\s+F\b|degrees?\s+F(?:ahrenheit)?)/gi;
  for (const match of raw.matchAll(re)) {
    const f = parseFloat(match[1]);
    if (f >= 100) return true;
  }
  return false;
}
const DUAL_RE = /\d+°F\s*\(\d+°C\)/;

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) collectStrings(v, out);
  }
  return out;
}

function auditRecipeStrings(label: string, strings: string[]) {
  let refs = 0;
  let dualAfterRender = 0;
  const samples: string[] = [];

  for (const raw of strings) {
    if (!TEMP_F_RE.test(raw)) continue;
    refs += 1;
    const rendered = formatTemperaturesInText(raw);
    const needsDual = stringNeedsDualDisplay(raw);
    if (!needsDual || DUAL_RE.test(rendered)) {
      dualAfterRender += 1;
    } else if (process.env.DEBUG_TEMPS === "1") {
      console.error(`[audit-recipe-temperatures] missing dual in: ${raw.slice(0, 160)}`);
    }
    if (samples.length < 2 && rendered !== raw) samples.push(rendered.slice(0, 120));
  }

  return { label, refs, dualAfterRender, samples };
}

function listJsonFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

let recipesAudited = 0;
let temperatureRefs = 0;
let dualReady = 0;
const qaResults: Array<{ label: string; refs: number; sample?: string }> = [];

for (const dir of CATALOG_DIRS) {
  if (!existsSync(dir)) continue;
  for (const file of listJsonFiles(dir)) {
    const slug = file.split(/[/\\]/).pop()?.replace(".json", "") ?? file;
    const page = JSON.parse(readFileSync(file, "utf8")) as { title?: string };
    const strings = collectStrings(page);
    const result = auditRecipeStrings(page.title || slug, strings);
    recipesAudited += 1;
    temperatureRefs += result.refs;
    dualReady += result.dualAfterRender;

    if (QA_SLUGS.has(slug)) {
      qaResults.push({
        label: page.title || slug,
        refs: result.refs,
        sample: result.samples[0],
      });
    }
  }
}

const redLeadStrings = [
  ...FIREFIGHTER_RED_LEAD_RECIPE.ingredients.map((i) =>
    [i.quantity, i.unit, i.name, i.notes].filter(Boolean).join(" "),
  ),
  ...FIREFIGHTER_RED_LEAD_RECIPE.steps.map((s) => s.instruction),
  ...FIREFIGHTER_RED_LEAD_RECIPE.tradition.flatMap((s) => s.paragraphs),
];
const redLeadAudit = auditRecipeStrings("Red Lead", redLeadStrings);
recipesAudited += 1;
temperatureRefs += redLeadAudit.refs;
dualReady += redLeadAudit.dualAfterRender;
qaResults.push({
  label: "Firefighter Red Lead",
  refs: redLeadAudit.refs,
  sample: redLeadAudit.samples[0],
});

// Spot-check scale-then-convert still independent of dual temps
const caesar = JSON.parse(
  readFileSync(join(ROOT, "client/public/catalog/golden-100/pages/chicken-caesar.json"), "utf8"),
) as { ingredients: Array<{ name: string; quantity?: string; unit?: string }>; baseServings?: number; crewSize: number };
const scaled = scaleGoldenIngredients(caesar.ingredients, caesar.baseServings ?? caesar.crewSize ?? 8, 6);
const chicken = scaled.find((i) => /chicken/i.test(i.name));
const metricQty = formatIngredientAmount(chicken?.quantity, chicken?.unit, "metric");
if (metricQty !== "1.4 kg") {
  console.error(`[audit-recipe-temperatures] FAIL metric scaling chicken: ${metricQty}`);
  process.exit(1);
}

if (temperatureRefs > 0 && dualReady < temperatureRefs) {
  console.error(
    `[audit-recipe-temperatures] FAIL only ${dualReady}/${temperatureRefs} temperature refs render with dual units`,
  );
  process.exit(1);
}

console.log(
  `[audit-recipe-temperatures] OK recipes=${recipesAudited} tempRefs=${temperatureRefs} dualReady=${dualReady}`,
);
for (const q of qaResults) {
  console.log(`  QA ${q.label}: ${q.refs} refs${q.sample ? ` — e.g. ${q.sample}` : ""}`);
}
