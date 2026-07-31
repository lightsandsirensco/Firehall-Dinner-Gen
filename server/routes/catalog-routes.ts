import type { Express, Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { toApprovedCatalogGridResponse } from "../../shared/approved-catalog.js";
import { getApprovedCatalog } from "../approved-catalog-cache.js";
import { sanitizeRecipeHeroSurface, sanitizeRecipeIndexEntries } from "../sanitize-verified-recipe-hero.js";
import { log } from "../logger.js";
import {
  PIZZA_NIGHT_CATALOG_PUBLIC_DIR,
  readPizzaNightRecipePage,
} from "../pizza-night/page-store.js";
import {
  PERFORMANCE_CATALOG_PUBLIC_DIR,
  readPerformanceRecipePage,
} from "../performance-meals/page-store.js";
import { buildPerformanceRecipePage } from "../performance-meals/page-builder.js";
import { getPerformanceRecipeBySlug } from "../../shared/performance-meals/adapted/index.js";
import {
  HALL_EXPANSION_CATALOG_PUBLIC_DIR,
  readHallExpansionRecipePage,
} from "../hall-expansion/page-store.js";
import { buildHallExpansionRecipePage } from "../hall-expansion/page-builder.js";
import { getHallExpansionRecipeBySlug } from "../../shared/hall-expansion/adapted/index.js";
import { loadMergedHallCatalogIndex, resolveHallRecipePage } from "../meal-catalog/load-index.js";
import { readBreakfastRecipePageFromDisk } from "../breakfast-catalog/page-store.js";
import {
  SMOOTHIE_CATALOG_PUBLIC_DIR,
  readSmoothieRecipePage,
} from "../fuel-catalog/page-store.js";
import { buildSmoothieRecipePage } from "../fuel-catalog/page-builder.js";
import { getSmoothieCatalogItem } from "../../shared/fuel-catalog/smoothies/catalog-data.js";
import { routeParam } from "./param.js";

export function registerCatalogRoutes(app: Express): void {
  app.get("/api/catalog/golden-100", async (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    const merged = loadMergedHallCatalogIndex();
    const recipes = sanitizeRecipeIndexEntries(merged.recipes);
    return res.json({ ...merged, recipes });
  });

  app.get("/api/catalog/approved/count", async (_req: Request, res: Response) => {
    try {
      const catalog = getApprovedCatalog();
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
      return res.json({
        version: 2 as const,
        assetRevision: catalog.assetRevision,
        recipeCount: catalog.recipeCount,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approved catalog count failed";
      log(`[catalog] Approved count error: ${msg}`, "catalog");
      return res.status(500).json({ message: "Approved catalog count failed." });
    }
  });

  app.get("/api/catalog/approved", async (req: Request, res: Response) => {
    try {
      const catalog = getApprovedCatalog();
      const view = String(req.query.view || "").toLowerCase();
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
      if (view === "grid") {
        const grid = toApprovedCatalogGridResponse(catalog);
        log(`[catalog] Approved grid browse: ${grid.recipeCount} recipes`, "catalog");
        return res.json(grid);
      }
      log(`[catalog] Approved browse: ${catalog.recipeCount} recipes`, "catalog");
      return res.json(catalog);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approved catalog failed";
      log(`[catalog] Approved browse error: ${msg}`, "catalog");
      return res.status(500).json({ message: "Approved catalog failed. Please try again." });
    }
  });

  app.get("/api/catalog/golden-100/:slug", async (req: Request, res: Response) => {
    const slug = decodeURIComponent(routeParam(req.params.slug)).trim().toLowerCase();
    const pizzaPage = readPizzaNightRecipePage(slug);
    if (pizzaPage) {
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
      return res.json(sanitizeRecipeHeroSurface(pizzaPage));
    }
    const page = resolveHallRecipePage(slug);
    if (!page) {
      return res.status(404).json({ message: "Recipe not in hall catalog" });
    }
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    return res.json(sanitizeRecipeHeroSurface(page));
  });

  app.get("/api/catalog/pizza-night", async (_req: Request, res: Response) => {
    const indexFile = path.join(PIZZA_NIGHT_CATALOG_PUBLIC_DIR, "index.json");
    if (!fs.existsSync(indexFile)) {
      return res.status(404).json({ message: "Pizza Night catalog not found" });
    }
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    const raw = JSON.parse(fs.readFileSync(indexFile, "utf8"));
    return res.json({ ...raw, recipes: sanitizeRecipeIndexEntries(raw.recipes ?? []) });
  });

  app.get("/api/catalog/pizza-night/:slug", async (req: Request, res: Response) => {
    const slug = decodeURIComponent(routeParam(req.params.slug)).trim().toLowerCase();
    const page = readPizzaNightRecipePage(slug);
    if (!page) {
      return res.status(404).json({ message: "Recipe not in Pizza Night catalog" });
    }
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    return res.json(sanitizeRecipeHeroSurface(page));
  });

  app.get("/api/catalog/performance-meals", async (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    const indexFile = path.join(PERFORMANCE_CATALOG_PUBLIC_DIR, "index.json");
    if (fs.existsSync(indexFile)) {
      const raw = JSON.parse(fs.readFileSync(indexFile, "utf8"));
      return res.json({ ...raw, recipes: sanitizeRecipeIndexEntries(raw.recipes ?? []) });
    }
    return res.status(404).json({ message: "Performance catalog not generated" });
  });

  app.get("/api/catalog/performance-meals/:slug", async (req: Request, res: Response) => {
    const slug = decodeURIComponent(routeParam(req.params.slug)).trim().toLowerCase();
    const adapted = getPerformanceRecipeBySlug(slug);
    if (!adapted) {
      return res.status(404).json({ message: "Recipe not in Performance Meals catalog" });
    }
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    const onDisk = readPerformanceRecipePage(slug);
    const page = onDisk ?? buildPerformanceRecipePage(adapted);
    return res.json(sanitizeRecipeHeroSurface(page));
  });

  app.get("/api/catalog/hall-expansion", async (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    const indexFile = path.join(HALL_EXPANSION_CATALOG_PUBLIC_DIR, "index.json");
    if (fs.existsSync(indexFile)) {
      const raw = JSON.parse(fs.readFileSync(indexFile, "utf8"));
      return res.json({ ...raw, recipes: sanitizeRecipeIndexEntries(raw.recipes ?? []) });
    }
    return res.status(404).json({ message: "Hall expansion catalog not generated" });
  });

  app.get("/api/catalog/hall-expansion/:slug", async (req: Request, res: Response) => {
    const slug = decodeURIComponent(routeParam(req.params.slug)).trim().toLowerCase();
    const adapted = getHallExpansionRecipeBySlug(slug);
    if (!adapted) {
      return res.status(404).json({ message: "Recipe not in Hall Expansion catalog" });
    }
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    const onDisk = readHallExpansionRecipePage(slug);
    const page = onDisk ?? buildHallExpansionRecipePage(adapted);
    return res.json(sanitizeRecipeHeroSurface(page));
  });

  app.get("/api/catalog/smoothies", async (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    const indexFile = path.join(SMOOTHIE_CATALOG_PUBLIC_DIR, "index.json");
    if (fs.existsSync(indexFile)) {
      const raw = JSON.parse(fs.readFileSync(indexFile, "utf8"));
      return res.json({ ...raw, recipes: sanitizeRecipeIndexEntries(raw.recipes ?? []) });
    }
    return res.status(404).json({ message: "Smoothie catalog not generated" });
  });

  app.get("/api/catalog/smoothies/:slug", async (req: Request, res: Response) => {
    const slug = decodeURIComponent(routeParam(req.params.slug)).trim().toLowerCase();
    const item = getSmoothieCatalogItem(slug);
    if (!item) {
      return res.status(404).json({ message: "Recipe not in smoothie catalog" });
    }
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    const onDisk = readSmoothieRecipePage(slug);
    const page = onDisk ?? buildSmoothieRecipePage(item);
    return res.json(sanitizeRecipeHeroSurface(page));
  });

  app.get("/api/catalog/breakfast/:slug", async (req: Request, res: Response) => {
    const slug = decodeURIComponent(routeParam(req.params.slug)).trim().toLowerCase();
    const page = readBreakfastRecipePageFromDisk(slug);
    if (!page) {
      return res.status(404).json({ message: "Recipe not in breakfast catalog" });
    }
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    return res.json(sanitizeRecipeHeroSurface(page));
  });
}
