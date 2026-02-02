// src/lib/theme/website/css-extractor.ts

import { Page } from 'playwright-core';

export interface CSSVariables {
  found: boolean;
  colors: Record<string, string>;
}

const CSS_EXTRACTION_SCRIPT = `
  (() => {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    const result = { found: false, colors: {} };

    const allProps = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.type === 1) {
            const matches = rule.cssText.match(/--[\\w-]+/g);
            if (matches) allProps.push(...matches);
          }
        }
      } catch { /* CORS blocked stylesheet, skip */ }
    }

    const uniqueProps = [...new Set(allProps)].slice(0, 100);

    for (const prop of uniqueProps) {
      const value = computed.getPropertyValue(prop).trim();
      if (value && isColorValue(value)) {
        result.colors[prop] = value;
        result.found = true;
      }
    }

    function isColorValue(v) {
      if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return true;
      if (/^rgba?\\s*\\(/i.test(v)) return true;
      if (/^hsla?\\s*\\(/i.test(v)) return true;
      if (/^oklch\\s*\\(/i.test(v)) return true;
      return false;
    }

    return result;
  })()
`;

export async function extractCSSVariables(page: Page): Promise<CSSVariables> {
  try {
    const result = await page.evaluate(CSS_EXTRACTION_SCRIPT);
    return result as CSSVariables;
  } catch {
    return { found: false, colors: {} };
  }
}

export function cssVarsToColors(vars: Record<string, string>): string[] {
  const colors: string[] = [];

  const priorities = [
    'primary', 'secondary', 'accent', 'background', 'foreground',
    'surface', 'text', 'border', 'muted', 'card'
  ];

  for (const priority of priorities) {
    for (const [name, value] of Object.entries(vars)) {
      if (name.toLowerCase().includes(priority)) {
        const hex = cssColorToHex(value);
        if (hex && !colors.includes(hex)) {
          colors.push(hex);
        }
      }
    }
  }

  for (const value of Object.values(vars)) {
    const hex = cssColorToHex(value);
    if (hex && !colors.includes(hex)) {
      colors.push(hex);
    }
  }

  return colors.slice(0, 8);
}

export function cssColorToHex(value: string): string | null {
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
    return value.length === 4
      ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      : value;
  }

  const rgbMatch = value.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `#${Number(r).toString(16).padStart(2, '0')}${Number(g).toString(16).padStart(2, '0')}${Number(b).toString(16).padStart(2, '0')}`;
  }

  return null;
}
