import { cn } from "@/lib/utils";

/** Master Firehall Meals mark — also the source for the favicon and PWA icons (scripts/generate-pwa-icons.ts). */
export const BRAND_LOGO_SRC = "/pwa/icon.svg";

/** Decorative: always rendered beside the brand name, which carries the accessible label. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt=""
      aria-hidden
      width={32}
      height={32}
      decoding="async"
      draggable={false}
      className={cn("shrink-0 select-none object-contain", className)}
      data-testid="brand-logo"
    />
  );
}
