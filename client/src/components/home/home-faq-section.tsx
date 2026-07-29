import { Link } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";
import { HOME_FAQ_ITEMS } from "@/lib/seo/home-faq";
import { CTA, HOME } from "@/lib/brand-copy";

export function HomeFaqSection() {
  return (
    <section
      className={cn(app.main, app.sectionY)}
      aria-labelledby="home-faq-heading"
    >
      <h2 id="home-faq-heading" className={app.titleSection}>
        {HOME.faqTitle}
      </h2>

      <div className="mt-4 md:hidden">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
          Crew sizing, personal saves, and optional hall linking — answered on the FAQ page.
        </p>
        <Link
          href="/faq"
          className="mt-3 inline-block text-sm text-primary font-medium hover:underline"
          data-testid="home-faq-mobile-link"
        >
          {CTA.fullFaq} →
        </Link>
      </div>

      <Accordion type="single" collapsible className="mt-4 max-w-2xl hidden md:block">
        {HOME_FAQ_ITEMS.map((item, i) => (
          <AccordionItem key={item.question} value={`faq-${i}`} className="border-border/30">
            <AccordionTrigger className="text-left text-sm sm:text-[15px] py-4 hover:no-underline">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p className="mt-5 text-sm text-muted-foreground hidden md:block">
        <Link href="/faq" className="text-primary font-medium hover:underline">
          {CTA.fullFaq}
        </Link>
      </p>
    </section>
  );
}
