import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  type HeroFocalPoint,
  type HeroImageLayout,
  type HeroOverlayPreset,
  HERO_CINEMATIC_GRADE,
  HERO_FOCAL_CLASS,
  HERO_IMAGE_BASE,
  HERO_LAYOUT_FRAME,
  heroOverlayClasses,
} from "@/lib/hero-image";
import { normalizeMediaUrl } from "@/lib/media-url";

export interface HeroImageProps {
  src: string;
  alt: string;
  layout?: HeroImageLayout;
  focal?: HeroFocalPoint;
  /** How to fit the image into the frame */
  fit?: "cover" | "contain" | "contain-blur";
  overlay?: HeroOverlayPreset;
  /** Warm grade + vignette (explore cards) */
  cinematicGrade?: boolean;
  srcSet?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  fallback?: ReactNode;
  /** Return true if the error was handled (e.g. fallback URL) — image stays mounted */
  onError?: () => boolean | void;
  /** Dev-only context for troubleshooting missing images */
  debugId?: { slug?: string; title?: string; context?: string };
  /** LQIP / blur placeholder data URL — shown until full image loads */
  blurDataUrl?: string;
}

/**
 * Unified responsive hero / food image — consistent crop, overlays, loading.
 */
export function HeroImage({
  src,
  alt,
  layout = "detail",
  focal = "food",
  fit = "cover",
  overlay = "detail",
  cinematicGrade = false,
  srcSet,
  sizes,
  priority = false,
  className,
  imgClassName,
  fallback,
  onError,
  debugId,
  blurDataUrl,
}: HeroImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const resolvedSrc = normalizeMediaUrl(src);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [resolvedSrc]);

  const showImage = Boolean(resolvedSrc) && !failed;
  const isBanner = layout.startsWith("banner-");

  if (!showImage) {
    if (fallback) return <>{fallback}</>;
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-black",
          HERO_LAYOUT_FRAME[layout],
          className,
        )}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-zinc-950", HERO_LAYOUT_FRAME[layout], className)}>
      {!loaded && (
        <div
          className="absolute inset-0 z-[1]"
          style={
            blurDataUrl
              ? {
                  backgroundImage: `url(${blurDataUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(12px)",
                  transform: "scale(1.05)",
                }
              : undefined
          }
          aria-hidden
        >
          {!blurDataUrl && <div className="absolute inset-0 skeleton-shimmer" />}
        </div>
      )}

      {/* When using contain, fill empty space with a soft blurred cover background. */}
      {fit === "contain-blur" && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          aria-hidden
          style={{
            backgroundImage: `url(${resolvedSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(18px)",
            transform: "scale(1.08)",
            opacity: loaded ? 0.55 : 0.35,
          }}
        />
      )}

      <img
        src={resolvedSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        className={cn(
          HERO_IMAGE_BASE,
          fit === "cover"
            ? HERO_FOCAL_CLASS[focal]
            : fit === "contain"
              ? "object-contain object-center"
              : "object-contain object-center",
          cinematicGrade && HERO_CINEMATIC_GRADE,
          loaded ? "opacity-100 scale-100" : "opacity-40 scale-[1.01]",
          imgClassName,
        )}
        style={fit === "contain-blur" ? { zIndex: 1 } : undefined}
        onLoad={() => setLoaded(true)}
        onError={() => {
          const handled = onError?.();
          if (handled) return;
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.warn("[image] load failed", {
              src,
              resolvedSrc,
              alt,
              layout,
              focal,
              fit,
              ...debugId,
            });
          }
          setFailed(true);
          setLoaded(true);
        }}
      />

      {cinematicGrade && (
        <div
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent"
          aria-hidden
        />
      )}

      {overlay !== "none" && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[3]",
            heroOverlayClasses(overlay),
          )}
          aria-hidden
        />
      )}

      {isBanner && overlay.startsWith("banner") && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-[3] bg-gradient-to-t from-[#141414] to-transparent",
            layout === "banner-utility" ? "h-6" : "h-20 sm:h-24",
          )}
          aria-hidden
        />
      )}
    </div>
  );
}
