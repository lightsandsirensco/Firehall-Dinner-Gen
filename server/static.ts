import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";

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
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
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

  app.use("/{*path}", (req: Request, res: Response) => {
    const p = req.path.toLowerCase();
    if (/\.(jpg|jpeg|png|webp|gif|svg|ico|woff2?|css|js|map|txt)$/i.test(p)) {
      return res.status(404).end();
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
