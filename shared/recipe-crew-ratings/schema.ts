import { z } from "zod";

export const crewRatingVoteSchema = z.enum(["up", "down"]);

export const crewRatingComplaintSchema = z.enum([
  "too_complicated",
  "too_expensive",
  "not_enough_food",
  "instructions_unclear",
  "didnt_taste_great",
  "image_mismatch",
  "other",
]);

export const castCrewRatingVoteSchema = z.object({
  vote: crewRatingVoteSchema,
  complaint: crewRatingComplaintSchema.optional(),
  category: z.string().trim().max(80).optional(),
});

export type CastCrewRatingVoteInput = z.infer<typeof castCrewRatingVoteSchema>;
