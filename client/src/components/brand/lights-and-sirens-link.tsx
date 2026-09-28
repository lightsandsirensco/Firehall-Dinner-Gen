import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LIGHTS_AND_SIRENS } from "@/lib/lights-and-sirens";

type LightsAndSirensLinkProps = {
  className?: string;
  children?: ReactNode;
  /** hero = prominent under tagline; inline = body text; badge = pill */
  variant?: "hero" | "inline" | "badge" | "footer";
};

/**
 * Plain-text brand mention (NOT a link) — lightsandsirensco.com is
 * currently offline, so this no longer renders an <a>. Kept as a shared
 * component so every call site (nav, footer, recipe strips, etc.) updates
 * together if the destination ever comes back online.
 */
export function LightsAndSirensLink({
  className,
  children,
  variant = "inline",
}: LightsAndSirensLinkProps) {
  const label = children ?? LIGHTS_AND_SIRENS.name;

  return (
    <span
      className={cn(
        variant === "hero" &&
          "font-heading text-sm sm:text-base tracking-[0.18em] uppercase text-primary",
        variant === "inline" && "font-medium text-primary",
        variant === "badge" &&
          "inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary",
        variant === "footer" && "font-heading text-sm tracking-wide text-foreground/90",
        className,
      )}
      data-testid="link-lights-and-sirens"
    >
      {label}
    </span>
  );
}
