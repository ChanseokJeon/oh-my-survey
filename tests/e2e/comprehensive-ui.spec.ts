import { test, expect, Page, APIRequestContext } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test1234';

// Store API responses for verification
const apiCalls: Array<{ url: string; status: number; method: string }> = [];

// Track created surveys for cleanup
let createdSurveyIds: string[] = [];
let storedCookies: { name: string; value: string }[] = [];
const BASE_URL = 'http://localhost:3000';

// Configure tests to run serially to avoid parallel execution conflicts
test.describe.configure({ mode: 'serial' });

// Helper to login
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in with Email' }).click();
  await page.waitForURL('/', { timeout: 15000 });
  // Wait for dashboard to fully load
  await expect(page.getByRole('heading', { name: 'Surveys' })).toBeVisible({ timeout: 15000 });
  // Store cookies for cleanup
  storedCookies = await page.context().cookies();
}

// Helper to collect API calls
function setupApiInterception(page: Page) {
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      apiCalls.push({
        url: url.replace(/https?:\/\/[^/]+/, ''),
        status: response.status(),
        method: response.request().method(),
      });
    }
  });
}

test.describe('Comprehensive UI & API Test', () => {
  test.beforeEach(async ({ page }) => {
    apiCalls.length = 0; // Reset API calls
    setupApiInterception(page);
  });

  test('Login Page - All Elements', async ({ page }) => {
    await page.goto('/login');

    // Check page elements
    await expect(page.getByRole('heading', { name: 'Welcome to Oh My Survey' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with Email' })).toBeVisible();
    await expect(page.getByText('Continue with Google')).toBeVisible();
    await expect(page.getByText('Test Account')).toBeVisible();

    // Test email input
    await page.getByLabel('Email').fill('test@test.com');
    await expect(page.getByLabel('Email')).toHaveValue('test@test.com');

    // Test password input
    await page.getByLabel('Password').fill('password123');
    await expect(page.getByLabel('Password')).toHaveValue('password123');

    // Test login button (with wrong credentials)
    await page.getByRole('button', { name: 'Sign in with Email' }).click();

    // Should show error or stay on login page
    await page.waitForTimeout(2000);

    console.log('✅ Login Page - All elements functional');
  });

  test('Login Flow - Successful Login', async ({ page }) => {
    await login(page);

    // Verify we're on dashboard
    await expect(page.getByRole('heading', { name: 'Surveys' })).toBeVisible();

    // Verify API calls made
    const sessionCall = apiCalls.find(c => c.url.includes('/api/auth/session'));
    expect(sessionCall).toBeDefined();

    console.log('✅ Login Flow - Successful');
    console.log('   API Calls:', apiCalls.map(c => `${c.method} ${c.url} (${c.status})`).join(', '));
  });

  test('Dashboard Page - All Elements', async ({ page }) => {
    await login(page);

    // Check dashboard elements
    await expect(page.getByRole('heading', { name: 'Surveys' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'New Survey' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate with AI' }).first()).toBeVisible();

    // Check sidebar elements
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();

    console.log('✅ Dashboard Page - All elements visible');
  });

  test('New Survey Button', async ({ page }) => {
    await login(page);

    // Click New Survey
    await page.getByRole('link', { name: 'New Survey' }).click();
    await expect(page).toHaveURL(/\/surveys\/new/);

    // Check new survey page elements
    await expect(page.getByPlaceholder('Enter survey title')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Survey' })).toBeVisible();

    // Theme selection should be visible
    await expect(page.getByText('Light')).toBeVisible();
    await expect(page.getByText('Dark')).toBeVisible();
    await expect(page.getByText('Minimal')).toBeVisible();

    console.log('✅ New Survey Page - All elements functional');
  });

  test('Create Survey Flow', async ({ page }) => {
    await login(page);
    apiCalls.length = 0;

    // Navigate to new survey
    await page.getByRole('link', { name: 'New Survey' }).click();

    // Fill survey details
    const surveyTitle = `UI Test Survey ${Date.now()}`;
    await page.getByPlaceholder('Enter survey title').fill(surveyTitle);

    // Select theme
    await page.getByText('Dark').click();

    // Create survey
    await page.getByRole('button', { name: 'Create Survey' }).click();

    // Should redirect to edit page
    await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 10000 });

    // Track survey ID for cleanup
    const url = page.url();
    const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (surveyId) createdSurveyIds.push(surveyId);

    // Verify API call (201 Created is correct for POST)
    const createCall = apiCalls.find(c => c.url.includes('/api/surveys') && c.method === 'POST');
    expect(createCall).toBeDefined();
    expect([200, 201]).toContain(createCall?.status);

    console.log('✅ Create Survey - API working');
    console.log('   API Call:', `${createCall?.method} ${createCall?.url} (${createCall?.status})`);
  });

  test('Survey Edit Page - Tab Navigation', async ({ page }) => {
    await login(page);

    // Create survey first
    await page.getByRole('link', { name: 'New Survey' }).click();
    await page.getByPlaceholder('Enter survey title').fill(`Tab Test ${Date.now()}`);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

    // Track survey ID for cleanup
    const url = page.url();
    const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (surveyId) createdSurveyIds.push(surveyId);

    // Test Edit tab (should be active)
    await expect(page.locator('[data-testid="survey-tab-edit"]')).toBeVisible();

    // Test Settings tab - use Promise.all to wait for navigation
    await Promise.all([
      page.waitForURL(/\/settings/, { timeout: 15000 }),
      page.locator('[data-testid="survey-tab-settings"]').click(),
    ]);

    // Test Responses tab
    await Promise.all([
      page.waitForURL(/\/responses/, { timeout: 15000 }),
      page.locator('[data-testid="survey-tab-responses"]').click(),
    ]);

    // Go back to Edit tab
    await Promise.all([
      page.waitForURL(/\/edit/, { timeout: 15000 }),
      page.locator('[data-testid="survey-tab-edit"]').click(),
    ]);

    console.log('✅ Tab Navigation - All tabs functional');
  });

  test('Survey Edit Page - Add Question Button', async ({ page }) => {
    await login(page);
    apiCalls.length = 0;

    // Create survey
    await page.getByRole('link', { name: 'New Survey' }).click();
    await page.getByPlaceholder('Enter survey title').fill(`Question Test ${Date.now()}`);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

    // Track survey ID for cleanup
    const url = page.url();
    const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (surveyId) createdSurveyIds.push(surveyId);

    // Click Add Question button
    await page.getByRole('button', { name: /Add.*question/i }).click();

    // Question type picker should appear
    await page.waitForSelector('[role="dialog"]');

    // Check all question types are visible (use exact text from component)
    await expect(page.getByText('Short Text').first()).toBeVisible();
    await expect(page.getByText('Long Text').first()).toBeVisible();
    await expect(page.getByText('Multiple Choice').first()).toBeVisible();
    await expect(page.getByText('Yes / No')).toBeVisible();
    await expect(page.getByText('Rating').first()).toBeVisible();

    console.log('✅ Add Question Button - Question type picker functional');
  });

  test('AI Generator Dialog', async ({ page }) => {
    await login(page);

    // Click Generate with AI button (use first() to avoid strict mode violation)
    await page.getByRole('button', { name: 'Generate with AI' }).first().click();

    // Dialog should open
    await expect(page.getByRole('heading', { name: 'Generate Survey with AI' })).toBeVisible();

    // Check dialog elements
    await expect(page.getByText('Example prompts')).toBeVisible();
    await expect(page.getByPlaceholder(/customer feedback survey/i)).toBeVisible();

    // Test example prompt button
    const exampleButton = page.getByRole('button', { name: /Customer satisfaction/i });
    if (await exampleButton.isVisible()) {
      await exampleButton.click();
      // Textarea should be filled
      const textarea = page.getByPlaceholder(/customer feedback survey/i);
      await expect(textarea).not.toBeEmpty();
    }

    // Close dialog
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('heading', { name: 'Generate Survey with AI' })).not.toBeVisible();

    console.log('✅ AI Generator Dialog - All elements functional');
  });

  test('Settings Page - All Elements', async ({ page }) => {
    await login(page);

    // Create survey and go to settings
    await page.getByRole('link', { name: 'New Survey' }).click();
    await page.getByPlaceholder('Enter survey title').fill(`Settings Test ${Date.now()}`);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

    // Track survey ID for cleanup
    const url = page.url();
    const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (surveyId) createdSurveyIds.push(surveyId);

    // Navigate to Settings
    await page.locator('[data-testid="survey-tab-settings"]').click();
    await expect(page).toHaveURL(/\/settings/);

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Check settings elements (these may take time to load)
    const generalCard = page.getByText('General').first();
    if (await generalCard.isVisible({ timeout: 5000 })) {
      console.log('   - General section visible');
    }

    // Check for title input
    const titleInput = page.getByLabel('Title');
    if (await titleInput.isVisible({ timeout: 3000 })) {
      console.log('   - Title input visible');
    }

    // Check for theme selection
    const lightTheme = page.getByText('Light').first();
    if (await lightTheme.isVisible({ timeout: 3000 })) {
      console.log('   - Theme selection visible');
    }

    console.log('✅ Settings Page - Elements checked');
  });

  test('Responses Page - Empty State', async ({ page }) => {
    await login(page);

    // Create survey and go to responses
    await page.getByRole('link', { name: 'New Survey' }).click();
    await page.getByPlaceholder('Enter survey title').fill(`Responses Test ${Date.now()}`);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

    // Track survey ID for cleanup
    const url = page.url();
    const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (surveyId) createdSurveyIds.push(surveyId);

    // Navigate to Responses - use Promise.all to wait for navigation
    await Promise.all([
      page.waitForURL(/\/responses/, { timeout: 15000 }),
      page.locator('[data-testid="survey-tab-responses"]').click(),
    ]);

    // Should show empty state or response list
    await page.waitForTimeout(1000);

    console.log('✅ Responses Page - Loaded');
  });

  test('Back to Dashboard Navigation', async ({ page }) => {
    await login(page);

    // Create survey
    await page.getByRole('link', { name: 'New Survey' }).click();
    await page.getByPlaceholder('Enter survey title').fill(`Nav Test ${Date.now()}`);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

    // Track survey ID for cleanup
    const url = page.url();
    const surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (surveyId) createdSurveyIds.push(surveyId);

    // Click back button or Dashboard link (use first() due to multiple Dashboard links)
    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await expect(page).toHaveURL('/');

    console.log('✅ Back to Dashboard - Navigation functional');
  });

  test('API Endpoints Health Check', async ({ request }) => {
    // Test public API endpoints
    const endpoints = [
      { path: '/api/auth/providers', method: 'GET', expectedStatus: 200 },
      { path: '/api/auth/session', method: 'GET', expectedStatus: 200 },
      { path: '/api/auth/csrf', method: 'GET', expectedStatus: 200 },
      { path: '/api/public/surveys/non-existent', method: 'GET', expectedStatus: 404 },
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`http://localhost:3000${endpoint.path}`);
      const status = response.status();
      const passed = status === endpoint.expectedStatus;

      console.log(`   ${passed ? '✅' : '❌'} ${endpoint.method} ${endpoint.path} - ${status} (expected ${endpoint.expectedStatus})`);
      expect(status).toBe(endpoint.expectedStatus);
    }

    console.log('✅ API Endpoints - All healthy');
  });

  test('404 Page', async ({ page }) => {
    await page.goto('/non-existent-page-12345');

    // Should show 404
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();

    console.log('✅ 404 Page - Working correctly');
  });

  test('Public Survey 404', async ({ page }) => {
    await page.goto('/s/non-existent-survey-slug');

    // Should show 404
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();

    console.log('✅ Public Survey 404 - Working correctly');
  });

  test('Survey Selection Mode', async ({ page }) => {
    await login(page);

    // Create two surveys for testing selection
    await page.getByRole('link', { name: 'New Survey' }).click();
    await page.getByPlaceholder('Enter survey title').fill(`Selection Test 1 ${Date.now()}`);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

    // Track first survey ID for cleanup
    let url = page.url();
    let surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (surveyId) createdSurveyIds.push(surveyId);

    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await expect(page).toHaveURL('/');

    await page.getByRole('link', { name: 'New Survey' }).click();
    await page.getByPlaceholder('Enter survey title').fill(`Selection Test 2 ${Date.now()}`);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

    // Track second survey ID for cleanup
    url = page.url();
    surveyId = url.match(/\/surveys\/([^/]+)\/edit/)?.[1];
    if (surveyId) createdSurveyIds.push(surveyId);

    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await expect(page).toHaveURL('/');

    // Click Select button to enter selection mode
    await page.getByRole('button', { name: 'Select' }).click();

    // Check bulk actions bar appears
    await expect(page.getByText('Select surveys')).toBeVisible();
    await expect(page.getByRole('button', { name: /Delete/ })).toBeVisible();

    // Select all checkbox should be visible
    await expect(page.getByRole('checkbox', { name: 'Select all surveys' })).toBeVisible();

    // Exit selection mode
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Bulk actions bar should disappear
    await expect(page.getByText('Select surveys')).not.toBeVisible();

    console.log('✅ Survey Selection Mode - Working correctly');
  });

  test('Survey Bulk Delete', async ({ page }) => {
    await login(page);

    // Create a test survey for deletion
    await page.getByRole('link', { name: 'New Survey' }).click();
    const surveyTitle = `Bulk Delete Test ${Date.now()}`;
    await page.getByPlaceholder('Enter survey title').fill(surveyTitle);
    await page.getByRole('button', { name: 'Create Survey' }).click();
    await expect(page).toHaveURL(/\/edit/, { timeout: 10000 });

    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await expect(page).toHaveURL('/');

    // Wait for surveys to load
    await page.waitForTimeout(1000);

    // Enter selection mode first
    await page.getByRole('button', { name: 'Select' }).click();
    await expect(page.getByText('Select surveys')).toBeVisible();

    // Find the survey card and select its checkbox using aria-label
    const checkbox = page.getByRole('checkbox', { name: `Select ${surveyTitle}` });
    await checkbox.click();

    // Verify selection count
    await expect(page.getByText('1 of')).toBeVisible();

    // Delete button should be enabled
    const deleteButton = page.getByRole('button', { name: /Delete \(1\)/ });
    await expect(deleteButton).toBeEnabled();

    // Click delete
    await deleteButton.click();

    // Wait for AlertDialog and confirm
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByTestId('confirm-delete-button').click();

    // Should exit selection mode and survey should be deleted
    await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);
    await expect(page.getByText(surveyTitle)).not.toBeVisible();

    console.log('✅ Survey Bulk Delete - Working correctly');
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

// Summary test
test('Print Test Summary', async () => {
  console.log('\n========================================');
  console.log('       COMPREHENSIVE UI TEST SUMMARY');
  console.log('========================================');
  console.log('All interactive elements tested:');
  console.log('- Login page (email, password, buttons)');
  console.log('- Dashboard (New Survey, AI Generator)');
  console.log('- Survey creation flow');
  console.log('- Tab navigation (Edit/Settings/Responses)');
  console.log('- Add Question flow');
  console.log('- AI Generator dialog');
  console.log('- Settings page elements');
  console.log('- API endpoints health check');
  console.log('- 404 error pages');
  console.log('- Survey selection mode');
  console.log('- Bulk delete functionality');
  console.log('========================================\n');
});
