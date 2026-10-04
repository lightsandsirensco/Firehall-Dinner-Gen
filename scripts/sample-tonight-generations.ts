#!/usr/bin/env tsx
/**
 * Calls the real POST /api/generate ("Pick Tonight's Meal") across filter combinations and
 * compares every response to the canonical catalog page record for the returned slug.
 *
 *   npx tsx scripts/sample-tonight-generations.ts [--base http://localhost:5057] [--count 60] [--out review/tonight-generation-sample.json]
 */
import fs from "node:fs";
import path from "node:path";
import { customerCuisineLabel, customerMealFormatLabel, customerProteinLabel } from "../shared/customer-facing.js";
import { proteinMatchesFilter } from "../server/spoonacular-converter.js";
import { TONIGHT_IMAGE_HOLDS } from "../shared/catalog-integrity/image-holds.js";

const args = process.argv.slice(2);
const argVal = (name: string, def: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : def;
};
const BASE = argVal("--base", "http://localhost:5057");
const COUNT = Number(argVal("--count", "60"));
const OUT = argVal("--out", "review/tonight-generation-sample.json");

const PAGE_DIRS = ["golden-100", "performance-meals", "hall-expansion", "bbq"];
function loadPage(slug: string): Record<string, any> | null {
  for (const d of PAGE_DIRS) {
    const p = path.join("client/public/catalog", d, "pages", `${slug}.json`);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  }
  return null;
}

const PROTEINS = ["any", "chicken", "beef", "pork", "turkey", "seafood", "vegetarian"];
const TIMES = ["25-40", "30-45", "45-60", "60-90", "20-30"];
const CREWS = [4, 6, 8, 12, 16];
const HEALTH = ["balanced", "lean", "comfort"];
const GOALS = ["no_preference", "high_protein", "lighter", "balanced"];

const INTERNAL_LABEL = /^(hall|random|any|plated_main|none|mixed|undefined|null)$/i;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

let cookie = "";
async function csrf(): Promise<string> {
  const res = await fetch(`${BASE}/api/csrf-token`, { headers: cookie ? { cookie } : {} });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(/,(?=[^;]+=)/).map((c) => c.split(";")[0]).join("; ");
  return ((await res.json()) as { token: string }).token;
}

