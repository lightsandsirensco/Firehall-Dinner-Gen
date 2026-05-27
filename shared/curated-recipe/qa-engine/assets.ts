import fs from "node:fs";
import path from "node:path";

export interface ImageAvailabilityResult {
  /** Hero will render in production app */
  heroProductionOk: boolean;
  /** Hero will render in offline review bundle */
  heroReviewOk: boolean;
  thumbProductionOk: boolean;
  thumbReviewOk: boolean;
}

export interface ImageCheckContext {
  cwd?: string;
  reviewAssetsDir?: string;
}

function publicImageRoots(cwd: string): string[] {
  return [
    path.join(cwd, "client", "public", "images"),
    path.join(cwd, "public", "images"),
  ].filter((r) => fs.existsSync(r));
}

function siteImageOnDisk(publicPath: string, cwd: string): boolean {
  if (!publicPath.startsWith("/images/")) return false;
  const rel = publicPath.replace(/^\/images\//, "");
  const roots = publicImageRoots(cwd);
  if (roots.length === 0) return true;
  return roots.some((root) => fs.existsSync(path.join(root, rel)));
}

function reviewAssetExists(relPath: string, reviewAssetsDir?: string): boolean {
  if (!relPath || !reviewAssetsDir) return false;
  const normalized = relPath.replace(/^\.?\//, "");
  if (!normalized.startsWith("assets/")) return false;
  return fs.existsSync(path.join(reviewAssetsDir, normalized.replace(/^assets\//, "")));
}

function isHttp(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isValidImageRef(url: string): boolean {
  const u = (url || "").trim();
  if (!u) return false;
  if (isHttp(u)) return true;
  if (u.startsWith("/images/")) return true;
  if (u.startsWith("assets/")) return true;
  return false;
}

/** Resolve whether images are renderable — avoids false positives on valid app paths. */
export function checkImageAvailability(
  heroImage: string,
  thumbImage: string | undefined,
  ctx: ImageCheckContext = {},
): ImageAvailabilityResult {
  const cwd = ctx.cwd ?? process.cwd();
  const hero = (heroImage || "").trim();
  const thumb = (thumbImage || "").trim();

  const heroHttp = isHttp(hero);
  const thumbHttp = isHttp(thumb);
  const heroAssets = hero.startsWith("assets/");
  const thumbAssets = thumb.startsWith("assets/");
  const heroSite = hero.startsWith("/images/");
  const thumbSite = thumb.startsWith("/images/");

  const heroProductionOk = !hero || heroHttp || (heroSite && siteImageOnDisk(hero, cwd));

  const heroReviewOk =
    !hero ||
    heroHttp ||
    (heroAssets && reviewAssetExists(hero, ctx.reviewAssetsDir)) ||
    (heroSite && siteImageOnDisk(hero, cwd));

  const thumbProductionOk = !thumb || thumbHttp || (thumbSite && siteImageOnDisk(thumb, cwd));

  const thumbReviewOk =
    !thumb ||
    thumbHttp ||
    (thumbAssets && reviewAssetExists(thumb, ctx.reviewAssetsDir)) ||
    (thumbSite && siteImageOnDisk(thumb, cwd));

  return {
    heroProductionOk,
    heroReviewOk: heroReviewOk || heroProductionOk,
    thumbProductionOk,
    thumbReviewOk: thumbReviewOk || thumbProductionOk,
  };
}

export function isValidImageReference(url: string): boolean {
  return isValidImageRef(url);
}
