/**
 * E2E tests for Language Support
 * Tests Korean/English language handling in surveys
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

test.describe.configure({ mode: 'serial' });

let storedCookies: { name: string; value: string }[] = [];
let createdSurveyIds: string[] = [];

test.describe('Language Support', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('test1234');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/', { timeout: 10000 });

    storedCookies = (await context.cookies()).map(c => ({
      name: c.name,
      value: c.value,
    }));

    await context.close();
  });

  test.afterAll(async ({ request }) => {
    const cookieHeader = storedCookies.map(c => `${c.name}=${c.value}`).join('; ');
    const deletedIds = new Set<string>();

    for (const surveyId of createdSurveyIds) {
      try {
        await request.delete(`${BASE_URL}/api/surveys/${surveyId}`, {
          headers: { Cookie: cookieHeader },
        });
        deletedIds.add(surveyId);
        console.log(`Cleanup: Deleted survey ${surveyId}`);
      } catch (e) {
        console.log(`Cleanup: Failed to delete survey ${surveyId}:`, e instanceof Error ? e.message : e);
      }
    }
    createdSurveyIds = createdSurveyIds.filter(id => !deletedIds.has(id));
  });

  test('should create survey with default Korean language', async ({ page, context }) => {
    await context.addCookies(storedCookies.map(c => ({ ...c, domain: 'localhost', path: '/' })));

    // Create a new survey
    await page.goto(`${BASE_URL}/surveys/new`);
    await page.getByLabel('Survey Title').fill('Korean Test Survey');
    await page.getByRole('button', { name: 'Create Survey' }).click();

    // Wait for redirect to edit page
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 10000 });

    // Get survey ID from URL
    const url = page.url();
    const match = url.match(/\/surveys\/([^/]+)\/edit/);
    if (match) {
      createdSurveyIds.push(match[1]);
    }

    // Verify survey was created - API should return language: 'en'
    const surveyId = match?.[1];
    if (surveyId) {
      const response = await page.request.get(`${BASE_URL}/api/surveys/${surveyId}`);
      const data = await response.json();
      // API returns { survey: {...}, questions: [...], responseCount: N }
      expect(data.survey.language).toBe('ko');
      console.log('✅ Survey created with default language: ko');
    }
  });

  test('should store and return correct language for survey', async ({ request }) => {
    const cookieHeader = storedCookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Create a survey via API
    const createResponse = await request.post(`${BASE_URL}/api/surveys`, {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Language Storage Test',
        theme: 'light',
      },
    });

    expect(createResponse.status()).toBe(201);
    const survey = await createResponse.json();
    createdSurveyIds.push(survey.id);

    // Verify the created survey has correct language
    expect(survey.language).toBe('ko');
    console.log('✅ Survey created with language:', survey.language);

    // Fetch survey via GET API
    const getResponse = await request.get(`${BASE_URL}/api/surveys/${survey.id}`, {
      headers: { Cookie: cookieHeader },
    });
    expect(getResponse.status()).toBe(200);

    const getData = await getResponse.json();
    expect(getData.survey.language).toBe('ko');
    console.log('✅ Survey GET returns language:', getData.survey.language);
  });

  test('API should return language field in public survey response', async ({ request }) => {
    const cookieHeader = storedCookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Create a survey
    const createResponse = await request.post(`${BASE_URL}/api/surveys`, {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Language Field Test',
        theme: 'light',
      },
    });

    expect(createResponse.status()).toBe(201);
    const survey = await createResponse.json();
    createdSurveyIds.push(survey.id);

    // Add a question
    await request.post(`${BASE_URL}/api/surveys/${survey.id}/questions`, {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      data: {
        type: 'short_text',
        title: 'Test question',
        required: false,
      },
    });

    // Publish the survey
    await request.post(`${BASE_URL}/api/surveys/${survey.id}/publish`, {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      data: { action: 'publish' },
    });

    // Fetch public survey (no auth needed)
    const publicResponse = await request.get(`${BASE_URL}/api/public/surveys/${survey.slug}`);
    expect(publicResponse.status()).toBe(200);

    const publicData = await publicResponse.json();
    expect(publicData.language).toBeDefined();
    expect(publicData.language).toBe('ko');

    console.log('✅ API returns language field:', publicData.language);
  });
});
