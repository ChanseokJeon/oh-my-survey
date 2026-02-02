import { z } from "zod";
import { customThemeSchema } from "./theme";

export const createSurveySchema = z.object({
  title: z.string().min(1).max(200),
  theme: z.enum(["light", "dark", "minimal"]).optional().default("light"),
});

export const updateSurveySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["draft", "published", "closed"]).optional(),
  theme: z.enum(["light", "dark", "minimal", "custom"]).optional(),
  customTheme: customThemeSchema.nullable().optional(),
  logoBase64: z.string().nullable().optional(),
  sheetsConfig: z.object({
    spreadsheetId: z.string(),
    sheetName: z.string(),
  }).nullable().optional(),
});

export const publishSurveySchema = z.object({
  action: z.enum(["publish", "unpublish", "close"]),
});

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveySchema>;
export type PublishSurveyInput = z.infer<typeof publishSurveySchema>;
