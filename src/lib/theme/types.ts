// src/lib/theme/types.ts

export interface CustomThemeData {
  version: 1;
  colors: ThemeColors;
  meta: {
    source: 'image' | 'url' | 'manual' | 'website';
    extractedPalette?: string[]; // HEX for display
    createdAt: string; // ISO 8601
  };
}

// HSL 형식: "221.2 83.2% 53.3%" 또는 CSS gradient 문자열
export interface ThemeColors {
  surveyBg: string;
  surveyBgRaw?: string; // Optional: raw CSS value (gradient or color) for background
  surveyFg: string;
  surveyPrimary: string;
  surveyPrimaryFg: string;
  surveyMuted: string;
  surveyMutedFg: string;
  surveyBorder: string;
  surveyInput: string;
  surveyCard: string;
  surveyCardFg: string;
}

export const ALLOWED_CSS_VARS = [
  '--survey-bg',
  '--survey-bg-raw', // For gradients or raw CSS background values
  '--survey-fg',
  '--survey-primary',
  '--survey-primary-fg',
  '--survey-muted',
  '--survey-muted-fg',
  '--survey-border',
  '--survey-input',
  '--survey-card',
  '--survey-card-fg',
] as const;

export const THEME_KEY_TO_CSS_VAR: Record<keyof ThemeColors, string> = {
  surveyBg: '--survey-bg',
  surveyBgRaw: '--survey-bg-raw',
  surveyFg: '--survey-fg',
  surveyPrimary: '--survey-primary',
  surveyPrimaryFg: '--survey-primary-fg',
  surveyMuted: '--survey-muted',
  surveyMutedFg: '--survey-muted-fg',
  surveyBorder: '--survey-border',
  surveyInput: '--survey-input',
  surveyCard: '--survey-card',
  surveyCardFg: '--survey-card-fg',
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
