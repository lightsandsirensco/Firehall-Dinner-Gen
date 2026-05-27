/**

 * Hero image / title consistency checks (server-only imagery hooks).

 */



import { scoreImageTitleAlignment, inferVisualSignalsFromTitle } from "../shared/meal-image-title-match.js";

import { recordReliabilityEvent } from "./generation-reliability.js";



export function verifyHeroForTitle(

  title: string,

  mealFormat: string | undefined,

  heroSource: "generated" | "editorial_fallback" | "pinned" | undefined,

  shotPresetId?: string,

): { useHero: boolean; matchScore: number } {

  const depicted = inferVisualSignalsFromTitle(title, mealFormat);

  if (shotPresetId?.includes("taco")) depicted.add("taco");

  if (shotPresetId?.includes("burger")) depicted.add("burger");

  if (shotPresetId?.includes("pasta")) depicted.add("pasta");

  if (shotPresetId?.includes("bowl")) depicted.add("bowl");

  if (shotPresetId?.includes("skillet")) depicted.add("skillet");

  if (shotPresetId?.includes("sheet")) depicted.add("sheet_pan");



  const match = scoreImageTitleAlignment(title, mealFormat, {

    depictedSignals: [...depicted],

    heroSource,

  });



  if (heroSource === "generated" && !match.pass) {

    recordReliabilityEvent("blocked_client_send", `image_mismatch:${match.conflicts.join(",")}`);

    return { useHero: false, matchScore: match.score };

  }



  return { useHero: true, matchScore: match.score };

}


