import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";
import { MISSING_RECIPE_IMAGE_LABEL } from "@shared/image-reuse-policy";

interface MissingRecipeImagePlaceholderProps {
  title: string;
  className?: string;
  variant?: "card" | "detail";
}

/** Branded placeholder when a recipe has no verified hero image. */
export function MissingRecipeImagePlaceholder({
  title,
  className,
  variant = "card",
}: MissingRecipeImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black",
        variant === "detail" && "min-h-[240px] gap-3",
        className,
      )}
    >
      <Flame className={cn("text-primary/40", variant === "detail" ? "h-14 w-14" : "h-9 w-9")} aria-hidden />
      <p
        className={cn(
          "px-3 text-center font-medium uppercase tracking-wide text-white/60",
          variant === "detail" ? "text-xs" : "text-[11px]",
        )}
      >
        {MISSING_RECIPE_IMAGE_LABEL}
      </p>
      <p
        className={cn(
          "line-clamp-2 px-3 text-center font-medium text-white/70",
          variant === "detail" ? "text-sm" : "text-[11px]",
        )}
      >
        {title}
      </p>
    </div>
  );
}
