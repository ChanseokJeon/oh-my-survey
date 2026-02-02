// src/lib/theme/generator.ts

import type { ThemeColors } from './types';
import {
  hexToHsl,
  getLuminance,
  getAccessibleForeground,
  getContrastRatio,
  hslToHex,
} from './color-utils';

/**
 * Generates a complete theme from a color palette.
 * @param palette - Array of HEX color strings (5 colors from extractor)
 * @returns ThemeColors with WCAG AA accessibility guaranteed
 */
export function generateTheme(palette: string[]): ThemeColors {
  // Handle empty palette with default blue
  const primary = palette[0] || '#3B82F6';
  const accent = palette[1] || primary;

  // Determine if we should use a light or dark background based on primary color luminance
  const primaryLuminance = getLuminance(primary);
  const isLight = primaryLuminance < 0.5; // Dark primary → light background

  const background = isLight ? '#FFFFFF' : '#111827';
  const foreground = isLight ? '#111827' : '#F9FAFB';

  const colors: ThemeColors = {
    surveyPrimary: hexToHsl(primary),
    surveyPrimaryFg: hexToHsl(getAccessibleForeground(primary)),
    surveyBg: hexToHsl(background),
    surveyFg: hexToHsl(foreground),
    surveyMuted: hexToHsl(isLight ? '#F3F4F6' : '#374151'),
    surveyMutedFg: hexToHsl(isLight ? '#6B7280' : '#9CA3AF'),
    surveyBorder: hexToHsl(isLight ? '#E5E7EB' : '#374151'),
    surveyInput: hexToHsl(isLight ? '#E5E7EB' : '#374151'),
    surveyCard: hexToHsl(background),
    surveyCardFg: hexToHsl(foreground),
  };

  return ensureAccessibility(colors);
}

/**
 * Ensures all color pairs meet WCAG 2.1 AA contrast requirements.
 * - Text: 4.5:1 minimum
 * - UI elements: 3:1 minimum
 * @param colors - ThemeColors to validate and fix
 * @returns Accessibility-guaranteed ThemeColors
 */
export function ensureAccessibility(colors: ThemeColors): ThemeColors {
  const adjusted = { ...colors };

  // Convert HSL back to HEX for contrast calculations
  const toHex = (hsl: string) => hslToHex(hsl);

  // 1. Ensure surveyPrimaryFg has 4.5:1 contrast with surveyPrimary (text on buttons)
  adjusted.surveyPrimaryFg = hexToHsl(
    ensureTextContrast(toHex(colors.surveyPrimary), toHex(colors.surveyPrimaryFg))
  );

  // 2. Ensure surveyFg has 4.5:1 contrast with surveyBg (body text)
  adjusted.surveyFg = hexToHsl(
    ensureTextContrast(toHex(colors.surveyBg), toHex(colors.surveyFg))
  );

  // 3. Ensure surveyCardFg has 4.5:1 contrast with surveyCard
  adjusted.surveyCardFg = hexToHsl(
    ensureTextContrast(toHex(colors.surveyCard), toHex(colors.surveyCardFg))
  );

  // 4. Ensure surveyMutedFg has 4.5:1 contrast with surveyBg
  adjusted.surveyMutedFg = hexToHsl(
    ensureTextContrast(toHex(colors.surveyBg), toHex(colors.surveyMutedFg))
  );

  // 5. Ensure surveyBorder has 3:1 contrast with surveyBg (UI elements)
  adjusted.surveyBorder = hexToHsl(
    ensureUIContrast(toHex(colors.surveyBg), toHex(colors.surveyBorder))
  );

  return adjusted;
}

/**
 * Ensures foreground has 4.5:1 contrast ratio with background (WCAG AA for text).
 * If not, returns adjusted foreground color (black or white).
 */
function ensureTextContrast(background: string, foreground: string): string {
  const contrast = getContrastRatio(background, foreground);

  if (contrast >= 4.5) {
    return foreground; // Already meets requirement
  }

  // Return accessible foreground (black or white)
  return getAccessibleForeground(background);
}

/**
 * Ensures foreground has 3:1 contrast ratio with background (WCAG AA for UI).
 * If not, returns adjusted foreground color.
 */
function ensureUIContrast(background: string, foreground: string): string {
  const contrast = getContrastRatio(background, foreground);

  if (contrast >= 3.0) {
    return foreground; // Already meets requirement
  }

  // Adjust foreground to meet 3:1 contrast
  const bgLuminance = getLuminance(background);

  // Choose a gray that meets 3:1 contrast
  // Light background needs darker border, dark background needs lighter border
  return bgLuminance > 0.5 ? '#6B7280' : '#9CA3AF';
}
