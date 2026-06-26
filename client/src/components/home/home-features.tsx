import { Bookmark, Link2, ListChecks, RotateCw, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { HOME } from "@/lib/brand-copy";

const FEATURE_ICONS = [Sparkles, Bookmark, Users, ListChecks, RotateCw, Link2] as const;

export function HomeFeatures() {
  return (
    <section
      className="border-y border-border/20 bg-card/15"
      aria-labelledby="home-features-heading"
      data-testid="home-features"
    >
      <div className="max-w-[1400px] mx-auto px-page py-10 sm:py-14">
        <div className="max-w-lg mb-8">
          <h2
            id="home-features-heading"
            className="font-heading text-2xl sm:text-3xl leading-tight tracking-tight text-foreground"
          >
            {HOME.featuresTitle}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">{HOME.featuresLead}</p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOME.features.map(({ title, body }, index) => {
            const Icon = FEATURE_ICONS[index] ?? Sparkles;
            return (
              <li
                key={title}
                className={cn(
                  "rounded-2xl border border-border/30 bg-background/40 p-5 sm:p-6",
                  "transition-[border-color] duration-300 hover:border-primary/20",
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                  <Icon className="w-5 h-5 text-primary" aria-hidden />
                </div>
                <h3 className="mt-4 font-heading text-lg text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
