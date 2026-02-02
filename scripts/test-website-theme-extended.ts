// Extended timeout test script for website theme extraction
import { validateAndResolveUrl } from '../src/lib/theme/website/validator';
import { launchSecureBrowser, createSecurePage } from '../src/lib/theme/website/browser';
import { extractCSSVariables, cssVarsToColors } from '../src/lib/theme/website/css-extractor';
import { captureScreenshot } from '../src/lib/theme/website/screenshot';
import { extractColors } from '../src/lib/theme/extractor';
import { generateTheme } from '../src/lib/theme/generator';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG = {
  timeout: 30000, // Extended to 30 seconds
  viewport: { width: 1280, height: 720 },
};

async function extractWebsiteThemeExtended(url: string) {
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

    const cssVars = await extractCSSVariables(page);

    let palette: string[];
    let source: 'css-variables' | 'screenshot';
    let screenshotPath: string | undefined;

    if (cssVars.found && Object.keys(cssVars.colors).length >= 3) {
      palette = cssVarsToColors(cssVars.colors);
      source = 'css-variables';
    } else {
      const screenshotBuffer = await captureScreenshot(page);
      palette = await extractColors(screenshotBuffer);
      source = 'screenshot';

      // Save screenshot for visual verification
      screenshotPath = path.join(process.cwd(), '.omc', 'website-screenshot.png');
      fs.writeFileSync(screenshotPath, screenshotBuffer);
    }

    const theme = generateTheme(palette);

    return {
      palette,
      suggestedTheme: theme,
      source,
      screenshotPath,
      cssVars: cssVars.found ? cssVars.colors : undefined,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  const url = process.argv[2] || 'https://vcat.ai';
  console.log(`Testing website theme extraction for: ${url}`);
  console.log('Using extended timeout: 30 seconds');
  console.log('---');

  try {
    const startTime = Date.now();
    const result = await extractWebsiteThemeExtended(url);
    const duration = Date.now() - startTime;

    console.log(`\nExtraction completed in ${duration}ms`);
    console.log('Extraction Source:', result.source);

    if (result.cssVars) {
      console.log('\nCSS Variables found:');
      Object.entries(result.cssVars).slice(0, 10).forEach(([name, value]) => {
        console.log(`  ${name}: ${value}`);
      });
      if (Object.keys(result.cssVars).length > 10) {
        console.log(`  ... and ${Object.keys(result.cssVars).length - 10} more`);
      }
    }

    console.log('\nExtracted Palette:');
    result.palette.forEach((color, i) => {
      console.log(`  ${i + 1}. ${color}`);
    });

    console.log('\nSuggested Theme:');
    console.log(JSON.stringify(result.suggestedTheme, null, 2));

    if (result.screenshotPath) {
      console.log(`\nScreenshot saved to: ${result.screenshotPath}`);
    }

    // Save result to file for analysis
    const outputPath = path.join(process.cwd(), '.omc', 'theme-extraction-result.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({
      url,
      timestamp: new Date().toISOString(),
      duration,
      source: result.source,
      palette: result.palette,
      suggestedTheme: result.suggestedTheme,
      cssVars: result.cssVars,
      screenshotPath: result.screenshotPath,
    }, null, 2));
    console.log(`\nResult saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
