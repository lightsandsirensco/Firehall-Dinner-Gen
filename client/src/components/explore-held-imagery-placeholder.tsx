import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExploreHeldImageryLabel } from "@shared/explore-imagery-status";

const HELD_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")";

export interface ExploreHeldImageryPlaceholderProps {
  label: ExploreHeldImageryLabel | string;
  title?: string;
  variant?: "card" | "detail";
  className?: string;
}

/** Branded held state — no stock food, no broken-image chrome. */
export function ExploreHeldImageryPlaceholder({
  label,
  title,
  variant = "card",
  className,
}: ExploreHeldImageryPlaceholderProps) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#0a0a0c]",
        variant === "card" ? "min-h-[200px]" : undefined,
        className,
      )}
      aria-hidden={variant === "card"}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: HELD_TEXTURE }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_110%,hsl(var(--primary)/0.14),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(168deg,rgba(255,255,255,0.035)_0%,transparent_42%,rgba(0,0,0,0.42)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative z-10 flex max-w-[85%] flex-col items-center gap-2.5 px-4 text-center">
        <Flame className="h-4 w-4 text-primary/45" strokeWidth={1.5} aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">{label}</p>
        {title && variant === "detail" ? (
          <p className="font-heading text-base leading-snug text-white/35 line-clamp-2">{title}</p>
        ) : null}
      </div>
    </div>
  );
}
