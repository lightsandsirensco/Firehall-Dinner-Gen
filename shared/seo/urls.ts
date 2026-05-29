/** Canonical path helpers — always lowercase, no trailing slash. */

export function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  const p = path.startsWith("/") ? path : `/${path}`;
  return p.replace(/\/+$/, "") || "/";
}

export function absoluteUrl(origin: string, path: string): string {
  const base = origin.replace(/\/+$/, "");
  const p = normalizePath(path);
  return p === "/" ? `${base}/` : `${base}${p}`;
}

export function recipePath(slug: string): string {
  return `/recipes/${slug.trim().toLowerCase()}`;
}

export function absoluteImageUrl(origin: string, imagePath: string): string {
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const rel = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return absoluteUrl(origin, rel);
}
