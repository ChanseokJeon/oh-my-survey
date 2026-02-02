// src/lib/theme/oklab.ts

/**
 * Oklab color space conversions for perceptually uniform color processing.
 * Based on Björn Ottosson's Oklab color space.
 * Reference: https://bottosson.github.io/posts/oklab/
 */

/**
 * Oklab color representation (perceptually uniform)
 */
export interface Oklab {
  L: number; // Lightness (0-1)
  a: number; // Green-red axis
  b: number; // Blue-yellow axis
}

/**
 * OkLCh color representation (cylindrical Oklab)
 */
export interface OkLCh {
  L: number; // Lightness (0-1)
  C: number; // Chroma (saturation)
  h: number; // Hue angle in degrees (0-360)
}

/**
 * Converts sRGB to linear RGB.
 */
function srgbToLinear(c: number): number {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Converts linear RGB to sRGB.
 */
function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/**
 * Converts RGB (0-255) to Oklab color space.
 */
export function rgbToOklab(r: number, g: number, b: number): Oklab {
  // Convert sRGB to linear RGB
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  // Convert linear RGB to LMS cone space
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  // Take cube root
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // Convert to Oklab
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

/**
 * Converts Oklab to OkLCh (cylindrical coordinates).
 */
export function oklabToOklch(oklab: Oklab): OkLCh {
  const { L, a, b } = oklab;
  const C = Math.sqrt(a * a + b * b);
  let h = Math.atan2(b, a) * (180 / Math.PI);

  // Normalize hue to 0-360 range
  if (h < 0) h += 360;

  return { L, C, h };
}

/**
 * Extracts perceptually accurate hue from RGB color.
 * @returns Hue angle in degrees (0-360)
 */
export function rgbToHue(r: number, g: number, b: number): number {
  const oklab = rgbToOklab(r, g, b);
  const oklch = oklabToOklch(oklab);
  return oklch.h;
}

/**
 * Calculates OkLCh chroma (perceptual saturation) from RGB.
 * @returns Chroma value (0-1 typically, can exceed 1 for very saturated colors)
 */
export function rgbToChroma(r: number, g: number, b: number): number {
  const oklab = rgbToOklab(r, g, b);
  const oklch = oklabToOklch(oklab);
  return oklch.C;
}

/**
 * Converts Oklab color to RGB color space.
 * @param L - Lightness (0-1)
 * @param a - Green-red component
 * @param b - Blue-yellow component
 * @returns RGB color {r: 0-255, g: 0-255, b: 0-255}
 */
export function oklabToRgb(L: number, a: number, b: number): { r: number; g: number; b: number } {
  // Convert Oklab to LMS (cube root space)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  // Cube to get back to LMS
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // Convert LMS to linear RGB
  const rLinear = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // Convert linear RGB to sRGB
  const rSrgb = linearToSrgb(rLinear);
  const gSrgb = linearToSrgb(gLinear);
  const bSrgb = linearToSrgb(bLinear);

  // Clamp and convert to 0-255
  const r = Math.round(Math.max(0, Math.min(1, rSrgb)) * 255);
  const g = Math.round(Math.max(0, Math.min(1, gSrgb)) * 255);
  const bRgb = Math.round(Math.max(0, Math.min(1, bSrgb)) * 255);

  return { r, g, b: bRgb };
}

/**
 * Calculates perceptual color difference using simplified CIEDE2000-like formula.
 * Uses Euclidean distance in Oklab space, which approximates perceptual difference well.
 *
 * @param color1 - First RGB color
 * @param color2 - Second RGB color
 * @returns Delta E value (0 = identical, <1 = not perceptible, <3 = acceptable, >10 = different colors)
 */
export function deltaE(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  // Convert both colors to Oklab
  const lab1 = rgbToOklab(color1.r, color1.g, color1.b);
  const lab2 = rgbToOklab(color2.r, color2.g, color2.b);

  // Calculate Euclidean distance in Oklab space
  const deltaL = lab1.L - lab2.L;
  const deltaA = lab1.a - lab2.a;
  const deltaB = lab1.b - lab2.b;

  // Scale to match CIEDE2000 typical ranges (multiply by 100)
  const distance = Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB) * 100;

  return distance;
}
