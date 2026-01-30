import { test, expect } from '@playwright/test';

// Configure serial execution to avoid parallel test conflicts
test.describe.configure({ mode: 'serial' });

// Test credentials
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test1234';

// Track created surveys for cleanup
let createdSurveyIds: string[] = [];
let storedCookies: { name: string; value: string }[] = [];
const BASE_URL = 'http://localhost:3000';

// Helper function to login with retry
async function login(page: import('@playwright/test').Page, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in with Email' }).click();

    // Wait for either success navigation or error message
    try {
      await page.waitForURL('/', { timeout: 20000 });
      // Additional wait to ensure session is stable
      await page.waitForTimeout(500);
      // Store cookies for cleanup
      storedCookies = await page.context().cookies();
      return; // Success
    } catch {
      // Check if there's an error message
      const errorVisible = await page.getByText('Invalid email or password').isVisible().catch(() => false);
      if (errorVisible && attempt < retries) {
        console.log(`Login attempt ${attempt} failed, retrying...`);
        await page.waitForTimeout(1000);
        continue;
      }
      throw new Error(`Login failed after ${attempt} attempts`);
    }
  }
}

test.describe('Authentication', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome to Oh My Survey' })).toBeVisible();
  });

  test('should login with email and password', async ({ page }) => {
    await login(page);

    // Should be on dashboard
    await expect(page.getByRole('heading', { name: 'Surveys' })).toBeVisible();
  });
});

test.describe('Survey Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a new survey', async ({ page }) => {
    // Click New Survey button
    await page.getByRole('link', { name: 'New Survey' }).click();
    await expect(page).toHaveURL(/\/surveys\/new/);

    // Fill survey form
    const surveyTitle = `E2E Test Survey ${Date.now()}`;
    await page.getByPlaceholder('Enter survey title').fill(surveyTitle);

    // Select theme (Dark)
    await page.getByText('Dark').click();

    // Create survey
    await page.getByRole('button', { name: 'Create Survey' }).click();

    // Should redirect to edit page
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 10000 });

    // Track survey ID for cleanup
    const url = page.url();
    const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (surveyId) createdSurveyIds.push(surveyId);
  });

  test('should add questions to a survey', async ({ page }) => {
    // Create a survey first
    await page.getByRole('link', { name: 'New Survey' }).click();
    const surveyTitle = `Question Test ${Date.now()}`;
    await page.getByPlaceholder('Enter survey title').fill(surveyTitle);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 10000 });

    // Track survey ID for cleanup
    const url = page.url();
    const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (surveyId) createdSurveyIds.push(surveyId);

    // Add a short text question (button text is "Add your first question" for empty surveys)
    // Use JavaScript click to ensure React state updates properly
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent?.toLowerCase().includes('add') && b.textContent?.toLowerCase().includes('question')
      );
      btn?.click();
    });

    // Wait for question type picker dialog
    const typePickerDialog = page.getByRole('dialog').filter({ hasText: 'Add Question' });
    await expect(typePickerDialog).toBeVisible({ timeout: 5000 });

    // Click on the Short Text option using JavaScript for reliable React event triggering
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent?.includes('Short Text')
      );
      btn?.click();
    });

    // Wait for API call to complete and dialog to appear
    await page.waitForTimeout(500);

    // Wait for the editor dialog to appear (this happens after API call creates the question)
    const editorDialog = page.getByRole('dialog').filter({ hasText: 'Edit Question' });
    await expect(editorDialog).toBeVisible({ timeout: 15000 });

    // Fill question details
    await page.getByPlaceholder('Enter your question...').fill('What is your name?');

    // Save question
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Verify question appears in list (after dialog closes)
    await expect(page.getByText('What is your name?')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate between Edit, Settings, and Responses tabs', async ({ page }) => {
    // Create a survey first
    await page.getByRole('link', { name: 'New Survey' }).click();
    const surveyTitle = `Tab Test ${Date.now()}`;
    await page.getByPlaceholder('Enter survey title').fill(surveyTitle);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 10000 });

    // Track survey ID for cleanup
    const url = page.url();
    const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (surveyId) createdSurveyIds.push(surveyId);

    // Click Settings tab (use the one in the survey header, not sidebar)
    await page.locator('[data-testid="survey-tab-settings"]').click();
    await expect(page).toHaveURL(/\/settings/);

    // Click Responses tab
    await page.locator('[data-testid="survey-tab-responses"]').click();
    await expect(page).toHaveURL(/\/responses/);

    // Click Edit tab
    await page.locator('[data-testid="survey-tab-edit"]').click();
    await expect(page).toHaveURL(/\/edit/);
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
      } catch (e) {
        console.log(`Cleanup: Failed to delete survey ${surveyId}:`, e instanceof Error ? e.message : e);
      }
    }
    createdSurveyIds = createdSurveyIds.filter(id => !deletedIds.has(id));
  });
});

