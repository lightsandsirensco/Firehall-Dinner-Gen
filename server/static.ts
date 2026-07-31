import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { matchRecipeSlug, injectRecipeSeoIntoHtml } from "./seo/recipe-html-injection.js";
import { injectGenericPageSeoIntoHtml } from "./seo/generic-page-injection.js";
import { matchPackageSlug, injectPackageSeoIntoHtml } from "./seo/package-html-injection.js";
import { resolvePublicSiteOrigin } from "./seo/sitemap.js";

/** Vite emits hashed filenames — safe for long-term CDN/browser cache */
function isImmutableBuildAsset(filePath: string): boolean {
  return /-[a-zA-Z0-9_-]{8,}\.(js|css|mjs|woff2?|png|jpg|jpeg|webp|svg|ico)$/i.test(filePath);
}

function setStaticCacheHeaders(res: Response, filePath: string, kind: "build" | "images"): void {
  if (kind === "build" && isImmutableBuildAsset(filePath)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }
  if (kind === "images" && /\/images\/explore\//i.test(filePath)) {
    res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
    return;
  }
  if (kind === "images") {
    res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=3600");
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const clientPublic = path.resolve(process.cwd(), "client", "public");
  if (fs.existsSync(clientPublic)) {
    app.use(
      "/images",
      express.static(path.join(clientPublic, "images"), {
        index: false,
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => setStaticCacheHeaders(res, filePath, "images"),
      }),
    );
  }

  app.use(
    express.static(distPath, {
      index: false,
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => setStaticCacheHeaders(res, filePath, "build"),
    }),
  );

  const indexHtmlPath = path.resolve(distPath, "index.html");

  app.use("/{*path}", (req: Request, res: Response) => {
    // Inside an `app.use("/{*path}", …)` mount the wildcard consumes the
    // whole path, so `req.path`/`req.url` get rebased to "/" — use
    // `req.originalUrl` (unaffected by mount-point rebasing) instead.
    const fullPath = req.originalUrl.split("?")[0] || "/";
    const p = fullPath.toLowerCase();
    if (p === "/sitemap.xml" || p === "/robots.txt" || p === "/llms.txt") {
      return res.status(404).type("text/plain").send("Not found — configure SEO routes before static fallback.");
    }
    if (/\.(jpg|jpeg|png|webp|gif|svg|ico|woff2?|css|js|map|xml|json)$/i.test(p)) {
      if (p.endsWith(".json")) {
        return res.status(404).json({ message: "Catalog asset not found", path: fullPath });
      }
      return res.status(404).end();
    }
    res.setHeader("Cache-Control", "no-cache");

    const recipeSlug = matchRecipeSlug(fullPath);
    const packageSlug = matchPackageSlug(fullPath);
    try {
      const template = fs.readFileSync(indexHtmlPath, "utf-8");
      const origin = resolvePublicSiteOrigin(req.get("host"), req.get("x-forwarded-proto") ?? undefined);
      const result = recipeSlug
        ? injectRecipeSeoIntoHtml(template, origin, recipeSlug)
        : packageSlug
          ? injectPackageSeoIntoHtml(template, origin, packageSlug)
          : injectGenericPageSeoIntoHtml(template, origin, fullPath);
      return res.status(result.status).type("text/html").send(result.html);
    } catch {
      // Fall through to the plain static shell if injection fails for any reason.
    }

    res.sendFile(indexHtmlPath);
  });
}
