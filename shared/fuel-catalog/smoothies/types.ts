import type { SmoothieTaxonomy } from "../constants.js";
import type { FuelIngredient } from "../schema.js";

export interface SmoothieCatalogItem {
  slug: string;
  title: string;
  subtitle: string;
  taxonomyCategory: SmoothieTaxonomy;
  intro: string;
  ingredients: FuelIngredient[];
  instructions: string[];
  nutritionHighlights: string;
  substitutions?: string[];
  shiftNote: string;
  heroImage: string;
  thumbImage: string;
  imageAlt: string;
}
