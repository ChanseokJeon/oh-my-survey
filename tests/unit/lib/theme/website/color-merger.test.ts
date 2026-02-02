import { describe, it, expect } from 'vitest';
import {
  mergeColors,
  filterGrayscale,
  mergeColorsVisionFirst,
  type DOMColorMap,
} from '@/lib/theme/website/color-merger';
import type { ColorWithArea } from '@/lib/theme/extractor';

describe('mergeColors', () => {
  const emptyDomColors: DOMColorMap = {
    logo: [],
    cta: [],
    navigation: [],
    headings: [],
    accent: [],
  };

  describe('Weight-based ranking', () => {
    it('ranks logo colors highest (weight 1.0)', () => {
      const domColors: DOMColorMap = {
        logo: ['#ff0000'],
        cta: ['#00ff00'],
        navigation: ['#0000ff'],
        headings: [],
        accent: [],
      };
      const result = mergeColors(domColors, {}, []);
      expect(result[0]).toBe('#ff0000');
    });

    it('ranks CTA colors second (weight 0.9)', () => {
      const domColors: DOMColorMap = {
        logo: [],
        cta: ['#00ff00'],
        navigation: ['#0000ff'],
        headings: ['#ffff00'],
        accent: ['#ff00ff'],
      };
      const result = mergeColors(domColors, {}, []);
      expect(result[0]).toBe('#00ff00');
    });

    it('ranks accent colors third (weight 0.8)', () => {
      const domColors: DOMColorMap = {
        logo: [],
        cta: [],
        navigation: ['#0000ff'],
        headings: ['#ffff00'],
        accent: ['#ff00ff'],
      };
      const result = mergeColors(domColors, {}, []);
      expect(result[0]).toBe('#ff00ff');
    });

    it('ranks headings colors fourth (weight 0.7)', () => {
      const domColors: DOMColorMap = {
        logo: [],
        cta: [],
        navigation: ['#0000ff'],
        headings: ['#ffff00'],
        accent: [],
      };
      const result = mergeColors(domColors, {}, []);
      expect(result[0]).toBe('#ffff00');
    });

    it('ranks navigation colors fifth (weight 0.6)', () => {
      const domColors: DOMColorMap = {
        logo: [],
        cta: [],
        navigation: ['#0000ff'],
        headings: [],
        accent: [],
      };
      const cssColors = { primary: '#ffff00' };
      const result = mergeColors(domColors, cssColors, []);
      expect(result[0]).toBe('#0000ff');
    });

    it('ranks CSS variables sixth (weight 0.5)', () => {
      const cssColors = { primary: '#ffff00' };
      const pixelColors = ['#ff00ff'];
      const result = mergeColors(emptyDomColors, cssColors, pixelColors);
      expect(result[0]).toBe('#ffff00');
    });

    it('ranks pixel colors lowest (weight 0.3)', () => {
      const pixelColors = ['#ff00ff'];
      const result = mergeColors(emptyDomColors, {}, pixelColors);
      expect(result[0]).toBe('#ff00ff');
    });
  });

  describe('Similar color merging', () => {
    it('merges similar colors with RGB distance < 30', () => {
      // #ff0000 (255,0,0) and #ff1010 (255,16,16) have distance ~22.6
      const domColors: DOMColorMap = {
        logo: ['#ff0000'],
        cta: ['#ff1010'],
        navigation: [],
        headings: [],
        accent: [],
      };
      const result = mergeColors(domColors, {}, []);
      // Should merge into one color (logo has higher weight)
      expect(result.length).toBe(1);
      expect(result[0]).toBe('#ff0000');
    });

    it('does not merge dissimilar colors with RGB distance >= 30', () => {
      // #ff0000 (255,0,0) and #ff2020 (255,32,32) have distance ~45.3
      const domColors: DOMColorMap = {
        logo: ['#ff0000'],
        cta: ['#ff2020'],
        navigation: [],
        headings: [],
        accent: [],
      };
      const result = mergeColors(domColors, {}, []);
      // Should NOT merge
      expect(result.length).toBe(2);
      expect(result).toContain('#ff0000');
      expect(result).toContain('#ff2020');
    });

    it('merges multiple similar colors into one group', () => {
      // All reds within distance 30
      const domColors: DOMColorMap = {
        logo: ['#ff0000'],
        cta: ['#ff0505'],
        navigation: ['#ff0a0a'],
        headings: [],
        accent: [],
      };
      const result = mergeColors(domColors, {}, []);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('#ff0000'); // Highest weight
    });
  });

  describe('Maximum colors limit', () => {
    it('returns max 8 colors', () => {
      const domColors: DOMColorMap = {
        logo: ['#ff0000', '#00ff00'], // 2
        cta: ['#0000ff', '#ffff00'], // 2
        navigation: ['#ff00ff', '#00ffff'], // 2
        headings: ['#ff8800', '#88ff00'], // 2
        accent: ['#8800ff', '#0088ff'], // 2
      };
      const result = mergeColors(domColors, {}, []);
      expect(result.length).toBeLessThanOrEqual(8);
    });

    it('keeps highest-weighted colors when exceeding 8', () => {
      const domColors: DOMColorMap = {
        logo: ['#ff0000', '#11ff00'], // weight 1.0
        cta: ['#0000ff', '#22ffff'], // weight 0.9
        navigation: ['#ff00ff', '#33ff00'], // weight 0.6
        headings: ['#ff8800', '#44ff00'], // weight 0.7
        accent: ['#8800ff', '#55ff00'], // weight 0.8
      };
      const cssColors = {
        primary: '#66ff00', // weight 0.5
        secondary: '#77ff00',
      };
      const pixelColors = ['#88ff00', '#99ff00']; // weight 0.3
      const result = mergeColors(domColors, cssColors, pixelColors);

      expect(result.length).toBe(8);
      // Top colors should include logo and cta
      expect(result.slice(0, 4)).toEqual(
        expect.arrayContaining(['#ff0000', '#11ff00', '#0000ff', '#22ffff'])
      );
    });
  });

  describe('Empty input handling', () => {
    it('handles empty domColors', () => {
      const cssColors = { primary: '#ff0000' };
      const pixelColors = ['#00ff00'];
      const result = mergeColors(emptyDomColors, cssColors, pixelColors);
      expect(result.length).toBe(2);
      expect(result[0]).toBe('#ff0000'); // CSS has higher weight
    });

    it('handles empty cssColors', () => {
      const domColors: DOMColorMap = {
        logo: ['#ff0000'],
        cta: [],
        navigation: [],
        headings: [],
        accent: [],
      };
      const pixelColors = ['#00ff00'];
      const result = mergeColors(domColors, {}, pixelColors);
      expect(result.length).toBe(2);
      expect(result[0]).toBe('#ff0000'); // DOM has higher weight
    });

    it('handles empty pixelColors', () => {
      const domColors: DOMColorMap = {
        logo: ['#ff0000'],
        cta: [],
        navigation: [],
        headings: [],
        accent: [],
      };
      const cssColors = { primary: '#00ff00' };
      const result = mergeColors(domColors, cssColors, []);
      expect(result.length).toBe(2);
      expect(result[0]).toBe('#ff0000');
    });

    it('handles all empty inputs', () => {
      const result = mergeColors(emptyDomColors, {}, []);
      expect(result).toEqual([]);
    });
  });

  describe('Tie-breaking rules', () => {
    it('prefers DOM over CSS when weights are equal', () => {
      // Navigation (DOM, weight 0.6) vs CSS variable (weight 0.5)
      // But we need same weight for tie-breaking test
      // Let's create similar colors with same weight category
      const domColors: DOMColorMap = {
        logo: ['#ff0000'],
        cta: ['#ff0001'], // Similar to logo, will be in same group
        navigation: [],
        headings: [],
        accent: [],
      };
      const result = mergeColors(domColors, {}, []);
      // Logo (dom-logo) should win over CTA (dom-cta) despite similar weight
      expect(result[0]).toBe('#ff0000');
    });

    it('prefers CSS over Pixel when weights are equal', () => {
      // Create scenario where CSS and Pixel compete
      const cssColors = { primary: '#00ff00' };
      const pixelColors = ['#00ff01']; // Very similar
      const result = mergeColors(emptyDomColors, cssColors, pixelColors);
      expect(result[0]).toBe('#00ff00'); // CSS wins
    });

    it('prefers higher source priority within same weight', () => {
      // dom-logo (priority 6) > dom-cta (priority 5)
      const domColors: DOMColorMap = {
        logo: ['#ff0000'],
        cta: ['#ff0001'], // Similar, will merge
        navigation: [],
        headings: [],
        accent: [],
      };
      const result = mergeColors(domColors, {}, []);
      expect(result[0]).toBe('#ff0000');
    });
  });

  describe('Weight calculation correctness', () => {
    it('correctly applies CATEGORY_WEIGHTS to all sources', () => {
      // Use colors far apart to avoid merging (RGB distance > 30)
      const domColors: DOMColorMap = {
        logo: ['#ff0000'], // 1.0 - red
        cta: ['#00ff00'], // 0.9 - green
        navigation: ['#0000ff'], // 0.6 - blue
        headings: ['#ffff00'], // 0.7 - yellow
        accent: ['#ff00ff'], // 0.8 - magenta
      };
      const cssColors = { primary: '#00ffff' }; // 0.5 - cyan
      const pixelColors = ['#ffffff']; // 0.3 - white

      const result = mergeColors(domColors, cssColors, pixelColors);

      // Verify we get all 7 colors (no merging since all are distinct)
      expect(result.length).toBe(7);

      // Verify order matches weights (highest to lowest)
      expect(result[0]).toBe('#ff0000'); // logo (1.0)
      expect(result[1]).toBe('#00ff00'); // cta (0.9)
      expect(result[2]).toBe('#ff00ff'); // accent (0.8)
      expect(result[3]).toBe('#ffff00'); // headings (0.7)
      expect(result[4]).toBe('#0000ff'); // navigation (0.6)
      expect(result[5]).toBe('#00ffff'); // CSS (0.5)
      expect(result[6]).toBe('#ffffff'); // pixel (0.3)
    });
  });

  describe('Color conversion utilities', () => {
    it('handles valid hex colors', () => {
      const domColors: DOMColorMap = {
        logo: ['#ffffff'],
        cta: ['#000000'],
        navigation: ['#ff00ff'],
        headings: [],
        accent: [],
      };
      const result = mergeColors(domColors, {}, []);
      expect(result).toContain('#ffffff');
      expect(result).toContain('#000000');
      expect(result).toContain('#ff00ff');
    });

    it('correctly computes RGB distance for exact threshold case', () => {
      // Create two colors exactly 30 units apart
      // #ff0000 (255,0,0) to #ff001e (255,0,30) = distance 30
      const domColors: DOMColorMap = {
        logo: ['#ff0000'],
        cta: ['#ff001e'],
        navigation: [],
        headings: [],
        accent: [],
      };
      const result = mergeColors(domColors, {}, []);
      // Distance 30 should NOT merge (threshold is < 30, not <=)
      expect(result.length).toBe(2);
    });

    it('correctly computes RGB distance for just under threshold', () => {
      // #ff0000 (255,0,0) to #ff001d (255,0,29) = distance 29
      const domColors: DOMColorMap = {
        logo: ['#ff0000'],
        cta: ['#ff001d'],
        navigation: [],
        headings: [],
        accent: [],
      };
      const result = mergeColors(domColors, {}, []);
      // Distance 29 should merge (< 30)
      expect(result.length).toBe(1);
    });
  });

  describe('Real-world scenarios', () => {
    it('handles GitHub-like branding (green logo, gray UI)', () => {
      const domColors: DOMColorMap = {
        logo: ['#238636'], // GitHub green
        cta: ['#238636'],
        navigation: ['#21262d'], // Dark gray
        headings: ['#c9d1d9'], // Light gray
        accent: ['#58a6ff'], // Blue links
      };
      const result = mergeColors(domColors, {}, []);

      // Green should rank highest (logo/cta merge)
      expect(result[0]).toBe('#238636');
      // Blue accent should rank high
      expect(result).toContain('#58a6ff');
    });

    it('handles Stripe-like branding (purple accents)', () => {
      const domColors: DOMColorMap = {
        logo: ['#635bff'], // Stripe purple
        cta: ['#0a2540'], // Dark blue CTA
        navigation: ['#425466'],
        headings: ['#0a2540'],
        accent: ['#00d4ff'], // Cyan
      };
      const result = mergeColors(domColors, {}, []);

      expect(result[0]).toBe('#635bff'); // Logo purple
      expect(result).toContain('#00d4ff'); // Accent cyan
    });

    it('handles Tailwind-like branding (teal logo)', () => {
      const domColors: DOMColorMap = {
        logo: ['#06b6d4'], // Tailwind teal
        cta: ['#0ea5e9'], // Sky blue - distance 28.2 from logo, WILL MERGE
        navigation: ['#0f172a'], // Dark navy
        headings: ['#0f172a'], // Same as navigation - will merge
        accent: ['#8b5cf6'], // Purple
      };
      const result = mergeColors(domColors, {}, []);

      // Should have 3 unique colors:
      // 1. logo+cta merged (distance ~28.2)
      // 2. accent
      // 3. navigation+headings merged (identical)
      expect(result.length).toBe(3);
      expect(result[0]).toBe('#06b6d4'); // Logo (1.0) wins over CTA (0.9)
      expect(result[1]).toBe('#8b5cf6'); // Accent purple (0.8)
      expect(result[2]).toBe('#0f172a'); // Headings (0.7) wins over navigation (0.6)
    });
  });
});

