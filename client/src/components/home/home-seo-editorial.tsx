import { Link } from "wouter";
import { CTA, HOME } from "@/lib/brand-copy";

const LINKS = [
  { href: "/generator", label: CTA.findDinner },
  { href: "/recipes", label: CTA.viewRecipes },
  { href: "/wheel", label: CTA.classicsWheel },
  { href: "/guides", label: "Hall guides" },
] as const;

export function HomeSeoEditorial() {
  return (
    <section className="border-t border-border/20 bg-card/15" aria-labelledby="home-seo-heading">
      <div className="max-w-[1400px] mx-auto px-page py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2
            id="home-seo-heading"
            className="font-heading text-2xl sm:text-3xl leading-tight tracking-tight text-foreground"
          >
            {HOME.seoTitle}
          </h2>
          <div className="mt-5 space-y-4 text-[15px] sm:text-base text-muted-foreground leading-[1.75] max-w-prose">
            <p>
              Firehall Meals is for station kitchens — crew-sized recipes, honest timing, and guides
              on nutrition and hall life. No influencer food. No fake blog fluff. Just solid meals
              crews actually make.
            </p>
            <p>
              Built by a firefighter and his wife after years around the kitchen table. Browse recipes,
              read the guides, or hit Find a Meal when you need a plan tonight.
            </p>
          </div>
          <nav aria-label="Explore" className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-primary hover:text-primary/85 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
