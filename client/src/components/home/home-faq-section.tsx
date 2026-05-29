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
      className="max-w-[1400px] mx-auto px-page py-12 sm:py-16"
      aria-labelledby="home-faq-heading"
    >
      <h2
        id="home-faq-heading"
        className="font-heading text-xl sm:text-2xl tracking-tight text-foreground"
      >
        {HOME.faqTitle}
      </h2>
      <Accordion type="single" collapsible className="mt-4 max-w-2xl">
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
      <p className="mt-5 text-sm text-muted-foreground">
        <Link href="/faq" className="text-primary font-medium hover:underline">
          {CTA.fullFaq}
        </Link>
      </p>
    </section>
  );
}
