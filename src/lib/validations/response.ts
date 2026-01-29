import { z } from "zod";

export const submitResponseSchema = z.object({
  answers: z.record(
    z.string(),
    z.union([
      z.string(),
      z.array(z.string()),
      z.number().min(1).max(5), // For rating
    ])
  ),
});

export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
