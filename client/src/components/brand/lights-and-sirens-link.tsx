import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LIGHTS_AND_SIRENS } from "@/lib/lights-and-sirens";

type LightsAndSirensLinkProps = {
  href?: string;
  className?: string;
  children?: ReactNode;
  /** hero = prominent under tagline; inline = body text; badge = pill */
  variant?: "hero" | "inline" | "badge" | "footer";
};

export function LightsAndSirensLink({
  href = LIGHTS_AND_SIRENS.home,
  className,
  children,
  variant = "inline",
}: LightsAndSirensLinkProps) {
  const label = children ?? LIGHTS_AND_SIRENS.name;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm",
        variant === "hero" &&
          "font-heading text-sm sm:text-base tracking-[0.18em] uppercase text-primary hover:text-primary/85 underline decoration-primary/40 underline-offset-4",
        variant === "inline" &&
          "font-medium text-primary hover:text-primary/85 underline decoration-primary/35 underline-offset-2",
        variant === "badge" &&
          "inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary/15",
        variant === "footer" &&
          "font-heading text-sm tracking-wide text-foreground/90 hover:text-primary",
        className,
      )}
      data-testid="link-lights-and-sirens"
    >
      {label}
    </a>
  );
}
