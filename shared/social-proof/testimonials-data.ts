import type { SocialProofTestimonial } from "./types.js";

/**
 * Named hall testimonials — firefighter voice, one real benefit each.
 * Only reference features that work in production today (no Canteen Mode, no crew voting).
 */
export const SOCIAL_PROOF_TESTIMONIALS: SocialProofTestimonial[] = [
  {
    id: "mike-d-busy-shift",
    quote:
      "On a busy day nobody wants to be the one planning dinner. Somebody pulls this up, picks a protein and how many we're feeding, and we've got something figured out in a couple minutes.",
    attribution: { name: "Mike D.", role: "Firefighter" },
  },
  {
    id: "steve-r-grocery-run",
    quote:
      "I usually end up doing the grocery run. I add the recipe to my list and the amounts are already worked out for the crew, so I'm not doing math in the store aisle.",
    attribution: { name: "Steve R.", role: "Firefighter" },
  },
  {
    id: "kyle-m-hall-sized",
    quote:
      "I didn't cook much before I got hired. The steps are straightforward and everything's already sized for a hall, so I'm not guessing how much chicken feeds nine guys.",
    attribution: { name: "Kyle M.", role: "Firefighter — Ontario" },
  },
  {
    id: "matt-p-meal-wheel",
    quote:
      "We were stuck on tacos, chili and chicken parm on repeat. Someone spins the wheel at the start of shift, half as a joke, and it's put a few new meals into our rotation.",
    attribution: { name: "Matt P.", role: "Firefighter" },
  },
  {
    id: "ryan-c-eight-answers",
    quote: "Beats asking eight guys what they want and getting eight different answers.",
    attribution: { name: "Ryan C.", role: "Firefighter" },
  },
  {
    id: "jake-b-captain",
    quote:
      "Most recipe sites assume you're feeding a family of four. This one assumes you're feeding a crew, and you can sort by how much time you've actually got. Didn't expect us to keep using it, but somebody's on it most shifts.",
    attribution: { name: "Jake B.", role: "Captain" },
  },
];

export const SOCIAL_PROOF_HEADLINE = "Firefighters cooking on shift";
export const SOCIAL_PROOF_SUBHEADLINE =
  "Picking dinner, sizing it for the crew and sorting out the grocery list — from firefighters who cook on shift.";
