import express, { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

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
    if (req.path.startsWith("/images/") || req.path.startsWith("/assets/")) {
      return next();
    }
    const url = req.originalUrl;

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
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
