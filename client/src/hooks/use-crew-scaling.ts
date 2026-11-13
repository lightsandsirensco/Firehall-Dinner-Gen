import { useEffect, useMemo, useState } from "react";
import type { GoldenRecipePageIngredient } from "@shared/golden-100/recipe-page-schema";
import {
  adjustCookTimeForCrew,
  scaleGoldenIngredients,
} from "@shared/golden-100/recipe-quality/crew-scale";
import {
  DEFAULT_CREW_SIZE,
  getRecipeBaseServings,
} from "@shared/recipe/crew-scaling-config";
import { usePreferredCrewSize } from "@/hooks/use-preferred-crew-size";

type ScalablePage = {
  slug?: string;
  ingredients: GoldenRecipePageIngredient[];
  baseServings?: number;
  crewSize?: number;
  cookTime?: number;
  totalTime?: number;
};

export function useCrewScaling(page: ScalablePage | undefined) {
  const preferredCrewSize = usePreferredCrewSize();
  const [chosenCrewSize, setChosenCrewSize] = useState<number | null>(null);

  useEffect(() => {
    setChosenCrewSize(null);
  }, [page?.slug]);

  // Follows the saved crew (including a profile that finishes loading after mount) until the user picks one here.
  const crewSize = chosenCrewSize ?? preferredCrewSize;
  const baseServings = page ? getRecipeBaseServings(page) : DEFAULT_CREW_SIZE;

  const scaledIngredients = useMemo(() => {
    if (!page?.ingredients?.length) return [];
    return scaleGoldenIngredients(page.ingredients, baseServings, crewSize);
  }, [page?.ingredients, baseServings, crewSize]);

  const displayCookTime = useMemo(() => {
    if (!page) return 0;
    const base = page.cookTime ?? page.totalTime ?? 0;
    return adjustCookTimeForCrew(base, baseServings, crewSize);
  }, [page, baseServings, crewSize]);

  return {
    crewSize,
    setCrewSize: setChosenCrewSize,
    baseServings,
    scaledIngredients,
    displayCookTime,
  };
}
