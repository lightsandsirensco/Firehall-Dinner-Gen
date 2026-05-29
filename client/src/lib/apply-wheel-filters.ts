import type { FilterState } from "@/components/filter-panel";
import type { WheelClassic } from "@/lib/firehall-classics-wheel";

/** Merge wheel classic generator hints into current filter state. */
export function applyWheelClassicToFilters(
  filters: FilterState,
  classic: WheelClassic,
): FilterState {
  const gf = classic.generatorFilters;
  const protein = gf.proteins?.[0];
  return {
    ...filters,
    ...(protein ? { protein } : {}),
    ...(gf.meal_format ? { meal_format: gf.meal_format } : {}),
    ...(gf.cuisine_style ? { cuisine_style: gf.cuisine_style } : {}),
  };
}
