import { useQuery } from "@tanstack/react-query";
import { Testimonials } from "@/components/social-proof/testimonials";
import { fetchSocialProof, socialProofQueryKey } from "@/lib/social-proof-api";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

const VALUE_HEADLINE = "From solo dinners to feeding the entire crew.";
const VALUE_SUBHEADLINE =
  "Find recipes, calculate portions, and build grocery lists without the guesswork.";

interface SocialProofSectionProps {
  className?: string;
}

export function SocialProofSection({ className }: SocialProofSectionProps) {
  const { data } = useQuery({
    queryKey: socialProofQueryKey,
    queryFn: fetchSocialProof,
    staleTime: 120_000,
  });

  const testimonials = data?.testimonials ?? [];

  return (
    <section
      className={cn("border-y border-border/25 bg-card/20", className)}
      aria-labelledby="social-proof-heading"
      data-testid="social-proof-section"
    >
      <div className={cn(app.main, app.sectionY, "space-y-10 sm:space-y-12")}>
        <div className="mx-auto max-w-3xl text-center" data-testid="home-value-proposition">
          <span aria-hidden className="mx-auto block h-0.5 w-10 rounded-full bg-primary" />
          <h2
            id="social-proof-heading"
            className={cn(app.titlePage, "mt-5 text-balance sm:mt-6")}
          >
            {VALUE_HEADLINE}
          </h2>
          <p className={cn(app.lead, "mx-auto mt-4 max-w-2xl text-pretty")}>{VALUE_SUBHEADLINE}</p>
        </div>

        {testimonials.length > 0 ? <Testimonials testimonials={testimonials} /> : null}
      </div>
    </section>
  );
}
