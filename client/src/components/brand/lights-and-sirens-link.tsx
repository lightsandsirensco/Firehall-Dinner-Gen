import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LIGHTS_AND_SIRENS } from "@/lib/lights-and-sirens";

type LightsAndSirensLinkProps = {
  className?: string;
  children?: ReactNode;
  /**
   * hero = prominent under tagline; inline = body text; badge = pill;
   * plain = inherits the surrounding text styling exactly
   */
  variant?: "hero" | "inline" | "badge" | "footer" | "plain";
};

/** Parent-brand mention — links to lightsandsirensco.com in a new tab, styled to blend in. */
export function LightsAndSirensLink({
  className,
  children,
  variant = "inline",
}: LightsAndSirensLinkProps) {
  const label = children ?? LIGHTS_AND_SIRENS.name;

  return (
    <a
      href={LIGHTS_AND_SIRENS.website}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "underline-offset-4 hover:underline",
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
    </a>
  );
}

/** Renders a copy string with every "Lights & Sirens Co." linked, keeping the surrounding styling. */
export function WithLightsAndSirensLinks({ text }: { text: string }) {
  const parts = text.split(LIGHTS_AND_SIRENS.name);
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <LightsAndSirensLink variant="plain" />}
        </span>
      ))}
    </>
  );
}
