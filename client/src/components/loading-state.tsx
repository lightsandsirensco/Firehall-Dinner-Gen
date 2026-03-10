import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`premium-skeleton rounded-md ${className ?? ""}`} />;
}

export function LoadingState() {
  return (
    <div className="space-y-5 animate-in fade-in duration-500" data-testid="loading-state">
      <div className="flex items-center gap-4 mb-3 fade-up">
        <div className="w-12 h-12 rounded-md bg-primary/15 flex items-center justify-center">
          <Flame className="w-6 h-6 text-primary animate-pulse" />
        </div>
        <div className="space-y-2.5 flex-1">
          <ShimmerBlock className="h-7 w-3/4" />
          <ShimmerBlock className="h-4 w-1/2" />
        </div>
      </div>

      <Card className="premium-card">
        <CardContent className="p-5">
          <ShimmerBlock className="h-5 w-36 mb-4" />
          <div className="flex gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2.5" style={{ animationDelay: `${i * 80}ms` }}>
                <ShimmerBlock className="h-5 w-5 rounded-full" />
                <ShimmerBlock className="h-7 w-12" />
                <ShimmerBlock className="h-3.5 w-14" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="premium-card" style={{ animationDelay: "100ms" }}>
        <CardContent className="p-5">
          <ShimmerBlock className="h-5 w-32 mb-4" />
          <div className="grid grid-cols-2 gap-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <ShimmerBlock key={i} className="h-5" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="premium-card" style={{ animationDelay: "200ms" }}>
        <CardContent className="p-5">
          <ShimmerBlock className="h-5 w-28 mb-4" />
          <div className="space-y-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3.5">
                <ShimmerBlock className="h-5 w-7 flex-shrink-0 rounded-full" />
                <ShimmerBlock className="h-5 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 pt-1">
        <Flame className="w-4 h-4 text-primary/50 animate-pulse" />
        <p className="text-sm text-muted-foreground tracking-wide" data-testid="text-loading-message">
          Firing up the kitchen...
        </p>
      </div>
    </div>
  );
}
