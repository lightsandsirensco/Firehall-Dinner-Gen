import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb } from "../server/sqlite.js";

type Row = {
  slug: string;
  title: string;
  status: string;
  hero_image: string | null;
  hero_image_alt: string | null;
  thumb_image: string | null;
};

function normalizeForAudit(url: string | null | undefined): string {
  const raw = (url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("images/")) return `/${raw}`;
  return raw;
}

function localPathForPublicUrl(publicUrl: string): string | null {
  if (!publicUrl.startsWith("/images/")) return null;
  const rel = publicUrl.replace(/^\/images\//, "");
  return path.resolve(process.cwd(), "client", "public", "images", rel);
}

async function checkExternalUrl(url: string): Promise<{ ok: boolean; status?: number; note?: string }> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const head = await fetch(url, { method: "HEAD", signal: controller.signal });
    if (head.ok) {
      clearTimeout(t);
      return { ok: true, status: head.status };
    }
    // Many CDNs / blogs block HEAD; try a tiny GET as a fallback.
    const get = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Range: "bytes=0-0" },
    });
    clearTimeout(t);
    if (!get.ok) return { ok: false, status: get.status, note: "non-2xx" };
    return { ok: true, status: get.status };
  } catch (e: any) {
    return { ok: false, note: e?.name === "AbortError" ? "timeout" : "fetch_error" };
  }
}

function classify(url: string): "missing" | "local" | "external" | "other" {
  if (!url) return "missing";
  if (url.startsWith("/images/")) return "local";
  if (/^https?:\/\//i.test(url)) return "external";
  return "other";
}

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();

  const recipeCols = (db.prepare("PRAGMA table_info(curated_recipes)").all() as any[]).map(
    (r) => String(r.name),
  );
  const imageCols = (db.prepare("PRAGMA table_info(curated_recipe_images)").all() as any[]).map(
    (r) => String(r.name),
  );
  console.log(`[audit:recipe-images] curated_recipes columns: ${recipeCols.join(", ")}`);
  console.log(`[audit:recipe-images] curated_recipe_images columns: ${imageCols.join(", ")}`);
  const recipeIdCol =
    recipeCols.includes("recipe_id") ? "recipe_id" : recipeCols.includes("id") ? "id" : null;
  const imageRecipeIdCol =
    imageCols.includes("recipe_id") ? "recipe_id" : imageCols.includes("recipeId") ? "recipeId" : null;

  if (!recipeIdCol) {
    throw new Error(`audit:recipe-images: could not find recipe id column on curated_recipes`);
  }
  if (!imageRecipeIdCol) {
    throw new Error(`audit:recipe-images: could not find recipe id column on curated_recipe_images`);
  }

  const joinCol = `${imageRecipeIdCol}`;

  const rows = db
    .prepare(
      `
      SELECT
        r.slug,
        r.title,
        r.status,
        r.hero_image,
        r.hero_image_alt,
        (
          SELECT i.url
          FROM curated_recipe_images i
          WHERE i.${joinCol} = r.${recipeIdCol} AND i.role = 'thumb'
          ORDER BY i.position ASC, i.id ASC
          LIMIT 1
        ) AS thumb_image
      FROM curated_recipes r
      WHERE r.status = 'published'
      ORDER BY r.slug ASC
      `,
    )
    .all() as Row[];

  const results: Array<{
    slug: string;
    title: string;
    hero: { url: string; ok: boolean; reason?: string };
    thumb: { url: string; ok: boolean; reason?: string };
  }> = [];

  for (const r of rows) {
    const heroUrl = normalizeForAudit(r.hero_image);
    const thumbUrl = normalizeForAudit(r.thumb_image) || heroUrl;

    const hero = { url: heroUrl, ok: true as boolean, reason: undefined as string | undefined };
    const thumb = { url: thumbUrl, ok: true as boolean, reason: undefined as string | undefined };

    for (const target of [
      { kind: "hero", obj: hero },
      { kind: "thumb", obj: thumb },
    ] as const) {
      const url = target.obj.url;
      const kind = target.kind;
      const c = classify(url);
      if (c === "missing") {
        target.obj.ok = false;
        target.obj.reason = "missing";
        continue;
      }
      if (c === "local") {
        const disk = localPathForPublicUrl(url);
        if (!disk) {
          target.obj.ok = false;
          target.obj.reason = "local_unmapped";
          continue;
        }
        if (!fs.existsSync(disk)) {
          target.obj.ok = false;
          target.obj.reason = `missing_file:${path.relative(process.cwd(), disk)}`;
          continue;
        }
        continue;
      }
      if (c === "external") {
        const res = await checkExternalUrl(url);
        if (!res.ok) {
          target.obj.ok = false;
          target.obj.reason = `external_${res.note || "bad"}${res.status ? `:${res.status}` : ""}`;
        }
        continue;
      }

      // Relative / unknown forms usually break in the browser.
      target.obj.ok = false;
      target.obj.reason = `${kind}_bad_url_form`;
    }

    results.push({ slug: r.slug, title: r.title, hero, thumb });
  }

  const total = results.length;
  const heroBad = results.filter((r) => !r.hero.ok);
  const thumbBad = results.filter((r) => !r.thumb.ok);
  const ok = results.filter((r) => r.hero.ok && r.thumb.ok);

  console.log(`audit:recipe-images`);
  console.log(`total_published=${total}`);
  console.log(`images_ok=${ok.length}`);
  console.log(`missing_or_broken_hero=${heroBad.length}`);
  console.log(`missing_or_broken_thumbnail=${thumbBad.length}`);

  function printList(label: string, items: typeof results) {
    if (!items.length) return;
    console.log(`\n${label}:`);
    for (const r of items) {
      console.log(
        `- ${r.slug} | hero=${r.hero.ok ? "ok" : r.hero.reason} | thumb=${r.thumb.ok ? "ok" : r.thumb.reason}`,
      );
    }
  }

  printList("hero_issues", heroBad);
  printList("thumbnail_issues", thumbBad);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

