/**
 * Extract Recipe schema from HTML via JSON-LD (schema.org/Recipe).
 */

import type { ExtractedRecipe, ExtractedIngredient, ExtractedStep } from "../../../shared/ingestion/extracted-recipe.js";
import { getTrustedPublisher } from "../../../shared/ingestion/trusted-publishers.js";

function parseDurationMinutes(iso?: string): number {
  if (!iso || typeof iso !== "string") return 0;
  const m = iso.match(/P(?:T(?:(\d+)H)?(?:(\d+)M)?|(?:(\d+)D))/i);
  if (!m) return 0;
  const days = parseInt(m[3] || "0", 10);
  const hours = parseInt(m[1] || "0", 10);
  const mins = parseInt(m[2] || "0", 10);
  const total = days * 24 * 60 + hours * 60 + mins;
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.min(600, total);
}

function parseIngredientLine(line: string): ExtractedIngredient {
  const original = line.trim();
  const match = original.match(/^([\d./\s]+)\s*([a-zA-Z]+)?\s+(.+)$/);
  if (match) {
    const amount = parseFloat(match[1].replace(/\s+/g, "")) || 0;
    return {
      name: match[3].trim(),
      amount,
      unit: (match[2] || "").trim(),
      original,
    };
  }
  return { name: original, amount: 0, unit: "", original };
}

function collectJsonLdObjects(html: string): Record<string, unknown>[] {
  const objects: Record<string, unknown>[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") objects.push(item as Record<string, unknown>);
        }
      } else if (parsed && typeof parsed === "object") {
        objects.push(parsed as Record<string, unknown>);
      }
    } catch {
      /* skip malformed */
    }
  }
  return objects;
}

function findRecipeNode(objects: Record<string, unknown>[]): Record<string, unknown> | null {
  for (const obj of objects) {
    const type = obj["@type"];
    const types = Array.isArray(type) ? type : type ? [type] : [];
    if (types.some((t) => String(t).toLowerCase() === "recipe")) return obj;

    if (obj["@graph"] && Array.isArray(obj["@graph"])) {
      for (const g of obj["@graph"] as Record<string, unknown>[]) {
        const gt = g["@type"];
        const gtypes = Array.isArray(gt) ? gt : gt ? [gt] : [];
        if (gtypes.some((t) => String(t).toLowerCase() === "recipe")) return g;
      }
    }
  }
  return null;
}

function imageUrlFromRecipe(node: Record<string, unknown>): string {
  const img = node.image;
  if (typeof img === "string") return img;
  if (Array.isArray(img) && img.length > 0) {
    const first = img[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in first) return String((first as { url: string }).url);
  }
  if (img && typeof img === "object" && "url" in img) return String((img as { url: string }).url);
  return "";
}

export function extractRecipeFromHtml(html: string, pageUrl: string): ExtractedRecipe | null {
  const objects = collectJsonLdObjects(html);
  const recipe = findRecipeNode(objects);
  if (!recipe) return null;

  const title = String(recipe.name || recipe.headline || "").trim();
  if (!title || title.length < 3) return null;

  const rawIngredients = recipe.recipeIngredient || recipe.ingredients;
  const ingredients: ExtractedIngredient[] = [];
  if (Array.isArray(rawIngredients)) {
    for (const line of rawIngredients) {
      if (typeof line === "string" && line.trim()) {
        ingredients.push(parseIngredientLine(line));
      }
    }
  }

  const rawInstructions = recipe.recipeInstructions;
  const steps: ExtractedStep[] = [];
  if (Array.isArray(rawInstructions)) {
    rawInstructions.forEach((item, idx) => {
      if (typeof item === "string") {
        steps.push({ number: idx + 1, text: item.trim() });
      } else if (item && typeof item === "object") {
        const text = String(
          (item as { text?: string }).text ||
            (item as { name?: string }).name ||
            "",
        ).trim();
        if (text) steps.push({ number: idx + 1, text });
      }
    });
  } else if (typeof rawInstructions === "string" && rawInstructions.trim()) {
    rawInstructions
      .split(/\n+/)
      .filter(Boolean)
      .forEach((line, idx) => steps.push({ number: idx + 1, text: line.trim() }));
  }

  const prepMinutes = parseDurationMinutes(String(recipe.prepTime || ""));
  const cookMinutes = parseDurationMinutes(String(recipe.cookTime || ""));
  const totalMinutes =
    parseDurationMinutes(String(recipe.totalTime || "")) ||
    prepMinutes + cookMinutes ||
    35;

  let servings = 6;
  const yieldVal = recipe.recipeYield;
  if (typeof yieldVal === "number") servings = yieldVal;
  else if (typeof yieldVal === "string") {
    const n = parseInt(yieldVal.replace(/\D/g, ""), 10);
    if (n > 0) servings = Math.min(12, Math.max(4, n));
  }

  const publisher = getTrustedPublisher(pageUrl);
  const keywords: string[] = [];
  if (recipe.keywords) {
    if (typeof recipe.keywords === "string") {
      keywords.push(...recipe.keywords.split(",").map((k) => k.trim()));
    } else if (Array.isArray(recipe.keywords)) {
      keywords.push(...recipe.keywords.map(String));
    }
  }

  const cuisine = Array.isArray(recipe.recipeCuisine)
    ? String(recipe.recipeCuisine[0])
    : String(recipe.recipeCuisine || "");

  return {
    title,
    description: String(recipe.description || "").slice(0, 800) || undefined,
    heroImage: imageUrlFromRecipe(recipe),
    sourceUrl: pageUrl,
    publisherName: publisher?.name || new URL(pageUrl).hostname.replace(/^www\./i, ""),
    ingredients,
    steps,
    prepMinutes,
    cookMinutes,
    totalMinutes,
    servings,
    cuisine: cuisine || undefined,
    keywords,
  };
}
