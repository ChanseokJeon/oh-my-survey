// src/lib/theme/__tests__/hue-binning.test.ts

import { describe, it, expect } from 'vitest';
import { rgbToHue, rgbToChroma } from '../oklab';

describe('Hue-Binning Color Extraction', () => {
  describe('rgbToHue', () => {
    it('should calculate perceptually accurate hue for cyan', () => {
      // #00B693 (cyan) - expected hue ~168°
      const hue = rgbToHue(0, 182, 147);
      expect(hue).toBeGreaterThan(160);
      expect(hue).toBeLessThan(180);
    });

    it('should calculate perceptually accurate hue for lime', () => {
      // #3ED754 (lime) - expected hue ~128°
      const hue = rgbToHue(62, 215, 84);
      expect(hue).toBeGreaterThan(120);
      expect(hue).toBeLessThan(140);
    });

    it('should place cyan and lime in different 30° hue bins', () => {
      const cyanHue = rgbToHue(0, 182, 147); // ~168°
      const limeHue = rgbToHue(62, 215, 84); // ~128°

      // Calculate bin index (12 bins, 30° each)
      const cyanBin = Math.floor(cyanHue / 30);
      const limeBin = Math.floor(limeHue / 30);

      // They should be in different bins
      expect(cyanBin).not.toBe(limeBin);
      expect(cyanBin).toBe(5); // 150-180° bin
      expect(limeBin).toBe(4); // 120-150° bin
    });
  });

  describe('rgbToChroma', () => {
    it('should calculate high chroma for saturated colors', () => {
      const chroma = rgbToChroma(0, 182, 147); // cyan
      expect(chroma).toBeGreaterThan(0.1); // Saturated color
    });

    it('should calculate low chroma for neutral colors', () => {
      const chroma = rgbToChroma(128, 128, 128); // gray
      expect(chroma).toBeLessThan(0.01); // Near-zero chroma
    });

    it('should identify neutral colors below 15% chroma threshold', () => {
      const grayChroma = rgbToChroma(128, 128, 128);
      const lightGrayChroma = rgbToChroma(200, 200, 200);

      const NEUTRAL_THRESHOLD = 0.15;
      expect(grayChroma).toBeLessThan(NEUTRAL_THRESHOLD);
      expect(lightGrayChroma).toBeLessThan(NEUTRAL_THRESHOLD);
    });
  });

  describe('Hue bin boundaries', () => {
    it('should have 12 bins of 30 degrees each', () => {
      const HUE_BIN_COUNT = 12;
      const HUE_BIN_SIZE = 360 / HUE_BIN_COUNT;

      expect(HUE_BIN_SIZE).toBe(30);

      // Verify bin boundaries
      const bins = [
        { name: 'Red', start: 0, end: 30 },
        { name: 'Orange', start: 30, end: 60 },
        { name: 'Yellow', start: 60, end: 90 },
        { name: 'Yellow-Green', start: 90, end: 120 },
        { name: 'Green', start: 120, end: 150 },
        { name: 'Cyan', start: 150, end: 180 },
        { name: 'Cyan-Blue', start: 180, end: 210 },
        { name: 'Blue', start: 210, end: 240 },
        { name: 'Blue-Purple', start: 240, end: 270 },
        { name: 'Purple', start: 270, end: 300 },
        { name: 'Magenta', start: 300, end: 330 },
        { name: 'Pink-Red', start: 330, end: 360 },
      ];

      expect(bins.length).toBe(HUE_BIN_COUNT);
    });
  });
});
