// src/lib/theme/color-utils.ts

/**
 * Converts HEX color to HSL format.
 * @param hex - HEX color string (e.g., "#3B82F6")
 * @returns HSL string in format "221.2 83.2% 53.3%"
 */
export function hexToHsl(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Convert to RGB
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / delta + 2) / 6;
        break;
      case b:
        h = ((r - g) / delta + 4) / 6;
        break;
    }
  }

  // Convert to degrees and percentages
  const hDeg = Math.round(h * 360 * 10) / 10;
  const sPercent = Math.round(s * 100 * 10) / 10;
  const lPercent = Math.round(l * 100 * 10) / 10;

  return `${hDeg} ${sPercent}% ${lPercent}%`;
}

/**
 * Converts HSL color to HEX format.
 * @param hsl - HSL string in format "221.2 83.2% 53.3%"
 * @returns HEX color string (e.g., "#3B82F6")
 */
export function hslToHex(hsl: string): string {
  const match = hsl.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) {
    throw new Error(`Invalid HSL format: ${hsl}`);
  }

  const h = parseFloat(match[1]) / 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;

  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l; // Achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

/**
 * Calculates relative luminance of a HEX color (WCAG 2.1 formula).
 * @param hex - HEX color string
 * @returns Luminance value between 0 and 1
 */
export function getLuminance(hex: string): number {
  const cleanHex = hex.replace(/^#/, '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // Apply sRGB gamma correction
  const toLinear = (c: number) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculates contrast ratio between two HEX colors (WCAG 2.1 formula).
 * @param color1 - First HEX color
 * @param color2 - Second HEX color
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns an accessible foreground color (black or white) for the given background.
 * @param background - Background HEX color
 * @returns "#000000" or "#FFFFFF"
 */
export function getAccessibleForeground(background: string): string {
  const blackContrast = getContrastRatio(background, '#000000');
  const whiteContrast = getContrastRatio(background, '#FFFFFF');

  // Return the color with better contrast
  return blackContrast > whiteContrast ? '#000000' : '#FFFFFF';
}

/**
 * Converts RGB values to HEX color string.
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns HEX color string (e.g., "#3B82F6")
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        // Clamp to 0-255 range and round
        const clamped = Math.max(0, Math.min(255, Math.round(x)));
        const hex = clamped.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
      .toUpperCase()
  );
}