async function main(): Promise<void> {
  const results: Array<Record<string, unknown>> = [];
  let token = await csrf();
  for (let i = 0; i < COUNT; i++) {
    const body = {
      crew_size: CREWS[i % CREWS.length],
      busy_level: "average",
      time_available: TIMES[(i * 3) % TIMES.length],
      protein: PROTEINS[i % PROTEINS.length],
      healthiness_preference: HEALTH[(i * 5) % HEALTH.length],
      nutrition_goal: GOALS[(i * 7) % GOALS.length],
      appliances: ["stove", "oven"],
      budget_level: "standard",
      cuisine_style: "any",
      meal_format: "random",
      allergens_to_avoid: [],
      request_id: `sample-${Date.now()}-${i}`,
      generation_intent: "user",
    };
    const res = await fetch(`${BASE}/api/generate?debug=1`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": token, cookie },
      body: JSON.stringify(body),
    });
    if (res.status === 403 || res.status === 419) {
      token = await csrf();
      i--;
      continue;
    }
    const data = (await res.json()) as Record<string, any>;
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1000 * (data?.retry_after_seconds || 5)));
      i--;
      continue;
    }
    if (!res.ok) {
      results.push({ i, request: body, status: res.status, error: data?.code || data?.message, detail: data });
      if (results.filter((r) => r.error).length === 1) console.error(JSON.stringify(data).slice(0, 600));
      if (res.status === 429) await new Promise((r) => setTimeout(r, 1000 * (data?.retry_after_seconds || 5)));
      continue;
    }
    const slug = String(data._slug || "");
    const page = loadPage(slug);
    const issues: string[] = [];
    const shownTitle = data.meal_plate?.display_title || data.title;
    if (!slug) issues.push("no_slug");
    if (TONIGHT_IMAGE_HOLDS[slug]) issues.push(`image_hold_served:${slug}`);
    if (!page) issues.push("no_canonical_page");
    let detail: Record<string, any> | null = null;
    if (slug) {
      const dr = await fetch(`${BASE}/api/catalog/golden-100/${encodeURIComponent(slug)}`);
      detail = dr.ok ? ((await dr.json()) as Record<string, any>) : null;
      if (!detail) issues.push(`detail_page_missing:${dr.status}`);
    }
    if (page) {
      if (data.title !== page.title) issues.push(`title_differs:${data.title} != ${page.title}`);
      if (shownTitle !== page.title) issues.push(`displayed_title_differs:${shownTitle}`);
      if (data.hero_image && data.hero_image !== page.heroImage) issues.push(`hero_differs:${data.hero_image} != ${page.heroImage}`);
      if (data.hero_image && !fs.existsSync(path.join("client/public", String(data.hero_image).split("?")[0]!))) {
        issues.push(`hero_file_missing:${data.hero_image}`);
      }
      if (detail) {
        if (detail.title !== shownTitle) issues.push(`detail_title_differs:${detail.title}`);
        if ((detail.heroImage || "") !== (data.hero_image || "")) issues.push(`detail_hero_differs:${detail.heroImage} != ${data.hero_image}`);
        if ((detail.ingredients || []).length !== (data.ingredients || []).length) issues.push("detail_ingredient_count_differs");
        if ((detail.steps || []).length !== (data.steps || []).length) issues.push("detail_step_count_differs");
      }
      const pageIngs = new Set((page.ingredients || []).map((x: any) => norm(String(x.name))));
      const respIngs = (data.ingredients || []).map((x: any) => norm(String(x.name)));
      const added = respIngs.filter((n: string) => !pageIngs.has(n));
      const missing = [...pageIngs].filter((n) => !respIngs.includes(n as string));
      if (added.length) issues.push(`ingredients_added:${added.join("|")}`);
      if (missing.length) issues.push(`ingredients_missing:${missing.join("|")}`);
      if ((data.steps || []).length !== (page.steps || []).length) {
        issues.push(`step_count:${(data.steps || []).length} != ${(page.steps || []).length}`);
      }
      const pageTotal = Number(page.prepTime || 0) + Number(page.cookTime || 0);
      if (data.timing?.total_min && pageTotal && data.timing.total_min !== pageTotal) {
        issues.push(`total_minutes:${data.timing.total_min} != ${pageTotal}`);
      }
    }
    const chips = [
      customerMealFormatLabel(data as any),
      customerProteinLabel(data.protein_label || data.chosen_protein),
      customerCuisineLabel(data.meal_plate?.cuisine_label),
    ].filter(Boolean) as string[];
    const internal = chips.filter((c) => INTERNAL_LABEL.test(String(c).trim()) || /_/.test(String(c)));
    if (internal.length) issues.push(`internal_chip_values:${internal.join("|")}`);
    if (body.protein !== "any" && !proteinMatchesFilter(String(data.chosen_protein || ""), body.protein)) {
      issues.push(`protein_filter_violated:${data.chosen_protein} for ${body.protein}`);
    }
    results.push({
      i,
      request: body,
      slug,
      title: data.title,
      displayed_title: shownTitle,
      hero_image: data.hero_image,
      hero_status: data.hero_image_status,
      protein_label: data.protein_label,
      page_title: page?.title,
      page_hero: page?.heroImage,
      chips,
      issues,
    });
  }

  const ok = results.filter((r) => Array.isArray(r.issues) && (r.issues as string[]).length === 0).length;
  const errors = results.filter((r) => r.error).length;
  const issueCounts: Record<string, number> = {};
  for (const r of results) for (const iss of (r.issues as string[]) || []) {
    const k = iss.split(":")[0]!;
    issueCounts[k] = (issueCounts[k] || 0) + 1;
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ base: BASE, total: results.length, ok, errors, issueCounts, results }, null, 2));
  console.log(JSON.stringify({ total: results.length, ok, errors, issueCounts, distinctSlugs: new Set(results.map((r) => r.slug)).size }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
