import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface WorkflowExitProps {
  href: string;
  label: string;
  hint?: string;
  className?: string;
  testId?: string;
}

/**
 * Prevents dead ends — every deep page needs an obvious way out
 * to the dashboard that owns the job.
 */
export function WorkflowExit({
  href,
  label,
  hint,
  className,
  testId = "workflow-exit",
}: WorkflowExitProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border/50 bg-muted/15 px-4 py-3 text-center",
        className,
      )}
      data-testid={testId}
    >
      {hint ? <p className="mb-1.5 text-xs text-muted-foreground">{hint}</p> : null}
      <Link
        href={href}
        className="text-sm font-semibold text-primary hover:underline touch-manipulation min-h-10 inline-flex items-center"
      >
        {label}
      </Link>
    </div>
  );
}
