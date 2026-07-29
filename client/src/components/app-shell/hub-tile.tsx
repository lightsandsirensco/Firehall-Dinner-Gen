import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface HubTileProps {
  href?: string;
  onClick?: () => void;
  icon: LucideIcon;
  title: string;
  description?: string;
  secondary?: boolean;
  testId?: string;
}

function HubTileBody({
  icon: Icon,
  title,
  description,
  secondary,
}: Pick<HubTileProps, "icon" | "title" | "description" | "secondary">) {
  return (
    <>
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          secondary ? "bg-muted/40 text-muted-foreground" : "bg-primary/12 text-primary",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold leading-snug", secondary && "text-sm")}>{title}</p>
        {description ? (
          <p className={cn("mt-0.5 text-sm text-muted-foreground line-clamp-2", secondary && "text-xs")}>
            {description}
          </p>
        ) : null}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </>
  );
}

const tileClass = (secondary?: boolean) =>
  cn(
    "flex min-h-[72px] w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left",
    "transition-transform duration-200 ease-out touch-manipulation active:scale-[0.98]",
    "hover-elevate active-elevate-2",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    secondary ? "border-border/35 bg-muted/15" : "border-border/45 bg-card/50",
  );

export function HubTile({ href, onClick, icon: Icon, title, description, secondary, testId }: HubTileProps) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={tileClass(secondary)} data-testid={testId}>
        <HubTileBody icon={Icon} title={title} description={description} secondary={secondary} />
      </button>
    );
  }

  return (
    <Link href={href ?? "#"} className={tileClass(secondary)} data-testid={testId}>
      <HubTileBody icon={Icon} title={title} description={description} secondary={secondary} />
    </Link>
  );
}