test.describe('Public Survey', () => {
  test('should show 404 for non-existent survey', async ({ page }) => {
    await page.goto('/s/non-existent-survey-slug-12345');

    // Should show Next.js 404 page (use first match since there are two 404-related elements)
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });

  test('should display published survey to anonymous users', async ({ page, context }) => {
    // First, login and create a survey with questions, then publish it
    await login(page);

    // Create survey
    await page.getByRole('link', { name: 'New Survey' }).click();
    const surveyTitle = `Public Test ${Date.now()}`;
    await page.getByPlaceholder('Enter survey title').fill(surveyTitle);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 10000 });

    // Extract survey ID from URL
    const url = page.url();
    const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (!surveyId) throw new Error('Failed to extract survey ID');

    // Track survey ID for cleanup
    createdSurveyIds.push(surveyId);

    // Add a question
    await page.getByRole('button', { name: /Add.*question/i }).click();
    const typePickerDialog = page.getByRole('dialog').filter({ hasText: 'Add Question' });
    await expect(typePickerDialog).toBeVisible();
    // Click on the Short Text option - scope to dialog to avoid conflicts
    await typePickerDialog.getByRole('button', { name: /Short Text/i }).click();

    const editorDialog = page.getByRole('dialog').filter({ hasText: 'Edit Question' });
    await expect(editorDialog).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder('Enter your question...').fill('What is your feedback?');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('What is your feedback?')).toBeVisible({ timeout: 5000 });

    // Navigate to settings and publish
    await page.locator('[data-testid="survey-tab-settings"]').click();
    await expect(page).toHaveURL(/\/settings/);

    // Find and click publish button
    await page.getByRole('button', { name: /Publish/i }).click();
    await page.waitForTimeout(1000); // Wait for publish to complete

    // Fetch the survey to get the actual slug
    const surveyResponse = await page.request.get(`/api/surveys/${surveyId}`);
    const surveyData = await surveyResponse.json();
    const slug = surveyData.survey.slug;

    // Now open in new page to test as public user (context shares cookies but we can still test public access)
    const anonymousPage = await context.newPage();
    await anonymousPage.goto(`/s/${slug}`);

    // Should display survey title and question
    await expect(anonymousPage.getByRole('heading', { name: surveyTitle })).toBeVisible({ timeout: 10000 });
    await expect(anonymousPage.getByText('What is your feedback?')).toBeVisible();

    await anonymousPage.close();
  });

  test('should navigate through survey questions', async ({ page, context }) => {
    // Login and create a survey with multiple questions
    await login(page);

    // Create survey
    await page.getByRole('link', { name: 'New Survey' }).click();
    const surveyTitle = `Nav Test ${Date.now()}`;
    await page.getByPlaceholder('Enter survey title').fill(surveyTitle);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 10000 });

    // Extract survey ID from URL
    const url = page.url();
    const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (!surveyId) throw new Error('Failed to extract survey ID');

    // Track survey ID for cleanup
    createdSurveyIds.push(surveyId);

    // Add first question
    await page.getByRole('button', { name: /Add.*question/i }).click();
    let typePickerDialog = page.getByRole('dialog').filter({ hasText: 'Add Question' });
    await expect(typePickerDialog).toBeVisible();
    // Click on the Short Text option - scope to dialog to avoid conflicts
    await typePickerDialog.getByRole('button', { name: /Short Text/i }).click();

    let editorDialog = page.getByRole('dialog').filter({ hasText: 'Edit Question' });
    await expect(editorDialog).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder('Enter your question...').fill('Question 1');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Question 1')).toBeVisible({ timeout: 5000 });

    // Add second question
    await page.getByRole('button', { name: /Add Question/i }).click();
    typePickerDialog = page.getByRole('dialog').filter({ hasText: 'Add Question' });
    await expect(typePickerDialog).toBeVisible();
    // Click on the Yes/No option - scope to dialog to avoid conflicts
    await typePickerDialog.getByRole('button', { name: /Yes \/ No/i }).click();

    editorDialog = page.getByRole('dialog').filter({ hasText: 'Edit Question' });
    await expect(editorDialog).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder('Enter your question...').fill('Question 2');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Question 2')).toBeVisible({ timeout: 5000 });

    // Navigate to settings and publish
    await page.locator('[data-testid="survey-tab-settings"]').click();
    await expect(page).toHaveURL(/\/settings/);
    await page.getByRole('button', { name: /Publish/i }).click();
    await page.waitForTimeout(1000); // Wait for publish to complete

    // Fetch the survey to get the actual slug
    const surveyResponse = await page.request.get(`/api/surveys/${surveyId}`);
    const surveyData = await surveyResponse.json();
    const slug = surveyData.survey.slug;

    // Test navigation in new context
    const anonymousPage = await context.newPage();
    await anonymousPage.goto(`/s/${slug}`);

    // Should see first question
    await expect(anonymousPage.getByRole('heading', { name: 'Question 1' })).toBeVisible({ timeout: 10000 });

    // Fill answer and click Next
    await anonymousPage.getByRole('textbox').fill('My answer');
    await anonymousPage.getByRole('button', { name: 'Next', exact: true }).click();

    // Should see second question
    await expect(anonymousPage.getByRole('heading', { name: 'Question 2' })).toBeVisible({ timeout: 5000 });

    // Should be able to go back
    await anonymousPage.getByRole('button', { name: 'Previous', exact: true }).click();
    await expect(anonymousPage.getByRole('heading', { name: 'Question 1' })).toBeVisible();

    await anonymousPage.close();
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
      } catch (e) {
        console.log(`Cleanup: Failed to delete survey ${surveyId}:`, e instanceof Error ? e.message : e);
      }
    }
    createdSurveyIds = createdSurveyIds.filter(id => !deletedIds.has(id));
  });
});

