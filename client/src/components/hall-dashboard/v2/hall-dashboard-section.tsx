import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HallDashboardSectionProps {
  id?: string;
  title: string;
  icon?: ReactNode;
  action?: { label: string; href: string };
  children: ReactNode;
  className?: string;
  testId?: string;
}

export function HallDashboardSection({
  id,
  title,
  icon,
  action,
  children,
  className,
  testId,
}: HallDashboardSectionProps) {
  return (
    <section
      id={id}
      className={cn("rounded-2xl border border-border/45 bg-card/35 overflow-hidden", className)}
      aria-labelledby={id ? `${id}-heading` : undefined}
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border/30 bg-muted/15">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
          <h2
            id={id ? `${id}-heading` : undefined}
            className="font-heading text-base sm:text-lg tracking-wide leading-snug"
          >
            {title}
          </h2>
        </div>
        {action ? (
          <Link
            href={action.href}
            className="text-sm font-medium text-primary hover:text-primary/85 inline-flex items-center gap-0.5 shrink-0 min-h-11 px-2 touch-manipulation"
          >
            {action.label}
            <ChevronRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
