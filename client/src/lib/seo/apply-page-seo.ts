import type { PageSeoConfig } from "@shared/seo/metadata";
import { defaultOgImage } from "@shared/seo/metadata";
import { absoluteImageUrl, absoluteUrl } from "@shared/seo/urls";
import { SEO_SITE_NAME, SEO_TWITTER_HANDLE } from "@shared/seo/constants";
import { getSiteOrigin } from "./site-origin";

const SEO_JSON_LD_ATTR = "data-seo-jsonld";
const SEO_MANAGED_ATTR = "data-seo-managed";

function upsertMeta(
  attr: "name" | "property",
  key: string,
  content: string,
  managed = true,
): void {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  if (managed) el.setAttribute(SEO_MANAGED_ATTR, "true");
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string): void {
  const selector = `link[rel="${rel}"]`;
  let el = document.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute(SEO_MANAGED_ATTR, "true");
  el.setAttribute("href", href);
}

function clearManagedSeo(): void {
  document.querySelectorAll(`[${SEO_MANAGED_ATTR}="true"]`).forEach((el) => el.remove());
  document.querySelectorAll(`script[${SEO_JSON_LD_ATTR}]`).forEach((el) => el.remove());
}

function injectJsonLd(blocks: unknown[]): void {
  for (const data of blocks) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute(SEO_JSON_LD_ATTR, "true");
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
}

export function applyPageSeo(config: PageSeoConfig, jsonLd?: unknown | unknown[]): void {
  const origin = getSiteOrigin();
  const canonical = absoluteUrl(origin, config.canonicalPath);
  const ogImage = config.ogImage
    ? config.ogImage.startsWith("http")
      ? config.ogImage
      : absoluteImageUrl(origin, config.ogImage)
    : defaultOgImage(origin);

  document.title = config.title;

  upsertMeta("name", "description", config.description);
  if (config.keywords?.length) {
    upsertMeta("name", "keywords", config.keywords.join(", "));
  }
  if (config.robots) {
    upsertMeta("name", "robots", config.robots);
  }

  upsertLink("canonical", canonical);

  upsertMeta("property", "og:site_name", SEO_SITE_NAME);
  upsertMeta("property", "og:title", config.title);
  upsertMeta("property", "og:description", config.description);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:type", config.ogType ?? "website");
  upsertMeta("property", "og:image", ogImage);
  upsertMeta("property", "og:locale", "en_US");

  const card = config.twitterCard ?? "summary_large_image";
  upsertMeta("name", "twitter:card", card);
  upsertMeta("name", "twitter:title", config.title);
  upsertMeta("name", "twitter:description", config.description);
  upsertMeta("name", "twitter:image", ogImage);
  if (SEO_TWITTER_HANDLE) {
    upsertMeta("name", "twitter:site", SEO_TWITTER_HANDLE);
  }
}

export function applyPageSeoWithSchema(
  config: PageSeoConfig,
  jsonLd?: unknown | unknown[],
): () => void {
  clearManagedSeo();
  applyPageSeo(config, jsonLd);

  if (jsonLd) {
    const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    injectJsonLd(blocks);
  }

  return () => {
    clearManagedSeo();
  };
}
