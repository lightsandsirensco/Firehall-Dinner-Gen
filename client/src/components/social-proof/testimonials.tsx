import { Star } from "lucide-react";
import type { SocialProofTestimonial } from "@shared/social-proof/types";
import { formatTestimonialAttribution } from "@shared/social-proof/format";
import { cn } from "@/lib/utils";

interface TestimonialsProps {
  testimonials: SocialProofTestimonial[];
  className?: string;
}

function StarRating() {
  return (
    <div className="flex items-center gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
          aria-hidden
        />
      ))}
    </div>
  );
}

function TestimonialCard({ item }: { item: SocialProofTestimonial }) {
  const { attribution } = item;
  const attributionText = formatTestimonialAttribution(attribution);

  return (
    <article
      className="flex h-full w-[min(82vw,280px)] shrink-0 snap-start flex-col rounded-2xl border border-border/30 bg-card/40 p-4 sm:w-[300px] sm:p-5"
      data-testid={`testimonial-${item.id}`}
    >
      <StarRating />
      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground">
        &ldquo;{item.quote}&rdquo;
      </blockquote>
      {attributionText ? (
        <footer className="mt-3 text-xs text-muted-foreground">
          {attribution.name && !attribution.anonymous ? (
            <>
              <span className="font-semibold text-foreground">{attribution.name}</span>
              {attribution.role ? <> · {attribution.role}</> : null}
            </>
          ) : (
            <span className="font-medium">{attributionText}</span>
          )}
        </footer>
      ) : null}
    </article>
  );
}

export function Testimonials({ testimonials, className }: TestimonialsProps) {
  if (!testimonials.length) return null;

  return (
    <div className={cn("space-y-3", className)} data-testid="social-proof-testimonials">
      <ul className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-momentum scrollbar-hide -mx-1 px-1">
        {testimonials.map((item) => (
          <li key={item.id}>
            <TestimonialCard item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
