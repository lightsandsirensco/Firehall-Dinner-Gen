import { useState } from "react";
import { cn } from "@/lib/utils";

interface MealHeroImageProps {
  src: string;
  alt: string;
  emoji?: string;
  title?: string;
  className?: string;
  imgClassName?: string;
  /** Cinematic full-bleed vs contained card header */
  variant?: "cinematic" | "card";
}

/**
 * Hero image with safe fallback — never shows a mismatched random stock photo on error.
 */
export function MealHeroImage({
  src,
  alt,
  emoji = "🔥",
  title,
  className,
  imgClassName,
  variant = "cinematic",
}: MealHeroImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  if (!showImage) {
    return (
      <div
        className={cn(
          "relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black",
          variant === "cinematic" ? "min-h-[200px] sm:min-h-[280px]" : "aspect-[16/10]",
          className,
        )}
        role="img"
        aria-label={alt || title || "Meal"}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(198,40,40,0.25),transparent_70%)]" />
        <span className="text-5xl sm:text-6xl relative z-10 drop-shadow-lg" aria-hidden>
          {emoji}
        </span>
        {title && (
          <p className="relative z-10 mt-3 font-heading text-sm uppercase tracking-widest text-foreground/80 px-4 text-center">
            {title}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover",
          variant === "cinematic" && "min-h-[220px] sm:min-h-[280px] max-h-[min(70vh,480px)] sm:max-h-[420px]",
          imgClassName,
        )}
        onError={() => setFailed(true)}
        loading="eager"
        decoding="async"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
        aria-hidden
      />
    </div>
  );
}
