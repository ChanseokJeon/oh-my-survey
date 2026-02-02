// src/lib/theme/website/browser.ts

import { chromium, Browser, Page, Route, Request } from 'playwright-core';
import { isBlockedIP, BLOCKED_HOSTS } from './validator';

interface BrowserConfig {
  timeout: number;
  viewport: { width: number; height: number };
  resolvedIp: string;
  hostname: string;
}

export async function launchSecureBrowser(config: BrowserConfig): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-sandbox',
      '--disable-web-security=false',
      '--js-flags=--noexpose-wasm',
      `--host-resolver-rules=MAP ${config.hostname} ${config.resolvedIp}`,
    ],
  });
}

export async function createSecurePage(
  browser: Browser,
  config: BrowserConfig
): Promise<Page> {
  const context = await browser.newContext({
    viewport: config.viewport,
    userAgent: 'OhMySurvey/1.0 ThemeExtractor',
    bypassCSP: false,
  });

  const page = await context.newPage();

  await page.route('**/*', async (route: Route, request: Request) => {
    const redirectedFrom = request.redirectedFrom();

    if (redirectedFrom && request.isNavigationRequest()) {
      const newUrl = request.url();

      try {
        const parsed = new URL(newUrl);

        if (!['http:', 'https:'].includes(parsed.protocol)) {
          await route.abort('blockedbyclient');
          return;
        }

        // Check if hostname is a blocked host (domain name)
        if (BLOCKED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
          await route.abort('blockedbyclient');
          return;
        }

        // Check if hostname IS an IP address and is blocked
        if (isBlockedIP(parsed.hostname)) {
          await route.abort('blockedbyclient');
          return;
        }

        await route.continue();
      } catch {
        await route.abort('blockedbyclient');
      }
    } else {
      await route.continue();
    }
  });

  return page;
}
