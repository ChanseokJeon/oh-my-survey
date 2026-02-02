import { describe, it, expect } from 'vitest';
import {
  hexToHsl,
  hslToHex,
  getLuminance,
  getContrastRatio,
  getAccessibleForeground,
  rgbToHex,
} from '@/lib/theme/color-utils';

describe('hexToHsl', () => {
  it('should convert blue HEX to HSL', () => {
    const result = hexToHsl('#3B82F6');
    expect(result).toMatch(/^217\.2\s+91\.2%\s+59\.8%$/);
  });

  it('should convert red HEX to HSL', () => {
    const result = hexToHsl('#EF4444');
    expect(result).toMatch(/^0\s+84\.2%\s+60\.2%$/);
  });

  it('should convert black to HSL', () => {
    const result = hexToHsl('#000000');
    expect(result).toBe('0 0% 0%');
  });

  it('should convert white to HSL', () => {
    const result = hexToHsl('#FFFFFF');
    expect(result).toBe('0 0% 100%');
  });

  it('should handle lowercase HEX', () => {
    const result = hexToHsl('#3b82f6');
    expect(result).toMatch(/^217\.2\s+91\.2%\s+59\.8%$/);
  });

  it('should handle HEX without # prefix', () => {
    const result = hexToHsl('3B82F6');
    expect(result).toMatch(/^217\.2\s+91\.2%\s+59\.8%$/);
  });
});

describe('hslToHex', () => {
  it('should convert HSL to blue HEX', () => {
    const result = hslToHex('217.2 91.2% 59.8%');
    expect(result).toBe('#3B82F6');
  });

  it('should convert HSL to black HEX', () => {
    const result = hslToHex('0 0% 0%');
    expect(result).toBe('#000000');
  });

  it('should convert HSL to white HEX', () => {
    const result = hslToHex('0 0% 100%');
    expect(result).toBe('#FFFFFF');
  });

  it('should handle decimal values', () => {
    const result = hslToHex('221.2 83.2% 53.3%');
    expect(result).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('should throw on invalid HSL format', () => {
    expect(() => hslToHex('invalid')).toThrow('Invalid HSL format');
  });

  it('should throw on HSL without percentages', () => {
    expect(() => hslToHex('217 89 60')).toThrow('Invalid HSL format');
  });
});

describe('hexToHsl and hslToHex round-trip', () => {
  it('should maintain color integrity in round-trip conversion', () => {
    const original = '#3B82F6';
    const hsl = hexToHsl(original);
    const backToHex = hslToHex(hsl);
    expect(backToHex).toBe(original);
  });

  it('should handle multiple colors in round-trip', () => {
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
    colors.forEach((color) => {
      const hsl = hexToHsl(color);
      const backToHex = hslToHex(hsl);
      expect(backToHex).toBe(color);
    });
  });
});

describe('getLuminance', () => {
  it('should return 0 for black', () => {
    expect(getLuminance('#000000')).toBe(0);
  });

  it('should return 1 for white', () => {
    expect(getLuminance('#FFFFFF')).toBe(1);
  });

  it('should return value between 0 and 1 for colors', () => {
    const luminance = getLuminance('#3B82F6');
    expect(luminance).toBeGreaterThan(0);
    expect(luminance).toBeLessThan(1);
  });

  it('should return higher luminance for lighter colors', () => {
    const darkBlue = getLuminance('#1E3A8A');
    const lightBlue = getLuminance('#BFDBFE');
    expect(lightBlue).toBeGreaterThan(darkBlue);
  });

  it('should handle lowercase HEX', () => {
    const upper = getLuminance('#3B82F6');
    const lower = getLuminance('#3b82f6');
    expect(upper).toBe(lower);
  });
});

describe('getContrastRatio', () => {
  it('should return 21 for black vs white', () => {
    const ratio = getContrastRatio('#000000', '#FFFFFF');
    expect(ratio).toBeCloseTo(21, 1);
  });

  it('should return 1 for same colors', () => {
    const ratio = getContrastRatio('#3B82F6', '#3B82F6');
    expect(ratio).toBe(1);
  });

  it('should be symmetric', () => {
    const ratio1 = getContrastRatio('#3B82F6', '#FFFFFF');
    const ratio2 = getContrastRatio('#FFFFFF', '#3B82F6');
    expect(ratio1).toBe(ratio2);
  });

  it('should return ratio > 4.5 for good text contrast', () => {
    // Blue on white should have good contrast
    const ratio = getContrastRatio('#1E40AF', '#FFFFFF');
    expect(ratio).toBeGreaterThan(4.5);
  });

  it('should return ratio < 3 for poor contrast', () => {
    // Light blue on white has poor contrast
    const ratio = getContrastRatio('#BFDBFE', '#FFFFFF');
    expect(ratio).toBeLessThan(3);
  });
});

describe('getAccessibleForeground', () => {
  it('should return white for dark backgrounds', () => {
    expect(getAccessibleForeground('#000000')).toBe('#FFFFFF');
    expect(getAccessibleForeground('#1E3A8A')).toBe('#FFFFFF');
  });

  it('should return black for light backgrounds', () => {
    expect(getAccessibleForeground('#FFFFFF')).toBe('#000000');
    expect(getAccessibleForeground('#BFDBFE')).toBe('#000000');
  });

  it('should ensure WCAG AA compliance (4.5:1)', () => {
    const background = '#3B82F6';
    const foreground = getAccessibleForeground(background);
    const ratio = getContrastRatio(background, foreground);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('should handle edge cases', () => {
    // Mid-gray should get a foreground color
    const fg = getAccessibleForeground('#808080');
    expect(['#000000', '#FFFFFF']).toContain(fg);
  });
});

describe('rgbToHex', () => {
  it('should convert RGB to HEX', () => {
    expect(rgbToHex(59, 130, 246)).toBe('#3B82F6');
  });

  it('should handle black', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });

  it('should handle white', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF');
  });

  it('should pad single digits with zero', () => {
    expect(rgbToHex(1, 2, 3)).toBe('#010203');
  });

  it('should clamp values outside 0-255 range', () => {
    expect(rgbToHex(-10, 300, 128)).toBe('#00FF80');
  });

  it('should round decimal values', () => {
    expect(rgbToHex(59.4, 130.6, 246.1)).toBe('#3B83F6');
  });
});

describe('Edge cases and security', () => {
  it('should handle very small HEX values', () => {
    const result = hexToHsl('#010101');
    expect(result).toMatch(/^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/);
  });

  it('should handle grayscale colors', () => {
    const gray = '#808080';
    const hsl = hexToHsl(gray);
    const backToHex = hslToHex(hsl);
    expect(backToHex).toBe(gray);
  });

  it('should reject malformed HSL in hslToHex', () => {
    expect(() => hslToHex('221 83% 53%')).not.toThrow();
    expect(() => hslToHex('221.2 83.2% 53.3%')).not.toThrow();
    expect(() => hslToHex('hsl(221, 83%, 53%)')).toThrow();
    expect(() => hslToHex('221, 83%, 53%')).toThrow();
  });
});
