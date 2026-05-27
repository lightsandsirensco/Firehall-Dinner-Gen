import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { golden100HeroPath } from "@/lib/golden-100-hero";

interface CatalogHeroImageProps {
  slug: string;
  alt: string;
  className?: string;
  /** When false, skip network request and show placeholder (from manifest scan). */
  available?: boolean;
}

export function CatalogHeroImage({
  slug,
  alt,
  className,
  available = true,
}: CatalogHeroImageProps) {
  const [failed, setFailed] = useState(available === false);
  const src = golden100HeroPath(slug);

  if (failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center h-full w-full bg-muted text-muted-foreground gap-1",
          className,
        )}
        aria-hidden
      >
        <ImageIcon className="w-8 h-8 opacity-40" />
        <span className="text-[10px] font-medium">No image yet</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("w-full h-full object-cover", className)}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
