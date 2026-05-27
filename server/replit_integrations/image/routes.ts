import type { Express, Request, Response } from "express";
import { openai } from "./client";
import { normalizeGptImageSize, type GptImageApiSize } from "../../lib/image-sizes.js";

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt, size } = req.body as { prompt?: string; size?: string };

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const outputSize = normalizeGptImageSize(size, "1024x1024");

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: outputSize as GptImageApiSize,
      });

      const imageData = response.data[0];
      res.json({
        url: imageData.url,
        b64_json: imageData.b64_json,
      });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });
}
