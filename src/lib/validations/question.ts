import { z } from "zod";

export const questionTypeSchema = z.enum([
  "short_text",
  "long_text",
  "multiple_choice",
  "yes_no",
  "rating",
]);

export const createQuestionSchema = z.object({
  type: questionTypeSchema,
  title: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10).optional(),
  required: z.boolean().optional().default(false),
}).refine(
  (data) => {
    // Options required only for multiple_choice
    if (data.type === "multiple_choice") {
      return data.options && data.options.length >= 2;
    }
    return true;
  },
  {
    message: "Multiple choice questions require at least 2 options",
    path: ["options"],
  }
);

export const updateQuestionSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  options: z.array(z.string().min(1).max(200)).min(2).max(10).optional().nullable(),
  required: z.boolean().optional(),
});

export const reorderQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>;
