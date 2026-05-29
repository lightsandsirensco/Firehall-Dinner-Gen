import { useMemo } from "react";
import { buildHomeSeo } from "@shared/seo/metadata";
import {
  buildFaqPageSchema,
  buildHomeRecipeCollectionSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
} from "@shared/seo/schema";
import { FIREHALL_CATEGORY_LABEL, type FirehallCategoryId } from "@shared/firehall-categories";
import { getSiteOrigin } from "./site-origin";
import { usePageSeo } from "./use-page-seo";
import { HOME_FAQ_ITEMS } from "./home-faq";

const HOME_CATEGORY_CLUSTERS: FirehallCategoryId[] = [
  "crew_favorites",
  "quick_meals",
  "healthy_options",
  "bbq_smoker",
];

export function useHomeSeo(recipeCount = 150) {
  const origin = getSiteOrigin();
  const config = useMemo(() => buildHomeSeo(), []);
  const jsonLd = useMemo(
    () => [
      buildOrganizationSchema(origin),
      buildWebSiteSchema(origin),
      buildHomeRecipeCollectionSchema(
        origin,
        recipeCount,
        HOME_CATEGORY_CLUSTERS.map((id) => ({
          name: FIREHALL_CATEGORY_LABEL[id],
          path: `/categories/${id}`,
        })),
      ),
      buildFaqPageSchema(HOME_FAQ_ITEMS),
    ],
    [origin, recipeCount],
  );
  usePageSeo(config, jsonLd);
}
