import { Link } from "wouter";
import { Flame, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className={cn(app.page, "flex items-center justify-center")}>
      <div className="flex flex-col items-center justify-center text-center px-page py-16 fade-up">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
          <div
            className="absolute inset-0 rounded-full bg-primary/5 animate-ping motion-reduce:animate-none"
            style={{ animationDuration: "3s" }}
          />
          <Flame className="w-10 h-10 text-primary/70" aria-hidden />
        </div>

        <p className={cn(app.eyebrowMuted, "mb-3")}>Error 404</p>
        <h1 className={cn(app.titleSection, "mb-2")} data-testid="text-not-found-title">
          Wrong address, crew
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-sm leading-relaxed mb-8">
          That page isn't on the run sheet. It may have moved, or the link's just off — let's get you back to the kitchen.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button asChild size="lg" className="btn-tonight btn-generate active:scale-[0.98] transition-transform touch-manipulation">
            <Link href="/tonight">Pick tonight's meal</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Back to home</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground/60 text-xs mt-8">
          <RefreshCw className="w-3 h-3" aria-hidden />
          <span>Double-check the address, or head back and try again</span>
        </div>
      </div>
    </div>
  );
}
