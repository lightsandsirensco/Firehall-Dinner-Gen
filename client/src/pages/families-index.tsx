import { useEffect, useMemo } from "react";
import { Link } from "wouter";
import { SiteHeader } from "@/components/site-header";
import { getSavedCount } from "@/lib/saved-meals";

export default function FamiliesIndexPage() {
  const favCount = useMemo(() => getSavedCount(), []);

  useEffect(() => {
    const prev = document.title;
    document.title = "Recipe Families | Firehall Meals";
    return () => {
      document.title = prev || "Firehall Meals";
    };
  }, []);

  return (
    <div className="page-shell min-h-screen min-h-[100dvh] bg-background">
      <SiteHeader activePage="explore" favCount={favCount} />
      <main className="max-w-[1100px] mx-auto px-page py-10 sm:py-14">
        <h1 className="font-heading tracking-tight text-3xl sm:text-4xl">Recipe families</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
          Recipe families group close variants so crews can compare and pick the version that fits the shift. This page
          is a simple index right now — browse Explore for the full lineup by situation.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/explore" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            Explore recipes
          </Link>
          <Link href="/about" className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-semibold">
            About FirehallMeals
          </Link>
        </div>
      </main>
    </div>
  );
}

