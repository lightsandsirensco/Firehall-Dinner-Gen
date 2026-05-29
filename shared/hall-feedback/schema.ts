import { z } from "zod";

export const hallFeedbackSubmitSchema = z.object({
  message: z
    .string()
    .trim()
    .min(8, "Tell us a little more — even one sentence helps the hall.")
    .max(4000),
  email: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val === "string" && val.trim() === "") return undefined;
      return val;
    },
    z
      .string()
      .email("Enter a valid email or leave it blank.")
      .max(120)
      .optional(),
  ),
  channel: z.literal("general").optional().default("general"),
  source: z
    .enum(["floating_button", "footer", "generator_error", "unknown"])
    .optional()
    .default("unknown"),
  page_path: z.string().trim().max(200).optional(),
});

export type HallFeedbackSubmitInput = z.infer<typeof hallFeedbackSubmitSchema>;
