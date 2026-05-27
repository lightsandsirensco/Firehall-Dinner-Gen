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
  overlay = "detail",
  cinematicGrade = false,
  srcSet,
  sizes,
  priority = false,
  className,
  imgClassName,
  fallback,
  onError,
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
    <div
      className={cn(
        "relative overflow-hidden bg-zinc-950",
        HERO_LAYOUT_FRAME[layout],
        className,
      )}
    >
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

      <img
        src={resolvedSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className={cn(
          HERO_IMAGE_BASE,
          HERO_FOCAL_CLASS[focal],
          cinematicGrade && HERO_CINEMATIC_GRADE,
          loaded ? "opacity-100 scale-100" : "opacity-40 scale-[1.01]",
          imgClassName,
        )}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        onError={() => {
          const handled = onError?.();
          if (handled) return;
          setFailed(true);
          setLoaded(true);
        }}
      />

      {cinematicGrade && (
        <div
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-br from-primary/[0.07] via-transparent to-transparent"
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
