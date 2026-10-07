/**
 * Display-time focal position for recipe photography under `object-fit: cover`.
 * Never re-crops or rewrites image files — only shifts which part of the photo stays in frame.
 *
 * Recipe heroes are 1:1 masters with the dish sitting slightly below centre (measured mean ≈ 56%),
 * so the default biases the crop downward to keep bowls and plates whole.
 */

/** "center" | "top" | "bottom" | vertical percent (0–100) | full CSS position ("50% 70%"). */
export type ImageFocalPosition = "center" | "top" | "bottom" | number | `${number}%` | `${number}% ${number}%`;

export const DEFAULT_FOOD_OBJECT_POSITION = "50% 60%";

/**
 * Per-image overrides for problem photos only, keyed by image file stem
 * (e.g. "lemon-chicken-orzo-soup" for /images/golden-100/lemon-chicken-orzo-soup.jpg).
 */
const FOCAL_OVERRIDES: Record<string, ImageFocalPosition> = {};

function toCss(position: ImageFocalPosition): string {
  if (typeof position === "number") return `50% ${Math.min(100, Math.max(0, position))}%`;
  if (position === "center") return "50% 50%";
  if (position === "top") return "50% 0%";
  if (position === "bottom") return "50% 100%";
  return /^\d+(\.\d+)?%$/.test(position) ? `50% ${position}` : position;
}

function imageStem(src: string): string {
  const path = src.split(/[?#]/)[0] ?? "";
  const file = path.slice(path.lastIndexOf("/") + 1);
  return file.replace(/\.[a-z0-9]+$/i, "").replace(/(-thumb|-\d+w)$/i, "");
}

export function resolveImageObjectPosition(src: string | undefined | null, explicit?: ImageFocalPosition | null): string {
  if (explicit != null) return toCss(explicit);
  const override = src ? FOCAL_OVERRIDES[imageStem(src)] : undefined;
  return override != null ? toCss(override) : DEFAULT_FOOD_OBJECT_POSITION;
}
