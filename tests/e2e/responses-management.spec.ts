/**
 * E2E Tests for Responses Management
 * Tests response list display, CSV export functionality
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
  await page.waitForURL('/', { timeout: 15000 });
  storedCookies = await page.context().cookies();
}

test.describe('Responses Management', () => {
  test('should display responses in the responses page', async ({ page, request }) => {
    // Login
    await login(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Create a survey via API
    const surveyTitle = `Response Test ${Date.now()}`;
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
    const questionRes = await request.post(`${BASE_URL}/api/surveys/${survey.id}/questions`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      data: {
        type: 'short_text',
        title: 'What is your name?',
        required: true,
        order: 0,
      },
    });
    expect(questionRes.ok()).toBeTruthy();
    const question = await questionRes.json();

    // Publish the survey
    const publishRes = await request.patch(`${BASE_URL}/api/surveys/${survey.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      data: { status: 'published' },
    });
    expect(publishRes.ok()).toBeTruthy();

    // Submit a test response via public API (answers is an object keyed by questionId)
    const responseRes = await request.post(`${BASE_URL}/api/public/surveys/${survey.slug}/responses`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        answers: {
          [question.id]: 'Test User Response',
        },
      },
    });
    expect(responseRes.ok()).toBeTruthy();

    // Navigate to responses page
    await page.goto(`/surveys/${survey.id}/responses`);
    await page.waitForLoadState('networkidle');

    // Verify response appears in the table
    await expect(page.getByText('Test User Response')).toBeVisible({ timeout: 10000 });

    // Verify response count or table row exists
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('should export responses as CSV', async ({ page, request }) => {
    // Login
    await login(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Create a survey via API
    const surveyTitle = `CSV Export Test ${Date.now()}`;
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
    const questionRes = await request.post(`${BASE_URL}/api/surveys/${survey.id}/questions`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      data: {
        type: 'short_text',
        title: 'Your feedback?',
        required: false,
        order: 0,
      },
    });
    expect(questionRes.ok()).toBeTruthy();
    const question = await questionRes.json();

    // Publish the survey
    await request.patch(`${BASE_URL}/api/surveys/${survey.id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      data: { status: 'published' },
    });

    // Submit a response (answers is an object keyed by questionId)
    await request.post(`${BASE_URL}/api/public/surveys/${survey.slug}/responses`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        answers: {
          [question.id]: 'CSV Test Response',
        },
      },
    });

    // Navigate to responses page
    await page.goto(`/surveys/${survey.id}/responses`);
    await page.waitForLoadState('networkidle');

    // Wait for response to appear
    await expect(page.getByText('CSV Test Response')).toBeVisible({ timeout: 10000 });

    // Set up download listener and click export button
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export CSV/i }).click();

    const download = await downloadPromise;

    // Verify download occurred
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should show empty state when no responses', async ({ page, request }) => {
    // Login
    await login(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Create a survey via API (no responses)
    const surveyTitle = `Empty Responses Test ${Date.now()}`;
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

    // Navigate to responses page
    await page.goto(`/surveys/${survey.id}/responses`);
    await page.waitForLoadState('networkidle');

    // Verify empty state is shown
    await expect(page.getByText(/no responses/i)).toBeVisible({ timeout: 10000 });
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

test('Print Responses Management Test Summary', () => {
  console.log('\n========================================');
  console.log('  RESPONSES MANAGEMENT E2E TEST SUMMARY');
  console.log('========================================');
  console.log('Tests implemented:');
  console.log('- Response list display verification');
  console.log('- CSV export download verification');
  console.log('- Empty state display');
  console.log('========================================\n');
});
