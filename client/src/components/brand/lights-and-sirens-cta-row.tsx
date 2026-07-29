import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LIGHTS_AND_SIRENS, LIGHTS_COPY } from "@/lib/lights-and-sirens";

type LightsAndSirensCtaRowProps = {
  className?: string;
  size?: "default" | "sm";
};

export function LightsAndSirensCtaRow({ className, size = "default" }: LightsAndSirensCtaRowProps) {
  const btnClass =
    size === "sm"
      ? "h-9 px-4 text-[11px] font-heading uppercase tracking-[0.1em]"
      : "h-11 px-5 text-xs font-heading uppercase tracking-[0.1em]";

  return (
    <div
      className={cn("flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3", className)}
      data-testid="lights-cta-row"
    >
      <Button asChild size={size === "sm" ? "sm" : "default"} className={btnClass}>
        <a href={LIGHTS_AND_SIRENS.home} target="_blank" rel="noopener noreferrer">
          {LIGHTS_COPY.visitCta}
          <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-70" aria-hidden />
        </a>
      </Button>
      <Button asChild variant="outline" size={size === "sm" ? "sm" : "default"} className={btnClass}>
        <a href={LIGHTS_AND_SIRENS.shop} target="_blank" rel="noopener noreferrer">
          {LIGHTS_COPY.shopCta}
        </a>
      </Button>
    </div>
  );
}
