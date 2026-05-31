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
        variant === "detail" && "min-h-[240px]",
        className,
      )}
    >
      <Flame className="h-9 w-9 text-primary/30" aria-hidden />
      <p className="px-3 text-center text-[11px] font-medium uppercase tracking-wide text-white/45">
        {MISSING_RECIPE_IMAGE_LABEL}
      </p>
      <p className="line-clamp-2 px-3 text-center text-[11px] font-medium text-white/50">{title}</p>
    </div>
  );
}
