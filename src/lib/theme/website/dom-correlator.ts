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
    'button[class*="primary"]',
    'a[class*="cta"]',
    'button[class*="cta"]',
    '[class*="hero"] button',
    '[class*="hero"] a[href]',
    'button[class*="btn-primary"]',
    '.btn-primary',
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

      result[category] = [...colors].slice(0, 5);
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