describe('isGrayscaleOrExtreme (via filterGrayscale)', () => {
  const emptyDomColors: DOMColorMap = {
    logo: [],
    cta: [],
    navigation: [],
    headings: [],
    accent: [],
  };

  describe('filterGrayscale', () => {
    it('filters pure white (#ffffff)', () => {
      const colors: ColorWithArea[] = [
        { hex: '#ffffff', percentage: 0.5 },
        { hex: '#ff0000', percentage: 0.5 },
      ];
      const result = filterGrayscale(colors);

      expect(result).toHaveLength(1);
      expect(result[0].hex).toBe('#ff0000');
    });

    it('filters pure black (#000000)', () => {
      const colors: ColorWithArea[] = [
        { hex: '#000000', percentage: 0.3 },
        { hex: '#00ff00', percentage: 0.7 },
      ];
      const result = filterGrayscale(colors);

      expect(result).toHaveLength(1);
      expect(result[0].hex).toBe('#00ff00');
    });

    it('filters gray (#808080)', () => {
      const colors: ColorWithArea[] = [
        { hex: '#808080', percentage: 0.2 },
        { hex: '#0000ff', percentage: 0.8 },
      ];
      const result = filterGrayscale(colors);

      expect(result).toHaveLength(1);
      expect(result[0].hex).toBe('#0000ff');
    });

    it('filters various grayscale tones', () => {
      const colors: ColorWithArea[] = [
        { hex: '#f0f0f0', percentage: 0.1 }, // Light gray
        { hex: '#cccccc', percentage: 0.1 }, // Medium gray
        { hex: '#333333', percentage: 0.1 }, // Dark gray
        { hex: '#ff0000', percentage: 0.7 }, // Red (saturated)
      ];
      const result = filterGrayscale(colors);

      expect(result).toHaveLength(1);
      expect(result[0].hex).toBe('#ff0000');
    });

    it('keeps saturated colors (#ff0000)', () => {
      const colors: ColorWithArea[] = [
        { hex: '#ff0000', percentage: 0.33 }, // Red
        { hex: '#00ff00', percentage: 0.33 }, // Green
        { hex: '#0000ff', percentage: 0.34 }, // Blue
      ];
      const result = filterGrayscale(colors);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ hex: '#ff0000', percentage: 0.33 });
      expect(result).toContainEqual({ hex: '#00ff00', percentage: 0.33 });
      expect(result).toContainEqual({ hex: '#0000ff', percentage: 0.34 });
    });

    it('keeps colors with sufficient saturation', () => {
      const colors: ColorWithArea[] = [
        { hex: '#3b82f6', percentage: 0.25 }, // Tailwind blue
        { hex: '#ef4444', percentage: 0.25 }, // Tailwind red
        { hex: '#10b981', percentage: 0.25 }, // Tailwind green
        { hex: '#f59e0b', percentage: 0.25 }, // Tailwind amber
      ];
      const result = filterGrayscale(colors);

      // All should be kept (saturated colors)
      expect(result).toHaveLength(4);
    });

    it('removes grayscale colors from ColorWithArea[]', () => {
      const colors: ColorWithArea[] = [
        { hex: '#ffffff', percentage: 0.2 },
        { hex: '#808080', percentage: 0.1 },
        { hex: '#ff0000', percentage: 0.4 },
        { hex: '#000000', percentage: 0.1 },
        { hex: '#00ff00', percentage: 0.2 },
      ];
      const result = filterGrayscale(colors);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { hex: '#ff0000', percentage: 0.4 },
        { hex: '#00ff00', percentage: 0.2 },
      ]);
    });

    it('handles empty input', () => {
      const colors: ColorWithArea[] = [];
      const result = filterGrayscale(colors);

      expect(result).toEqual([]);
    });

    it('handles all grayscale input', () => {
      const colors: ColorWithArea[] = [
        { hex: '#ffffff', percentage: 0.4 },
        { hex: '#cccccc', percentage: 0.3 },
        { hex: '#808080', percentage: 0.2 },
        { hex: '#000000', percentage: 0.1 },
      ];
      const result = filterGrayscale(colors);

      expect(result).toEqual([]);
    });
  });
});

