// src/lib/theme/website/index.ts

import { validateAndResolveUrl } from './validator';
import { launchSecureBrowser, createSecurePage } from './browser';
import { extractCSSVariables, cssVarsToColors } from './css-extractor';
import { captureScreenshot } from './screenshot';
import { extractColorsHueBinning } from '../extractor';
import type { ColorWithArea } from '../extractor';
import { generateTheme } from '../generator';
import type { ThemeColors } from '../types';
import { extractDOMColors, DOMColorMap } from './dom-correlator';
import { mergeColors, mergeColorsHueBinningFirst, filterGrayscale } from './color-merger';

const CONFIG = {
  timeout: 15000,
  viewport: { width: 1280, height: 720 },
};

export interface WebsiteThemeResult {
  palette: string[];
  suggestedTheme: ThemeColors;
  source: 'vision-first' | 'fallback-dom';
}

export async function extractWebsiteTheme(url: string): Promise<WebsiteThemeResult> {
  const validated = await validateAndResolveUrl(url);

  let browser;
  try {
    browser = await launchSecureBrowser({
      ...CONFIG,
      resolvedIp: validated.resolvedIp,
      hostname: validated.hostname,
    });

    const page = await createSecurePage(browser, {
      ...CONFIG,
      resolvedIp: validated.resolvedIp,
      hostname: validated.hostname,
    });

    await page.goto(validated.url, {
      timeout: CONFIG.timeout,
      waitUntil: 'networkidle',
    });

    // Always extract ALL sources in parallel
    const [cssVars, domColors, screenshot] = await Promise.all([
      extractCSSVariables(page),
      extractDOMColors(page),
      captureScreenshot(page)
    ]);

    let palette: string[];
    let source: WebsiteThemeResult['source'];

    try {
      // PRIMARY: Hue-Binning extraction (prevents cross-hue contamination)
      const visualColors = await extractColorsHueBinning(screenshot);
      const filtered = filterGrayscale(visualColors);

      if (filtered.length >= 2) {
        // Convert DOMColorMap to flat string array for mergeColorsHueBinningFirst
        const domColorArray = [
          ...domColors.logo,
          ...domColors.cta,
          ...domColors.accent,
          ...domColors.headings,
          ...domColors.navigation,
        ];
        const cssColorArray = Object.values(cssVars.colors);

        palette = mergeColorsHueBinningFirst(visualColors, domColorArray, cssColorArray);
        source = 'vision-first';
      } else {
        // FALLBACK: Not enough visual colors after filtering
        palette = mergeColors(domColors, cssVars.colors, []);
        source = 'fallback-dom';
      }
    } catch {
      // FALLBACK: Error in visual extraction
      palette = mergeColors(domColors, cssVars.colors, []);
      source = 'fallback-dom';
    }

    const theme = generateTheme(palette);
    return { palette, suggestedTheme: theme, source };
  } finally {
    if (browser) await browser.close();
  }
}

function hasMeaningfulDOMColors(domColors: DOMColorMap): boolean {
  const totalColors = Object.values(domColors).flat().length;
  return totalColors >= 3;
}
