import type { SocialProofTestimonial } from "./types.js";

/** Named hall testimonials — real roles, firefighter voice. */
export const SOCIAL_PROOF_TESTIMONIALS: SocialProofTestimonial[] = [
  {
    id: "mike-d-crew-vote",
    quote:
      "We work at a busy station, the crew vote feature helps us plan our dinners ahead of a busy shift.",
    attribution: { name: "Mike D.", role: "Firefighter" },
  },
  {
    id: "steve-r-shopping-list",
    quote:
      "I use the shopping list to help me track canteen needs while I'm on my 7 off or away from the hall. Makes grocery runs way easier.",
    attribution: { name: "Steve R.", role: "Canteen Manager" },
  },
  {
    id: "kyle-m-probie",
    quote:
      "We've actually found some unreal meals with it. As a probie I'm new to cooking and this has really helped me impress my crew.",
    attribution: { name: "Kyle M.", role: "Firefighter" },
  },
  {
    id: "matt-p-meal-wheel",
    quote: "The whole crew looks forward to using the meal wheel every shift!",
    attribution: { name: "Matt P.", role: "Firefighter" },
  },
  {
    id: "ryan-c-no-group-chat",
    quote: "Way easier than asking twenty guys what they feel like eating.",
    attribution: { name: "Ryan C.", role: "Firefighter" },
  },
  {
    id: "jake-b-captain",
    quote: "I didn't think we'd use it this much, but now it's part of dinner every shift.",
    attribution: { name: "Jake B.", role: "Captain" },
  },
];

export const SOCIAL_PROOF_HEADLINE = "Firefighters cooking on shift";
export const SOCIAL_PROOF_SUBHEADLINE =
  "Personal meal picks, saved recipes, and optional hall planning — from firefighters who actually work the line.";
