/**
 * Testimonial records — server-only so internal consent notes never ship in
 * the client bundle. Wording is verbatim; do not edit a quote without the
 * firefighter's updated wording.
 *
 * A record is public only when `approved === true`, which is set solely after
 * the owner explicitly confirms the person is real and consented to public use.
 */
import type { SocialProofTestimonial, TestimonialRecord } from "../../shared/social-proof/types.js";

export const TESTIMONIAL_RECORDS: TestimonialRecord[] = [
  {
    id: "mike-d-busy-shift",
    quote:
      "On a busy day nobody wants to be the one planning dinner. Somebody pulls this up, picks a protein and how many we're feeding, and we've got something figured out in a couple minutes.",
    attribution: { name: "Mike D.", role: "Firefighter" },
    approved: false,
  },
  {
    id: "steve-r-grocery-run",
    quote:
      "I usually end up doing the grocery run. I add the recipe to my list and the amounts are already worked out for the crew, so I'm not doing math in the store aisle.",
    attribution: { name: "Steve R.", role: "Firefighter" },
    approved: false,
  },
  {
    id: "kyle-m-hall-sized",
    quote:
      "I didn't cook much before I got hired. The steps are straightforward and everything's already sized for a hall, so I'm not guessing how much chicken feeds nine guys.",
    attribution: { name: "Kyle M.", role: "Firefighter" },
    approved: false,
  },
  {
    id: "matt-p-meal-wheel",
    quote:
      "We were stuck on tacos, chili and chicken parm on repeat. Someone spins the wheel at the start of shift, half as a joke, and it's put a few new meals into our rotation.",
    attribution: { name: "Matt P.", role: "Firefighter" },
    approved: false,
  },
  {
    id: "ryan-c-eight-answers",
    quote: "Beats asking eight guys what they want and getting eight different answers.",
    attribution: { name: "Ryan C.", role: "Firefighter" },
    approved: false,
  },
  {
    id: "jake-b-captain",
    quote:
      "Most recipe sites assume you're feeding a family of four. This one assumes you're feeding a crew, and you can sort by how much time you've actually got. Didn't expect us to keep using it, but somebody's on it most shifts.",
    attribution: { name: "Jake B.", role: "Captain" },
    approved: false,
  },
];

/** Approved records only, reduced to the public shape (internal fields dropped). */
export function getPublishedTestimonials(
  records: readonly TestimonialRecord[] = TESTIMONIAL_RECORDS,
): SocialProofTestimonial[] {
  return records
    .filter((r) => r.approved === true)
    .map((r) => ({
      id: r.id,
      quote: r.quote,
      attribution: {
        ...(r.attribution.name ? { name: r.attribution.name } : {}),
        ...(r.attribution.role ? { role: r.attribution.role } : {}),
        ...(r.attribution.anonymous ? { anonymous: true } : {}),
      },
    }));
}
