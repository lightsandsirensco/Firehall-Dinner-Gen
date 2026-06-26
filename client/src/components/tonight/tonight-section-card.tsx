import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TonightSectionCardProps {
  title: string;
  icon: LucideIcon;
  testId: string;
  children: ReactNode;
  className?: string;
}

export function TonightSectionCard({
  title,
  icon: Icon,
  testId,
  children,
  className,
}: TonightSectionCardProps) {
  return (
    <section
      className={cn("overflow-hidden rounded-2xl border border-border/45 bg-card/35", className)}
      data-testid={testId}
      aria-label={title}
    >
      <header className="flex items-center gap-2.5 border-b border-border/30 bg-muted/15 px-4 py-3.5">
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <h2 className="font-heading text-base sm:text-lg tracking-wide leading-snug">{title}</h2>
      </header>
      <div className="divide-y divide-border/30">{children}</div>
    </section>
  );
}
