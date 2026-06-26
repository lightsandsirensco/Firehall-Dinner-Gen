import type { Express, Request, Response } from "express";
import { logError } from "../logger.js";
import { getSocialProofPayload, initSocialProofStore } from "./social-proof-store.js";

let storeReady = false;

async function ensureStore(): Promise<void> {
  if (!storeReady) {
    await initSocialProofStore();
    storeReady = true;
  }
}

export function registerSocialProofRoutes(app: Express): void {
  app.get("/api/social-proof", async (_req: Request, res: Response) => {
    try {
      await ensureStore();
      return res.json(getSocialProofPayload());
    } catch (err) {
      logError("social-proof", "fetch failed", err);
      return res.status(500).json({ message: "Failed to load social proof" });
    }
  });
}
