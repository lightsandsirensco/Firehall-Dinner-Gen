/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_CLARITY_PROJECT_ID?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_ADMIN_SECRET?: string;
  readonly VITE_EDITORIAL_CDN_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
