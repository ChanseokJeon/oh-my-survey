// src/lib/theme/website/dom-correlator.ts

import { Page } from 'playwright-core';
import { cssColorToHex } from './css-extractor';

export interface DOMColorMap {
  logo: string[];
  cta: string[];
  navigation: string[];
  headings: string[];
  accent: string[];
}

const SEMANTIC_SELECTORS = {
  logo: [
    '[class*="logo"]',
    '#logo',
    'header img[src*="logo"]',
    'header svg',
    'a[href="/"] img',
    '[aria-label*="logo" i]',
  ],
  cta: [
    // Primary button classes
    'button[class*="primary"]',
    'a[class*="primary"]',
    'button[class*="btn-primary"]',
    '.btn-primary',

    // CTA-specific classes
    'a[class*="cta"]',
    'button[class*="cta"]',
    '[class*="cta-button"]',
    '[class*="call-to-action"]',

    // Material-UI buttons
    '.MuiButton-root',
    '.MuiButton-contained',
    '.MuiButton-containedPrimary',
    '[class*="MuiButton-root"]',
    '[class*="MuiButton-contained"]',
    '[class*="MuiLoadingButton"]',

    // Hero section buttons (high priority CTA location)
    '[class*="hero"] button',
    '[class*="hero"] a[href]:not([href="#"])',
    '[class*="banner"] button',
    '[class*="banner"] a[href]:not([href="#"])',

    // Generic colored buttons (likely CTAs)
    'button:not([class*="secondary"]):not([class*="outline"]):not([class*="ghost"])',
    'main button',
    '[class*="main"] button',

    // Korean/international button text patterns via data attributes
    '[data-action="signup"]',
    '[data-action="start"]',
    '[data-action="trial"]',

    // Action buttons
    '[class*="action"] button',
    '[class*="start"] button',
    'button[class*="start"]',
    'a[class*="start"]',

    // Submit/signup buttons
    'button[type="submit"]',
    '[class*="signup"]',
    '[class*="register"]',
  ],
  navigation: [
    'nav',
    'header',
    '[class*="nav"]',
    '[class*="header"]',
    '[role="navigation"]',
  ],
  headings: [
    'h1',
    'h2',
    '.hero h1',
    '.hero h2',
    '[class*="title"]',
  ],
  accent: [
    'a:not(nav a)',
    '[class*="accent"]',
    '[class*="highlight"]',
    '[class*="badge"]',
  ],
};

const DOM_EXTRACTION_SCRIPT = `
  (() => {
    const selectors = ${JSON.stringify(SEMANTIC_SELECTORS)};
    const result = {};

    // Filter to prioritize colorful backgrounds
    const isColorful = (color) => {
      const match = color.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
      if (!match) return false;
      const [, r, g, b] = match.map(Number);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      return saturation > 0.3 && max > 50; // Colorful and not too dark
    };

    for (const [category, selectorList] of Object.entries(selectors)) {
      const colors = new Set();

      for (const selector of selectorList) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const style = getComputedStyle(el);

            // Background color
            const bg = style.backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
              colors.add(bg);
            }

            // Background image (gradients)
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none' && bgImage.includes('gradient')) {
              // Extract all color values from gradient string
              const colorRegex = /(?:#[0-9a-f]{3,8}|rgba?\\s*\\([^)]+\\)|hsla?\\s*\\([^)]+\\))/gi;
              const matches = bgImage.match(colorRegex);
              if (matches) {
                matches.forEach(c => colors.add(c));
              }
            }

            // Text color (for headings, links)
            const fg = style.color;
            if (fg && fg !== 'rgba(0, 0, 0, 0)') {
              colors.add(fg);
            }

            // Border color (for buttons)
            const border = style.borderColor;
            if (border && border !== 'rgba(0, 0, 0, 0)') {
              colors.add(border);
            }

            // SVG fill (for logos) - FIXED: case-insensitive tagName check
            if (el.tagName.toLowerCase() === 'svg' || el.closest('svg')) {
              const fill = style.fill;
              if (fill && fill !== 'none') {
                colors.add(fill);
              }
            }
          }
        } catch (e) {
          // Selector failed, continue
        }
      }

      // Sort colors so colorful ones come first
      result[category] = [...colors]
        .sort((a, b) => (isColorful(b) ? 1 : 0) - (isColorful(a) ? 1 : 0))
        .slice(0, 5);
    }

    return result;
  })()
`;

// hsl(210, 50%, 50%) or hsla(210, 50%, 50%, 0.5) format handler
function hslToHex(hslString: string): string | null {
  const hslMatch = hslString.match(/hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/i);
  if (!hslMatch) return null;

  const [, h, s, l] = hslMatch.map(Number);
  // HSL to RGB conversion
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Unified color normalization function
export function normalizeColor(color: string): string | null {
  // 1. Try cssColorToHex (handles #hex and rgb/rgba)
  const fromCss = cssColorToHex(color);
  if (fromCss) return fromCss;

  // 2. Try hslToHex
  const fromHsl = hslToHex(color);
  if (fromHsl) return fromHsl;

  return null;
}

export async function extractDOMColors(page: Page): Promise<DOMColorMap> {
  try {
    const rawColors = await page.evaluate(DOM_EXTRACTION_SCRIPT);

    // Normalize all colors to HEX
    const normalized: DOMColorMap = {
      logo: [],
      cta: [],
      navigation: [],
      headings: [],
      accent: [],
    };

    for (const [category, colors] of Object.entries(rawColors as Record<string, string[]>)) {
      normalized[category as keyof DOMColorMap] = colors
        .map((c: string) => normalizeColor(c))
        .filter((c: string | null): c is string => c !== null);
    }

    return normalized;
  } catch {
    // Return empty DOMColorMap on error
    return {
      logo: [],
      cta: [],
      navigation: [],
      headings: [],
      accent: [],
    };
  }
}
