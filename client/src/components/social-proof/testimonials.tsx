import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import type { SocialProofTestimonial } from "@shared/social-proof/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const AUTOPLAY_MS = 5000;

interface TestimonialsProps {
  testimonials: SocialProofTestimonial[];
  className?: string;
}

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function TestimonialCard({ item }: { item: SocialProofTestimonial }) {
  const { attribution } = item;
  const attributionLabel = [attribution.name, attribution.role].filter(Boolean).join(", ");

  return (
    <article
      className="flex h-full flex-col rounded-2xl border border-white/10 bg-zinc-950/70 p-5 shadow-lg shadow-black/20 sm:p-6"
      data-testid={`testimonial-${item.id}`}
    >
      <Quote className="h-5 w-5 text-primary/60" aria-hidden />
      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-zinc-100 sm:text-[0.9375rem] sm:leading-relaxed">
        &ldquo;{item.quote}&rdquo;
      </blockquote>
      {attributionLabel ? (
        <footer className="mt-4 text-sm text-zinc-400">
          <cite className="not-italic">
            <span className="text-zinc-500" aria-hidden>
              —
            </span>{" "}
            <span className="font-medium text-zinc-200">{attributionLabel}</span>
          </cite>
        </footer>
      ) : null}
    </article>
  );
}

export function Testimonials({ testimonials, className }: TestimonialsProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
    duration: reducedMotion ? 0 : 25,
  });

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit({
      loop: true,
      align: "start",
      slidesToScroll: 1,
      duration: reducedMotion ? 0 : 25,
    });
  }, [emblaApi, reducedMotion]);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index, reducedMotion);
    },
    [emblaApi, reducedMotion],
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || reducedMotion || isPaused) return;

    const timer = window.setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0, reducedMotion);
      }
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [emblaApi, reducedMotion, isPaused]);

  if (!testimonials.length) return null;

  const activeLabel = testimonials[selectedIndex]?.attribution.name ?? `Testimonial ${selectedIndex + 1}`;

  return (
    <div
      className={cn("space-y-5", className)}
      data-testid="social-proof-testimonials"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
    >
      <div
        className="relative"
        role="region"
        aria-roledescription="carousel"
        aria-label="Firefighter testimonials"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollPrev();
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollNext();
          }
        }}
      >
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Showing testimonial {selectedIndex + 1} of {testimonials.length}: {activeLabel}
        </p>

        <div ref={emblaRef} className="overflow-hidden">
          <ul className="flex touch-pan-y">
            {testimonials.map((item, index) => (
              <li
                key={item.id}
                className="min-w-0 shrink-0 grow-0 basis-full px-1 sm:basis-1/2 sm:px-1.5 lg:basis-1/3"
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${testimonials.length}`}
              >
                <TestimonialCard item={item} />
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full border-white/15 bg-zinc-950/50 text-zinc-200 hover:bg-zinc-900 hover:text-white"
            onClick={scrollPrev}
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>

          <div
            className="flex flex-wrap items-center justify-center gap-2"
            role="tablist"
            aria-label="Choose testimonial"
          >
            {testimonials.map((item, index) => {
              const isActive = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Go to testimonial ${index + 1}${item.attribution.name ? `: ${item.attribution.name}` : ""}`}
                  className={cn(
                    "h-2.5 rounded-full transition-all duration-300",
                    isActive ? "w-7 bg-amber-400" : "w-2.5 bg-zinc-600 hover:bg-zinc-500",
                  )}
                  onClick={() => scrollTo(index)}
                />
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full border-white/15 bg-zinc-950/50 text-zinc-200 hover:bg-zinc-900 hover:text-white"
            onClick={scrollNext}
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
