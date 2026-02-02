// src/lib/theme/website/color-merger.ts

import type { DOMColorMap } from './dom-correlator';
import type { ColorWithArea } from '../extractor';

// Re-export for consumers
export type { DOMColorMap };

/**
 * Calculates perceptual color difference using simplified deltaE formula.
 * Uses RGB Euclidean distance as approximation (actual deltaE would use Lab color space).
 * Returns a value where 0 = identical colors, higher = more different.
 */
function deltaE(hex1: string, hex2: string): number {
  // For simplicity, use RGB distance as deltaE approximation
  // Real deltaE would convert to Lab color space, but RGB distance is sufficient for validation
  return colorDistance(hex1, hex2);
}

export type ColorSourceType =
  | 'dom-logo'
  | 'dom-cta'
  | 'dom-navigation'
  | 'dom-headings'
  | 'dom-accent'
  | 'css-variable'
  | 'pixel';

export interface ColorSource {
  hex: string;
  source: ColorSourceType;
  weight: number;
}

const CATEGORY_WEIGHTS = {
  logo: 1.0,
  cta: 0.9,
  accent: 0.8,
  headings: 0.7,
  navigation: 0.6,
  cssVariable: 0.5,
  pixel: 0.3,
};

const SIMILAR_THRESHOLD = 30;

const SEMANTIC_BOOST = {
  logo: 1.5,
  cta: 1.4,
  accent: 1.3,
  headings: 1.2,
  navigation: 1.1,
  cssVariable: 1.1,
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
  );
}

export function mergeColors(
  domColors: DOMColorMap,
  cssColors: Record<string, string>,
  pixelColors: string[]
): string[] {
  const allColors: ColorSource[] = [];

  // 1. Collect DOM colors with weights
  if (domColors.logo) {
    for (const hex of domColors.logo) {
      allColors.push({ hex, source: 'dom-logo', weight: CATEGORY_WEIGHTS.logo });
    }
  }
  if (domColors.cta) {
    for (const hex of domColors.cta) {
      allColors.push({ hex, source: 'dom-cta', weight: CATEGORY_WEIGHTS.cta });
    }
  }
  if (domColors.accent) {
    for (const hex of domColors.accent) {
      allColors.push({ hex, source: 'dom-accent', weight: CATEGORY_WEIGHTS.accent });
    }
  }
  if (domColors.headings) {
    for (const hex of domColors.headings) {
      allColors.push({ hex, source: 'dom-headings', weight: CATEGORY_WEIGHTS.headings });
    }
  }
  if (domColors.navigation) {
    for (const hex of domColors.navigation) {
      allColors.push({ hex, source: 'dom-navigation', weight: CATEGORY_WEIGHTS.navigation });
    }
  }

  // 2. Collect CSS variable colors
  for (const hex of Object.values(cssColors)) {
    allColors.push({ hex, source: 'css-variable', weight: CATEGORY_WEIGHTS.cssVariable });
  }

  // 3. Collect pixel colors
  for (const hex of pixelColors) {
    allColors.push({ hex, source: 'pixel', weight: CATEGORY_WEIGHTS.pixel });
  }

  // 4. Group similar colors (RGB distance < 30)
  const groups: ColorSource[][] = [];
  const processed = new Set<number>();

  for (let i = 0; i < allColors.length; i++) {
    if (processed.has(i)) continue;

    const group: ColorSource[] = [allColors[i]];
    processed.add(i);

    for (let j = i + 1; j < allColors.length; j++) {
      if (processed.has(j)) continue;

      if (colorDistance(allColors[i].hex, allColors[j].hex) < SIMILAR_THRESHOLD) {
        group.push(allColors[j]);
        processed.add(j);
      }
    }

    groups.push(group);
  }

  // 5. Select highest-scoring color from each group
  const selectedColors: ColorSource[] = [];

  for (const group of groups) {
    // Sort by weight (descending), then by source priority
    const sorted = group.sort((a, b) => {
      if (b.weight !== a.weight) {
        return b.weight - a.weight;
      }

      // Tie-breaking: DOM > CSS > Pixel
      const sourcePriority: Record<ColorSourceType, number> = {
        'dom-logo': 6,
        'dom-cta': 5,
        'dom-accent': 4,
        'dom-headings': 3,
        'dom-navigation': 2,
        'css-variable': 1,
        'pixel': 0,
      };

      return sourcePriority[b.source] - sourcePriority[a.source];
    });

    selectedColors.push(sorted[0]);
  }

  // 6. Sort by score (descending) and return top 8
  const finalColors = selectedColors
    .sort((a, b) => {
      if (b.weight !== a.weight) {
        return b.weight - a.weight;
      }

      // Tie-breaking: DOM > CSS > Pixel
      const sourcePriority: Record<ColorSourceType, number> = {
        'dom-logo': 6,
        'dom-cta': 5,
        'dom-accent': 4,
        'dom-headings': 3,
        'dom-navigation': 2,
        'css-variable': 1,
        'pixel': 0,
      };

      return sourcePriority[b.source] - sourcePriority[a.source];
    })
    .slice(0, 8)
    .map((c) => c.hex);

  return finalColors;
}