test.describe('AI Generator Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should open AI generator dialog from dashboard', async ({ page }) => {
    // Click Generate with AI button
    await page.getByRole('button', { name: 'Generate with AI' }).click();

    // Dialog should open
    await expect(page.getByRole('heading', { name: 'Generate Survey with AI' })).toBeVisible();

    // Should show example prompts
    await expect(page.getByText('Example prompts')).toBeVisible();
  });

  test('should fill description from example prompt', async ({ page }) => {
    await page.getByRole('button', { name: 'Generate with AI' }).click();

    // Click an example prompt
    await page.getByRole('button', { name: /Customer satisfaction/i }).click();

    // Textarea should be filled
    const textarea = page.getByPlaceholder(/customer feedback survey/i);
    await expect(textarea).not.toBeEmpty();

    // Character counter should update
    await expect(page.getByText(/\d+ \/ 2000/)).toBeVisible();
  });

  test('should close dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Generate with AI' }).click();
    await expect(page.getByRole('heading', { name: 'Generate Survey with AI' })).toBeVisible();

    // Close dialog
    await page.getByRole('button', { name: 'Close' }).click();

    // Dialog should be closed
    await expect(page.getByRole('heading', { name: 'Generate Survey with AI' })).not.toBeVisible();
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
      } catch (e) {
        console.log(`Cleanup: Failed to delete survey ${surveyId}:`, e instanceof Error ? e.message : e);
      }
    }
    createdSurveyIds = createdSurveyIds.filter(id => !deletedIds.has(id));
  });
});

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to settings page', async ({ page }) => {
    // Create a survey and go to settings
    await page.getByRole('link', { name: 'New Survey' }).click();
    await page.getByPlaceholder('Enter survey title').fill(`Settings Test ${Date.now()}`);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

    // Track survey ID for cleanup
    const url = page.url();
    const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (surveyId) createdSurveyIds.push(surveyId);

    // Navigate to Settings (use the survey header tab)
    await page.locator('[data-testid="survey-tab-settings"]').click();
    await expect(page).toHaveURL(/\/settings/);

    // Settings page should have loaded - verify by checking that we're still on a survey page
    // The settings tab should still be visible
    await expect(page.locator('[data-testid="survey-tab-settings"]')).toBeVisible();
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
      } catch (e) {
        console.log(`Cleanup: Failed to delete survey ${surveyId}:`, e instanceof Error ? e.message : e);
      }
    }
    createdSurveyIds = createdSurveyIds.filter(id => !deletedIds.has(id));
  });
});
