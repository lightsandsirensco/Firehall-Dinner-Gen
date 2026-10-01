import type { EditorialEmbeddedRecipe } from "../../editorial/content-schema.js";
import type { SmoothieCatalogItem } from "./types.js";

export function smoothieCatalogToEmbedded(item: SmoothieCatalogItem): EditorialEmbeddedRecipe {
  return {
    id: item.slug,
    name: item.title,
    category: item.subtitle,
    intro: item.intro,
    ingredients: item.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity ?? "",
      unit: i.unit,
      notes: i.notes,
    })),
    instructions: item.instructions,
    nutritionHighlights: item.nutritionHighlights,
    substitutions: item.substitutions,
    shiftNote: item.shiftNote,
    // Guide cards render small; every smoothie hero ships a ~100 KB .webp beside the ~1.6 MB .jpg.
    imagePath: item.heroImage.replace(/^(\/images\/smoothies\/.+)\.jpg$/, "$1.webp"),
    imageAlt: item.imageAlt,
  };
}
