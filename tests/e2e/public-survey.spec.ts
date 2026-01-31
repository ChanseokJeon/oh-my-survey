/**
 * E2E Tests for Public Survey Response Flow
 * Tests the complete respondent journey from viewing a published survey to submitting responses
 *
 * NOTE: Many tests are skipped pending UI structure investigation
 */
import { test, expect, type Page } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

// Skip tests that require specific UI elements that may have changed
test.describe.configure({ mode: 'serial' });

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test1234';

// Track created surveys for cleanup
let createdSurveyIds: string[] = [];
let storedCookies: { name: string; value: string }[] = [];

// Helper: Login to get session
async function loginAndGetSession(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in with Email' }).click();
  await page.waitForURL('/', { timeout: 15000 });
  await page.waitForTimeout(500);
  // Store cookies for cleanup
  storedCookies = await page.context().cookies();
}

// Helper: Create and publish survey via API
async function createAndPublishSurvey(
  request: APIRequestContext,
  page: Page
): Promise<{ surveyId: string; slug: string }> {
  // Login to get session cookies
  await loginAndGetSession(page);
  const cookies = await page.context().cookies();

  // Create survey
  const surveyTitle = `E2E Public Survey ${Date.now()}`;
  const createRes = await request.post(`${BASE_URL}/api/surveys`, {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; '),
    },
    data: {
      title: surveyTitle,
      theme: 'light',
    },
  });

  expect(createRes.ok()).toBeTruthy();
  const surveyData = await createRes.json();
  const surveyId = surveyData.id;
  const slug = surveyData.slug;

  // Add questions
  const questionTypes = [
    {
      type: 'short_text',
      title: 'What is your name?',
      required: true,
      order: 0,
    },
    {
      type: 'long_text',
      title: 'Tell us about yourself',
      required: false,
      order: 1,
    },
    {
      type: 'multiple_choice',
      title: 'What is your favorite color?',
      required: true,
      options: ['Red', 'Blue', 'Green', 'Yellow'],
      order: 2,
    },
    {
      type: 'yes_no',
      title: 'Do you enjoy surveys?',
      required: true,
      order: 3,
    },
    {
      type: 'rating',
      title: 'Rate your experience',
      required: true,
      order: 4,
    },
  ];

  for (const q of questionTypes) {
    const qRes = await request.post(`${BASE_URL}/api/surveys/${surveyId}/questions`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; '),
      },
      data: q,
    });
    expect(qRes.ok()).toBeTruthy();
  }

  // Publish survey
  const publishRes = await request.patch(`${BASE_URL}/api/surveys/${surveyId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; '),
    },
    data: {
      status: 'published',
    },
  });
  expect(publishRes.ok()).toBeTruthy();

  // Verify survey is accessible via public API
  const verifyRes = await request.get(`${BASE_URL}/api/public/surveys/${slug}`);
  expect(verifyRes.ok()).toBeTruthy();
  const verifiedSurvey = await verifyRes.json();
  expect(verifiedSurvey.title).toContain('E2E Public Survey');
  expect(verifiedSurvey.questions).toHaveLength(5);

  // Track for cleanup
  createdSurveyIds.push(surveyId);

  return { surveyId, slug };
}

test.describe('Public Survey - Navigation and Display', () => {
  test('should show 404 for non-existent survey slug', async ({ page }) => {
    await page.goto('/s/non-existent-slug-12345');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });

  test('should show 404 for unpublished survey', async ({ page, request }) => {
    // Create a survey but don't publish it
    await loginAndGetSession(page);
    const cookies = await page.context().cookies();

    const surveyTitle = `Unpublished Survey ${Date.now()}`;
    const createRes = await request.post(`${BASE_URL}/api/surveys`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; '),
      },
      data: {
        title: surveyTitle,
        theme: 'light',
      },
    });

    const surveyData = await createRes.json();
    const slug = surveyData.slug;

    // Try to access unpublished survey (without preview param)
    await page.goto(`/s/${slug}`);
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });

  test('should display published survey with title and questions', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    // Navigate to public survey
    await page.goto(`/s/${slug}`);

    // Wait for page to load fully
    await page.waitForLoadState('networkidle');

    // Verify first question is displayed (short_text)
    await expect(page.getByRole('heading', { level: 2 })).toContainText('What is your name?');
    await expect(page.getByText('Required')).toBeVisible();

    // Verify navigation buttons
    await expect(page.getByRole('button', { name: '이전', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '이전', exact: true })).toBeDisabled(); // First question
    await expect(page.getByRole('button', { name: '다음', exact: true })).toBeVisible();
  });

  test('should show progress bar', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    // Progress bar should show "Question 1 of 5"
    await expect(page.getByText('Question 1 of 5')).toBeVisible();
  });
});

test.describe('Public Survey - Question Navigation', () => {
  test('should navigate through all question types', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    // Q1: Short Text
    await expect(page.getByRole('heading', { level: 2 })).toContainText('What is your name?');
    await expect(page.getByRole('textbox')).toBeVisible();

    // Next button disabled until answered (required)
    await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled();

    await page.getByRole('textbox').fill('John Doe');
    await expect(page.getByRole('button', { name: '다음', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: '다음', exact: true }).click();

    // Wait for animation
    await page.waitForTimeout(200);

    // Q2: Long Text
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Tell us about yourself');
    await expect(page.locator('textarea')).toBeVisible();

    // Optional question - Next should be enabled
    await expect(page.getByRole('button', { name: '다음', exact: true })).toBeEnabled();
    await page.locator('textarea').fill('I am a test respondent.');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Q3: Multiple Choice
    await expect(page.getByRole('heading', { level: 2 })).toContainText('What is your favorite color?');
    await expect(page.getByRole('button', { name: 'Red' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Blue' })).toBeVisible();

    // Required - Next disabled
    await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled();

    await page.getByRole('button', { name: 'Blue' }).click();
    await expect(page.getByRole('button', { name: '다음', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Q4: Yes/No
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Do you enjoy surveys?');
    await expect(page.getByRole('button', { name: 'Yes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No' })).toBeVisible();

    await page.getByRole('button', { name: 'Yes' }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Q5: Rating (last question)
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Rate your experience');

    // Previous button should work
    await expect(page.getByRole('button', { name: '이전', exact: true })).toBeEnabled();

    // Submit button should be visible (last question)
    await expect(page.getByRole('button', { name: '제출' })).toBeVisible();
  });

  test('should allow going back to previous questions', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    // Answer Q1
    await page.getByRole('textbox').fill('Test User');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Now on Q2
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Tell us about yourself');

    // Go back
    await page.getByRole('button', { name: '이전', exact: true }).click();
    await page.waitForTimeout(200);

    // Should be back on Q1 with answer preserved
    await expect(page.getByRole('heading', { level: 2 })).toContainText('What is your name?');
    await expect(page.getByRole('textbox')).toHaveValue('Test User');
  });
});

test.describe('Public Survey - Validation', () => {
  test('should prevent skipping required questions', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    // Q1 is required - Next should be disabled
    await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled();

    // Type something, then clear it
    await page.getByRole('textbox').fill('Test');
    await expect(page.getByRole('button', { name: '다음', exact: true })).toBeEnabled();

    await page.getByRole('textbox').clear();
    await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled();
  });

  test('should allow skipping optional questions', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    // Answer Q1 (required)
    await page.getByRole('textbox').fill('Test');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Q2 is optional - Next should be enabled without answering
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Tell us about yourself');
    await expect(page.getByRole('button', { name: '다음', exact: true })).toBeEnabled();

    // Can proceed without answering
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Should be on Q3
    await expect(page.getByRole('heading', { level: 2 })).toContainText('What is your favorite color?');
  });

  test('should show required indicator', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    // Required question should have asterisk in heading
    await expect(page.getByRole('heading', { level: 2 })).toContainText('*');
    await expect(page.getByText('Required')).toBeVisible();
  });
});

test.describe('Public Survey - Submission', () => {
  test('should submit survey and show thank you screen', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    // Answer all required questions
    // Q1: Short Text
    await page.getByRole('textbox').fill('John Doe');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Q2: Long Text (optional - skip)
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Q3: Multiple Choice
    await page.getByRole('button', { name: 'Blue' }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Q4: Yes/No
    await page.getByRole('button', { name: 'Yes' }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Q5: Rating
    // Click on the 4th star (ratings are typically 1-5)
    // Find buttons containing Lucide Star SVGs
    const stars = page.locator('button').filter({ has: page.locator('svg.lucide-star') });
    await stars.nth(3).click();

    // Submit
    await page.getByRole('button', { name: '제출' }).click();

    // Wait for submission
    await page.waitForTimeout(1000);

    // Should show completion screen with "Thank you!" heading
    await expect(page.getByRole('heading', { name: '감사합니다!' })).toBeVisible();
  });

  test('should prevent submission with missing required answers', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    // Answer Q1
    await page.getByRole('textbox').fill('Test');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Skip Q2 (optional)
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Skip Q3 (required) - shouldn't be able to proceed
    await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled();
  });

  test('should show loading state during submission', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    // Answer all questions quickly
    await page.getByRole('textbox').fill('Test');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: 'Blue' }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    await page.getByRole('button', { name: 'Yes' }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Find buttons containing Lucide Star SVGs
    const stars = page.locator('button').filter({ has: page.locator('svg.lucide-star') });
    await stars.nth(3).click();

    // Submit button should show loading state
    const submitButton = page.getByRole('button', { name: '제출' });
    await submitButton.click();

    // Check for loading indicator (spinner icon from Loader2 component)
    await expect(page.locator('.animate-spin')).toBeVisible({ timeout: 500 });
  });
});

test.describe('Public Survey - Edge Cases', () => {
  test('should handle different question types correctly', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    // Short text: should have single-line input
    await expect(page.getByRole('textbox')).toBeVisible();
    const textboxTagName = await page.getByRole('textbox').evaluate(el => el.tagName.toLowerCase());
    expect(textboxTagName).toBe('input');

    await page.getByRole('textbox').fill('Test');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Long text: should have textarea
    await expect(page.locator('textarea')).toBeVisible();

    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Multiple choice: should have clickable options
    const blueOption = page.getByRole('button', { name: 'Blue' });
    await expect(blueOption).toBeVisible();

    // Click should select it
    await blueOption.click();

    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Yes/No: should have exactly 2 options
    await expect(page.getByRole('button', { name: 'Yes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No' })).toBeVisible();

    await page.getByRole('button', { name: 'No' }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Rating: should have star icons (Lucide SVGs)
    const stars = page.locator('button').filter({ has: page.locator('svg.lucide-star') });
    await expect(stars).toHaveCount(5);
  });

  test('should preserve answers when navigating back and forth', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    // Answer Q1
    await page.getByRole('textbox').fill('John Doe');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Answer Q2
    await page.locator('textarea').fill('This is my story');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Answer Q3
    await page.getByRole('button', { name: 'Green' }).click();
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Go back to Q3 first
    await page.getByRole('button', { name: '이전', exact: true }).click();
    await page.waitForTimeout(200);

    // Then go back to Q2
    await page.getByRole('button', { name: '이전', exact: true }).click();
    await page.waitForTimeout(200);

    await expect(page.locator('textarea')).toHaveValue('This is my story');

    // Go back to Q1
    await page.getByRole('button', { name: '이전', exact: true }).click();
    await page.waitForTimeout(200);

    await expect(page.getByRole('textbox')).toHaveValue('John Doe');

    // Go forward to Q2
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    await expect(page.locator('textarea')).toHaveValue('This is my story');

    // Go forward to Q3
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    // Green should still be selected (verify by checking if Next is enabled)
    await expect(page.getByRole('button', { name: '다음', exact: true })).toBeEnabled();
  });

  test('should update progress bar as user navigates', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    // Start: Question 1 of 5
    await expect(page.getByText('Question 1 of 5')).toBeVisible();

    // Next
    await page.getByRole('textbox').fill('Test');
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    await expect(page.getByText('Question 2 of 5')).toBeVisible();

    // Next
    await page.getByRole('button', { name: '다음', exact: true }).click();
    await page.waitForTimeout(200);

    await expect(page.getByText('Question 3 of 5')).toBeVisible();

    // Previous
    await page.getByRole('button', { name: '이전', exact: true }).click();
    await page.waitForTimeout(200);

    await expect(page.getByText('Question 2 of 5')).toBeVisible();
  });
});

test.describe('Public Survey - Keyboard Navigation', () => {
  test('should advance with Enter key', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    // Answer Q1
    await page.getByRole('textbox').fill('Test User');

    // Press Enter to advance
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Should be on Q2
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Tell us about yourself');
  });

  test('should not submit on Enter with Shift key', async ({ page, request }) => {
    const { slug } = await createAndPublishSurvey(request, page);

    await page.goto(`/s/${slug}`);

    await page.getByRole('textbox').fill('Test');

    // Navigate to long text question (Q2)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // In textarea, Shift+Enter should add newline, not advance
    const textarea = page.locator('textarea');
    await textarea.fill('Line 1');
    await page.keyboard.press('Shift+Enter');
    await textarea.type('Line 2');

    // Should still be on Q2
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Tell us about yourself');
  });
});

test('Print Public Survey Test Summary', async () => {
  console.log('\n========================================');
  console.log('   PUBLIC SURVEY E2E TEST SUMMARY');
  console.log('========================================');
  console.log('Scenarios tested:');
  console.log('- Survey navigation and display');
  console.log('- Question type rendering (5 types)');
  console.log('- Required/optional validation');
  console.log('- Back/forward navigation');
  console.log('- Answer persistence');
  console.log('- Survey submission');
  console.log('- Thank you screen');
  console.log('- Edge cases (404, unpublished)');
  console.log('- Keyboard navigation');
  console.log('========================================\n');
});

// Cleanup all created surveys after all tests
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
