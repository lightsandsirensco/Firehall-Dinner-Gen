#!/usr/bin/env tsx
/**
 * Replace hero alt text that leaked image-prompt templates or internal taxonomy tokens
 * ("— american sheet_pan plated for a firehall crew", "Wide firehall crew platter of … on a
 * station prep table") with alt text that describes the photo. Only the alt string is
 * edited; the rest of each page file is left byte-for-byte as is.
 *
 * When the vision cache holds a non-CRITICAL verdict for this exact hero + recipe, the alt names
 * the foods vision saw in the photo, and that verdict is carried to the new cache key (the alt
 * is built from it, so it is accurate by construction). Otherwise the alt falls back to the
 * recipe subtitle and the next vision audit re-inspects the recipe.
 *
 *   npx tsx scripts/clean-hero-alt-text.ts            # dry run
 *   npx tsx scripts/clean-hero-alt-text.ts --apply
 */
import fs from "node:fs";
import path from "node:path";
import { buildRecipeImageAlt } from "../server/imagery/recipe-image-prompt.js";
import { accuracyStatus, qaCacheKey, type QaRecipe, type VisionVerdict } from "../server/imagery/recipe-image-qa.js";
import { TEMPLATE_ALT } from "../shared/hero-image-validation.js";

const PUBLIC = path.join(process.cwd(), "client", "public");
const CATALOG = path.join(PUBLIC, "catalog");
const CACHE_PATH = path.join(process.cwd(), "scripts", "output", "recipe-image-audit-cache.json");
const APPLY = process.argv.includes("--apply");
const TAXONOMY_TOKEN = /\b[a-z]+_[a-z]+\b/;
const ALT_FIELDS = ["heroImageAlt", "imageAlt"] as const;

type Page = QaRecipe & { heroImage?: string };

const isBadAlt = (alt: string) => TEMPLATE_ALT.test(alt) || TAXONOMY_TOKEN.test(alt);

/** Plain truncating writes fail on OneDrive cloud placeholders; replace the file instead. */
function replaceFile(abs: string, data: string): void {
  const tmp = `${abs}.tmp`;
  fs.writeFileSync(tmp, data, "utf8");
  fs.renameSync(tmp, abs);
}

function indexTitles(col: string): Map<string, string | undefined> {
  const indexPath = path.join(CATALOG, col, "index.json");
  if (!fs.existsSync(indexPath)) return new Map();
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as { recipes?: Array<{ slug: string; title?: string }> };
  return new Map((index.recipes ?? []).map((r) => [r.slug, r.title]));
}

const cache = fs.existsSync(CACHE_PATH) ? (JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) as Record<string, VisionVerdict>) : {};
let changed = 0;
let fromVision = 0;
let cacheMoved = 0;
const unresolved: string[] = [];
const writes: Array<{ abs: string; raw: string }> = [];

for (const col of fs.readdirSync(CATALOG)) {
  const pagesDir = path.join(CATALOG, col, "pages");
  if (!fs.existsSync(pagesDir)) continue;
  const live = indexTitles(col);
  for (const file of fs.readdirSync(pagesDir).filter((f) => f.endsWith(".json"))) {
    const abs = path.join(pagesDir, file);
    let raw = fs.readFileSync(abs, "utf8");
    const page = JSON.parse(raw) as Page;
    const slug = file.replace(/\.json$/, "");
    const heroAbs = page.heroImage ? path.join(PUBLIC, page.heroImage.replace(/^\//, "")) : "";
    const heroBuf = live.has(slug) && heroAbs && fs.existsSync(heroAbs) ? fs.readFileSync(heroAbs) : null;
    // Same recipe shape audit-recipe-image-catalog hashes into the cache key.
    const auditRecipe = (p: Page): QaRecipe => ({ ...p, slug, title: p.title || live.get(slug) });
    let edited = false;

    for (const field of ALT_FIELDS) {
      const alt = page[field];
      if (typeof alt !== "string" || !isBadAlt(alt)) continue;
      const cached = heroBuf ? cache[qaCacheKey(heroBuf, auditRecipe(page))] : undefined;
      // A CRITICAL photo shows the wrong dish; naming its foods would only describe that mistake.
      const verdict = cached && accuracyStatus(cached) !== "CRITICAL" ? cached : undefined;
      const next = buildRecipeImageAlt(page, verdict?.visible_foods);
      const needle = `"${field}": ${JSON.stringify(alt)}`;
      if (isBadAlt(next) || raw.split(needle).length !== 2) {
        unresolved.push(`${col}/${file} [${field}] ${alt}`);
        continue;
      }
      raw = raw.replace(needle, () => `"${field}": ${JSON.stringify(next)}`);
      if ((JSON.parse(raw) as Page)[field] !== next) throw new Error(`${col}/${file}: rewrite did not round-trip`);
      console.log(`${col}/${file}${verdict ? "" : " (subtitle fallback)"}\n  - ${alt}\n  + ${next}`);
      if (verdict?.visible_foods?.length) {
        fromVision++;
        cache[qaCacheKey(heroBuf!, auditRecipe({ ...page, [field]: next }))] = verdict;
        cacheMoved++;
      }
      page[field] = next;
      changed++;
      edited = true;
    }

    if (edited) writes.push({ abs, raw });
  }
}

if (APPLY) {
  if (cacheMoved) replaceFile(CACHE_PATH, JSON.stringify(cache));
  for (const { abs, raw } of writes) replaceFile(abs, raw);
}

console.log(
  `\n[clean-hero-alt-text] ${APPLY ? "corrected" : "would correct"} ${changed} alt text(s) in ${writes.length} page(s): ` +
    `${fromVision} from vision-listed foods, ${changed - fromVision} from the recipe subtitle; vision cache entries carried over: ${cacheMoved}`,
);
for (const u of unresolved) console.warn(`  unresolved ${u}`);
if (!APPLY && changed) console.log("[clean-hero-alt-text] dry run — pass --apply to write");
