import type {
  ApprovedCatalogCookTimeBucket,
  ApprovedCatalogEntry,
  ApprovedCatalogPrimaryFilter,
} from "@shared/approved-catalog";

export interface ApprovedCatalogFilterState {
  primary: ApprovedCatalogPrimaryFilter;
  category: string;
  protein: string;
  cookTime: ApprovedCatalogCookTimeBucket | "all";
  highProtein: boolean;
  lowCleanup: boolean;
}

export const DEFAULT_APPROVED_CATALOG_FILTERS: ApprovedCatalogFilterState = {
  primary: "all",
  category: "all",
  protein: "all",
  cookTime: "all",
  highProtein: false,
  lowCleanup: false,
};

export function filterApprovedCatalogEntries(
  entries: ApprovedCatalogEntry[],
  state: ApprovedCatalogFilterState,
): ApprovedCatalogEntry[] {
  return entries.filter((entry) => {
    switch (state.primary) {
      case "healthy":
        if (!entry.isHealthy) return false;
        break;
      case "bbq_grill":
        if (!entry.isBbqGrill) return false;
        break;
      case "smoothies":
        if (!entry.isSmoothie) return false;
        break;
      default:
        break;
    }

    if (state.category !== "all" && entry.category !== state.category) return false;
    if (state.protein !== "all" && entry.protein !== state.protein) return false;
    if (state.cookTime !== "all" && entry.cookTimeBucket !== state.cookTime) return false;
    if (state.highProtein && !entry.isHighProtein) return false;
    if (state.lowCleanup && !entry.isLowCleanup) return false;
    return true;
  });
}

export function buildApprovedCatalogFacetOptions(entries: ApprovedCatalogEntry[]): {
  categories: Array<{ id: string; label: string }>;
  proteins: Array<{ id: string; label: string }>;
} {
  const categoryIds = new Set<string>();
  const proteinIds = new Set<string>();

  for (const entry of entries) {
    categoryIds.add(entry.category);
    proteinIds.add(entry.protein);
  }

  const categories = [...categoryIds]
    .map((id) => ({
      id,
      label: entries.find((e) => e.category === id)?.categoryLabel ?? id.replace(/_/g, " "),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const proteins = [...proteinIds]
    .map((id) => ({
      id,
      label: id.replace(/_/g, " "),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { categories, proteins };
}

export function hasActiveApprovedCatalogFilters(state: ApprovedCatalogFilterState): boolean {
  return (
    state.primary !== "all" ||
    state.category !== "all" ||
    state.protein !== "all" ||
    state.cookTime !== "all" ||
    state.highProtein ||
    state.lowCleanup
  );
}
