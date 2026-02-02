// src/lib/theme/website/screenshot.ts

import { Page } from 'playwright-core';

export async function captureScreenshot(page: Page): Promise<Buffer> {
  return page.screenshot({
    type: 'png',
    clip: {
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
    },
  });
}
