import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildGeneratorSeo } from "@shared/seo/metadata";
import { buildOrganizationSchema, buildWebSiteSchema } from "@shared/seo/schema";
import { APPROVED_CATALOG_TOTAL } from "@shared/meal-catalog/curated-count";
import { approvedCatalogTotalQueryKey, fetchApprovedCatalogTotal } from "@/lib/approved-catalog-api";
import { getSiteOrigin } from "./site-origin";
import { usePageSeo } from "./use-page-seo";

export function useGeneratorSeo() {
  const origin = getSiteOrigin();
  const { data: recipeCount = APPROVED_CATALOG_TOTAL } = useQuery({
    queryKey: approvedCatalogTotalQueryKey,
    queryFn: fetchApprovedCatalogTotal,
    staleTime: 120_000,
  });
  const config = useMemo(() => buildGeneratorSeo(recipeCount), [recipeCount]);
  const jsonLd = useMemo(
    () => [buildOrganizationSchema(origin), buildWebSiteSchema(origin)],
    [origin],
  );
  usePageSeo(config, jsonLd);
}
