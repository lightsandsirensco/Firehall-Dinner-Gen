import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame } from "lucide-react";

export function LoadingState() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center animate-pulse">
          <Flame className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-5 w-40 mb-3" />
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-6 w-10" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-5" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-5 w-24 mb-3" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-5 w-6 flex-shrink-0" />
                <Skeleton className="h-5 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground animate-pulse">
        Firing up the kitchen...
      </p>
    </div>
  );
}
