/**
 * Low-level helpers for rewriting the static `index.html` shell with real,
 * per-route SEO tags before it leaves the server. Shared by
 * `recipe-html-injection.ts` (the original `/recipes/:slug` injector) and
 * `generic-page-injection.ts` (breakfast, smoothies, guides, landing pages,
 * product pages, families, and home JSON-LD).
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeJsonForScriptTag(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function replaceTag(html: string, pattern: RegExp, replacement: string): string {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

export interface SeoTagValues {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: "website" | "article";
  ogImage?: string;
  /** e.g. "@firehallmeals" — omitted if falsy. */
  twitterSite?: string;
}

/**
 * Rewrite title, meta description, canonical link, Open Graph tags, and
 * Twitter tags in `html`. No-ops any tag whose source pattern isn't found
 * (defensive — a shell edit shouldn't be able to silently break injection).
 */
export function applySeoTagsToHtml(html: string, values: SeoTagValues): string {
  const title = escapeHtml(values.title);
  const description = escapeHtml(values.description);
  const canonicalUrl = escapeHtml(values.canonicalUrl);

  let out = html;

  out = replaceTag(out, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);

  out = replaceTag(
    out,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${description}" />`,
  );

  out = replaceTag(
    out,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${canonicalUrl}" />`,
  );

  out = replaceTag(
    out,
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:type" content="${values.ogType}" />`,
  );

  out = replaceTag(
    out,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${title}" />`,
  );

  out = replaceTag(
    out,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${description}" />`,
  );

  out = replaceTag(
    out,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${canonicalUrl}" />`,
  );

  if (values.ogImage) {
    const ogImage = escapeHtml(values.ogImage);
    out = replaceTag(
      out,
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:image" content="${ogImage}" />`,
    );
    out = replaceTag(
      out,
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:image" content="${ogImage}" />`,
    );
  }

  out = replaceTag(
    out,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${title}" />`,
  );

  out = replaceTag(
    out,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${description}" />`,
  );

  if (values.twitterSite) {
    const twitterSite = escapeHtml(values.twitterSite);
    if (/<meta\s+name="twitter:site"/.test(out)) {
      out = replaceTag(
        out,
        /<meta\s+name="twitter:site"\s+content="[^"]*"\s*\/>/,
        `<meta name="twitter:site" content="${twitterSite}" />`,
      );
    } else if (out.includes('<meta name="twitter:card"')) {
      out = out.replace(
        /(<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/>)/,
        `$1\n    <meta name="twitter:site" content="${twitterSite}" />`,
      );
    }
  }

  return out;
}

/** Insert one or more JSON-LD `<script>` blocks just before `</head>`. */
export function injectJsonLdIntoHtml(html: string, jsonLd: unknown[]): string {
  if (!jsonLd.length || !html.includes("</head>")) return html;
  const jsonLdTag = `<script type="application/ld+json">${escapeJsonForScriptTag(jsonLd)}</script>\n  </head>`;
  return html.replace("</head>", jsonLdTag);
}

const EMPTY_ROOT_RE = /<div id="root"><\/div>/;

/**
 * Inject a plain-HTML content snapshot inside `<div id="root">` so non-JS
 * crawlers see real content instead of an empty shell. Safe no-op if the
 * expected empty-root marker isn't found (e.g. shell markup changed), and
 * safe at runtime because the client uses `createRoot().render()` (not
 * `hydrateRoot()`), which fully replaces this markup once JS executes.
 */
export function injectBodyContentIntoHtml(html: string, contentHtml: string): string {
  if (!contentHtml || !EMPTY_ROOT_RE.test(html)) return html;
  return html.replace(EMPTY_ROOT_RE, `<div id="root">${contentHtml}</div>`);
}

/**
 * Rewrite `html` for a genuine 404 (dead/removed recipe, guide, smoothie,
 * breakfast, package, or guide-topic link, or any other unrecognized public
 * URL). Every injector previously paired `status: 404` with the completely
 * untouched `index.html` shell — a crawler still saw the homepage's own
 * title, description, indexable `robots` meta, and (most misleadingly) its
 * canonical URL on a real 404 response, which can cause search engines to
 * fold a dead URL's signals into the homepage instead of dropping it. This
 * gives 404s their own real title/description, strips the canonical and
 * `og:url` (there's no real page here to canonicalize), and forces
 * `noindex, nofollow` so the 404 status is backed by 404-appropriate tags.
 */
export function applyNotFoundSeoToHtml(html: string): string {
  const title = "Page Not Found | Firehall Meals";
  const description = "That page doesn't exist or may have moved. Browse recipes, guides, and tools from the Firehall Meals homepage.";

  let out = html;
  out = replaceTag(out, /<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  out = replaceTag(
    out,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  );
  out = replaceTag(
    out,
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/>/,
    `<meta name="robots" content="noindex, nofollow" />`,
  );
  // No canonical/og:url on a 404 — there's no real page to point crawlers at.
  out = out.replace(/\s*<link\s+rel="canonical"\s+href="[^"]*"\s*\/>\n?/, "\n");
  out = out.replace(/\s*<meta\s+property="og:url"\s+content="[^"]*"\s*\/>\n?/, "\n");
  out = replaceTag(
    out,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
  );
  out = replaceTag(
    out,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
  );
  out = replaceTag(
    out,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
  );
  out = replaceTag(
    out,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  );
  return out;
}
