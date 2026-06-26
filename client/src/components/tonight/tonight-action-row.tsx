import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface TonightActionRowProps {
  label: string;
  hint?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  status?: boolean;
  testId?: string;
}

export function TonightActionRow({
  label,
  hint,
  href,
  onClick,
  disabled,
  status,
  testId,
}: TonightActionRowProps) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold leading-snug", status && "text-sm font-medium text-muted-foreground")}>
          {label}
        </p>
        {hint ? <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{hint}</p> : null}
      </div>
      {!status ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
    </>
  );

  const className = cn(
    "flex w-full items-center gap-3 px-4 py-3.5 min-h-[52px] text-left touch-manipulation transition-colors",
    status ? "bg-muted/10" : "hover:bg-primary/5 active:bg-primary/8",
    disabled && "pointer-events-none opacity-50",
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={className} data-testid={testId}>
        {body}
      </button>
    );
  }

  if (href && !disabled) {
    return (
      <Link href={href} className={className} data-testid={testId}>
        {body}
      </Link>
    );
  }

  return (
    <div className={className} data-testid={testId} role="status">
      {body}
    </div>
  );
}
