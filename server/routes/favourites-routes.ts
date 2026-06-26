import type { Express, Request, Response } from "express";
import { addFavourite, getFavourites, removeFavourite } from "../favourites";
import { routeParam } from "./param.js";

export function registerFavouritesRoutes(app: Express): void {
  app.get("/api/favourites", (req: Request, res: Response) => {
    const userId = (req as { _sessionId?: string })._sessionId || "unknown";
    const faves = getFavourites(userId);
    return res.json({ favourites: faves });
  });

  app.post("/api/favourites", (req: Request, res: Response) => {
    const userId = (req as { _sessionId?: string })._sessionId || "unknown";
    const { recipeId } = req.body;

    if (!recipeId || typeof recipeId !== "string") {
      return res.status(400).json({ message: "recipeId (string) is required." });
    }

    const updated = addFavourite(userId, recipeId);
    return res.json({ favourites: updated });
  });

  app.delete("/api/favourites/:recipeId", (req: Request, res: Response) => {
    const userId = (req as { _sessionId?: string })._sessionId || "unknown";
    const recipeId = routeParam(req.params.recipeId);
    const updated = removeFavourite(userId, recipeId);
    return res.json({ favourites: updated });
  });
}
