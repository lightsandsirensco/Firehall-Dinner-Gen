import { Link } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HOME_FAQ_ITEMS } from "@/lib/seo/home-faq";
import { CTA, HOME } from "@/lib/brand-copy";

export function HomeFaqSection() {
  return (
    <section
      className="max-w-[1400px] mx-auto px-page py-10 sm:py-16"
      aria-labelledby="home-faq-heading"
    >
      <h2
        id="home-faq-heading"
        className="font-heading text-xl sm:text-2xl tracking-tight text-foreground"
      >
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
