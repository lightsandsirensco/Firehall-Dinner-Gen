import { useQuery } from "@tanstack/react-query";
import { SocialProofStatsRow } from "@/components/social-proof/social-proof-stats";
import { Testimonials } from "@/components/social-proof/testimonials";
import { fetchSocialProof, socialProofQueryKey } from "@/lib/social-proof-api";
import {
  SOCIAL_PROOF_HEADLINE,
  SOCIAL_PROOF_SUBHEADLINE,
  SOCIAL_PROOF_TESTIMONIALS,
} from "@shared/social-proof/testimonials-data";
import { cn } from "@/lib/utils";

interface SocialProofSectionProps {
  className?: string;
}

export function SocialProofSection({ className }: SocialProofSectionProps) {
  const { data } = useQuery({
    queryKey: socialProofQueryKey,
    queryFn: fetchSocialProof,
    staleTime: 120_000,
  });

  const stats = data?.stats;
  const testimonials = data?.testimonials ?? SOCIAL_PROOF_TESTIMONIALS;
  const headline = data?.headline ?? SOCIAL_PROOF_HEADLINE;
  const subheadline = data?.subheadline ?? SOCIAL_PROOF_SUBHEADLINE;

  return (
    <section
      className={cn("border-y border-border/25 bg-card/20", className)}
      aria-labelledby="social-proof-heading"
      data-testid="social-proof-section"
    >
      <div className="max-w-[1400px] mx-auto px-page py-10 sm:py-14 space-y-8">
        <div className="max-w-2xl">
          <h2
            id="social-proof-heading"
            className="font-heading text-2xl sm:text-3xl leading-tight tracking-tight text-foreground text-balance"
          >
            {headline}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {subheadline}
          </p>
        </div>

        {stats ? <SocialProofStatsRow stats={stats} /> : null}

        <Testimonials testimonials={testimonials} />
      </div>
    </section>
  );
}
