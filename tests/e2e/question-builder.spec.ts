import { test, expect, Page } from '@playwright/test';

// Configure serial mode to prevent parallel execution issues
test.describe.configure({ mode: 'serial' });

// Test credentials
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test1234';

// Track created surveys for cleanup
let createdSurveyIds: string[] = [];
let storedCookies: { name: string; value: string }[] = [];
const BASE_URL = 'http://localhost:3000';

// Helper to login
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in with Email' }).click();
  await page.waitForURL('/', { timeout: 15000 });
  await page.waitForTimeout(500);
  // Store cookies for cleanup
  storedCookies = await page.context().cookies();
}

// Helper to create a survey and navigate to edit page
async function createSurveyAndNavigateToEdit(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'New Survey' }).click();
  await page.getByPlaceholder('Enter survey title').fill(`Question Builder Test ${Date.now()}`);

  // Set up listener for survey context load BEFORE clicking create
  const surveyLoadPromise = page.waitForResponse(
    response => response.url().includes('/api/surveys/') && response.request().method() === 'GET' && !response.url().includes('/questions'),
    { timeout: 15000 }
  );

  await page.getByRole('button', { name: 'Create Survey' }).click();
  await expect(page).toHaveURL(/\/surveys\/[^/]+\/edit/, { timeout: 10000 });

  // Extract survey ID from URL for cleanup tracking
  const url = page.url();
  const surveyIdMatch = url.match(/\/surveys\/([^/]+)\/edit/);
  if (surveyIdMatch && surveyIdMatch[1]) {
    createdSurveyIds.push(surveyIdMatch[1]);
  }

  // Wait for survey context to load
  await surveyLoadPromise;

  // Wait for network to be completely idle
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  // Wait for page to fully load - check for the "Add your first question" button to be ready
  await expect(page.getByRole('button', { name: /Add.*question/i })).toBeVisible({ timeout: 5000 });

  // Additional wait to ensure React has processed the context update and re-rendered
  await page.waitForTimeout(2000);
}

test.describe('Question Builder - UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await createSurveyAndNavigateToEdit(page);
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

  test('Question Type Picker dialog opens and displays all question types', async ({ page }) => {
    // Click Add Question button
    const addButton = page.getByRole('button', { name: /Add.*question/i }).first();
    await addButton.click();

    // Verify type picker dialog opens
    await expect(page.getByRole('heading', { name: 'Add Question' })).toBeVisible({ timeout: 5000 });

    // Verify all 5 question types are displayed
    await expect(page.getByText('Short Text').first()).toBeVisible();
    await expect(page.getByText('Single line text input')).toBeVisible();

    await expect(page.getByText('Long Text').first()).toBeVisible();
    await expect(page.getByText('Multi-line text input')).toBeVisible();

    await expect(page.getByText('Multiple Choice').first()).toBeVisible();
    await expect(page.getByText('Select one option')).toBeVisible();

    await expect(page.getByText('Yes / No')).toBeVisible();
    await expect(page.getByText('Simple yes or no')).toBeVisible();

    await expect(page.getByText('Rating').first()).toBeVisible();
    await expect(page.getByText('1-5 star rating')).toBeVisible();

    console.log('✅ Question Type Picker displays all options correctly');
  });

  test('Question Type Picker closes when a type is selected', async ({ page }) => {
    // Click Add Question button
    const addButton = page.getByRole('button', { name: /Add.*question/i }).first();
    await addButton.click();

    // Verify dialog opens
    await expect(page.getByRole('heading', { name: 'Add Question' })).toBeVisible({ timeout: 5000 });

    // Click on Short Text
    await page.getByRole('button').filter({ hasText: 'Short Text' }).first().click();

    // Wait a moment
    await page.waitForTimeout(1000);

    // Verify dialog closed
    await expect(page.getByRole('heading', { name: 'Add Question' })).not.toBeVisible();

    console.log('✅ Question Type Picker closes on selection');
  });
});

