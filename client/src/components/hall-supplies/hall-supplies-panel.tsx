import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { HALL_CANTEEN } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

interface HallSuppliesPanelProps {
  hallId: string;
  className?: string;
}

/** Legacy hall settings panel — links to the staples tracker. */
export function HallSuppliesPanel({ hallId: _hallId, className }: HallSuppliesPanelProps) {
  return (
    <div
      id="hall-supplies"
      className={cn("rounded-2xl border border-border/45 bg-card/40 px-4 py-5 space-y-3", className)}
      data-testid="hall-supplies-panel"
    >
      <p className="text-sm text-muted-foreground">{HALL_CANTEEN.subtitle}</p>
      <Button asChild className="w-full min-h-[44px]">
        <Link href="/hall/canteen">{HALL_CANTEEN.viewCanteen}</Link>
      </Button>
    </div>
  );
}
