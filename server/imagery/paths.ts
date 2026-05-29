/**

 * Deterministic public paths for editorial imagery assets.

 */



import fs from "node:fs";

import path from "node:path";

import {

  cacheSafeSlugFilename,

  editorialPathForRole,

  type EditorialImageFormat,

} from "../../shared/editorial-image-delivery.js";

import type { EditorialVariantRole } from "../../shared/mobile-crop-rules.js";



export const EDITORIAL_IMAGE_DIRS = {

  golden100: "golden-100",

  smoothies: "smoothies",

  mobile: "mobile",

  thumbs: "thumbs",

  rails: "rails",

} as const;



export type EditorialImageSubdir = keyof typeof EDITORIAL_IMAGE_DIRS;



const SUBDIR_TO_ROLE: Record<EditorialImageSubdir, EditorialVariantRole> = {

  golden100: "hero",

  smoothies: "hero",

  mobile: "mobile",

  thumbs: "thumb",

  rails: "rail",

};



export function editorialSlugFilename(slug: string, ext: EditorialImageFormat = "jpg"): string {

  return cacheSafeSlugFilename(slug, ext);

}



export function golden100HeroPath(slug: string): string {

  return editorialPathForRole("hero", slug, "jpg");

}



export function smoothieHeroPath(slug: string): string {

  const file = editorialSlugFilename(slug, "jpg");

  return `/images/smoothies/${file}`;

}



export function mobileHeroPath(slug: string): string {

  return editorialPathForRole("mobile", slug, "jpg");

}



export function thumbImagePath(slug: string): string {

  return editorialPathForRole("thumb", slug, "jpg");

}



export function railPreviewPath(slug: string): string {

  return editorialPathForRole("rail", slug, "jpg");

}



export function webpPathForSubdir(subdir: EditorialImageSubdir, slug: string): string {

  const role = SUBDIR_TO_ROLE[subdir];

  return editorialPathForRole(role, slug, "webp");

}



export function clientPublicImageDir(subdir: EditorialImageSubdir): string {

  return path.join(process.cwd(), "client", "public", "images", EDITORIAL_IMAGE_DIRS[subdir]);

}



export function distPublicImageDir(subdir: EditorialImageSubdir): string {

  return path.join(process.cwd(), "dist", "public", "images", EDITORIAL_IMAGE_DIRS[subdir]);

}



/** Write bytes to client/public (+ dist in production). */

export function mirrorEditorialImageFile(

  subdir: EditorialImageSubdir,

  slug: string,

  buffer: Buffer,

  format?: EditorialImageFormat,

): { publicPath: string; absolutePath: string } {

  const ext: EditorialImageFormat =
    format ?? (buffer[8] === 0x57 && buffer[9] === 0x45 ? "webp" : "jpg");

  const filename = editorialSlugFilename(slug, ext);

  const dirs = [clientPublicImageDir(subdir)];

  if (process.env.NODE_ENV === "production") {

    dirs.push(distPublicImageDir(subdir));

  }



  let absolutePath = "";

  for (const dir of dirs) {

    fs.mkdirSync(dir, { recursive: true });

    const abs = path.join(dir, filename);

    fs.writeFileSync(abs, buffer);

    if (!absolutePath) absolutePath = abs;

  }



  const role = SUBDIR_TO_ROLE[subdir];

  const publicPath =
    subdir === "smoothies"
      ? `/images/smoothies/${filename}`
      : editorialPathForRole(role, slug, ext);

  return {

    publicPath,

    absolutePath,

  };

}


