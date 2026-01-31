/**
 * E2E Tests for Survey Publishing
 * Tests publish/unpublish workflow and public URL accessibility
 */
import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test1234';

let createdSurveyIds: string[] = [];
let storedCookies: { name: string; value: string }[] = [];

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in with Email' }).click();
  await page.waitForURL('/', { timeout: 30000 });
  // Wait for dashboard to fully load
  await expect(page.getByRole('heading', { name: 'Surveys' })).toBeVisible({ timeout: 15000 });
  storedCookies = await page.context().cookies();
}

test.describe('Survey Publishing', () => {
  test('should publish survey and make it publicly accessible', async ({ page, request, context }) => {
    // Login
    await login(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Create a survey via API
    const surveyTitle = `Publish Test ${Date.now()}`;
    const createRes = await request.post(`${BASE_URL}/api/surveys`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      data: { title: surveyTitle, theme: 'light' },
    });
    expect(createRes.ok()).toBeTruthy();
    const survey = await createRes.json();
    createdSurveyIds.push(survey.id);

    // Add a question (required for publishing)
    await request.post(`${BASE_URL}/api/surveys/${survey.id}/questions`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      data: {
        type: 'short_text',
        title: 'Test Question',
        required: true,
        order: 0,
      },
    });

    // Navigate to settings page
    await page.goto(`/surveys/${survey.id}/settings`);

    // Wait for the Publish button to be enabled (requires questions to be loaded)
    const publishButton = page.getByRole('button', { name: /Publish Survey/i });
    await expect(publishButton).toBeVisible({ timeout: 10000 });

    // If button is disabled, reload to ensure questions are loaded
    const isDisabled = await publishButton.isDisabled();
    if (isDisabled) {
      await page.reload();
      await expect(publishButton).toBeEnabled({ timeout: 10000 });
    }

    // Click Publish button
    await publishButton.click();

    // Wait for the API response and UI update - Unpublish button appears
    await expect(page.getByRole('button', { name: /Unpublish/i })).toBeVisible({ timeout: 10000 });

    // Test public URL accessibility
    const publicPage = await context.newPage();
    await publicPage.goto(`/s/${survey.slug}`);

    // Should show survey title (not 404)
    await expect(publicPage.getByRole('heading', { name: surveyTitle })).toBeVisible({ timeout: 10000 });

    await publicPage.close();
  });

  test('should unpublish survey and block public access', async ({ page, request, context }) => {
    // Login
    await login(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Create and publish a survey via API
    const surveyTitle = `Unpublish Test ${Date.now()}`;
    const createRes = await request.post(`${BASE_URL}/api/surveys`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      data: { title: surveyTitle, theme: 'light' },
    });
    expect(createRes.ok()).toBeTruthy();
    const survey = await createRes.json();
    createdSurveyIds.push(survey.id);

    // Add a question
    await request.post(`${BASE_URL}/api/surveys/${survey.id}/questions`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      data: {
        type: 'yes_no',
        title: 'Yes or No?',
        required: true,
        order: 0,
      },
    });

    // Publish via API
    await request.patch(`${BASE_URL}/api/surveys/${survey.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      data: { status: 'published' },
    });

    // Verify it's accessible
    const publicPage = await context.newPage();
    await publicPage.goto(`/s/${survey.slug}`);
    await expect(publicPage.getByRole('heading', { name: surveyTitle })).toBeVisible({ timeout: 10000 });
    await publicPage.close();

    // Navigate to settings and unpublish
    await page.goto(`/surveys/${survey.id}/settings`);
    await page.waitForLoadState('networkidle');

    // Click Unpublish button
    await page.getByRole('button', { name: /Unpublish/i }).click();
    await page.waitForTimeout(1000);

    // Verify Publish button reappears
    await expect(page.getByRole('button', { name: /Publish/i })).toBeVisible({ timeout: 10000 });

    // Verify public URL now shows 404
    const publicPage2 = await context.newPage();
    await publicPage2.goto(`/s/${survey.slug}`);
    await expect(publicPage2.getByRole('heading', { name: '404' })).toBeVisible({ timeout: 10000 });
    await publicPage2.close();
  });

  test('should show public URL with copy button when published', async ({ page, request }) => {
    // Login
    await login(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Create and publish a survey
    const surveyTitle = `Copy URL Test ${Date.now()}`;
    const createRes = await request.post(`${BASE_URL}/api/surveys`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      data: { title: surveyTitle, theme: 'light' },
    });
    const survey = await createRes.json();
    createdSurveyIds.push(survey.id);

    // Add question and publish
    await request.post(`${BASE_URL}/api/surveys/${survey.id}/questions`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      data: { type: 'rating', title: 'Rate us', required: true, order: 0 },
    });

    await request.patch(`${BASE_URL}/api/surveys/${survey.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      data: { status: 'published' },
    });

    // Navigate to settings
    await page.goto(`/surveys/${survey.id}/settings`);
    await page.waitForLoadState('networkidle');

    // Verify public URL is displayed
    await expect(page.locator('code').filter({ hasText: `/s/${survey.slug}` })).toBeVisible();

    // Verify Copy button exists
    await expect(page.getByRole('button', { name: /Copy/i })).toBeVisible();
  });

  test.afterAll(async ({ request }) => {
    const cookieHeader = storedCookies.map(c => `${c.name}=${c.value}`).join('; ');
    for (const surveyId of createdSurveyIds) {
      try {
        await request.delete(`${BASE_URL}/api/surveys/${surveyId}`, {
          headers: { Cookie: cookieHeader },
        });
      } catch (e) {
        console.log(`Cleanup: Failed to delete survey ${surveyId}`);
      }
    }
    createdSurveyIds = [];
  });
});

test('Print Survey Publishing Test Summary', () => {
  console.log('\n========================================');
  console.log('  SURVEY PUBLISHING E2E TEST SUMMARY');
  console.log('========================================');
  console.log('Tests implemented:');
  console.log('- Publish survey and verify public access');
  console.log('- Unpublish survey and verify 404');
  console.log('- Public URL display with copy button');
  console.log('========================================\n');
});
