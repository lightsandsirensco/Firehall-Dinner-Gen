import { useMemo } from "react";
import { buildHomeSeo } from "@shared/seo/metadata";
import { buildFaqPageSchema, buildOrganizationSchema, buildWebSiteSchema } from "@shared/seo/schema";
import { getSiteOrigin } from "./site-origin";
import { usePageSeo } from "./use-page-seo";
import { HOME_FAQ_ITEMS } from "./home-faq";

export function useHomeSeo() {
  const origin = getSiteOrigin();
  const config = useMemo(() => buildHomeSeo(), []);
  const jsonLd = useMemo(
    () => [
      buildOrganizationSchema(origin),
      buildWebSiteSchema(origin),
      buildFaqPageSchema(HOME_FAQ_ITEMS),
    ],
    [origin],
  );
  usePageSeo(config, jsonLd);
}
