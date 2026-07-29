import express, { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { matchRecipeSlug, injectRecipeSeoIntoHtml } from "./seo/recipe-html-injection.js";
import { injectGenericPageSeoIntoHtml } from "./seo/generic-page-injection.js";
import { resolvePublicSiteOrigin } from "./seo/sitemap.js";

const CLIENT_PUBLIC = path.resolve(import.meta.dirname, "..", "client", "public");

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Serve /images/* from client/public before SPA fallback (avoids HTML responses for JPGs)
  app.use(express.static(CLIENT_PUBLIC, { index: false, maxAge: "1h" }));

  app.use((req, res, next) => {
    if (!req.path.endsWith(".json")) return next();
    const rel = req.path.replace(/^\//, "");
    const abs = path.join(CLIENT_PUBLIC, rel);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ message: "Catalog asset not found", path: req.path });
    }
    next();
  });

  app.use(vite.middlewares);

  app.use("/{*path}", async (req, res, next) => {
    // Inside an `app.use("/{*path}", …)` mount the wildcard consumes the
    // whole path, so `req.path` gets rebased to "/" — use `req.originalUrl`
    // (unaffected by mount-point rebasing) for real path matching below.
    const url = req.originalUrl;
    const pathname = url.split("?")[0] || "/";
    if (pathname.startsWith("/images/") || pathname.startsWith("/assets/")) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      let page = await vite.transformIndexHtml(url, template);
      const recipeSlug = matchRecipeSlug(pathname);
      const origin = resolvePublicSiteOrigin(req.get("host"), req.get("x-forwarded-proto") ?? undefined);
      if (recipeSlug) {
        page = injectRecipeSeoIntoHtml(page, origin, recipeSlug);
      } else {
        page = injectGenericPageSeoIntoHtml(page, origin, pathname);
      }
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