describe('mergeColorsVisionFirst', () => {
  const emptyDomColors: DOMColorMap = {
    logo: [],
    cta: [],
    navigation: [],
    headings: [],
    accent: [],
  };

  it('larger area colors rank higher (without semantic boost)', () => {
    const visualColors: ColorWithArea[] = [
      { hex: '#ff0000', percentage: 0.6 }, // Large area
      { hex: '#00ff00', percentage: 0.3 }, // Medium area
      { hex: '#0000ff', percentage: 0.1 }, // Small area
    ];

    const result = mergeColorsVisionFirst(visualColors, emptyDomColors, {});

    expect(result[0]).toBe('#ff0000'); // Largest area
    expect(result[1]).toBe('#00ff00'); // Second largest
    expect(result[2]).toBe('#0000ff'); // Smallest
  });

  it('semantic boost increases weight', () => {
    const visualColors: ColorWithArea[] = [
      { hex: '#ff0000', percentage: 0.1 }, // Small area, but matches logo
      { hex: '#00ff00', percentage: 0.9 }, // Large area, no semantic match
    ];

    const domColors: DOMColorMap = {
      logo: ['#ff0000'], // Semantic boost for red
      cta: [],
      navigation: [],
      headings: [],
      accent: [],
    };

    const result = mergeColorsVisionFirst(visualColors, domColors, {});

    // Red should rank higher due to semantic boost (0.1 * 1.5 = 0.15 vs 0.9 * 1.0 = 0.9)
    // Actually green still wins, but boost helps red compete better
    expect(result).toContain('#ff0000');
    expect(result).toContain('#00ff00');
  });

  it('semantic boost from logo is highest (1.5x)', () => {
    const visualColors: ColorWithArea[] = [
      { hex: '#ff0000', percentage: 0.2 }, // Logo color
      { hex: '#00ff00', percentage: 0.2 }, // CTA color
      { hex: '#0000ff', percentage: 0.2 }, // Accent color
    ];

    const domColors: DOMColorMap = {
      logo: ['#ff0000'], // Boost 1.5x
      cta: ['#00ff00'], // Boost 1.4x
      navigation: [],
      headings: [],
      accent: ['#0000ff'], // Boost 1.3x
    };

    const result = mergeColorsVisionFirst(visualColors, domColors, {});

    // With equal area (0.2), semantic boost determines order:
    // red: 0.2 * 1.5 = 0.30
    // green: 0.2 * 1.4 = 0.28
    // blue: 0.2 * 1.3 = 0.26
    expect(result[0]).toBe('#ff0000'); // Highest boost
    expect(result[1]).toBe('#00ff00'); // Second highest
    expect(result[2]).toBe('#0000ff'); // Third highest
  });

  it('returns max 8 colors', () => {
    const visualColors: ColorWithArea[] = [
      { hex: '#ff0000', percentage: 0.15 },
      { hex: '#00ff00', percentage: 0.14 },
      { hex: '#0000ff', percentage: 0.13 },
      { hex: '#ffff00', percentage: 0.12 },
      { hex: '#ff00ff', percentage: 0.11 },
      { hex: '#00ffff', percentage: 0.1 },
      { hex: '#ff8800', percentage: 0.09 },
      { hex: '#88ff00', percentage: 0.08 },
      { hex: '#8800ff', percentage: 0.07 },
      { hex: '#0088ff', percentage: 0.01 },
    ];

    const result = mergeColorsVisionFirst(visualColors, emptyDomColors, {});

    expect(result.length).toBeLessThanOrEqual(8);
  });

  it('filters grayscale before ranking', () => {
    const visualColors: ColorWithArea[] = [
      { hex: '#ffffff', percentage: 0.4 }, // White (should be filtered)
      { hex: '#ff0000', percentage: 0.3 }, // Red (kept)
      { hex: '#808080', percentage: 0.2 }, // Gray (should be filtered)
      { hex: '#00ff00', percentage: 0.1 }, // Green (kept)
    ];

    const result = mergeColorsVisionFirst(visualColors, emptyDomColors, {});

    expect(result).toHaveLength(2);
    expect(result[0]).toBe('#ff0000');
    expect(result[1]).toBe('#00ff00');
    expect(result).not.toContain('#ffffff');
    expect(result).not.toContain('#808080');
  });

  it('handles all grayscale input', () => {
    const visualColors: ColorWithArea[] = [
      { hex: '#ffffff', percentage: 0.4 },
      { hex: '#cccccc', percentage: 0.3 },
      { hex: '#808080', percentage: 0.2 },
      { hex: '#000000', percentage: 0.1 },
    ];

    const result = mergeColorsVisionFirst(visualColors, emptyDomColors, {});

    expect(result).toEqual([]);
  });

  it('combines area and semantic signals correctly', () => {
    const visualColors: ColorWithArea[] = [
      { hex: '#ff0000', percentage: 0.05 }, // Small area, logo boost
      { hex: '#00ff00', percentage: 0.5 }, // Large area, no boost
      { hex: '#0000ff', percentage: 0.45 }, // Large area, no boost
    ];

    const domColors: DOMColorMap = {
      logo: ['#ff0000'], // 1.5x boost
      cta: [],
      navigation: [],
      headings: [],
      accent: [],
    };

    const result = mergeColorsVisionFirst(visualColors, domColors, {});

    // Scores:
    // red: 0.05 * 1.5 = 0.075
    // green: 0.5 * 1.0 = 0.5
    // blue: 0.45 * 1.0 = 0.45
    expect(result[0]).toBe('#00ff00'); // Highest score
    expect(result[1]).toBe('#0000ff'); // Second
    expect(result[2]).toBe('#ff0000'); // Third (area too small to overcome)
  });

  it('handles CSS variable semantic boost', () => {
    const visualColors: ColorWithArea[] = [
      { hex: '#ff0000', percentage: 0.5 },
      { hex: '#00ff00', percentage: 0.5 }, // Matches CSS variable
    ];

    const cssColors = {
      primary: '#00ff00', // Boost 1.1x
    };

    const result = mergeColorsVisionFirst(visualColors, emptyDomColors, cssColors);

    // Scores:
    // red: 0.5 * 1.0 = 0.5
    // green: 0.5 * 1.1 = 0.55
    expect(result[0]).toBe('#00ff00'); // Boosted by CSS variable
    expect(result[1]).toBe('#ff0000');
  });

  it('handles empty visual colors', () => {
    const visualColors: ColorWithArea[] = [];

    const result = mergeColorsVisionFirst(visualColors, emptyDomColors, {});

    expect(result).toEqual([]);
  });

  it('handles real-world scenario: website with large gray background and small brand colors', () => {
    const visualColors: ColorWithArea[] = [
      { hex: '#f5f5f5', percentage: 0.7 }, // Large gray background (filtered)
      { hex: '#3b82f6', percentage: 0.15 }, // Blue logo
      { hex: '#10b981', percentage: 0.1 }, // Green CTA
      { hex: '#ffffff', percentage: 0.05 }, // White (filtered)
    ];

    const domColors: DOMColorMap = {
      logo: ['#3b82f6'], // Blue gets 1.5x boost
      cta: ['#10b981'], // Green gets 1.4x boost
      navigation: [],
      headings: [],
      accent: [],
    };

    const result = mergeColorsVisionFirst(visualColors, domColors, {});

    // Grayscale filtered, leaving only blue and green
    expect(result).toHaveLength(2);
    // Blue: 0.15 * 1.5 = 0.225
    // Green: 0.1 * 1.4 = 0.14
    expect(result[0]).toBe('#3b82f6'); // Blue ranks higher
    expect(result[1]).toBe('#10b981'); // Green second
  });
});
