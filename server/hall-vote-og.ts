import fs from "fs";
import path from "path";
import {
  SEO_CANONICAL_ORIGIN,
  SEO_DEFAULT_OG_IMAGE_PATH,
  SEO_SITE_NAME,
} from "@shared/seo/constants";
import { getHallVoteOgMeta } from "./hall-vote-store";

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function replaceMeta(html: string, name: string, content: string, property = false): string {
  const attr = property ? "property" : "name";
  const pattern = new RegExp(`<meta\\s+${attr}="${name}"[^>]*>`, "i");
  const tag = `<meta ${attr}="${name}" content="${escapeHtmlAttr(content)}" />`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace("</head>", `  ${tag}\n  </head>`);
}

function replaceTitle(html: string, title: string): string {
  return html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtmlAttr(title)}</title>`);
}

function replaceCanonical(html: string, url: string): string {
  const pattern = /<link\s+rel="canonical"[^>]*>/i;
  const tag = `<link rel="canonical" href="${escapeHtmlAttr(url)}" />`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace("</head>", `  ${tag}\n  </head>`);
}

export function buildHallVoteOgHtml(indexHtml: string, voteId: string): string | null {
  const meta = getHallVoteOgMeta(voteId);
  if (!meta) return null;

  const pageUrl = `${SEO_CANONICAL_ORIGIN}/vote/${voteId}`;
  const ogImage = meta.image.startsWith("http")
    ? meta.image
    : `${SEO_CANONICAL_ORIGIN}${meta.image.startsWith("/") ? meta.image : SEO_DEFAULT_OG_IMAGE_PATH}`;

  let html = indexHtml;
  html = replaceTitle(html, meta.title);
  html = replaceMeta(html, "description", meta.description);
  html = replaceCanonical(html, pageUrl);
  html = replaceMeta(html, "og:title", meta.title, true);
  html = replaceMeta(html, "og:description", meta.description, true);
  html = replaceMeta(html, "og:url", pageUrl, true);
  html = replaceMeta(html, "og:image", ogImage, true);
  html = replaceMeta(html, "og:type", "website", true);
  html = replaceMeta(html, "twitter:title", meta.title);
  html = replaceMeta(html, "twitter:description", meta.description);
  html = replaceMeta(html, "twitter:image", ogImage);
  return html;
}

let cachedIndexHtml: string | null = null;

export function loadIndexHtmlForOg(): string {
  if (cachedIndexHtml) return cachedIndexHtml;
  const distPath = path.resolve(__dirname, "public", "index.html");
  const devPath = path.resolve(process.cwd(), "client", "index.html");
  const filePath = fs.existsSync(distPath) ? distPath : devPath;
  cachedIndexHtml = fs.readFileSync(filePath, "utf8");
  return cachedIndexHtml;
}

export function registerHallVoteOgRoute(app: import("express").Express): void {
  app.get("/vote/:voteId", (req, res, next) => {
    try {
      const voteId = String(req.params.voteId || "").trim();
      if (!voteId) return next();

      const indexHtml = loadIndexHtmlForOg();
      const html = buildHallVoteOgHtml(indexHtml, voteId);
      if (!html) return next();

      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    } catch {
      return next();
    }
  });
}

export function resolveHallVoteShareOrigin(req: import("express").Request): string {
  const envOrigin = process.env.PUBLIC_ORIGIN || process.env.SEO_CANONICAL_ORIGIN;
  if (envOrigin) return envOrigin.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return SEO_CANONICAL_ORIGIN;
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers.host || "localhost:5000";
  return `${protocol}://${host}`;
}

export { SEO_SITE_NAME };
