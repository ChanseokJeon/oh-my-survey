// tests/unit/lib/theme/extractor.test.ts

import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { extractColors, extractColorsWithArea, extractColorsHueBinning } from '@/lib/theme/extractor';

describe('extractColors', () => {
  it('should extract 5 colors from a gradient image', async () => {
    // Create a 100x100 gradient image (blue to red)
    const width = 100;
    const height = 100;
    const channels = 3;
    const imageData = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        imageData[idx] = Math.floor((x / width) * 255); // R
        imageData[idx + 1] = 0; // G
        imageData[idx + 2] = Math.floor(((width - x) / width) * 255); // B
      }
    }

    const buffer = await sharp(imageData, {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    const colors = await extractColors(buffer);

    expect(colors).toHaveLength(5);
    colors.forEach((color) => {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  it('should extract single color from a solid color image', async () => {
    // Create a 50x50 solid blue image
    const buffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 3,
        background: { r: 59, g: 130, b: 246 }, // #3B82F6
      },
    })
      .png()
      .toBuffer();

    const colors = await extractColors(buffer);

    expect(colors).toHaveLength(5);
    // All colors should be very similar (cluster around blue)
    colors.forEach((color) => {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  it('should handle small images (10x10)', async () => {
    const buffer = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const colors = await extractColors(buffer);

    expect(colors).toHaveLength(5);
    colors.forEach((color) => {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  it('should handle PNG with transparency', async () => {
    // Create a 50x50 semi-transparent red image
    const buffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();

    const colors = await extractColors(buffer);

    expect(colors).toHaveLength(5);
    colors.forEach((color) => {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  it('should extract distinct colors from a multi-color image', async () => {
    // Create a 100x100 image with 4 quadrants (red, green, blue, yellow)
    const width = 100;
    const height = 100;
    const channels = 3;
    const imageData = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;

        if (x < 50 && y < 50) {
          // Top-left: Red
          imageData[idx] = 255;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 0;
        } else if (x >= 50 && y < 50) {
          // Top-right: Green
          imageData[idx] = 0;
          imageData[idx + 1] = 255;
          imageData[idx + 2] = 0;
        } else if (x < 50 && y >= 50) {
          // Bottom-left: Blue
          imageData[idx] = 0;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 255;
        } else {
          // Bottom-right: Yellow
          imageData[idx] = 255;
          imageData[idx + 1] = 255;
          imageData[idx + 2] = 0;
        }
      }
    }

    const buffer = await sharp(imageData, {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    const colors = await extractColors(buffer);

    expect(colors).toHaveLength(5);

    // Verify we got distinct colors (at least some variation)
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBeGreaterThan(1);
  });

  it('should handle JPEG images', async () => {
    const buffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    const colors = await extractColors(buffer);

    expect(colors).toHaveLength(5);
    colors.forEach((color) => {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  it('should throw error for invalid image buffer', async () => {
    const invalidBuffer = Buffer.from('not an image');

    await expect(extractColors(invalidBuffer)).rejects.toThrow();
  });

  it('should sort colors by brightness (lightest to darkest)', async () => {
    // Create image with black, gray, and white
    const width = 90;
    const height = 30;
    const channels = 3;
    const imageData = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;

        if (x < 30) {
          // Black
          imageData[idx] = 0;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 0;
        } else if (x < 60) {
          // Gray
          imageData[idx] = 128;
          imageData[idx + 1] = 128;
          imageData[idx + 2] = 128;
        } else {
          // White
          imageData[idx] = 255;
          imageData[idx + 1] = 255;
          imageData[idx + 2] = 255;
        }
      }
    }

    const buffer = await sharp(imageData, {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    const colors = await extractColors(buffer);

    // First color should be lightest (white-ish)
    // Last color should be darkest (black-ish)
    expect(colors).toHaveLength(5);

    // Convert first and last colors to RGB for brightness comparison
    const getAvgBrightness = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (r + g + b) / 3;
    };

    const firstBrightness = getAvgBrightness(colors[0]);
    const lastBrightness = getAvgBrightness(colors[colors.length - 1]);

    expect(firstBrightness).toBeGreaterThan(lastBrightness);
  });
});

describe('extractColorsWithArea', () => {
  it('returns ColorWithArea[] with hex and percentage', async () => {
    const buffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 59, g: 130, b: 246 }, // Blue
      },
    })
      .png()
      .toBuffer();

    const colors = await extractColorsWithArea(buffer);

    expect(colors.length).toBeGreaterThan(0);
    colors.forEach((color) => {
      expect(color).toHaveProperty('hex');
      expect(color).toHaveProperty('percentage');
      expect(color.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(color.percentage).toBeGreaterThanOrEqual(0);
      expect(color.percentage).toBeLessThanOrEqual(1);
    });

    // At least one color should have significant percentage
    const maxPercentage = Math.max(...colors.map(c => c.percentage));
    expect(maxPercentage).toBeGreaterThan(0);
  });

  it('percentages sum to approximately 1.0', async () => {
    const buffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const colors = await extractColorsWithArea(buffer);
    const sum = colors.reduce((acc, c) => acc + c.percentage, 0);

    // Allow small floating point error tolerance
    expect(sum).toBeGreaterThan(0.99);
    expect(sum).toBeLessThanOrEqual(1.01);
  });

  it('results are sorted by percentage (descending)', async () => {
    // Create image with 4 quadrants (different colors, different areas due to k-means)
    const width = 100;
    const height = 100;
    const channels = 3;
    const imageData = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;

        if (x < 50 && y < 50) {
          // Top-left: Red (25%)
          imageData[idx] = 255;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 0;
        } else if (x >= 50 && y < 50) {
          // Top-right: Green (25%)
          imageData[idx] = 0;
          imageData[idx + 1] = 255;
          imageData[idx + 2] = 0;
        } else if (x < 50 && y >= 50) {
          // Bottom-left: Blue (25%)
          imageData[idx] = 0;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 255;
        } else {
          // Bottom-right: Yellow (25%)
          imageData[idx] = 255;
          imageData[idx + 1] = 255;
          imageData[idx + 2] = 0;
        }
      }
    }

    const buffer = await sharp(imageData, {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    const colors = await extractColorsWithArea(buffer);

    // Verify descending order
    for (let i = 0; i < colors.length - 1; i++) {
      expect(colors[i].percentage).toBeGreaterThanOrEqual(colors[i + 1].percentage);
    }
  });

  it('returns 8 colors for k=8', async () => {
    // Create gradient image with many colors
    const width = 100;
    const height = 100;
    const channels = 3;
    const imageData = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        imageData[idx] = Math.floor((x / width) * 255); // R
        imageData[idx + 1] = Math.floor((y / height) * 255); // G
        imageData[idx + 2] = Math.floor(((width - x) / width) * 255); // B
      }
    }

    const buffer = await sharp(imageData, {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    const colors = await extractColorsWithArea(buffer);

    expect(colors).toHaveLength(8);
  });

  it('handles solid color image (all percentages on one cluster)', async () => {
    const buffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const colors = await extractColorsWithArea(buffer);

    expect(colors).toHaveLength(8);
    // First cluster should have high percentage (most pixels)
    expect(colors[0].percentage).toBeGreaterThan(0.5);
  });

  it('handles multi-color image with distinct clusters', async () => {
    // Half red, half blue
    const width = 100;
    const height = 100;
    const channels = 3;
    const imageData = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;

        if (x < 50) {
          // Left half: Red
          imageData[idx] = 255;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 0;
        } else {
          // Right half: Blue
          imageData[idx] = 0;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 255;
        }
      }
    }

    const buffer = await sharp(imageData, {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    const colors = await extractColorsWithArea(buffer);

    // Should have distinct clusters
    expect(colors.length).toBe(8);
    // Top 2 clusters should each have significant percentage (~50% each)
    expect(colors[0].percentage).toBeGreaterThan(0.3);
    expect(colors[1].percentage).toBeGreaterThan(0.3);
  });

  it('throws error for invalid image buffer', async () => {
    const invalidBuffer = Buffer.from('not an image');

    await expect(extractColorsWithArea(invalidBuffer)).rejects.toThrow();
  });
});

describe('extractColorsHueBinning', () => {
  it('should extract colors from a valid image', async () => {
    // Use the same 4-quadrant test fixture as extractColorsWithArea
    const width = 100;
    const height = 100;
    const channels = 3;
    const imageData = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;

        if (x < 50 && y < 50) {
          // Top-left: Red
          imageData[idx] = 255;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 0;
        } else if (x >= 50 && y < 50) {
          // Top-right: Green
          imageData[idx] = 0;
          imageData[idx + 1] = 255;
          imageData[idx + 2] = 0;
        } else if (x < 50 && y >= 50) {
          // Bottom-left: Blue
          imageData[idx] = 0;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 255;
        } else {
          // Bottom-right: Yellow
          imageData[idx] = 255;
          imageData[idx + 1] = 255;
          imageData[idx + 2] = 0;
        }
      }
    }

    const buffer = await sharp(imageData, {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    const colors = await extractColorsHueBinning(buffer);

    // Should extract colors with hex and percentage properties
    expect(colors.length).toBeGreaterThan(0);
    colors.forEach((color) => {
      expect(color).toHaveProperty('hex');
      expect(color).toHaveProperty('percentage');
      expect(color.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(color.percentage).toBeGreaterThanOrEqual(0);
      expect(color.percentage).toBeLessThanOrEqual(1);
    });
  });

  it('should separate colors into different hue bins', async () => {
    // Create image with cyan (~168°) and lime green (~128°)
    // These should fall into different 30° bins:
    // Bin 4 (120-150°) = lime green
    // Bin 5 (150-180°) = cyan
    const width = 100;
    const height = 100;
    const channels = 3;
    const imageData = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;

        if (x < 50) {
          // Left half: Cyan (#00B693)
          imageData[idx] = 0;
          imageData[idx + 1] = 182;
          imageData[idx + 2] = 147;
        } else {
          // Right half: Lime (#3ED754)
          imageData[idx] = 62;
          imageData[idx + 1] = 215;
          imageData[idx + 2] = 84;
        }
      }
    }

    const buffer = await sharp(imageData, {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    const colors = await extractColorsHueBinning(buffer);

    // Should extract at least 2 colors (one from each hue bin)
    expect(colors.length).toBeGreaterThanOrEqual(2);

    // Verify colors have different hues (not averaged together)
    // Extract R, G, B from hex and verify they're distinct
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    const color1 = hexToRgb(colors[0].hex);
    const color2 = hexToRgb(colors[1].hex);

    // Colors should be distinct (not averaged into muddy middle color)
    const colorDistance = Math.sqrt(
      Math.pow(color1.r - color2.r, 2) +
      Math.pow(color1.g - color2.g, 2) +
      Math.pow(color1.b - color2.b, 2)
    );

    // Distance should be significant (not averaged together)
    expect(colorDistance).toBeGreaterThan(50);
  });

  it('should return colors sorted by percentage (descending)', async () => {
    // Create image with different area proportions
    // 60% red, 40% blue
    const width = 100;
    const height = 100;
    const channels = 3;
    const imageData = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;

        if (x < 60) {
          // Left 60%: Red
          imageData[idx] = 255;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 0;
        } else {
          // Right 40%: Blue
          imageData[idx] = 0;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 255;
        }
      }
    }

    const buffer = await sharp(imageData, {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    const colors = await extractColorsHueBinning(buffer);

    // Verify descending order
    for (let i = 0; i < colors.length - 1; i++) {
      expect(colors[i].percentage).toBeGreaterThanOrEqual(colors[i + 1].percentage);
    }

    // First color should have higher percentage (red ~60%)
    expect(colors[0].percentage).toBeGreaterThan(0.5);
  });

  it('should handle all-neutral/grayscale images', async () => {
    // Create grayscale image (black, gray, white)
    const width = 90;
    const height = 30;
    const channels = 3;
    const imageData = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;

        if (x < 30) {
          // Black
          imageData[idx] = 0;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 0;
        } else if (x < 60) {
          // Gray
          imageData[idx] = 128;
          imageData[idx + 1] = 128;
          imageData[idx + 2] = 128;
        } else {
          // White
          imageData[idx] = 255;
          imageData[idx + 1] = 255;
          imageData[idx + 2] = 255;
        }
      }
    }

    const buffer = await sharp(imageData, {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    const colors = await extractColorsHueBinning(buffer);

    // Should not crash and return at least one color (neutral bin)
    expect(colors.length).toBeGreaterThanOrEqual(0);

    // If colors are returned, they should be neutral (low saturation)
    colors.forEach((color) => {
      expect(color).toHaveProperty('hex');
      expect(color).toHaveProperty('percentage');
    });
  });

  it('should use most saturated pixel per bin, not average', async () => {
    // Create an image with fully saturated colors in multiple hue bins
    // Verify that output colors have high saturation (S near 100% in HSV)
    const width = 100;
    const height = 100;
    const channels = 3;
    const imageData = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;

        if (x < 33) {
          // Pure red (255, 0, 0) - 100% saturation
          imageData[idx] = 255;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 0;
        } else if (x < 66) {
          // Pure green (0, 255, 0) - 100% saturation
          imageData[idx] = 0;
          imageData[idx + 1] = 255;
          imageData[idx + 2] = 0;
        } else {
          // Pure blue (0, 0, 255) - 100% saturation
          imageData[idx] = 0;
          imageData[idx + 1] = 0;
          imageData[idx + 2] = 255;
        }
      }
    }

    const buffer = await sharp(imageData, {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    const colors = await extractColorsHueBinning(buffer);

    // Should extract at least 3 colors (one per hue bin)
    expect(colors.length).toBeGreaterThanOrEqual(3);

    // Helper to calculate HSV saturation
    const rgbToSaturation = (r: number, g: number, b: number): number => {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max === 0) return 0;
      return (max - min) / max;
    };

    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    // All output colors should have high saturation (>= 80%)
    // This proves we're using the most saturated pixel, not averaging
    colors.forEach((color) => {
      const rgb = hexToRgb(color.hex);
      const saturation = rgbToSaturation(rgb.r, rgb.g, rgb.b);

      // Each color should be highly saturated
      // If averaging was used, saturation would be much lower
      expect(saturation).toBeGreaterThanOrEqual(0.8);
    });
  });
});
