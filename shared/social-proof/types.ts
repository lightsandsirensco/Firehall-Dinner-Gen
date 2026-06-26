export interface SocialProofStats {
  meals_generated: number;
  hall_votes: number;
  recipes_saved: number;
  generated_at: string;
}

export interface SocialProofAttribution {
  /** Display name (e.g. "Mike D."). */
  name?: string;
  /** Shift role label (e.g. "Firefighter", "Captain"). */
  role?: string;
  /** Hide identifying details — shows generic label. */
  anonymous?: boolean;
}

export interface SocialProofTestimonial {
  id: string;
  quote: string;
  attribution: SocialProofAttribution;
}

export interface SocialProofPayload {
  stats: SocialProofStats;
  testimonials: SocialProofTestimonial[];
  headline: string;
  subheadline: string;
}
