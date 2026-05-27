import type {
  CookTimeBucket,
  CrewSizeBucket,
  CuisineKind,
  DifficultyLevel,
  EquipmentKind,
  HallTestedStatus,
  LeftoversQuality,
  MealStyle,
  METADATA_SCHEMA_VERSION,
  NutritionCategory,
  ProteinKind,
} from "./taxonomy.js";

/** Structured CMS metadata — canonical filter/search surface */
export interface CuratedRecipeMetadata {
  schemaVersion: typeof METADATA_SCHEMA_VERSION;
  protein: ProteinKind;
  cuisine: CuisineKind;
  difficulty: DifficultyLevel;
  /** 1 (easy cleanup) – 5 (heavy cleanup) */
  cleanupDifficulty: 1 | 2 | 3 | 4 | 5;
  cookTimeBucket: CookTimeBucket;
  /** Active total minutes (denormalized for display) */
  totalMinutes: number;
  equipment: EquipmentKind[];
  crewSize: {
    bucket: CrewSizeBucket;
    servingsBase: number;
    minCrew: number;
    maxCrew: number;
  };
  leftoversQuality: LeftoversQuality;
  hallTested: HallTestedStatus;
  featured: boolean;
  busyNightSuitable: boolean;
  mealStyle: MealStyle;
  nutritionCategory: NutritionCategory;
  /** Optional editorial overrides (manual CMS edits) */
  overrides?: Partial<CuratedRecipeMetadataOverrides>;
  /** ISO timestamp when metadata last computed or edited */
  updatedAt?: string;
}

/** Fields editors may set explicitly — preserved across re-derive */
export interface CuratedRecipeMetadataOverrides {
  protein?: ProteinKind;
  cuisine?: CuisineKind;
  difficulty?: DifficultyLevel;
  cleanupDifficulty?: 1 | 2 | 3 | 4 | 5;
  cookTimeBucket?: CookTimeBucket;
  equipment?: EquipmentKind[];
  crewSizeBucket?: CrewSizeBucket;
  leftoversQuality?: LeftoversQuality;
  hallTested?: HallTestedStatus;
  featured?: boolean;
  busyNightSuitable?: boolean;
  mealStyle?: MealStyle;
  nutritionCategory?: NutritionCategory;
}

/** Filter surface for list queries / recommendation prep */
export interface CuratedMetadataFilter {
  protein?: ProteinKind | ProteinKind[];
  cuisine?: CuisineKind | CuisineKind[];
  difficulty?: DifficultyLevel | DifficultyLevel[];
  cookTimeBucket?: CookTimeBucket | CookTimeBucket[];
  cleanupDifficultyMax?: number;
  equipment?: EquipmentKind;
  crewSizeBucket?: CrewSizeBucket;
  leftoversQuality?: LeftoversQuality;
  hallTested?: HallTestedStatus | HallTestedStatus[];
  featured?: boolean;
  busyNightSuitable?: boolean;
  mealStyle?: MealStyle | MealStyle[];
  nutritionCategory?: NutritionCategory | NutritionCategory[];
}

export interface MetadataQaIssue {
  field: string;
  severity: "warn" | "error";
  message: string;
}
