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
import type { EditorialMealPick } from "../../shared/editorial/content-schema.js";
import { absoluteImageUrl } from "../../shared/seo/urls.js";
import { approvedCatalogRecipePath } from "../../shared/approved-catalog.js";
import { getGuideLandingLink } from "../../shared/seo/guide-authority-links.js";
import { dedupeAgainstShownCopy } from "../../shared/text/dedupe-lead-sentence.js";
import { goldenRecipeLeadParagraph } from "../../shared/golden-100/lead-paragraph.js";
import { escapeHtml } from "./apply-seo-tags.js";
import { resolveKnownRecipeTitle } from "./recipe-title-lookup.js";

/** "smoked-brisket" -> "Smoked Brisket" — last-resort anchor text for a
 * recipe slug that isn't in any known catalog (see `recipeLinkLabel` below,
 * which is what every snapshot builder should actually call). */
export function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Real catalog title for `slug` when known, else a title-cased guess from
 * the slug itself. Every snapshot builder below that links to a recipe by
 * bare slug (no display title loaded synchronously) should use this instead
 * of calling `titleCaseFromSlug` directly, so crawlable related-recipe
 * anchor text matches the recipe's actual title rather than a slug-derived
 * approximation. */
export function recipeLinkLabel(slug: string): string {
  return resolveKnownRecipeTitle(slug) ?? titleCaseFromSlug(slug);
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
  /** "Why crews like it" — already deduped against the subtitle/lead
   * paragraph exactly like the client (`dedupeAgainstShownCopy`), so it's
   * never a verbatim repeat of copy already shown just above it. */
  whyCrewsLikeIt?: string;
  /** Crew-specific guidance beyond the generic recipe core (why-it-works,
   * hall tips, holding/leftover/meal-prep notes, substitutions, equipment)
   * — see `RecipeGuidanceSection`. Rendered after the steps. */
  guidanceSections?: RecipeGuidanceSection[];
  /** Crawlable links to genuinely related recipes (same category/protein/
   * meal type) — see each collection's `*RecipeSnapshot` builder below. */
  relatedLinks?: IndexSnapshotLink[];
  /** Additional headed link sections rendered after `relatedLinks` — for a
   * recipe with more than one genuinely distinct crawlable link group (e.g.
   * "/firefighter-red-lead-recipe"'s breakfast-side links vs. dinner-classic
   * links), where a single flat "Related recipes" list would blur two
   * different real groupings the client itself shows separately. */
  linkSections?: IndexSnapshotSection[];
  /** Only for a recipe route whose SSR JSON-LD also includes a FAQPage
   * entity (e.g. `/firefighter-red-lead-recipe`) — rendered so the visible
   * snapshot always matches what that schema claims, instead of a crawler
   * seeing FAQPage structured data with no corresponding visible Q&A. */
  faqs?: Array<{ question: string; answer: string }>;
}

/**
 * A server-renderable block of "beyond the generic recipe core" content —
 * the crew-specific guidance (why crews like it, hall tips, holding/leftover/
 * meal-prep notes, substitutions, equipment) that already exists in canonical
 * recipe data and is already shown to users client-side, but never reached
 * the pre-hydration HTML (see Phase 4 SEO audit). Every section here maps
 * 1:1 to a field + heading the recipe's own client page already renders —
 * see `goldenRecipeSnapshot`/`breakfastRecipeSnapshot`/`fuelRecipeSnapshot`
 * below for the exact field -> heading mapping per recipe family. Sections
 * are only ever pushed when the underlying field is genuinely non-empty, so
 * no recipe is ever forced into a section it doesn't have real content for.
 */
export interface RecipeGuidanceSection {
  /**
   * Omit when the client shows this content with no visible section
   * label/heading of its own (e.g. golden-shaped recipes' `equipment`,
   * rendered client-side as unlabeled pills) — the point of this field is
   * server/client parity, so we never invent a heading the client doesn't
   * actually show. The content itself still renders (as a plain list), just
   * without a synthesized `<h2>`.
   */
  heading?: string;
  kind: "list" | "paragraph";
  items: string[];
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

