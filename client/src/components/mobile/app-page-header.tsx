import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

interface AppPageHeaderProps {
  eyebrow?: ReactNode;
  title: string;
  subtitle?: string;
  /** feed = explore gradient band; event = pizza ember */
  variant?: "feed" | "event" | "minimal";
  className?: string;
  children?: ReactNode;
}

export function AppPageHeader({
  eyebrow,
  title,
  subtitle,
  variant = "feed",
  className,
  children,
}: AppPageHeaderProps) {
  const isEvent = variant === "event";
  const isMinimal = variant === "minimal";

  return (
    <header
      className={cn(
        "relative overflow-hidden border-b border-border/30",
        !isMinimal && "border-b",
        className,
      )}
    >
      {!isMinimal && (
        <>
          <div
            className={cn(
              "absolute inset-0",
              isEvent
                ? "bg-gradient-to-br from-red-950/90 via-red-950/80 to-zinc-950"
                : "bg-gradient-to-b from-zinc-950 via-zinc-900/95 to-background",
            )}
            aria-hidden
          />
          <div
            className={cn(
              "absolute inset-0",
              isEvent
                ? "bg-[radial-gradient(ellipse_70%_80%_at_50%_120%,rgba(234,88,12,0.35),transparent)]"
                : "bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(234,88,12,0.2),transparent)]",
            )}
            aria-hidden
          />
        </>
      )}
      <div className={cn(app.mainFeed, "relative py-7 sm:py-10 md:py-12")}>
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <h1 className={cn(app.titlePage, "max-w-[16ch] sm:max-w-2xl")}>{title}</h1>
        {subtitle && <p className={cn(app.lead, "mt-3 max-w-md")}>{subtitle}</p>}
        {children}
      </div>
    </header>
  );
}
