import type { Express } from "express";
import { createServer, type Server } from "http";
import { generateRequestSchema } from "@shared/schema";
import type { TemplateRow, GenerateResponse } from "@shared/schema";
import { loadTemplates, filterTemplates, pickTemplate } from "./templates";
import { generateRecipe } from "./ai";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/generate", async (req, res) => {
    try {
      const parsed = generateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: " + parsed.error.message });
      }

      const request = parsed.data;
      const templates = await loadTemplates();

      const candidates = filterTemplates(templates, request);

      if (candidates.length === 0) {
        return res.status(404).json({ message: "No matching templates found. Try loosening your filters." });
      }

      const chosen = pickTemplate(candidates, request.last_template_id);

      const recipe = await generateRecipe(chosen, request);

      return res.json(recipe);
    } catch (error: any) {
      console.error("Generate error:", error);
      return res.status(500).json({ message: error.message || "Failed to generate recipe" });
    }
  });

  return httpServer;
}
