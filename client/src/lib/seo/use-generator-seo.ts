import { useMemo } from "react";
import { buildGeneratorSeo } from "@shared/seo/metadata";
import { buildOrganizationSchema, buildWebSiteSchema } from "@shared/seo/schema";
import { getSiteOrigin } from "./site-origin";
import { usePageSeo } from "./use-page-seo";

export function useGeneratorSeo() {
  const origin = getSiteOrigin();
  const config = useMemo(() => buildGeneratorSeo(), []);
  const jsonLd = useMemo(
    () => [buildOrganizationSchema(origin), buildWebSiteSchema(origin)],
    [origin],
  );
  usePageSeo(config, jsonLd);
}
