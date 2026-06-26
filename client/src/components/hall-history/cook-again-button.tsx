import { Link } from "wouter";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HALL_HISTORY } from "@/lib/brand-copy";
import { approvedCatalogRecipePath } from "@shared/approved-catalog";
import { trackHallMealRepeated } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface CookAgainButtonProps {
  title: string;
  recipeSlug?: string;
  recipePath?: string;
  source?: string;
  className?: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

export function CookAgainButton({
  title,
  recipeSlug,
  recipePath,
  source = "cook_again_button",
  className,
  variant = "outline",
  size = "default",
}: CookAgainButtonProps) {
  const href = recipePath ?? (recipeSlug ? approvedCatalogRecipePath(recipeSlug) : undefined);
  if (!href) return null;
  const cookHref = `${href}${href.includes("?") ? "&" : "?"}cook=1`;

  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={cn("gap-2 touch-manipulation", className)}
      data-testid="button-cook-again"
    >
      <Link
        href={cookHref}
        onClick={() =>
          trackHallMealRepeated({
            recipe_slug: recipeSlug,
            recipe_title: title,
            source,
          })
        }
      >
        <RotateCcw className="w-4 h-4 shrink-0" aria-hidden />
        {HALL_HISTORY.cookAgain}
      </Link>
    </Button>
  );
}