function isGrayscaleOrExtreme(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);

  // Lightness (0-1)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 510; // = (max + min) / (2 * 255)

  // Filter: too bright (>90%) or too dark (<10%)
  if (lightness > 0.90 || lightness < 0.10) return true;

  // Saturation based on chroma
  const chroma = max - min;
  if (chroma === 0) return true; // Pure grayscale

  // Saturation = chroma / (255 * (1 - |2L - 1|))
  const saturationDenom = 255 * (1 - Math.abs(2 * lightness - 1));
  const saturation = saturationDenom > 0 ? chroma / saturationDenom : 0;

  // Filter: low saturation (<12%) - muted/grayish colors
  return saturation < 0.12;
}

export function filterGrayscale(colors: ColorWithArea[]): ColorWithArea[] {
  return colors.filter(c => !isGrayscaleOrExtreme(c.hex));
}

function findSemanticBoost(
  hex: string,
  domColors: DOMColorMap,
  cssColors: Record<string, string>
): number {
  let boost = 1.0;

  const checkCategory = (colors: string[], boostValue: number) => {
    for (const domHex of colors) {
      if (colorDistance(hex, domHex) < SIMILAR_THRESHOLD) {
        boost = Math.max(boost, boostValue);
        break;
      }
    }
  };

  checkCategory(domColors.logo, SEMANTIC_BOOST.logo);
  checkCategory(domColors.cta, SEMANTIC_BOOST.cta);
  checkCategory(domColors.accent, SEMANTIC_BOOST.accent);
  checkCategory(domColors.headings, SEMANTIC_BOOST.headings);
  checkCategory(domColors.navigation, SEMANTIC_BOOST.navigation);

  for (const cssHex of Object.values(cssColors)) {
    if (colorDistance(hex, cssHex) < SIMILAR_THRESHOLD) {
      boost = Math.max(boost, SEMANTIC_BOOST.cssVariable);
    }
  }

  return boost;
}

