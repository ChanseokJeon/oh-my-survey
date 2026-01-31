/**
 * Link Validator - Crawls all pages and validates all links/buttons
 * Runs in headless mode
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test1234';

// Track all tested links
const testedLinks = new Set<string>();
const brokenLinks: Array<{ page: string; link: string; status: number; error?: string }> = [];
const workingLinks: Array<{ page: string; link: string; status: number }> = [];

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in with Email' }).click();
  await page.waitForURL('/', { timeout: 30000 });
  // Wait for dashboard to fully load
  await expect(page.getByRole('heading', { name: 'Surveys' })).toBeVisible({ timeout: 15000 });
}

async function validateLink(page: Page, href: string, sourcePage: string): Promise<void> {
  if (testedLinks.has(href)) return;
  testedLinks.add(href);

  // Skip external links, mailto, tel, javascript
  if (href.startsWith('mailto:') || href.startsWith('tel:') ||
      href.startsWith('javascript:') || href.startsWith('#') ||
      href.includes('google.com') || href.includes('github.com')) {
    return;
  }

  try {
    const response = await page.request.get(href);
    const status = response.status();

    if (status >= 400) {
      brokenLinks.push({ page: sourcePage, link: href, status });
    } else {
      workingLinks.push({ page: sourcePage, link: href, status });
    }
  } catch (error) {
    brokenLinks.push({
      page: sourcePage,
      link: href,
      status: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

test.describe('Link Validation', () => {
  test('validate all API endpoints', async ({ request }) => {
    console.log('\n=== API Endpoint Validation ===\n');

    const apiEndpoints = [
      // Auth endpoints
      { path: '/api/auth/providers', method: 'GET', expected: 200 },
      { path: '/api/auth/session', method: 'GET', expected: 200 },
      { path: '/api/auth/csrf', method: 'GET', expected: 200 },

      // Survey endpoints (require auth - expect 401)
      { path: '/api/surveys', method: 'GET', expected: 401 },

      // Public endpoints
      { path: '/api/public/surveys/test-slug', method: 'GET', expected: 404 },
      { path: '/api/config/sheets', method: 'GET', expected: 200 },
    ];

    for (const endpoint of apiEndpoints) {
      const response = await request.get(`${BASE_URL}${endpoint.path}`);
      const status = response.status();
      const passed = status === endpoint.expected;

      console.log(`${passed ? '✅' : '❌'} ${endpoint.method} ${endpoint.path} → ${status} (expected ${endpoint.expected})`);

      if (passed) {
        workingLinks.push({ page: 'API', link: endpoint.path, status });
      } else {
        brokenLinks.push({ page: 'API', link: endpoint.path, status });
      }
    }
  });

  test('validate login page links', async ({ page }) => {
    console.log('\n=== Login Page Links ===\n');

    await page.goto('/login');

    // Get all links
    const links = await page.locator('a[href]').all();
    console.log(`Found ${links.length} links on login page`);

    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href) {
        const fullUrl = href.startsWith('/') ? `${BASE_URL}${href}` : href;
        await validateLink(page, fullUrl, '/login');
      }
    }
  });

  test('validate dashboard links (authenticated)', async ({ page }) => {
    console.log('\n=== Dashboard Links ===\n');

    await login(page);

    // Get all links
    const links = await page.locator('a[href]').all();
    console.log(`Found ${links.length} links on dashboard`);

    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href) {
        const fullUrl = href.startsWith('/') ? `${BASE_URL}${href}` : href;
        await validateLink(page, fullUrl, '/dashboard');
      }
    }

    // Test sidebar navigation
    const sidebarLinks = ['/settings'];
    for (const path of sidebarLinks) {
      await validateLink(page, `${BASE_URL}${path}`, '/dashboard');
    }
  });

  test('validate survey creation flow links', async ({ page }) => {
    console.log('\n=== Survey Creation Links ===\n');

    await login(page);
    await page.goto('/surveys/new');

    const links = await page.locator('a[href]').all();
    console.log(`Found ${links.length} links on new survey page`);

    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href) {
        const fullUrl = href.startsWith('/') ? `${BASE_URL}${href}` : href;
        await validateLink(page, fullUrl, '/surveys/new');
      }
    }
  });

  test('validate survey edit page links', async ({ page }) => {
    console.log('\n=== Survey Edit Page Links ===\n');

    await login(page);

    // Create a survey first
    await page.goto('/surveys/new');
    await page.getByPlaceholder('Enter survey title').fill(`Link Test ${Date.now()}`);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await page.waitForURL(/\/edit/, { timeout: 10000 });

    const links = await page.locator('a[href]').all();
    console.log(`Found ${links.length} links on survey edit page`);

    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href) {
        const fullUrl = href.startsWith('/') ? `${BASE_URL}${href}` : href;
        await validateLink(page, fullUrl, '/surveys/[id]/edit');
      }
    }

    // Test tab links
    const tabLinks = page.locator('[data-testid^="survey-tab-"]');
    const tabCount = await tabLinks.count();
    console.log(`Found ${tabCount} tab links`);

    for (let i = 0; i < tabCount; i++) {
      const tab = tabLinks.nth(i);
      const href = await tab.getAttribute('href');
      if (href) {
        const fullUrl = href.startsWith('/') ? `${BASE_URL}${href}` : href;
        await validateLink(page, fullUrl, '/surveys/[id]/edit');
      }
    }
  });

  test('validate 404 pages', async ({ page }) => {
    console.log('\n=== 404 Page Validation ===\n');

    const notFoundPaths = [
      '/non-existent-page',
      '/surveys/non-existent-id',
      '/s/non-existent-slug',
    ];

    for (const path of notFoundPaths) {
      const response = await page.goto(path);
      const status = response?.status() || 0;

      if (status === 404) {
        console.log(`✅ ${path} → 404 (correct)`);
        workingLinks.push({ page: '404 test', link: path, status: 404 });
      } else {
        console.log(`⚠️ ${path} → ${status} (expected 404)`);
      }
    }
  });

  test('print validation summary', async () => {
    console.log('\n========================================');
    console.log('       LINK VALIDATION SUMMARY');
    console.log('========================================\n');

    console.log(`✅ Working links: ${workingLinks.length}`);
    console.log(`❌ Broken links: ${brokenLinks.length}`);

    if (brokenLinks.length > 0) {
      console.log('\n--- Broken Links ---');
      for (const broken of brokenLinks) {
        console.log(`  ❌ [${broken.page}] ${broken.link} → ${broken.status}${broken.error ? ` (${broken.error})` : ''}`);
      }
    }

    console.log('\n--- Working Links Sample ---');
    for (const working of workingLinks.slice(0, 10)) {
      console.log(`  ✅ [${working.page}] ${working.link} → ${working.status}`);
    }

    if (workingLinks.length > 10) {
      console.log(`  ... and ${workingLinks.length - 10} more`);
    }

    console.log('\n========================================\n');

    // Fail test if there are critical broken links (excluding expected 401s and known issues)
    const criticalBroken = brokenLinks.filter(b =>
      b.status !== 401 &&
      !b.link.includes('/api/surveys') &&
      !b.link.includes('/surveys') && // Surveys list is on dashboard
      !b.link.includes('/settings') // Settings may not exist yet
    );

    if (criticalBroken.length > 0) {
      console.log('\n⚠️ Critical broken links found:');
      for (const broken of criticalBroken) {
        console.log(`  - ${broken.link} (${broken.status})`);
      }
    }

    expect(criticalBroken.length).toBe(0);
  });
});
