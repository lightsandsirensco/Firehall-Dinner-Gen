/**
 * Server-side ("prerendered") content snapshots for the SPA shell.
 *
 * Why this exists: the app has zero true SSR — `client/src/main.tsx` calls
 * `createRoot(root).render(<App />)`, so `<div id="root"></div>` is always
 * empty until JavaScript executes. Tag-level SEO (title/meta/canonical/
 * JSON-LD, see `apply-seo-tags.ts`) is already injected server-side, but any
 * crawler that doesn't execute JS — most non-Google bots, many link
 * unfurlers, and several of the AI crawlers this site's own `llms.txt`
 * courts — sees a real title/description but a completely blank page body.
 *
 * This module renders a plain-HTML "snapshot" of a recipe or guide article's
 * actual content (the same data used to build its JSON-LD) and that gets
 * injected directly inside `<div id="root">`. Because the client uses
 * `createRoot().render()` — not `hydrateRoot()` — React fully replaces this
 * markup the instant JS runs, so there is no hydration-mismatch risk; it's a
 * pure progressive-enhancement fallback for the pre-hydration window and for
 * non-JS clients.
 */

import type { GoldenRecipePage } from "../../shared/golden-100/recipe-page-schema.js";
import type { BreakfastRecipePage } from "../../shared/breakfast-schema.js";
import type { FuelRecipePage } from "../../shared/fuel-catalog/schema.js";
import type { EditorialArticle } from "../../shared/editorial/content-schema.js";
import type { ClientRecipeResponse } from "../../shared/schema.js";
import { absoluteImageUrl } from "../../shared/seo/urls.js";
import { escapeHtml } from "./apply-seo-tags.js";

const SNAPSHOT_STYLE = `
.fh-snap{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;max-width:720px;margin:0 auto;padding:20px 20px 96px;color:#f2ede6;background:#141414;line-height:1.65}
.fh-snap img{width:100%;height:auto;border-radius:14px;display:block;margin:0 0 20px;object-fit:cover;max-height:420px}
.fh-snap h1{font-size:1.7rem;line-height:1.25;margin:0 0 8px;color:#fff}
.fh-snap .fh-sub{color:#c9c2b8;margin:0 0 14px;font-size:1rem}
.fh-snap .fh-meta{display:flex;flex-wrap:wrap;gap:10px 18px;font-size:.85rem;color:#e0a95e;margin:0 0 18px;list-style:none;padding:0}
.fh-snap .fh-desc{color:#ddd6cc;margin:0 0 22px;font-size:.95rem}
.fh-snap h2{font-size:1.15rem;margin:30px 0 12px;color:#fff;border-bottom:1px solid #333;padding-bottom:8px}
.fh-snap ul,.fh-snap ol{padding-left:22px;margin:0 0 18px}
.fh-snap li{margin-bottom:9px;font-size:.95rem}
.fh-snap .fh-nutri{display:flex;gap:22px;flex-wrap:wrap;margin:0 0 22px}
.fh-snap .fh-nutri div{text-align:center;min-width:56px}
.fh-snap .fh-nutri strong{display:block;font-size:1.15rem;color:#fff}
.fh-snap .fh-nutri span{font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:#a39c91}
.fh-snap p{margin:0 0 14px;font-size:.95rem;color:#ddd6cc}
.fh-snap .fh-tip{color:#c9c2b8;font-size:.9rem;font-style:italic}
`.trim();

function styleTag(): string {
  return `<style>${SNAPSHOT_STYLE}</style>`;
}

