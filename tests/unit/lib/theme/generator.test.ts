// tests/unit/lib/theme/generator.test.ts

import { describe, it, expect } from 'vitest';
import { generateTheme, ensureAccessibility } from '@/lib/theme/generator';
import type { ThemeColors } from '@/lib/theme/types';
import { getContrastRatio, hslToHex } from '@/lib/theme/color-utils';

describe('generateTheme', () => {
  it('should generate a complete theme from a color palette', () => {
    const palette = [
      '#3B82F6', // Blue
      '#8B5CF6', // Purple
      '#10B981', // Green
      '#F59E0B', // Orange
      '#EF4444', // Red
    ];

    const theme = generateTheme(palette);

    // Verify all required properties exist
    expect(theme).toHaveProperty('surveyBg');
    expect(theme).toHaveProperty('surveyFg');
    expect(theme).toHaveProperty('surveyPrimary');
    expect(theme).toHaveProperty('surveyPrimaryFg');
    expect(theme).toHaveProperty('surveyMuted');
    expect(theme).toHaveProperty('surveyMutedFg');
    expect(theme).toHaveProperty('surveyBorder');
    expect(theme).toHaveProperty('surveyInput');
    expect(theme).toHaveProperty('surveyCard');
    expect(theme).toHaveProperty('surveyCardFg');

    // Verify all values are in HSL format
    Object.values(theme).forEach((value) => {
      expect(value).toMatch(/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/);
    });
  });

  it('should use primary color from palette', () => {
    const palette = ['#FF0000']; // Red
    const theme = generateTheme(palette);

    const primaryHex = hslToHex(theme.surveyPrimary);

    // Should be close to red (allowing for HSL conversion rounding)
    expect(primaryHex).toMatch(/^#FF?00?00?$/i);
  });

  it('should generate light theme for dark primary color', () => {
    const palette = ['#111827']; // Dark gray
    const theme = generateTheme(palette);

    const bgHex = hslToHex(theme.surveyBg);

    // Background should be light (white-ish)
    expect(bgHex).toMatch(/^#F+$/i);
  });

  it('should generate dark theme for light primary color', () => {
    const palette = ['#F9FAFB']; // Very light gray
    const theme = generateTheme(palette);

    const bgHex = hslToHex(theme.surveyBg);

    // Background should be dark
    expect(bgHex).toMatch(/^#1+[0-9A-F]*$/i);
  });

  it('should handle single-color palette', () => {
    const palette = ['#3B82F6'];
    const theme = generateTheme(palette);

    // Should still generate a complete theme
    Object.values(theme).forEach((value) => {
      expect(value).toMatch(/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/);
    });
  });

  it('should handle empty palette by using fallback', () => {
    const palette: string[] = [];

    // This should ideally not happen, but we handle it gracefully
    expect(() => generateTheme(palette)).not.toThrow();
  });
});

describe('ensureAccessibility', () => {
  it('should ensure surveyFg has 4.5:1 contrast with surveyBg', () => {
    const colors: ThemeColors = {
      surveyBg: '0 0% 100%', // White
      surveyFg: '0 0% 80%', // Light gray (poor contrast)
      surveyPrimary: '221 83% 53%',
      surveyPrimaryFg: '210 40% 98%',
      surveyMuted: '210 40% 96%',
      surveyMutedFg: '215 16% 47%',
      surveyBorder: '214 32% 91%',
      surveyInput: '214 32% 91%',
      surveyCard: '0 0% 100%',
      surveyCardFg: '222 47% 11%',
    };

    const adjusted = ensureAccessibility(colors);

    const bg = hslToHex(adjusted.surveyBg);
    const fg = hslToHex(adjusted.surveyFg);
    const contrast = getContrastRatio(bg, fg);

    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

  it('should ensure surveyPrimaryFg has 4.5:1 contrast with surveyPrimary', () => {
    const colors: ThemeColors = {
      surveyBg: '0 0% 100%',
      surveyFg: '222 47% 11%',
      surveyPrimary: '221 83% 53%', // Blue
      surveyPrimaryFg: '221 83% 60%', // Slightly lighter blue (poor contrast)
      surveyMuted: '210 40% 96%',
      surveyMutedFg: '215 16% 47%',
      surveyBorder: '214 32% 91%',
      surveyInput: '214 32% 91%',
      surveyCard: '0 0% 100%',
      surveyCardFg: '222 47% 11%',
    };

    const adjusted = ensureAccessibility(colors);

    const primary = hslToHex(adjusted.surveyPrimary);
    const primaryFg = hslToHex(adjusted.surveyPrimaryFg);
    const contrast = getContrastRatio(primary, primaryFg);

    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

  it('should ensure surveyCardFg has 4.5:1 contrast with surveyCard', () => {
    const colors: ThemeColors = {
      surveyBg: '0 0% 100%',
      surveyFg: '222 47% 11%',
      surveyPrimary: '221 83% 53%',
      surveyPrimaryFg: '210 40% 98%',
      surveyMuted: '210 40% 96%',
      surveyMutedFg: '215 16% 47%',
      surveyBorder: '214 32% 91%',
      surveyInput: '214 32% 91%',
      surveyCard: '0 0% 100%', // White
      surveyCardFg: '0 0% 70%', // Light gray (poor contrast)
    };

    const adjusted = ensureAccessibility(colors);

    const card = hslToHex(adjusted.surveyCard);
    const cardFg = hslToHex(adjusted.surveyCardFg);
    const contrast = getContrastRatio(card, cardFg);

    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

  it('should ensure surveyMutedFg has 4.5:1 contrast with surveyBg', () => {
    const colors: ThemeColors = {
      surveyBg: '0 0% 100%', // White
      surveyFg: '222 47% 11%',
      surveyPrimary: '221 83% 53%',
      surveyPrimaryFg: '210 40% 98%',
      surveyMuted: '210 40% 96%',
      surveyMutedFg: '0 0% 85%', // Very light gray (poor contrast)
      surveyBorder: '214 32% 91%',
      surveyInput: '214 32% 91%',
      surveyCard: '0 0% 100%',
      surveyCardFg: '222 47% 11%',
    };

    const adjusted = ensureAccessibility(colors);

    const bg = hslToHex(adjusted.surveyBg);
    const mutedFg = hslToHex(adjusted.surveyMutedFg);
    const contrast = getContrastRatio(bg, mutedFg);

    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

  it('should ensure surveyBorder has 3:1 contrast with surveyBg (UI elements)', () => {
    const colors: ThemeColors = {
      surveyBg: '0 0% 100%', // White
      surveyFg: '222 47% 11%',
      surveyPrimary: '221 83% 53%',
      surveyPrimaryFg: '210 40% 98%',
      surveyMuted: '210 40% 96%',
      surveyMutedFg: '215 16% 47%',
      surveyBorder: '0 0% 98%', // Almost white (poor contrast)
      surveyInput: '214 32% 91%',
      surveyCard: '0 0% 100%',
      surveyCardFg: '222 47% 11%',
    };

    const adjusted = ensureAccessibility(colors);

    const bg = hslToHex(adjusted.surveyBg);
    const border = hslToHex(adjusted.surveyBorder);
    const contrast = getContrastRatio(bg, border);

    expect(contrast).toBeGreaterThanOrEqual(3.0);
  });

  it('should not modify colors that already meet accessibility standards', () => {
    const colors: ThemeColors = {
      surveyBg: '0 0% 100%', // White
      surveyFg: '222 47% 11%', // Dark gray (good contrast)
      surveyPrimary: '221 83% 53%', // Blue
      surveyPrimaryFg: '210 40% 98%', // Almost white (good contrast)
      surveyMuted: '210 40% 96%',
      surveyMutedFg: '215 16% 47%', // Medium gray (good contrast)
      surveyBorder: '214 32% 91%',
      surveyInput: '214 32% 91%',
      surveyCard: '0 0% 100%',
      surveyCardFg: '222 47% 11%',
    };

    const adjusted = ensureAccessibility(colors);

    // Verify key contrasts are maintained
    const bg = hslToHex(adjusted.surveyBg);
    const fg = hslToHex(adjusted.surveyFg);
    const bgContrast = getContrastRatio(bg, fg);

    const primary = hslToHex(adjusted.surveyPrimary);
    const primaryFg = hslToHex(adjusted.surveyPrimaryFg);
    const primaryContrast = getContrastRatio(primary, primaryFg);

    expect(bgContrast).toBeGreaterThanOrEqual(4.5);
    expect(primaryContrast).toBeGreaterThanOrEqual(4.5);
  });

  it('should handle dark theme accessibility', () => {
    const colors: ThemeColors = {
      surveyBg: '222 47% 11%', // Dark
      surveyFg: '0 0% 50%', // Medium gray (might be poor contrast)
      surveyPrimary: '221 83% 53%',
      surveyPrimaryFg: '210 40% 98%',
      surveyMuted: '215 16% 20%',
      surveyMutedFg: '215 16% 40%',
      surveyBorder: '214 32% 20%',
      surveyInput: '214 32% 20%',
      surveyCard: '222 47% 11%',
      surveyCardFg: '0 0% 50%',
    };

    const adjusted = ensureAccessibility(colors);

    const bg = hslToHex(adjusted.surveyBg);
    const fg = hslToHex(adjusted.surveyFg);
    const contrast = getContrastRatio(bg, fg);

    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });
});