test.describe('Question Builder - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await createSurveyAndNavigateToEdit(page);
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

  test('Add all 5 question types via UI', async ({ page }) => {
    const questionTypes = [
      { label: 'Short Text', type: 'Short Text' },
      { label: 'Long Text', type: 'Long Text' },
      { label: 'Multiple Choice', type: 'Multiple Choice' },
      { label: 'Yes / No', type: 'Yes/No' },
      { label: 'Rating', type: 'Rating' },
    ];

    for (let i = 0; i < questionTypes.length; i++) {
      const qt = questionTypes[i];

      // Click Add Question button
      const addButton = page.getByRole('button', { name: /Add.*question/i }).first();
      await addButton.click();

      // Wait for type picker dialog
      await expect(page.getByRole('heading', { name: 'Add Question' })).toBeVisible({ timeout: 5000 });

      // Scope to dialog for button selection
      const dialog = page.getByRole('dialog');

      // Wait for dialog to be fully ready
      await page.waitForTimeout(500);

      // Set up network listener BEFORE clicking
      const [response] = await Promise.all([
        page.waitForResponse(
          response => response.url().includes('/questions') && response.request().method() === 'POST',
          { timeout: 15000 }
        ),
        // Click the button - using text content match to ensure we get the right button
        dialog.locator(`button:has-text("${qt.label}")`).click()
      ]);

      expect(response.status()).toBe(201);

      // Wait for type picker to close
      await expect(page.getByRole('heading', { name: 'Add Question' })).not.toBeVisible();

      // Wait for Question Editor dialog to open
      await expect(page.getByRole('heading', { name: 'Edit Question' })).toBeVisible({ timeout: 5000 });

      // Close the editor with Cancel button (more reliable than Escape)
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('heading', { name: 'Edit Question' })).not.toBeVisible();

      await page.waitForTimeout(500);
    }

    // Verify all 5 questions appear as cards with drag handles
    const dragHandles = page.locator('svg.lucide-grip-vertical');
    await expect(dragHandles).toHaveCount(5);

    console.log('✅ Added all 5 question types successfully');
  });

  test('Edit question title and required property', async ({ page }) => {
    // Add a question first
    await page.getByRole('button', { name: /Add.*question/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Question' })).toBeVisible();

    // Scope to dialog
    const dialog = page.getByRole('dialog');
    await page.waitForTimeout(500);

    const [response] = await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/questions') && response.request().method() === 'POST',
        { timeout: 15000 }
      ),
      dialog.locator('button:has-text("Short Text")').click()
    ]);

    expect(response.status()).toBe(201);

    // Editor should open
    await expect(page.getByRole('heading', { name: 'Edit Question' })).toBeVisible({ timeout: 5000 });

    // Edit the title - use the ID selector since label is "Question" not "Question Title"
    const titleInput = page.locator('#title');
    await titleInput.fill('What is your name?');

    // Toggle required
    const requiredSwitch = page.locator('#required');
    await requiredSwitch.click();

    // Set up listener for update API call
    const questionUpdatePromise = page.waitForResponse(
      response => response.url().includes('/questions/') && response.request().method() === 'PATCH',
      { timeout: 10000 }
    );

    // Save
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await questionUpdatePromise;

    // Wait for editor to close
    await expect(page.getByRole('heading', { name: 'Edit Question' })).not.toBeVisible();

    // Verify question appears in list with correct title
    await expect(page.getByText('What is your name?')).toBeVisible();
    await expect(page.getByText('Required')).toBeVisible();

    console.log('✅ Edited question title and required property');
  });

  test('Edit multiple choice question - add/remove options', async ({ page }) => {
    // Add a multiple choice question
    await page.getByRole('button', { name: /Add.*question/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Question' })).toBeVisible();

    // Scope to dialog
    const dialog = page.getByRole('dialog');
    await page.waitForTimeout(500);

    const [response] = await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/questions') && response.request().method() === 'POST',
        { timeout: 15000 }
      ),
      dialog.locator('button:has-text("Multiple Choice")').click()
    ]);

    expect(response.status()).toBe(201);

    // Editor should open
    await expect(page.getByRole('heading', { name: 'Edit Question' })).toBeVisible({ timeout: 5000 });

    // Should have 2 default options - check placeholder that matches actual component
    const optionInputs = page.locator('input[placeholder^="Option"]');
    await expect(optionInputs).toHaveCount(2);

    // Add a new option
    await page.getByRole('button', { name: 'Add Option' }).click();
    await page.waitForTimeout(300);
    await expect(optionInputs).toHaveCount(3);

    // Edit options
    await optionInputs.nth(0).fill('Red');
    await optionInputs.nth(1).fill('Blue');
    await optionInputs.nth(2).fill('Green');

    // Remove the second option (Blue) - use the X button with lucide-x class
    const deleteButtons = page.locator('button:has(svg.lucide-x)');
    await deleteButtons.nth(1).click();
    await page.waitForTimeout(300);

    // Should have 2 options now
    await expect(optionInputs).toHaveCount(2);

    // Set up listener for update API call
    const questionUpdatePromise = page.waitForResponse(
      response => response.url().includes('/questions/') && response.request().method() === 'PATCH',
      { timeout: 10000 }
    );

    // Save
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await questionUpdatePromise;
    await expect(page.getByRole('heading', { name: 'Edit Question' })).not.toBeVisible();

    // Verify metadata shows correct option count
    await expect(page.getByText('2 options')).toBeVisible();

    console.log('✅ Edited multiple choice options');
  });

  test('Delete question', async ({ page }) => {
    // Add a question
    await page.getByRole('button', { name: /Add.*question/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Question' })).toBeVisible();

    // Scope to dialog
    const dialog = page.getByRole('dialog');
    await page.waitForTimeout(500);

    const [response] = await Promise.all([
      page.waitForResponse(
        response => response.url().includes('/questions') && response.request().method() === 'POST',
        { timeout: 15000 }
      ),
      dialog.locator('button:has-text("Short Text")').click()
    ]);

    expect(response.status()).toBe(201);

    // Close editor
    await expect(page.getByRole('heading', { name: 'Edit Question' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Question' })).not.toBeVisible();

    // Verify question exists using drag handle
    const dragHandles = page.locator('svg.lucide-grip-vertical');
    await expect(dragHandles).toHaveCount(1);

    // Set up dialog handler to accept confirm
    page.on('dialog', dialog => dialog.accept());

    // Set up listener for delete API call
    const questionDeletePromise = page.waitForResponse(
      response => response.url().includes('/questions/') && response.request().method() === 'DELETE',
      { timeout: 10000 }
    );

    // Click delete button (trash icon)
    const deleteButton = page.locator('button:has(svg.lucide-trash-2)').first();
    await deleteButton.click();

    await questionDeletePromise;

    // Wait a bit for UI to update
    await page.waitForTimeout(500);

    // Verify question is gone
    await expect(page.getByText('No questions yet')).toBeVisible();

    console.log('✅ Deleted question successfully');
  });

  test('Verify question list displays correct metadata', async ({ page }) => {
    // Add multiple questions of different types
    const questionsToAdd = [
      'Short Text',
      'Rating',
      'Yes / No',
    ];

    for (const qType of questionsToAdd) {
      await page.getByRole('button', { name: /Add.*question/i }).first().click();
      await expect(page.getByRole('heading', { name: 'Add Question' })).toBeVisible();

      // Scope to dialog
      const dialog = page.getByRole('dialog');
      await page.waitForTimeout(500);

      const [response] = await Promise.all([
        page.waitForResponse(
          response => response.url().includes('/questions') && response.request().method() === 'POST',
          { timeout: 15000 }
        ),
        dialog.locator(`button:has-text("${qType}")`).click()
      ]);

      expect(response.status()).toBe(201);

      await expect(page.getByRole('heading', { name: 'Edit Question' })).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('heading', { name: 'Edit Question' })).not.toBeVisible();
      await page.waitForTimeout(300);
    }

    // Verify all questions are displayed using drag handles
    const dragHandles = page.locator('svg.lucide-grip-vertical');
    await expect(dragHandles).toHaveCount(3);

    // Verify each drag handle's parent card has the required elements
    for (let i = 0; i < 3; i++) {
      const card = dragHandles.nth(i).locator('..').locator('..');
      // Should have edit button (pencil icon)
      await expect(card.locator('svg.lucide-pencil')).toBeVisible();
      // Should have delete button (trash icon)
      await expect(card.locator('svg.lucide-trash-2')).toBeVisible();
      // Should have question title
      await expect(card.getByText('New question')).toBeVisible();
    }

    console.log('✅ Question metadata displays correctly');
  });
});

// Summary test
test('Print Question Builder Test Summary', async () => {
  console.log('\n========================================');
  console.log('   QUESTION BUILDER TEST SUMMARY');
  console.log('========================================');
  console.log('Tests implemented:');
  console.log('✅ Question Type Picker UI components');
  console.log('✅ Add all 5 question types via UI');
  console.log('✅ Edit question title and required field');
  console.log('✅ Add/remove options for multiple choice');
  console.log('✅ Delete questions');
  console.log('✅ Verify question metadata display');
  console.log('');
  console.log('All question builder CRUD features are working!');
  console.log('========================================\n');
});
