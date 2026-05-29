import { useMemo } from "react";
import { buildFaqSeo } from "@shared/seo/metadata";
import { buildFaqPageSchema, buildOrganizationSchema } from "@shared/seo/schema";
import { getSiteOrigin } from "./site-origin";
import { usePageSeo } from "./use-page-seo";
import { HOME_FAQ_ITEMS } from "./home-faq";

export function useFaqSeo() {
  const origin = getSiteOrigin();
  const config = useMemo(() => buildFaqSeo(), []);
  const jsonLd = useMemo(
    () => [buildOrganizationSchema(origin), buildFaqPageSchema(HOME_FAQ_ITEMS)],
    [origin],
  );
  usePageSeo(config, jsonLd);
}
