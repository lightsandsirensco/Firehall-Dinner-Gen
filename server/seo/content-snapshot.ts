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
import type { SeoLandingPageDef } from "../../shared/seo/landing-pages-data.js";
import type { ProductSeoPageDef } from "../../shared/seo/product-pages-data.js";
import { absoluteImageUrl, recipePath } from "../../shared/seo/urls.js";
import { escapeHtml } from "./apply-seo-tags.js";

/** "smoked-brisket" -> "Smoked Brisket" — used only as a crawlable link label
 * when a page links out to recipes by slug and no display title is loaded
 * synchronously (avoids a data-store dependency in this render path). */
export function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

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
.fh-snap .fh-linklist{list-style:none;padding:0;margin:0 0 22px;display:flex;flex-wrap:wrap;gap:10px}
.fh-snap .fh-linklist li{margin:0}
.fh-snap .fh-linklist a{display:inline-block;padding:8px 14px;border:1px solid #3a3a3a;border-radius:999px;color:#f2ede6;text-decoration:none;font-size:.85rem}
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

export interface IndexSnapshotLink {
  label: string;
  path: string;
}

export interface IndexSnapshotSection {
  heading?: string;
  links: IndexSnapshotLink[];
}

function renderLinkSections(sections: IndexSnapshotSection[]): string {
  return sections
    .filter((s) => s.links.length > 0)
    .map((section) => {
      const heading = section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : "";
      const links = `<ul class="fh-linklist">${section.links
        .map((l) => `<li><a href="${escapeHtml(l.path)}">${escapeHtml(l.label)}</a></li>`)
        .join("")}</ul>`;
      return `${heading}${links}`;
    })
    .join("");
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
  /** Optional crawlable link lists rendered after the FAQ block (e.g. linked
   * recipes, related pages) — used by SEO landing / product pages, which
   * have no `practicalAdvice` list of their own. */
  linkSections?: IndexSnapshotSection[];
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

  const linkSections = data.linkSections?.length ? renderLinkSections(data.linkSections) : "";

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
    linkSections,
    `</div>`,
  ]
    .filter(Boolean)
    .join("");
}

export interface IndexSnapshotData {
  h1: string;
  intro: string;
  sections: IndexSnapshotSection[];
}

/**
 * Render a plain-HTML snapshot for index/category/marketing pages (home,
 * Explore, breakfast/smoothies/pizza/guides indexes, SEO landing pages,
 * etc.) — an H1, an intro paragraph, and crawlable links to real content.
 * Without this, non-JS crawlers hitting these routes see correct <head>
 * metadata but a completely empty `<div id="root">` and no H1 — real gap
 * confirmed against raw production HTML (no JS execution).
 */
export function renderIndexSnapshotHtml(data: IndexSnapshotData): string {
  return [
    `<div class="fh-snap">`,
    styleTag(),
    `<h1>${escapeHtml(data.h1)}</h1>`,
    `<p class="fh-desc">${escapeHtml(data.intro)}</p>`,
    renderLinkSections(data.sections),
    `</div>`,
  ]
    .filter(Boolean)
    .join("");
}

/** Strip the trailing " | Firehall Meals" (or similar) brand suffix from a <title> for use as a plain H1. */
export function h1FromSeoTitle(title: string): string {
  return title.replace(/\s*\|\s*Firehall Meals\s*$/i, "").trim() || title.trim();
}

/**
 * Last-resort fallback so no route in the generic-page injector can ever
 * ship an empty `<div id="root">` — every indexable page gets at least an
 * H1, its real meta description as visible body copy, and links back into
 * real crawlable content (recipe/guide detail pages already carry full
 * content snapshots of their own).
 */
export function fallbackIndexSnapshot(title: string, description: string): IndexSnapshotData {
  return {
    h1: h1FromSeoTitle(title),
    intro: description,
    sections: [
      {
        links: [
          { label: "Browse all recipes", path: "/explore" },
          { label: "Find tonight's meal", path: "/generator" },
          { label: "Firefighter meal guides", path: "/guides" },
        ],
      },
    ],
  };
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

/**
 * SEO landing pages (e.g. `/firefighter-bbq-recipes`) previously shipped
 * only the generic `fallbackIndexSnapshot` to non-JS clients — real title/
 * meta but none of their actual `sections`/FAQs/linked recipes, even though
 * that content exists and renders fine client-side. This gives crawlers the
 * real body copy, matching what `/guides/:slug` and recipe pages already do.
 */
export function seoLandingPageSnapshot(page: SeoLandingPageDef): ArticleSnapshotData {
  return {
    title: page.h1,
    description: page.description,
    intro: page.intro,
    sections: page.sections,
    practicalAdvice: [],
    faqs: page.faqs,
    linkSections: [
      {
        heading: "Recipes in this collection",
        links: page.recipeSlugs.map((slug) => ({
          label: titleCaseFromSlug(slug),
          path: recipePath(slug),
        })),
      },
      {
        heading: "Related topics",
        links: page.relatedPages.map((rel) => ({
          label: rel.label,
          path: `/${rel.slug}`,
        })),
      },
    ],
  };
}

/**
 * Product SEO pages (e.g. `/classics-wheel`, `/hall-meal-planner`) had the
 * same gap as landing pages — their real problem/workaround/solution copy
 * and FAQs were never server-rendered for non-JS clients.
 */
export function productSeoPageSnapshot(page: ProductSeoPageDef): ArticleSnapshotData {
  return {
    title: page.h1,
    description: page.description,
    intro: page.intro,
    sections: [page.problem, page.currentWorkaround, page.solution],
    practicalAdvice: [],
    faqs: page.faqs,
    linkSections: [
      {
        heading: "Recipes",
        links: page.recipeSlugs.map((slug) => ({
          label: titleCaseFromSlug(slug),
          path: recipePath(slug),
        })),
      },
      {
        heading: "Guides",
        links: page.guideSlugs.map((g) => ({ label: g.label, path: `/guides/${g.slug}` })),
      },
    ],
  };
}