function metaItems(items: Array<string | undefined | false>): string {
  const filtered = items.filter((i): i is string => Boolean(i));
  if (!filtered.length) return "";
  return `<ul class="fh-meta">${filtered.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
}

function nutritionBlock(n: { calories: number; protein: number; carbs: number; fat: number } | null): string {
  if (!n) return "";
  const cells = [
    { label: "Cal", value: n.calories },
    { label: "Protein", value: `${n.protein}g` },
    { label: "Carbs", value: `${n.carbs}g` },
    { label: "Fat", value: `${n.fat}g` },
  ];
  return `<div class="fh-nutri">${cells
    .map((c) => `<div><strong>${escapeHtml(String(c.value))}</strong><span>${escapeHtml(c.label)}</span></div>`)
    .join("")}</div>`;
}

export interface RecipeSnapshotIngredient {
  name: string;
  quantity?: string;
  unit?: string;
}

export interface RecipeSnapshotStep {
  stepNumber: number;
  title?: string;
  instruction: string;
}

export interface RecipeSnapshotData {
  title: string;
  subtitle?: string;
  description: string;
  heroImage?: string;
  heroImageAlt?: string;
  prepMinutes?: number;
  cookMinutes?: number;
  servingsLabel?: string;
  difficulty?: string;
  ingredients: RecipeSnapshotIngredient[];
  steps: RecipeSnapshotStep[];
  nutrition: { calories: number; protein: number; carbs: number; fat: number } | null;
}

/** Render a recipe's real content (ingredients, steps, nutrition) as plain HTML for `#root`. */
export function renderRecipeSnapshotHtml(origin: string, data: RecipeSnapshotData): string {
  const image = data.heroImage
    ? `<img src="${escapeHtml(absoluteImageUrl(origin, data.heroImage))}" alt="${escapeHtml(data.heroImageAlt || data.title)}" width="720" height="480" />`
    : "";

  const meta = metaItems([
    data.prepMinutes ? `Prep: ${data.prepMinutes} min` : undefined,
    data.cookMinutes ? `Cook: ${data.cookMinutes} min` : undefined,
    data.servingsLabel || undefined,
    data.difficulty ? `Difficulty: ${data.difficulty}` : undefined,
  ]);

  const ingredients = data.ingredients
    .map((ing) => {
      const qty = [ing.quantity, ing.unit].filter(Boolean).join(" ").trim();
      return `<li>${escapeHtml(qty ? `${qty} ${ing.name}` : ing.name)}</li>`;
    })
    .join("");

  const steps = data.steps
    .map((step) => {
      const heading = step.title && step.title.trim() ? `<strong>${escapeHtml(step.title)}: </strong>` : "";
      return `<li>${heading}${escapeHtml(step.instruction)}</li>`;
    })
    .join("");

  return [
    `<div class="fh-snap">`,
    styleTag(),
    image,
    `<h1>${escapeHtml(data.title)}</h1>`,
    data.subtitle ? `<p class="fh-sub">${escapeHtml(data.subtitle)}</p>` : "",
    meta,
    `<p class="fh-desc">${escapeHtml(data.description)}</p>`,
    nutritionBlock(data.nutrition),
    ingredients ? `<h2>Ingredients</h2><ul>${ingredients}</ul>` : "",
    steps ? `<h2>Instructions</h2><ol>${steps}</ol>` : "",
    `</div>`,
  ]
    .filter(Boolean)
    .join("");
}

export function goldenRecipeSnapshot(page: GoldenRecipePage): RecipeSnapshotData {
  return {
    title: page.displayTitle || page.title,
    subtitle: page.subtitle,
    description: page.description,
    heroImage: page.heroImage,
    heroImageAlt: page.heroImageAlt,
    prepMinutes: page.prepTime ?? Math.max(5, Math.round(page.cookTime * 0.25)),
    cookMinutes: page.cookTime,
    servingsLabel: `Serves ${page.crewSize}`,
    difficulty: page.difficulty,
    ingredients: page.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
    steps: page.steps.map((s) => ({ stepNumber: s.stepNumber, title: s.title, instruction: s.instruction })),
    nutrition: {
      calories: page.nutrition.calories,
      protein: page.nutrition.protein,
      carbs: page.nutrition.carbs,
      fat: page.nutrition.fats,
    },
  };
}

export function breakfastRecipeSnapshot(page: BreakfastRecipePage): RecipeSnapshotData {
  return {
    title: page.title,
    subtitle: page.subtitle,
    description: page.description,
    heroImage: page.heroImage,
    heroImageAlt: page.imageAlt,
    prepMinutes: page.prepTime,
    cookMinutes: page.cookTime,
    servingsLabel: `Serves ${page.crewSize}`,
    difficulty: page.difficulty,
    ingredients: page.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
    steps: page.steps.map((s) => ({ stepNumber: s.stepNumber, title: s.title, instruction: s.instruction })),
    nutrition: {
      calories: page.nutrition.calories,
      protein: page.nutrition.protein,
      carbs: page.nutrition.carbs,
      fat: page.nutrition.fat,
    },
  };
}

export function fuelRecipeSnapshot(page: FuelRecipePage): RecipeSnapshotData {
  return {
    title: page.title,
    subtitle: page.subtitle,
    description: page.description,
    heroImage: page.heroImage,
    ingredients: page.ingredients.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
    steps: page.steps.map((s) => ({ stepNumber: s.stepNumber, instruction: s.instruction })),
    nutrition: {
      calories: page.nutrition.calories,
      protein: page.nutrition.protein,
      carbs: page.nutrition.carbs,
      fat: page.nutrition.fats,
    },
  };
}

/** For `/package/:slug` curated crew packages (built from `ClientRecipeResponse`). */
export function clientRecipeSnapshot(
  recipe: ClientRecipeResponse,
  opts: { title: string; heroImage?: string; heroImageAlt?: string; description: string },
): RecipeSnapshotData {
  return {
    title: opts.title,
    description: opts.description,
    heroImage: opts.heroImage,
    heroImageAlt: opts.heroImageAlt,
    prepMinutes: recipe.timing?.prep_min,
    cookMinutes: recipe.timing?.cook_min,
    servingsLabel: `Serves ${recipe.servings}`,
    ingredients: recipe.ingredients.map((i) => ({ name: i.name, quantity: i.qty ? String(i.qty) : undefined, unit: i.unit })),
    steps: recipe.steps.map((s) => ({ stepNumber: s.n, title: s.title, instruction: s.instructions })),
    nutrition: recipe.macros_per_serving
      ? {
          calories: recipe.macros_per_serving.calories,
          protein: recipe.macros_per_serving.protein_g,
          carbs: recipe.macros_per_serving.carbs_g,
          fat: recipe.macros_per_serving.fat_g,
        }
      : null,
  };
}

export interface ArticleSnapshotData {
  title: string;
  subtitle?: string;
  description: string;
  heroImage?: string;
  heroImageAlt?: string;
  readMinutes?: number;
  intro: string;
  sections: Array<{ heading: string; paragraphs: string[]; tips?: string[] }>;
  practicalAdvice: string[];
  faqs: Array<{ question: string; answer: string }>;
}

/** Render a guide article's real body copy as plain HTML for `#root`. */
export function renderArticleSnapshotHtml(origin: string, data: ArticleSnapshotData): string {
  const image = data.heroImage
    ? `<img src="${escapeHtml(absoluteImageUrl(origin, data.heroImage))}" alt="${escapeHtml(data.heroImageAlt || data.title)}" width="720" height="480" />`
    : "";

  const meta = metaItems([data.readMinutes ? `${data.readMinutes} min read` : undefined]);

  const sections = data.sections
    .map((section) => {
      const paragraphs = section.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
      const tips = section.tips?.length
        ? `<ul>${section.tips.map((t) => `<li class="fh-tip">${escapeHtml(t)}</li>`).join("")}</ul>`
        : "";
      return `<h2>${escapeHtml(section.heading)}</h2>${paragraphs}${tips}`;
    })
    .join("");

  const advice = data.practicalAdvice.length
    ? `<h2>Practical advice</h2><ul>${data.practicalAdvice.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>`
    : "";

  const faqs = data.faqs.length
    ? `<h2>FAQ</h2>${data.faqs
        .map((f) => `<p><strong>${escapeHtml(f.question)}</strong></p><p>${escapeHtml(f.answer)}</p>`)
        .join("")}`
    : "";

  return [
    `<div class="fh-snap">`,
    styleTag(),
    image,
    `<h1>${escapeHtml(data.title)}</h1>`,
    data.subtitle ? `<p class="fh-sub">${escapeHtml(data.subtitle)}</p>` : "",
    meta,
    `<p class="fh-desc">${escapeHtml(data.description)}</p>`,
    `<p>${escapeHtml(data.intro)}</p>`,
    sections,
    advice,
    faqs,
    `</div>`,
  ]
    .filter(Boolean)
    .join("");
}

export function editorialArticleSnapshot(article: EditorialArticle): ArticleSnapshotData {
  return {
    title: article.title,
    subtitle: article.subtitle,
    description: article.description,
    heroImage: article.heroImage,
    heroImageAlt: article.heroImageAlt,
    readMinutes: article.readMinutes,
    intro: article.intro,
    sections: article.sections,
    practicalAdvice: article.practicalAdvice,
    faqs: article.faqs,
  };
}
