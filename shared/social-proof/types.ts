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

/** Public shape — the only testimonial fields ever sent to a client. */
export interface SocialProofTestimonial {
  id: string;
  quote: string;
  attribution: SocialProofAttribution;
}

/** Server-only record. Internal fields must never reach a public payload. */
export interface TestimonialRecord extends SocialProofTestimonial {
  /** Publishes only when exactly `true` — set solely on the owner's explicit confirmation. */
  approved: boolean;
  /** "YYYY-MM-DD" the owner approved public use. */
  approvedAt?: string;
  /** Internal provenance / consent note. */
  consentNote?: string;
}

export interface SocialProofPayload {
  stats: SocialProofStats;
  testimonials: SocialProofTestimonial[];
  headline: string;
  subheadline: string;
}
