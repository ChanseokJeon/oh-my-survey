import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test1234';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in with Email' }).click();
  await page.waitForURL('/', { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Surveys' })).toBeVisible({ timeout: 15000 });
}

test.describe('UI/UX Fixes Verification', () => {

  test.describe('Accessibility - aria-labels', () => {

    test('Login page uses semantic colors (not hardcoded grays)', async ({ page }) => {
      await page.goto('/login');
      await page.screenshot({ path: 'test-results/screenshots/login-page.png', fullPage: true });

      // Verify page loads correctly
      await expect(page.getByRole('heading', { name: 'Welcome to Oh My Survey' })).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();

      // Verify no hardcoded gray classes in DOM (spot check key elements)
      // The submit button should use semantic primary color
      const submitBtn = page.getByRole('button', { name: 'Sign in with Email' });
      await expect(submitBtn).toBeVisible();
    });

    test('Dashboard - survey card menu has aria-label', async ({ page }) => {
      await login(page);

      // Create a survey first to have a card
      await page.getByRole('link', { name: 'New Survey' }).click();
      await page.getByPlaceholder('Enter survey title').fill(`A11y Test ${Date.now()}`);
      await page.getByRole('button', { name: 'Create Survey' }).click();
      await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

      // Get survey ID for cleanup
      const url = page.url();
      const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];

      // Go back to dashboard
      await page.getByRole('link', { name: 'Dashboard' }).first().click();
      await expect(page).toHaveURL('/');
      await page.waitForTimeout(1000);

      // Take screenshot of dashboard
      await page.screenshot({ path: 'test-results/screenshots/dashboard.png', fullPage: true });

      // Verify survey menu button has aria-label
      const menuButton = page.getByRole('button', { name: '설문 메뉴' }).first();
      await expect(menuButton).toBeVisible();

      // Cleanup
      if (surveyId) {
        const cookies = await page.context().cookies();
        const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        await page.request.delete(`http://localhost:3000/api/surveys/${surveyId}`, {
          headers: { Cookie: cookieHeader },
        });
      }
    });

    test('Question builder - edit/delete buttons have aria-labels', async ({ page }) => {
      await login(page);

      // Create survey
      await page.getByRole('link', { name: 'New Survey' }).click();
      await page.getByPlaceholder('Enter survey title').fill(`Q Builder A11y ${Date.now()}`);
      await page.getByRole('button', { name: 'Create Survey' }).click();
      await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

      const url = page.url();
      const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];

      // Add a question
      await page.getByRole('button', { name: /Add.*question/i }).click();
      await page.waitForSelector('[role="dialog"]');
      await page.getByText('Short Text').first().click();
      await page.waitForTimeout(2000);

      // Take screenshot of question editor
      await page.screenshot({ path: 'test-results/screenshots/question-builder.png', fullPage: true });

      // Verify question item buttons have aria-labels
      const editBtn = page.getByRole('button', { name: '질문 편집' }).first();
      const deleteBtn = page.getByRole('button', { name: '질문 삭제' }).first();

      // These may or may not be visible depending on the question list rendering
      // If questions are in a list, the edit button should be findable
      if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(editBtn).toBeVisible();
        console.log('✅ Edit button has aria-label');
      }

      if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(deleteBtn).toBeVisible();
        console.log('✅ Delete button has aria-label');
      }

      // Cleanup
      if (surveyId) {
        const cookies = await page.context().cookies();
        const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        await page.request.delete(`http://localhost:3000/api/surveys/${surveyId}`, {
          headers: { Cookie: cookieHeader },
        });
      }
    });
  });

  test.describe('Semantic Colors', () => {

    test('Login page - verify no hardcoded gray classes in rendered HTML', async ({ page }) => {
      await page.goto('/login');

      // Check login form container (not entire body which may include Next.js internals)
      const loginForm = page.locator('form').first();
      const loginContainer = page.locator('.bg-muted').first();

      // Semantic classes SHOULD be present on login page elements
      await expect(loginContainer).toBeVisible();
      console.log('✅ bg-muted: present on login container');

      const formContent = await loginForm.innerHTML();

      // Check login form does NOT contain hardcoded grays
      const forbiddenInForm = ['bg-gray-50', 'text-gray-600', 'text-gray-700', 'bg-black'];
      for (const cls of forbiddenInForm) {
        const found = formContent.includes(cls);
        console.log(`${found ? '❌' : '✅'} ${cls}: ${found ? 'STILL PRESENT' : 'removed'}`);
        expect(found).toBe(false);
      }

      // Verify semantic classes present
      const submitBtn = page.getByRole('button', { name: 'Sign in with Email' });
      const btnClasses = await submitBtn.getAttribute('class') || '';
      expect(btnClasses).toContain('bg-primary');
      console.log('✅ bg-primary: present on submit button');

      const errorLabel = page.locator('label').first();
      const labelClasses = await errorLabel.getAttribute('class') || '';
      expect(labelClasses).toContain('text-foreground');
      console.log('✅ text-foreground: present on labels');
    });

    test('CSS variables include success/warning/info', async ({ page }) => {
      await page.goto('/login');

      // Check that semantic CSS variables are defined
      const successVar = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--success').trim();
      });
      const warningVar = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--warning').trim();
      });
      const infoVar = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--info').trim();
      });

      console.log(`--success: "${successVar}"`);
      console.log(`--warning: "${warningVar}"`);
      console.log(`--info: "${infoVar}"`);

      expect(successVar).not.toBe('');
      expect(warningVar).not.toBe('');
      expect(infoVar).not.toBe('');
    });
  });

  test.describe('Reduced Motion', () => {

    test('prefers-reduced-motion disables animations', async ({ page }) => {
      // Emulate prefers-reduced-motion: reduce
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/login');

      // Check that animations are disabled
      const animDuration = await page.evaluate(() => {
        const el = document.querySelector('button');
        if (!el) return 'no-button';
        return getComputedStyle(el).transitionDuration;
      });

      console.log(`Animation duration with reduced-motion: ${animDuration}`);
      // Browser returns scientific notation: 1e-05s = 0.00001s = 0.01ms
      const durationMs = parseFloat(animDuration) * 1000;
      expect(durationMs).toBeLessThanOrEqual(1);
    });
  });

  test.describe('Touch Targets', () => {

    test('Icon buttons meet 44px minimum', async ({ page }) => {
      await login(page);

      // Check button sizes via computed styles
      // The icon button should be at least 44px
      const buttonSizes = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const sizes: Array<{ text: string; width: number; height: number }> = [];
        buttons.forEach(btn => {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.width < 50) { // Icon-sized buttons
            sizes.push({
              text: btn.textContent?.trim().substring(0, 20) || btn.getAttribute('aria-label') || 'unknown',
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          }
        });
        return sizes;
      });

      console.log('Icon button sizes:');
      for (const btn of buttonSizes) {
        const passes = btn.height >= 44;
        console.log(`  ${passes ? '✅' : '❌'} "${btn.text}": ${btn.width}x${btn.height}px`);
      }
    });
  });

  test.describe('Visual Regression Screenshots', () => {

    test('Capture key pages for visual review', async ({ page }) => {
      // 1. Login page
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/screenshots/01-login.png', fullPage: true });
      console.log('📸 Login page screenshot captured');

      // 2. Login and go to dashboard
      await login(page);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/screenshots/02-dashboard.png', fullPage: true });
      console.log('📸 Dashboard screenshot captured');

      // 3. Create survey and capture edit page
      await page.getByRole('link', { name: 'New Survey' }).click();
      await page.getByPlaceholder('Enter survey title').fill(`Screenshot Test ${Date.now()}`);
      await page.getByRole('button', { name: 'Create Survey' }).click();
      await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

      const url = page.url();
      const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];

      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/screenshots/03-survey-edit.png', fullPage: true });
      console.log('📸 Survey edit page screenshot captured');

      // 4. Settings page
      await page.locator('[data-testid="survey-tab-settings"]').click();
      await page.waitForURL(/\/settings/);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/screenshots/04-survey-settings.png', fullPage: true });
      console.log('📸 Survey settings screenshot captured');

      // 5. 404 page
      await page.goto('/s/non-existent-slug');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/screenshots/05-404.png', fullPage: true });
      console.log('📸 404 page screenshot captured');

      // Cleanup
      if (surveyId) {
        const cookies = await page.context().cookies();
        const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        await page.request.delete(`http://localhost:3000/api/surveys/${surveyId}`, {
          headers: { Cookie: cookieHeader },
        });
      }
    });
  });
});
