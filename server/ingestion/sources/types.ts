import type { IngestRecipeDraft, TrendSignal } from "../../../shared/ingestion/recipe-ingest-schema.js";

/** Discovers trend signals — no recipe body yet */
export interface TrendDiscoverySource {
  readonly name: string;
  discover(): Promise<TrendSignal[]>;
}

/** Resolves signals into recipe drafts (e.g. via Spoonacular search) */
export interface RecipeResolutionSource {
  readonly name: string;
  resolve(signals: TrendSignal[]): Promise<IngestRecipeDraft[]>;
}

export interface IngestionSourceBundle {
  trends: TrendDiscoverySource[];
  resolvers: RecipeResolutionSource[];
}
