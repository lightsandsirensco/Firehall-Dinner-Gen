import { cn } from "@/lib/utils";
import { FoodImage } from "@/components/mobile/food-image";

interface MealHeroImageProps {
  src: string;
  alt: string;
  emoji?: string;
  title?: string;
  className?: string;
  imgClassName?: string;
  /** Cinematic full-bleed vs contained card header */
  variant?: "cinematic" | "card";
  priority?: boolean;
}

/**
 * Meal / wheel reveal hero — uses shared HeroImage system.
 */
export function MealHeroImage({
  src,
  alt,
  emoji = "🔥",
  title,
  className,
  imgClassName,
  variant = "cinematic",
  priority = true,
}: MealHeroImageProps) {
  const fallback = (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black",
        variant === "cinematic"
          ? "w-full aspect-[5/4] max-h-[min(48vh,440px)] sm:aspect-[16/9] sm:max-h-[min(400px,52vh)]"
          : "w-full aspect-[16/10]",
        className,
      )}
      role="img"
      aria-label={alt || title || "Meal"}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(198,40,40,0.22),transparent_70%)]" />
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

  return (
    <FoodImage
      src={src}
      alt={alt}
      layout={variant === "cinematic" ? "cinematic" : "card-fill"}
      focal="food-plate"
      overlay={variant === "cinematic" ? "minimal" : "minimal"}
      priority={priority}
      bleed={variant === "cinematic"}
      rounded={variant === "cinematic" ? "none" : "lg"}
      className={cn(
        variant === "cinematic" && "sm:rounded-2xl sm:ring-1 sm:ring-border/40 sm:shadow-xl sm:shadow-black/25",
        className,
      )}
      imgClassName={imgClassName}
      fallback={fallback}
    />
  );
}
