import { useQuery } from "@tanstack/react-query";
import { SocialProofStatsRow } from "@/components/social-proof/social-proof-stats";
import { Testimonials } from "@/components/social-proof/testimonials";
import { fetchSocialProof, socialProofQueryKey } from "@/lib/social-proof-api";
import { hasCredibleSocialProofStats } from "@shared/social-proof/format";
import { SOCIAL_PROOF_HEADLINE, SOCIAL_PROOF_SUBHEADLINE } from "@shared/social-proof/testimonials-data";
import { cn } from "@/lib/utils";
import { app } from "@/lib/design-tokens";

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
  const testimonials = data?.testimonials ?? [];
  const headline = data?.headline ?? SOCIAL_PROOF_HEADLINE;
  const subheadline = data?.subheadline ?? SOCIAL_PROOF_SUBHEADLINE;
  const hasTestimonials = testimonials.length > 0;
  const hasStats = hasCredibleSocialProofStats(stats);

  if (!hasTestimonials && !hasStats) return null;

  return (
    <section
      className={cn("border-y border-border/25 bg-card/20", className)}
      aria-labelledby="social-proof-heading"
      data-testid="social-proof-section"
    >
      <div className={cn(app.main, app.sectionY, "space-y-8")}>
        <div className="max-w-2xl">
          <h2 id="social-proof-heading" className={cn(app.titleSection, "text-balance")}>
            {headline}
          </h2>
          {hasTestimonials ? (
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              {subheadline}
            </p>
          ) : null}
        </div>

        {hasStats ? <SocialProofStatsRow stats={stats!} /> : null}

        {hasTestimonials ? <Testimonials testimonials={testimonials} /> : null}
      </div>
    </section>
  );
}
