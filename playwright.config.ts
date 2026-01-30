import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  timeout: 60000, // 60 second timeout per test
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Allow 1 retry locally for PGlite WASM flakiness
  workers: process.env.CI ? 1 : 4, // Limit workers to reduce PGlite memory pressure
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: true, // Force headless mode
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse existing server
    timeout: 30000,
  },
});