  const relatedSection: IndexSnapshotSection[] = data.relatedLinks?.length
    ? [{ heading: "Related recipes", links: data.relatedLinks }]
    : [];
  const extraLinkSections = data.linkSections ?? [];

  const guidanceHtml = (data.guidanceSections ?? [])
    .filter((section) => section.items.length > 0)
    .map((section) => {
      const heading = section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : "";
      const body =
        section.kind === "paragraph"
          ? section.items.map((p) => `<p>${escapeHtml(p)}</p>`).join("")
          : `<ul>${section.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
      return `${heading}${body}`;
    })
    .join("");

  const faqs = data.faqs?.length
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
    data.whyCrewsLikeIt
      ? `<p class="fh-desc"><strong>Why crews like it: </strong>${escapeHtml(data.whyCrewsLikeIt)}</p>`
      : "",
    nutritionBlock(data.nutrition),
    ingredients ? `<h2>Ingredients</h2><ul>${ingredients}</ul>` : "",
    steps ? `<h2>Instructions</h2><ol>${steps}</ol>` : "",
    guidanceHtml,
    faqs,
    renderLinkSections([...relatedSection, ...extraLinkSections, siteHubSection()]),
    `</div>`,
  ]
    .filter(Boolean)
    .join("");
}

/**
 * Golden-100-shaped families (Golden 100, Hall Expansion, Performance,
 * BBQ, Pizza Night all build to this same `GoldenRecipePage` shape — see
 * `shared/golden-100/recipe-page-schema.ts`). Every guidance section below
 * mirrors a field + heading `client/src/pages/golden-recipe-page.tsx`
 * already renders post-hydration ("Tonight's spread" / "Hall tips" /
 * "Substitutions" / "Meal prep" / "Leftovers"). `equipment` is included too,
 * but deliberately *without* a heading: the client shows it as unlabeled
 * pills with no section label of its own, so a synthesized `<h2>Equipment</h2>`
 * here would be crawler-only content the client never actually presents.
 * Sections are only pushed when the field is genuinely non-empty.
 */
export function goldenRecipeSnapshot(page: GoldenRecipePage): RecipeSnapshotData {
  // Shared with the client's `leadParagraph` (see `golden-recipe-page.tsx`
  // and `shared/golden-100/lead-paragraph.ts`) so the two can never drift.
  const leadParagraph = goldenRecipeLeadParagraph(page);

  // `whyCrewsLikeIt` frequently restates the subtitle/lead as a leading
  // phrase — same dedupe the client applies, so the snapshot never repeats
  // the sentence shown just above it in `<p class="fh-desc">`.
  const whyCrewsLikeIt = dedupeAgainstShownCopy(page.whyCrewsLikeIt, page.subtitle, leadParagraph);

  const guidanceSections: RecipeGuidanceSection[] = [];
  if (page.tonightSpread.length) {
    guidanceSections.push({ heading: "Tonight's spread", kind: "list", items: page.tonightSpread });
  }
  if (page.proTips.length) {
    guidanceSections.push({ heading: "Hall tips", kind: "list", items: page.proTips });
  }
  if (page.substitutions?.length) {
    guidanceSections.push({ heading: "Substitutions", kind: "list", items: page.substitutions });
  }
  if (page.mealPrepNotes?.trim()) {
    guidanceSections.push({ heading: "Meal prep", kind: "paragraph", items: [page.mealPrepNotes.trim()] });
  }
  if (page.leftovers.length) {
    guidanceSections.push({ heading: "Leftovers", kind: "list", items: page.leftovers });
  }
  if (page.equipment.length) {
    // No `heading` — see doc comment above.
    guidanceSections.push({ kind: "list", items: page.equipment });
  }

  return {
    title: page.displayTitle || page.title,
    subtitle: page.subtitle,
    description: leadParagraph,
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
    whyCrewsLikeIt,
    guidanceSections,
    // `relatedSlugs` is already curated per-recipe (see `link-recipe-families`
    // / editorial QA tooling) but was never rendered as an actual crawlable
    // link — every /recipes/:slug page was a dead-end leaf in the raw-HTML
    // link graph. `approvedCatalogRecipePath` correctly routes cross-catalog
    // slugs (breakfast/smoothie/etc.) so this never produces a broken link.
    relatedLinks: (page.relatedSlugs ?? []).map((slug) => ({
      label: recipeLinkLabel(slug),
      path: approvedCatalogRecipePath(slug),
    })),
  };
}

/**
 * Breakfast + Breakfast Performance (`BreakfastRecipePage` —
 * `shared/breakfast-schema.ts`). Headings mirror
 * `client/src/pages/breakfast-recipe-page.tsx` exactly ("Equipment" /
 * "Morning spread" / "Station workflow" / "Cleanup" / "Leftovers").
 */
export function breakfastRecipeSnapshot(
  page: BreakfastRecipePage,
  relatedLinks: IndexSnapshotLink[] = [],
): RecipeSnapshotData {
  const guidanceSections: RecipeGuidanceSection[] = [];
  if (page.equipment?.length) {
    guidanceSections.push({ heading: "Equipment", kind: "list", items: page.equipment });
  }
  if (page.tonightSpread?.length) {
    guidanceSections.push({ heading: "Morning spread", kind: "list", items: page.tonightSpread });
  }
  if (page.stationWorkflow.length) {
    guidanceSections.push({ heading: "Station workflow", kind: "list", items: page.stationWorkflow });
  }
  if (page.cleanupNotes.length) {
    guidanceSections.push({ heading: "Cleanup", kind: "list", items: page.cleanupNotes });
  }
  if (page.leftovers.length) {
    guidanceSections.push({ heading: "Leftovers", kind: "list", items: page.leftovers });
  }

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
    guidanceSections,
    relatedLinks,
  };
}

/** Every current smoothie's `nutrition.highlights` is the literal placeholder
 * string "Nutrition estimate coming soon" (verified against all 10 on-disk
 * pages — not recipe-specific content, just an unshipped-feature placeholder)
 * — so it's deliberately excluded from SSR (and from this list of real
 * guidance) rather than rendered as if it were genuine nutrition commentary.
 * If a future recipe ships a real, non-placeholder highlight, it can be
 * added back in without any other change here. */
const SMOOTHIE_NUTRITION_HIGHLIGHTS_PLACEHOLDER = /^nutrition estimate coming soon$/i;

/**
 * Smoothies (`FuelRecipePage` — `shared/fuel-catalog/schema.ts`). Headings
 * mirror `client/src/pages/smoothie-recipe-page.tsx` ("Substitutions" /
 * "On shift").
 */
export function fuelRecipeSnapshot(page: FuelRecipePage): RecipeSnapshotData {
  const guidanceSections: RecipeGuidanceSection[] = [];
  if (page.substitutions?.length) {
    guidanceSections.push({ heading: "Substitutions", kind: "list", items: page.substitutions });
  }
  const highlights = page.nutrition.highlights?.trim();
  if (highlights && !SMOOTHIE_NUTRITION_HIGHLIGHTS_PLACEHOLDER.test(highlights)) {
    guidanceSections.push({ heading: "Nutrition notes", kind: "paragraph", items: [highlights] });
  }
  if (page.shiftNote?.trim()) {
    guidanceSections.push({ heading: "On shift", kind: "paragraph", items: [page.shiftNote.trim()] });
  }

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
    guidanceSections,
    relatedLinks: (page.relatedSlugs ?? []).map((slug) => ({
      label: recipeLinkLabel(slug),
      path: approvedCatalogRecipePath(slug),
    })),
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

/**
 * Every snapshot (recipe, article, or index/category page) — regardless of
 * how thin or rich its own page-specific content is — ends with this same
 * small set of crawlable links to the site's primary collection hubs.
 *
 * Without this, a raw (non-JS) crawl of the site is a graph of disconnected
 * islands: each recipe/guide snapshot only ever contained its own content
 * with zero outbound `<a href>`s, and each collection hub only linked a
 * truncated sample of its own catalog — so most of the catalog was only
 * ever reachable via `sitemap.xml`, never via an actual crawlable link path
 * from the homepage (confirmed against raw production HTML). This section
 * guarantees every indexable page is at most 1–2 hub hops from any other.
 */
const SITE_HUB_LINKS: IndexSnapshotLink[] = [
  { label: "Explore all recipes", path: "/explore" },
  { label: "Breakfast recipes", path: "/breakfast" },
  { label: "Smoothies", path: "/smoothies" },
  { label: "Pizza Night", path: "/pizza" },
  { label: "Guides", path: "/guides" },
  { label: "Classics Wheel", path: "/wheel" },
];

function siteHubSection(): IndexSnapshotSection {
  return { heading: "Browse more", links: SITE_HUB_LINKS };
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
  /** Categorized recipe grids rendered right after `sections` — e.g.
   * "Popular Firefighter Meals" / "Quick Firehouse Meals" on the
   * `/firefighter-meals` hub. Rendered as heading + intro + crawlable
   * `<a href>` list, with an optional "view all" link to a bigger collection. */
  recipeGridSections?: Array<{ heading: string; intro?: string; links: IndexSnapshotLink[]; viewAll?: IndexSnapshotLink }>;
  /** Editorial section(s) rendered after `recipeGridSections`, before the
   * Generator CTA — e.g. "Cooking for a Firehouse Crew". */
  secondarySections?: Array<{ heading: string; paragraphs: string[] }>;
  /** Optional "Find Tonight's Meal" callout rendered before the FAQ block. */
  generatorCta?: { heading: string; body: string; ctaLabel: string; ctaPath: string };
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

  const recipeGridSections = (data.recipeGridSections ?? [])
    .filter((s) => s.links.length > 0)
    .map((s) => {
      const intro = s.intro ? `<p>${escapeHtml(s.intro)}</p>` : "";
      const links = `<ul class="fh-linklist">${s.links
        .map((l) => `<li><a href="${escapeHtml(l.path)}">${escapeHtml(l.label)}</a></li>`)
        .join("")}</ul>`;
      const viewAll = s.viewAll
        ? `<p><a href="${escapeHtml(s.viewAll.path)}">${escapeHtml(s.viewAll.label)}</a></p>`
        : "";
      return `<h2>${escapeHtml(s.heading)}</h2>${intro}${links}${viewAll}`;
    })
    .join("");

  const secondarySections = (data.secondarySections ?? [])
    .map((section) => {
      const paragraphs = section.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
      return `<h2>${escapeHtml(section.heading)}</h2>${paragraphs}`;
    })
    .join("");

  const generatorCta = data.generatorCta
    ? `<h2>${escapeHtml(data.generatorCta.heading)}</h2><p>${escapeHtml(data.generatorCta.body)}</p><p><a href="${escapeHtml(data.generatorCta.ctaPath)}">${escapeHtml(data.generatorCta.ctaLabel)}</a></p>`
    : "";

  const advice = data.practicalAdvice.length
    ? `<h2>Practical advice</h2><ul>${data.practicalAdvice.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>`
    : "";

  const faqs = data.faqs.length
    ? `<h2>FAQ</h2>${data.faqs
        .map((f) => `<p><strong>${escapeHtml(f.question)}</strong></p><p>${escapeHtml(f.answer)}</p>`)
        .join("")}`
    : "";

  const linkSections = renderLinkSections([...(data.linkSections ?? []), siteHubSection()]);

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
    recipeGridSections,
    secondarySections,
    generatorCta,
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
    renderLinkSections([...data.sections, siteHubSection()]),
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

/** Guide `mealRecommendations` are already real, curated links to catalog
 * recipes (the client renders them with the exact same
 * `approvedCatalogRecipePath` call — see `GuideMealPicks`) but were never
 * part of the raw-HTML snapshot, so every guide was a dead-end leaf too.
 * `knownRecipeSlugs` guards against ever emitting a link to a stale/renamed
 * recipe slug (Phase 3 fixed every guide's `mealRecommendations` to point
 * at a real, current catalog slug — see `review/` Phase 3 report — but this
 * filter stays as a permanent safety net against future content edits). */
function mealRecommendationLinks(
  picks: EditorialMealPick[],
  knownRecipeSlugs: Set<string>,
): IndexSnapshotLink[] {
  return picks
    .filter((m) => knownRecipeSlugs.has(m.slug.trim().toLowerCase()))
    .map((m) => ({ label: m.title, path: approvedCatalogRecipePath(m.slug) }));
}

export function editorialArticleSnapshot(
  article: EditorialArticle,
  knownRecipeSlugs: Set<string> = new Set(),
): ArticleSnapshotData {
  // Phase 3 "GUIDE → LANDING PAGE LINKS" — one deliberate, contextual hub
  // link per guide (see `shared/seo/guide-authority-links.ts`); guides with
  // no genuinely-fitting destination get no extra section.
  const landingLink = getGuideLandingLink(article.slug);
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
    linkSections: [
      {
        heading: "Recipes in this guide",
        links: mealRecommendationLinks(article.mealRecommendations ?? [], knownRecipeSlugs),
      },
      ...(landingLink
        ? [
            {
              heading: "Related collection",
              links: [{ label: landingLink.label.replace(/^our /, ""), path: landingLink.href }],
            },
          ]
        : []),
    ],
  };
}

/**
 * SEO landing pages (e.g. `/firefighter-bbq-recipes`) previously shipped
 * only the generic `fallbackIndexSnapshot` to non-JS clients — real title/
 * meta but none of their actual `sections`/FAQs/linked recipes, even though
 * that content exists and renders fine client-side. This gives crawlers the
 * real body copy, matching what `/guides/:slug` and recipe pages already do.
 */
export function seoLandingPageSnapshot(
  page: SeoLandingPageDef,
  knownRecipeSlugs: Set<string> = new Set(),
): ArticleSnapshotData {
  // A few `recipeSlugs` entries across landing pages reference stale/renamed
  // recipes that no longer exist (confirmed via `audit-crawlability`, which
  // surfaces any such 404 as a "broken internal link") — filter them out so
  // this fix never ships a new broken link. `approvedCatalogRecipePath`
  // (not the naive `recipePath`) so a breakfast/smoothie slug here still
  // resolves to its real route instead of a 404 at `/recipes/:slug`.
  const validSlugs = page.recipeSlugs.filter((slug) => knownRecipeSlugs.has(slug));

  // Categorized recipe grids (e.g. Popular / Quick / High-Protein / Healthy /
  // Classics / Breakfast on `/firefighter-meals`) take priority over the flat
  // "Recipes in this collection" list below — same `knownRecipeSlugs` guard
  // against stale/renamed slugs, applied per-section so one bad slug in one
  // section can't wipe out the rest of that section's real links.
  const recipeGridSections = (page.recipeSections ?? []).map((section) => ({
    heading: section.heading,
    intro: section.intro,
    links: section.recipeSlugs
      .filter((slug) => knownRecipeSlugs.has(slug))
      .map((slug) => ({ label: recipeLinkLabel(slug), path: approvedCatalogRecipePath(slug) })),
    viewAll: section.viewAllPath
      ? { label: section.viewAllLabel ?? "View all", path: section.viewAllPath }
      : undefined,
  }));

  return {
    title: page.h1,
    description: page.description,
    intro: page.intro,
    sections: page.sections,
    recipeGridSections: recipeGridSections.length > 0 ? recipeGridSections : undefined,
    secondarySections: page.secondarySections,
    generatorCta: page.generatorCta,
    practicalAdvice: [],
    faqs: page.faqs,
    linkSections: [
      // Only render the flat "Recipes in this collection" grid when the page
      // has no categorized `recipeSections` of its own (avoids showing every
      // recipe twice on pages like `/firefighter-meals`).
      ...(recipeGridSections.length > 0
        ? []
        : [
            {
              heading: "Recipes in this collection",
              links: validSlugs.map((slug) => ({
                label: recipeLinkLabel(slug),
                path: approvedCatalogRecipePath(slug),
              })),
            },
          ]),
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
export function productSeoPageSnapshot(
  page: ProductSeoPageDef,
  knownRecipeSlugs: Set<string> = new Set(),
): ArticleSnapshotData {
  const validSlugs = page.recipeSlugs.filter((slug) => knownRecipeSlugs.has(slug));
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
        links: validSlugs.map((slug) => ({
          label: recipeLinkLabel(slug),
          path: approvedCatalogRecipePath(slug),
        })),
      },
      {
        heading: "Guides",
        links: page.guideSlugs.map((g) => ({ label: g.label, path: `/guides/${g.slug}` })),
      },
    ],
  };
}
