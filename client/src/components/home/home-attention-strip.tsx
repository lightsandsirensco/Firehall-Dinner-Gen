import { Link } from "wouter";
import { AlertTriangle, CheckCircle2, ShoppingCart, Vote } from "lucide-react";
import { cn } from "@/lib/utils";

export type AttentionItem = {
  id: string;
  href: string;
  label: string;
  detail: string;
  tone: "urgent" | "open" | "ok";
  testId: string;
};

/**
 * Action chips — "we're low on milk", not "open Inventory".
 */
export function HomeAttentionStrip({
  items,
  className,
}: {
  items: AttentionItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section
      className={cn("space-y-2", className)}
      aria-labelledby="home-attention"
      data-testid="home-attention-strip"
    >
      <h2
        id="home-attention"
        className="px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Needs attention
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                "flex min-h-[56px] items-center gap-3 rounded-2xl border px-4 py-3 touch-manipulation transition-colors",
                item.tone === "urgent"
                  ? "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15"
                  : item.tone === "open"
                    ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                    : "border-border/40 bg-card/40 hover:bg-muted/30",
              )}
              data-testid={item.testId}
            >
              <AttentionIcon tone={item.tone} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{item.label}</p>
                <p className="text-sm text-muted-foreground line-clamp-1">{item.detail}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AttentionIcon({ tone }: { tone: AttentionItem["tone"] }) {
  if (tone === "urgent") {
    return <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />;
  }
  if (tone === "open") {
    return <Vote className="h-5 w-5 shrink-0 text-primary" aria-hidden />;
  }
  return <ShoppingCart className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />;
}

export function HomeAllClear({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-border/35 bg-muted/15 px-4 py-3 text-sm text-muted-foreground",
        className,
      )}
      data-testid="home-all-clear"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
      <span>Hall looks steady — nothing urgent right now.</span>
    </div>
  );
}
