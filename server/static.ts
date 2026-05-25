import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const clientPublic = path.resolve(process.cwd(), "client", "public");
  if (fs.existsSync(clientPublic)) {
    app.use("/images", express.static(path.join(clientPublic, "images"), { index: false, maxAge: "1h" }));
  }

  app.use(express.static(distPath, { index: false, maxAge: "1h" }));

  // SPA fallback — never return index.html for static asset paths (broken images)
  app.use("/{*path}", (req, res) => {
    const p = req.path.toLowerCase();
    if (/\.(jpg|jpeg|png|webp|gif|svg|ico|woff2?|css|js|map|txt)$/i.test(p)) {
      return res.status(404).end();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