export function mergeColorsVisionFirst(
  visualColors: ColorWithArea[],
  domColors: DOMColorMap,
  cssColors: Record<string, string>
): string[] {
  // 1. Filter grayscale
  const filtered = filterGrayscale(visualColors);

  // 2. Calculate weighted scores: area * semantic boost
  const scored = filtered.map(({ hex, percentage }) => ({
    hex,
    weight: percentage * findSemanticBoost(hex, domColors, cssColors),
    percentage
  }));

  // 3. Inject high-priority DOM colors that aren't captured in visual extraction
  const BASE_INJECTION_WEIGHT = 0.08;
  const highPriorityDOMColors: { hex: string; priority: string }[] = [];

  // Collect CTA and accent colors (highest priority semantic colors)
  if (domColors.cta) {
    for (const hex of domColors.cta) {
      highPriorityDOMColors.push({ hex, priority: 'cta' });
    }
  }
  if (domColors.accent) {
    for (const hex of domColors.accent) {
      highPriorityDOMColors.push({ hex, priority: 'accent' });
    }
  }

  // Check if each high-priority DOM color exists in visual colors
  for (const { hex: domHex } of highPriorityDOMColors) {
    // Skip if grayscale/extreme
    if (isGrayscaleOrExtreme(domHex)) continue;

    // Check if similar color exists in scored visual colors
    const hasSimilarVisualColor = scored.some(
      (visualColor) => colorDistance(visualColor.hex, domHex) < SIMILAR_THRESHOLD
    );

    // If NOT present, inject it with base weight
    if (!hasSimilarVisualColor) {
      scored.push({
        hex: domHex,
        weight: BASE_INJECTION_WEIGHT,
        percentage: BASE_INJECTION_WEIGHT, // Not used further, but kept for consistency
      });
    }
  }

  // 4. Sort by weight (descending)
  scored.sort((a, b) => b.weight - a.weight);

  // 5. Return top 8
  return scored.slice(0, 8).map(c => c.hex);
}

/**
 * Merges colors using Hue-Binning extraction as the primary source.
 * Hue-binning already provides properly separated colors by hue regions,
 * so we primarily trust visual colors and cross-validate with DOM/CSS for confidence boosting.
 *
 * @param visualColors - Colors from hue-binning extraction (already hue-separated)
 * @param domColors - DOM-extracted colors by semantic category
 * @param cssColors - CSS variable colors
 * @returns Top 8 colors sorted by priority
 */
export function mergeColorsHueBinningFirst(
  visualColors: ColorWithArea[],
  domColors: string[],
  cssColors: string[]
): string[] {
  const DELTA_E_THRESHOLD = 10; // Perceptual similarity threshold
  const DOM_BOOST = 1.5; // Boost confidence if color matches DOM color
  const CSS_BOOST = 1.2; // Smaller boost for CSS colors (less reliable)

  // 1. Filter out grayscale/extreme colors
  const filtered = filterGrayscale(visualColors);

  // 2. Calculate confidence scores for each visual color
  interface ScoredColor {
    hex: string;
    confidence: number;
    percentage: number;
  }

  const scored: ScoredColor[] = filtered.map(({ hex, percentage }) => {
    let confidence = percentage; // Start with visual area as base confidence

    // Cross-validate with DOM colors: boost if similar color found
    for (const domHex of domColors) {
      if (deltaE(hex, domHex) < DELTA_E_THRESHOLD) {
        confidence *= DOM_BOOST;
        break; // Only apply boost once per color
      }
    }

    // Cross-validate with CSS colors: smaller boost
    for (const cssHex of cssColors) {
      if (deltaE(hex, cssHex) < DELTA_E_THRESHOLD) {
        confidence *= CSS_BOOST;
        break;
      }
    }

    return { hex, confidence, percentage };
  });

  // 3. Sort by confidence (descending) and return top 8
  scored.sort((a, b) => b.confidence - a.confidence);
  return scored.slice(0, 8).map(c => c.hex);
}

/**
 * Validates extracted colors against expected brand colors.
 * Useful for testing extraction accuracy.
 *
 * @param extracted - Colors extracted by the system
 * @param expected - Known correct brand colors
 * @param threshold - deltaE threshold for considering a match (default: 10)
 * @returns Validation metrics
 */
export function validateExtraction(
  extracted: string[],
  expected: string[],
  threshold: number = 10
): { matches: number; total: number; accuracy: number } {
  let matches = 0;

  // For each expected color, check if a similar color exists in extracted
  for (const expectedHex of expected) {
    const hasMatch = extracted.some(extractedHex =>
      deltaE(expectedHex, extractedHex) < threshold
    );
    if (hasMatch) {
      matches++;
    }
  }

  const total = expected.length;
  const accuracy = total > 0 ? matches / total : 0;

  return { matches, total, accuracy };
}
