import { z } from 'zod';

// HSL 형식: "221.2 83.2% 53.3%"
const hslColorSchema = z.string().regex(
  /^\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%$/,
  'Invalid HSL color format'
);

// HEX 형식
const hexColorSchema = z.string().regex(
  /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  'Invalid HEX color format'
);

export const themeColorsSchema = z.object({
  surveyBg: hslColorSchema,
  surveyFg: hslColorSchema,
  surveyPrimary: hslColorSchema,
  surveyPrimaryFg: hslColorSchema,
  surveyMuted: hslColorSchema,
  surveyMutedFg: hslColorSchema,
  surveyBorder: hslColorSchema,
  surveyInput: hslColorSchema,
  surveyCard: hslColorSchema,
  surveyCardFg: hslColorSchema,
});

export const customThemeSchema = z.object({
  version: z.literal(1),
  colors: themeColorsSchema,
  meta: z.object({
    source: z.enum(['image', 'url', 'manual', 'website']),
    extractedPalette: z.array(hexColorSchema).max(10).optional(),
    createdAt: z.string().datetime(),
  }),
});

export const extractThemeRequestSchema = z.object({
  source: z.enum(['file', 'url', 'base64', 'website']),
  data: z.string().min(1).max(10 * 1024 * 1024), // 10MB max string
});

export type ThemeColors = z.infer<typeof themeColorsSchema>;
export type CustomThemeData = z.infer<typeof customThemeSchema>;
export type ExtractThemeRequest = z.infer<typeof extractThemeRequestSchema>;
