import { describe, it, expect } from 'vitest';
import { rgbToOklab, oklabToRgb, rgbToHue, deltaE, oklabToOklch, rgbToChroma } from '@/lib/theme/oklab';

describe('Oklab color space utilities', () => {
  describe('rgbToOklab and oklabToRgb round-trip', () => {
    it('should convert RGB -> Oklab -> RGB for red', () => {
      const original = { r: 255, g: 0, b: 0 };
      const oklab = rgbToOklab(original.r, original.g, original.b);
      const result = oklabToRgb(oklab.L, oklab.a, oklab.b);

      expect(result.r).toBeCloseTo(original.r, 0); // within 1
      expect(result.g).toBeCloseTo(original.g, 0);
      expect(result.b).toBeCloseTo(original.b, 0);
    });

    it('should convert RGB -> Oklab -> RGB for green', () => {
      const original = { r: 0, g: 255, b: 0 };
      const oklab = rgbToOklab(original.r, original.g, original.b);
      const result = oklabToRgb(oklab.L, oklab.a, oklab.b);

      expect(result.r).toBeCloseTo(original.r, 0);
      expect(result.g).toBeCloseTo(original.g, 0);
      expect(result.b).toBeCloseTo(original.b, 0);
    });

    it('should convert RGB -> Oklab -> RGB for blue', () => {
      const original = { r: 0, g: 0, b: 255 };
      const oklab = rgbToOklab(original.r, original.g, original.b);
      const result = oklabToRgb(oklab.L, oklab.a, oklab.b);

      expect(result.r).toBeCloseTo(original.r, 0);
      expect(result.g).toBeCloseTo(original.g, 0);
      expect(result.b).toBeCloseTo(original.b, 0);
    });

    it('should convert RGB -> Oklab -> RGB for white', () => {
      const original = { r: 255, g: 255, b: 255 };
      const oklab = rgbToOklab(original.r, original.g, original.b);
      const result = oklabToRgb(oklab.L, oklab.a, oklab.b);

      expect(result.r).toBeCloseTo(original.r, 0);
      expect(result.g).toBeCloseTo(original.g, 0);
      expect(result.b).toBeCloseTo(original.b, 0);
    });

    it('should convert RGB -> Oklab -> RGB for black', () => {
      const original = { r: 0, g: 0, b: 0 };
      const oklab = rgbToOklab(original.r, original.g, original.b);
      const result = oklabToRgb(oklab.L, oklab.a, oklab.b);

      expect(result.r).toBeCloseTo(original.r, 0);
      expect(result.g).toBeCloseTo(original.g, 0);
      expect(result.b).toBeCloseTo(original.b, 0);
    });

    it('should convert RGB -> Oklab -> RGB for gray', () => {
      const original = { r: 128, g: 128, b: 128 };
      const oklab = rgbToOklab(original.r, original.g, original.b);
      const result = oklabToRgb(oklab.L, oklab.a, oklab.b);

      expect(result.r).toBeCloseTo(original.r, 0);
      expect(result.g).toBeCloseTo(original.g, 0);
      expect(result.b).toBeCloseTo(original.b, 0);
    });

    it('should convert RGB -> Oklab -> RGB for arbitrary color', () => {
      const original = { r: 123, g: 234, b: 45 };
      const oklab = rgbToOklab(original.r, original.g, original.b);
      const result = oklabToRgb(oklab.L, oklab.a, oklab.b);

      expect(result.r).toBeCloseTo(original.r, 0);
      expect(result.g).toBeCloseTo(original.g, 0);
      expect(result.b).toBeCloseTo(original.b, 0);
    });
  });

  describe('rgbToHue', () => {
    it('should return approximately 20-40° for red (Oklab hue)', () => {
      const hue = rgbToHue(255, 0, 0);
      // In Oklab color space, red is around 29-30°
      expect(hue).toBeGreaterThanOrEqual(20);
      expect(hue).toBeLessThanOrEqual(40);
    });

    it('should return approximately 95-115° for yellow (Oklab hue)', () => {
      const hue = rgbToHue(255, 255, 0);
      // In Oklab color space, yellow is around 109-110°
      expect(hue).toBeGreaterThanOrEqual(95);
      expect(hue).toBeLessThanOrEqual(115);
    });

    it('should return approximately 120-150° for green', () => {
      const hue = rgbToHue(0, 255, 0);
      expect(hue).toBeGreaterThanOrEqual(120);
      expect(hue).toBeLessThanOrEqual(150);
    });

    it('should return approximately 190-210° for cyan (Oklab hue)', () => {
      const hue = rgbToHue(0, 255, 255);
      // In Oklab color space, cyan is around 194-195°
      expect(hue).toBeGreaterThanOrEqual(190);
      expect(hue).toBeLessThanOrEqual(210);
    });

    it('should return approximately 260-280° for blue (Oklab hue)', () => {
      const hue = rgbToHue(0, 0, 255);
      // In Oklab color space, blue is around 264°
      expect(hue).toBeGreaterThanOrEqual(260);
      expect(hue).toBeLessThanOrEqual(280);
    });

    it('should return approximately 300-330° for purple/magenta', () => {
      const hue = rgbToHue(255, 0, 255);
      expect(hue).toBeGreaterThanOrEqual(300);
      expect(hue).toBeLessThanOrEqual(330);
    });

    it('should return consistent hue for grayscale colors', () => {
      // Grayscale colors have no hue, but the function should still return a valid angle
      const hue = rgbToHue(128, 128, 128);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThanOrEqual(360);
    });
  });

  describe('deltaE', () => {
    it('should return 0 for identical colors', () => {
      const color1 = { r: 255, g: 0, b: 0 };
      const color2 = { r: 255, g: 0, b: 0 };

      const difference = deltaE(color1, color2);
      expect(difference).toBe(0);
    });

    it('should return < 3 for similar colors (perceptually acceptable)', () => {
      const color1 = { r: 255, g: 0, b: 0 };
      const color2 = { r: 255, g: 5, b: 5 };

      const difference = deltaE(color1, color2);
      expect(difference).toBeLessThan(3);
    });

    it('should return > 50 for very different colors (red vs blue)', () => {
      const color1 = { r: 255, g: 0, b: 0 };
      const color2 = { r: 0, g: 0, b: 255 };

      const difference = deltaE(color1, color2);
      expect(difference).toBeGreaterThan(50);
    });

    it('should return > 50 for very different colors (red vs green)', () => {
      const color1 = { r: 255, g: 0, b: 0 };
      const color2 = { r: 0, g: 255, b: 0 };

      const difference = deltaE(color1, color2);
      expect(difference).toBeGreaterThan(50);
    });

    it('should return > 50 for black vs white', () => {
      const color1 = { r: 0, g: 0, b: 0 };
      const color2 = { r: 255, g: 255, b: 255 };

      const difference = deltaE(color1, color2);
      expect(difference).toBeGreaterThan(50);
    });

    it('should be symmetric (deltaE(A,B) === deltaE(B,A))', () => {
      const color1 = { r: 123, g: 234, b: 45 };
      const color2 = { r: 67, g: 89, b: 210 };

      const diff1 = deltaE(color1, color2);
      const diff2 = deltaE(color2, color1);

      expect(diff1).toBeCloseTo(diff2, 10);
    });
  });

  describe('oklabToOklch', () => {
    it('should calculate chroma and hue correctly for red', () => {
      const oklab = rgbToOklab(255, 0, 0);
      const oklch = oklabToOklch(oklab);

      expect(oklch.L).toBe(oklab.L);
      expect(oklch.C).toBeGreaterThan(0); // Red is saturated
      expect(oklch.h).toBeGreaterThanOrEqual(0);
      expect(oklch.h).toBeLessThan(360);
    });

    it('should return chroma ≈ 0 for grayscale colors', () => {
      const oklab = rgbToOklab(128, 128, 128);
      const oklch = oklabToOklch(oklab);

      expect(oklch.C).toBeCloseTo(0, 5); // Very close to 0 for gray
    });

    it('should normalize hue to 0-360 range', () => {
      const colors = [
        { r: 255, g: 0, b: 0 },    // red
        { r: 0, g: 255, b: 0 },    // green
        { r: 0, g: 0, b: 255 },    // blue
        { r: 255, g: 255, b: 0 },  // yellow
        { r: 255, g: 0, b: 255 },  // magenta
        { r: 0, g: 255, b: 255 },  // cyan
      ];

      colors.forEach(color => {
        const oklab = rgbToOklab(color.r, color.g, color.b);
        const oklch = oklabToOklch(oklab);

        expect(oklch.h).toBeGreaterThanOrEqual(0);
        expect(oklch.h).toBeLessThan(360);
      });
    });

    it('should calculate correct chroma for fully saturated colors', () => {
      const red = rgbToOklab(255, 0, 0);
      const redLch = oklabToOklch(red);

      const green = rgbToOklab(0, 255, 0);
      const greenLch = oklabToOklch(green);

      const blue = rgbToOklab(0, 0, 255);
      const blueLch = oklabToOklch(blue);

      // All fully saturated colors should have high chroma
      expect(redLch.C).toBeGreaterThan(0.15);
      expect(greenLch.C).toBeGreaterThan(0.15);
      expect(blueLch.C).toBeGreaterThan(0.15);
    });
  });

  describe('rgbToChroma', () => {
    it('should return high chroma for saturated colors', () => {
      const redChroma = rgbToChroma(255, 0, 0);
      expect(redChroma).toBeGreaterThan(0.15);

      const greenChroma = rgbToChroma(0, 255, 0);
      expect(greenChroma).toBeGreaterThan(0.15);

      const blueChroma = rgbToChroma(0, 0, 255);
      expect(blueChroma).toBeGreaterThan(0.15);
    });

    it('should return low chroma for grayscale colors', () => {
      const blackChroma = rgbToChroma(0, 0, 0);
      expect(blackChroma).toBeCloseTo(0, 5);

      const grayChroma = rgbToChroma(128, 128, 128);
      expect(grayChroma).toBeCloseTo(0, 5);

      const whiteChroma = rgbToChroma(255, 255, 255);
      expect(whiteChroma).toBeCloseTo(0, 5);
    });

    it('should return moderate chroma for desaturated colors', () => {
      // Desaturated red (pinkish)
      const desaturatedRed = rgbToChroma(200, 100, 100);
      expect(desaturatedRed).toBeGreaterThan(0);
      expect(desaturatedRed).toBeLessThan(0.15);
    });
  });

  describe('edge cases', () => {
    it('should handle RGB values at boundaries', () => {
      const colors = [
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
        { r: 0, g: 0, b: 255 },
      ];

      colors.forEach(color => {
        const oklab = rgbToOklab(color.r, color.g, color.b);
        expect(oklab.L).toBeGreaterThanOrEqual(0);
        expect(oklab.L).toBeLessThanOrEqual(1);

        const rgb = oklabToRgb(oklab.L, oklab.a, oklab.b);
        expect(rgb.r).toBeGreaterThanOrEqual(0);
        expect(rgb.r).toBeLessThanOrEqual(255);
        expect(rgb.g).toBeGreaterThanOrEqual(0);
        expect(rgb.g).toBeLessThanOrEqual(255);
        expect(rgb.b).toBeGreaterThanOrEqual(0);
        expect(rgb.b).toBeLessThanOrEqual(255);
      });
    });

    it('should handle mid-range RGB values', () => {
      const color = { r: 128, g: 64, b: 192 };
      const oklab = rgbToOklab(color.r, color.g, color.b);
      const rgb = oklabToRgb(oklab.L, oklab.a, oklab.b);

      expect(rgb.r).toBeCloseTo(color.r, 0);
      expect(rgb.g).toBeCloseTo(color.g, 0);
      expect(rgb.b).toBeCloseTo(color.b, 0);
    });
  });
});
