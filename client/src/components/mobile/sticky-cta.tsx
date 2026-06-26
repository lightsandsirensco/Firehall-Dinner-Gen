import type { ComponentProps } from "react";
import { GenerateButtons } from "@/components/filter-panel";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type StickyCTAProps = ComponentProps<typeof GenerateButtons> & { compact?: boolean };

/**
 * Single dominant thumb-zone CTA — mobile only (desktop uses sidebar buttons).
 */
export function StickyCTA(props: StickyCTAProps) {
  return (
    <div className={app.stickyBarAboveTabs} data-testid="mobile-sticky-cta">
      <div className="px-page pt-2.5 pb-1">
        <GenerateButtons
          {...props}
          compact={props.compact ?? true}
          className={cn("gap-2", props.className)}
        />
      </div>
    </div>
  );
}
