import type { Express, Request, Response } from "express";
import {
  BROWSE_CANONICAL_PATH,
  firehallCategoryExplorePath,
} from "../shared/browse-canonical.js";

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** 301 redirects — legacy browse hubs → canonical /explore. */
export function registerBrowseRedirects(app: Express): void {
  app.get("/recipes", (req: Request, res: Response) => {
    const q = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    res.redirect(301, `${BROWSE_CANONICAL_PATH}${q}`);
  });

  app.get("/categories/:categoryId", (req: Request, res: Response) => {
    const categoryId = routeParam(req.params.categoryId).trim().toLowerCase();
    res.redirect(301, firehallCategoryExplorePath(categoryId));
  });
}
