/**
 * Check Golden 100 static image assets on disk.
 */

import fs from "node:fs";
import path from "node:path";
import { EDITORIAL_IMAGE_DIRS } from "../imagery/paths.js";
import { editorialSlugFilename } from "../imagery/paths.js";

export interface GoldenPageAssetStatus {
  slug: string;
  hero: boolean;
  mobile: boolean;
  thumb: boolean;
  rail: boolean;
  complete: boolean;
}

function assetExists(subdir: keyof typeof EDITORIAL_IMAGE_DIRS, slug: string): boolean {
  const dir = path.join(process.cwd(), "client", "public", "images", EDITORIAL_IMAGE_DIRS[subdir]);
  const file = path.join(dir, editorialSlugFilename(slug, "jpg"));
  return fs.existsSync(file);
}

export function checkGoldenPageAssets(slug: string): GoldenPageAssetStatus {
  const hero = assetExists("golden100", slug);
  const mobile = assetExists("mobile", slug);
  const thumb = assetExists("thumbs", slug);
  const rail = assetExists("rails", slug);
  return {
    slug,
    hero,
    mobile,
    thumb,
    rail,
    complete: hero && mobile && thumb && rail,
  };
}

export function listMissingGoldenAssets(slugs: string[]): GoldenPageAssetStatus[] {
  return slugs
    .map(checkGoldenPageAssets)
    .filter((s) => !s.complete);
}
