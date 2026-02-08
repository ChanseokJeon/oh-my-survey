/**
 * E2E Tests for Keyboard Navigation in Survey Response
 * Tests Arrow key movement, Space selection, ARIA attributes, and wrap-around
 * Uses existing published survey (no login required)
 */
import { test, expect } from '@playwright/test';

const SURVEY_SLUG = 'keyboard-nav-test-dr9RXx7j';

test.describe('Keyboard Navigation - Multiple Choice', () => {
  test('should have ARIA radiogroup and radio roles', async ({ page }) => {
    await page.goto(`/s/${SURVEY_SLUG}`);
    await page.waitForLoadState('networkidle');

    // Q1: short_text - answer and proceed to Q2 (multiple_choice)
    await page.getByRole('textbox').fill('E2E Test');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Q2 should be multiple choice
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Favorite color?');

    // Verify ARIA container
    const radiogroup = page.locator('[role="radiogroup"]');
    await expect(radiogroup).toBeVisible();

    // Verify 4 radio items
    const radios = page.locator('[role="radio"]');
    await expect(radios).toHaveCount(4);
  });

  test('should navigate options with Arrow keys', async ({ page }) => {
    await page.goto(`/s/${SURVEY_SLUG}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Q2 (multiple choice)
    await page.getByRole('textbox').fill('E2E Test');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const radios = page.locator('[role="radio"]');

    // First item should have tabindex=0
    await expect(radios.nth(0)).toHaveAttribute('tabindex', '0');
    await expect(radios.nth(1)).toHaveAttribute('tabindex', '-1');

    // Focus first and press ArrowDown
    await radios.nth(0).focus();
    await expect(radios.nth(0)).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(radios.nth(1)).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(radios.nth(2)).toBeFocused();

    // ArrowUp should go back
    await page.keyboard.press('ArrowUp');
    await expect(radios.nth(1)).toBeFocused();
  });

  test('should select option with Space key', async ({ page }) => {
    await page.goto(`/s/${SURVEY_SLUG}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Q2
    await page.getByRole('textbox').fill('E2E Test');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const radios = page.locator('[role="radio"]');

    // Navigate to 3rd option and select with Space
    await radios.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(radios.nth(2)).toBeFocused();

    await page.keyboard.press('Space');

    // Verify aria-checked
    await expect(radios.nth(2)).toHaveAttribute('aria-checked', 'true');
    await expect(radios.nth(0)).toHaveAttribute('aria-checked', 'false');
    await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'false');
  });

  test('should wrap around at boundaries', async ({ page }) => {
    await page.goto(`/s/${SURVEY_SLUG}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Q2
    await page.getByRole('textbox').fill('E2E Test');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    const radios = page.locator('[role="radio"]');

    // Focus last item (index 3) and press ArrowDown → should wrap to first
    await radios.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(radios.nth(3)).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(radios.nth(0)).toBeFocused();

    // From first, ArrowUp should wrap to last
    await page.keyboard.press('ArrowUp');
    await expect(radios.nth(3)).toBeFocused();
  });

  test('Space should not trigger page navigation', async ({ page }) => {
    await page.goto(`/s/${SURVEY_SLUG}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Q2
    await page.getByRole('textbox').fill('E2E Test');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Select an option with Space
    const radios = page.locator('[role="radio"]');
    await radios.nth(1).focus();
    await page.keyboard.press('Space');

    // Should still be on Q2
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Favorite color?');
  });
});

test.describe('Keyboard Navigation - Rating', () => {
  test('should navigate stars with Arrow keys and select with Space', async ({ page }) => {
    await page.goto(`/s/${SURVEY_SLUG}`);
    await page.waitForLoadState('networkidle');

    // Navigate to Q3 (rating): Q1 → Q2 → Q3
    await page.getByRole('textbox').fill('E2E Test');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Q2 (multiple_choice): select option to proceed
    let radiosQ2 = page.locator('[role="radio"]');
    await radiosQ2.nth(0).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Q3 (yes_no): select option to proceed
    let radiosQ3 = page.locator('[role="radio"]');
    await radiosQ3.nth(0).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Should be on Q4: rating
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Rate this');

    const radios = page.locator('[role="radio"]');
    await expect(radios).toHaveCount(5);

    // Navigate to 4th star (index 3) with ArrowRight
    await radios.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(radios.nth(3)).toBeFocused();

    // Select with Space
    await page.keyboard.press('Space');
    await expect(radios.nth(3)).toHaveAttribute('aria-checked', 'true');
  });
});
