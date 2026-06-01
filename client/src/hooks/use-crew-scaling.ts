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

type ScalablePage = {
  slug?: string;
  ingredients: GoldenRecipePageIngredient[];
  baseServings?: number;
  crewSize?: number;
  cookTime?: number;
  totalTime?: number;
};

export function useCrewScaling(page: ScalablePage | undefined) {
  const [crewSize, setCrewSize] = useState(DEFAULT_CREW_SIZE);

  useEffect(() => {
    setCrewSize(DEFAULT_CREW_SIZE);
  }, [page?.slug]);

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
    setCrewSize,
    baseServings,
    scaledIngredients,
    displayCookTime,
  };
}
