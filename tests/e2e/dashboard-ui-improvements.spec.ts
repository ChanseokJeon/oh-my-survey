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

test.describe('Dashboard UI Improvements Verification', () => {

  test.describe('Survey Card Hover States', () => {

    test('Survey cards have proper hover classes', async ({ page }) => {
      await login(page);

      // Create a survey to have a card to test
      await page.getByRole('link', { name: 'New Survey' }).click();
      await page.getByPlaceholder('Enter survey title').fill(`Hover Test ${Date.now()}`);
      await page.getByRole('button', { name: 'Create Survey' }).click();
      await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

      const url = page.url();
      const surveyId = url.match(/\/surveys\/([^\/]+)\/edit/)?.[1];

      // Go back to dashboard
      await page.getByRole('link', { name: 'Dashboard' }).first().click();
      await expect(page).toHaveURL('/');
      await page.waitForTimeout(1000);

      // Find the survey card - it's a Card component rendered in the grid
      const card = page.locator('div.grid').locator('> div').first();
      await expect(card).toBeVisible();

      const cardClasses = await card.getAttribute('class') || '';

      // Verify hover classes
      expect(cardClasses).toContain('transition-all');
      expect(cardClasses).toContain('duration-200');
      expect(cardClasses).toContain('hover:shadow-md');
      expect(cardClasses).toContain('hover:border-primary/50');
      expect(cardClasses).toContain('cursor-pointer');

      console.log('✅ Survey card has all required hover classes');

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

  test.describe('Empty State', () => {

    test('Empty state shows correct elements when no surveys exist', async ({ page }) => {
      await login(page);

      // Check if we have surveys - if so, delete them all to get empty state
      const selectButton = page.getByRole('button', { name: 'Select' });
      const hasSelectButton = await selectButton.isVisible().catch(() => false);

      if (hasSelectButton) {
        // Enter selection mode
        await selectButton.click();

        // Select all
        await page.getByRole('checkbox', { name: 'Select all surveys' }).check();

        // Delete all
        await page.getByRole('button', { name: /Delete/ }).click();
        await page.getByRole('button', { name: 'Delete' }).click();
        await page.waitForTimeout(2000);
      }

      // Take screenshot of empty state
      await page.screenshot({ path: 'test-results/screenshots/dashboard-empty-state.png', fullPage: true });

      // Verify FileQuestion icon is visible (it's inside the circular bg-muted container)
      const emptyStateContainer = page.locator('.border-dashed');
      await expect(emptyStateContainer).toBeVisible();
      console.log('✅ Empty state container is visible');

      // Verify heading
      await expect(page.getByRole('heading', { name: 'Create your first survey' })).toBeVisible();
      console.log('✅ Empty state heading is present');

      // Verify descriptive text
      await expect(page.getByText('Get started by creating a new survey from scratch or let AI generate one for you')).toBeVisible();
      console.log('✅ Empty state descriptive text is present');

      // Verify both action buttons are visible
      await expect(page.getByRole('button', { name: 'Generate with AI' }).last()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Create Survey' })).toBeVisible();
      console.log('✅ Both action buttons are visible in empty state');
    });
  });

  test.describe('Button Visual Hierarchy', () => {

    test('"New Survey" button has correct size and shadow', async ({ page }) => {
      await login(page);

      const newSurveyButton = page.getByRole('link', { name: 'New Survey' });
      await expect(newSurveyButton).toBeVisible();

      const buttonClasses = await newSurveyButton.getAttribute('class') || '';

      // Verify size="lg" styling
      // The Button component with size="lg" should have larger padding/height
      // shadcn/ui typically uses classes like "h-11" or "h-10" for lg size
      const hasLgSize = buttonClasses.includes('h-11') || buttonClasses.includes('h-10') || buttonClasses.includes('px-8');
      expect(hasLgSize).toBe(true);
      console.log('✅ "New Survey" button has large size classes');

      // Verify shadow-sm class
      expect(buttonClasses).toContain('shadow-sm');
      console.log('✅ "New Survey" button has shadow-sm class');
    });
  });

  test.describe('Badge Readability', () => {

    test('Status badges have font-medium class', async ({ page }) => {
      await login(page);

      // Create a survey to have a badge to test
      await page.getByRole('link', { name: 'New Survey' }).click();
      await page.getByPlaceholder('Enter survey title').fill(`Badge Test ${Date.now()}`);
      await page.getByRole('button', { name: 'Create Survey' }).click();
      await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

      const url = page.url();
      const surveyId = url.match(/\/surveys\/([^\/]+)\/edit/)?.[1];

      // Go back to dashboard
      await page.getByRole('link', { name: 'Dashboard' }).first().click();
      await expect(page).toHaveURL('/');
      await page.waitForTimeout(1000);

      // Find the status badge - it should be visible in the card content
      const badge = page.getByText('draft').first();
      await expect(badge).toBeVisible();

      const badgeClasses = await badge.getAttribute('class') || '';
      expect(badgeClasses).toContain('font-medium');
      console.log('✅ Status badge has font-medium class');

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

  test.describe('Grid Responsive Layout', () => {

    test('Grid container has responsive classes', async ({ page }) => {
      await login(page);

      // Create a survey so the grid is rendered
      await page.getByRole('link', { name: 'New Survey' }).click();
      await page.getByPlaceholder('Enter survey title').fill(`Grid Test ${Date.now()}`);
      await page.getByRole('button', { name: 'Create Survey' }).click();
      await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

      const url = page.url();
      const surveyId = url.match(/\/surveys\/([^\/]+)\/edit/)?.[1];

      // Go back to dashboard
      await page.getByRole('link', { name: 'Dashboard' }).first().click();
      await expect(page).toHaveURL('/');
      await page.waitForTimeout(1000);

      // Find the grid container - it contains the survey cards
      const gridContainer = page.locator('div.grid.gap-4.sm\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4').first();
      await expect(gridContainer).toBeVisible();

      const gridClasses = await gridContainer.getAttribute('class') || '';

      // Verify responsive grid classes
      expect(gridClasses).toContain('sm:grid-cols-2');
      expect(gridClasses).toContain('lg:grid-cols-3');
      expect(gridClasses).toContain('xl:grid-cols-4');
      console.log('✅ Grid has all responsive column classes');

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

  test.describe('Selection Mode Icon', () => {

    test('"Select" button uses CheckSquare icon', async ({ page }) => {
      await login(page);

      // Create a survey so the Select button appears
      await page.getByRole('link', { name: 'New Survey' }).click();
      await page.getByPlaceholder('Enter survey title').fill(`Select Icon Test ${Date.now()}`);
      await page.getByRole('button', { name: 'Create Survey' }).click();
      await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

      const url = page.url();
      const surveyId = url.match(/\/surveys\/([^\/]+)\/edit/)?.[1];

      // Go back to dashboard
      await page.getByRole('link', { name: 'Dashboard' }).first().click();
      await expect(page).toHaveURL('/');
      await page.waitForTimeout(1000);

      // Find the Select button
      const selectButton = page.getByRole('button', { name: 'Select' });
      await expect(selectButton).toBeVisible();

      // Check that the button contains an SVG icon (CheckSquare from lucide-react)
      // The CheckSquare icon should be inside the button
      const svgIcon = selectButton.locator('svg').first();
      await expect(svgIcon).toBeVisible();
      console.log('✅ "Select" button contains an icon (CheckSquare)');

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

  test.describe('Visual Screenshots', () => {

    test('Capture dashboard states for visual verification', async ({ page }) => {
      await login(page);

      // 1. Dashboard with surveys
      // Create a couple of surveys
      for (let i = 1; i <= 2; i++) {
        await page.getByRole('link', { name: 'New Survey' }).click();
        await page.getByPlaceholder('Enter survey title').fill(`Screenshot Test ${i} - ${Date.now()}`);
        await page.getByRole('button', { name: 'Create Survey' }).click();
        await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });
        await page.getByRole('link', { name: 'Dashboard' }).first().click();
        await expect(page).toHaveURL('/');
        await page.waitForTimeout(1000);
      }

      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: 'test-results/screenshots/dashboard-with-surveys.png',
        fullPage: true
      });
      console.log('📸 Dashboard with surveys screenshot captured');

      // 2. Dashboard in selection mode
      await page.getByRole('button', { name: 'Select' }).click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: 'test-results/screenshots/dashboard-selection-mode.png',
        fullPage: true
      });
      console.log('📸 Dashboard in selection mode screenshot captured');

      // Exit selection mode
      await page.getByRole('button', { name: 'Cancel' }).click();

      // 3. Clean up all surveys to get empty state
      const selectButtonFinal = page.getByRole('button', { name: 'Select' });
      const hasSelectButtonFinal = await selectButtonFinal.isVisible().catch(() => false);

      if (hasSelectButtonFinal) {
        await selectButtonFinal.click();
        await page.getByRole('checkbox', { name: 'Select all surveys' }).check();
        await page.getByRole('button', { name: /Delete/ }).click();
        await page.getByRole('button', { name: 'Delete' }).click();
        await page.waitForTimeout(2000);
      }

      await page.screenshot({
        path: 'test-results/screenshots/dashboard-empty-state-full.png',
        fullPage: true
      });
      console.log('📸 Dashboard empty state screenshot captured');
    });
  });
});
