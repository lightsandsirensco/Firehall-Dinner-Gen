import { Link } from "wouter";
import { Flame } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { app } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useFaqSeo } from "@/lib/seo/use-faq-seo";
import { HOME_FAQ_ITEMS } from "@/lib/seo/home-faq";
import { Button } from "@/components/ui/button";
import { InternalLinkHub } from "@/components/seo/internal-link-hub";
import { BRAND_NAME, CTA } from "@/lib/brand-copy";

export default function FaqPage() {
  useFaqSeo();

  return (
    <div className={app.page}>
      <SiteHeader activePage="faq" />

      <main className={cn(app.main, "py-10 sm:py-14 max-w-3xl")}>
        <p className={app.eyebrowMuted}>FAQ</p>
        <h1 className={cn(app.titlePage, "mt-3")}>Firefighter & Firehall Meal FAQ</h1>
        <p className={cn(app.lead, "mt-4")}>
          Straight answers about firefighter meals, station cooking, and crew dinners on {BRAND_NAME}.
        </p>

        <dl className="mt-10 space-y-8">
          {HOME_FAQ_ITEMS.map((item) => (
            <div key={item.question}>
              <dt className="font-heading text-lg text-foreground">{item.question}</dt>
              <dd className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 flex flex-col sm:flex-row gap-3">
          <Button asChild className="font-heading uppercase tracking-wide text-xs">
            <Link href="/generator">{CTA.findDinner}</Link>
          </Button>
          <Button asChild variant="outline" className="font-heading uppercase tracking-wide text-xs">
            <Link href="/explore">{CTA.exploreMeals}</Link>
          </Button>
        </div>

        <div className="mt-14 border-t border-border/20 pt-10">
          <InternalLinkHub />
        </div>
      </main>

      <footer className="border-t border-border/20 mt-10">
        <div className="max-w-[1400px] mx-auto px-page py-6 flex items-center justify-center gap-2">
          <Flame className="w-3.5 h-3.5 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground/50">
            <Link href="/" className="hover:text-muted-foreground transition-colors">
              {BRAND_NAME}
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
