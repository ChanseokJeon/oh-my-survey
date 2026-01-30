# E2E Tests for Oh-My-Survey

## Test Files

### public-survey.spec.ts
Comprehensive E2E tests for the public survey response flow (Typeform-style one-question-at-a-time interface).

**Test Coverage:**
- Survey navigation and display
- Question type rendering (short_text, long_text, multiple_choice, yes_no, rating)
- Required/optional field validation
- Back/forward navigation with answer persistence
- Survey submission and completion screen
- Edge cases (404, unpublished surveys)
- Keyboard navigation (Enter to advance)

**Test Scenarios:**
1. **Navigation and Display** (4 tests)
   - 404 handling for non-existent slugs
   - 404 for unpublished surveys
   - Published survey display with title and questions
   - Progress bar visibility

2. **Question Navigation** (2 tests)
   - Navigate through all 5 question types
   - Back/forward navigation

3. **Validation** (3 tests)
   - Prevent skipping required questions
   - Allow skipping optional questions
   - Required field indicators

4. **Submission** (3 tests)
   - Complete survey submission flow
   - Prevent submission with missing required answers
   - Loading state during submission

5. **Edge Cases** (3 tests)
   - Different question type rendering
   - Answer persistence across navigation
   - Progress bar updates

6. **Keyboard Navigation** (2 tests)
   - Enter key to advance
   - Shift+Enter behavior in textareas

**Total: 18 test cases**

## Running Tests

### Run all E2E tests
```bash
pnpm test:e2e
```

### Run only public survey tests
```bash
pnpm test:e2e tests/e2e/public-survey.spec.ts
```

### Run in headed mode (see browser)
```bash
npx playwright test tests/e2e/public-survey.spec.ts --headed
```

### Run specific test
```bash
npx playwright test tests/e2e/public-survey.spec.ts -g "should submit survey"
```

### Debug mode
```bash
npx playwright test tests/e2e/public-survey.spec.ts --debug
```

## Test Architecture

### Setup Phase
Each test suite uses a helper function `createAndPublishSurvey()` that:
1. Logs in as test user
2. Creates a survey via API
3. Adds 5 questions (one of each type)
4. Publishes the survey
5. Returns survey ID and slug

This ensures a clean, isolated survey for each test that needs one.

### Test Data
- **Test User:** test@example.com / test1234
- **Survey Questions:**
  1. Short Text: "What is your name?" (required)
  2. Long Text: "Tell us about yourself" (optional)
  3. Multiple Choice: "What is your favorite color?" (required, options: Red/Blue/Green/Yellow)
  4. Yes/No: "Do you enjoy surveys?" (required)
  5. Rating: "Rate your experience" (required, 1-5 stars)

### Key Patterns

**Waiting for animations:**
```typescript
await page.getByRole('button', { name: 'Next' }).click();
await page.waitForTimeout(200); // Wait for transition animation
```

**Answer persistence verification:**
```typescript
// Go back
await page.getByRole('button', { name: 'Previous' }).click();
await page.waitForTimeout(200);

// Verify answer preserved
await expect(page.getByRole('textbox')).toHaveValue('John Doe');
```

**Required field validation:**
```typescript
// Should be disabled when empty
await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();

// Should be enabled when filled
await page.getByRole('textbox').fill('Test');
await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
```

## Troubleshooting

### Tests fail with "Survey not found"
- Ensure the dev server is running (`pnpm dev`)
- Check database connection
- Verify test user exists in database

### Navigation tests are flaky
- Increase animation wait time if needed
- Check for race conditions in question loading

### Submission tests fail
- Verify API endpoint `/api/public/surveys/[slug]/responses` is working
- Check network tab for error responses
- Ensure all required questions are answered

## Future Enhancements

- [ ] Test file upload questions (when implemented)
- [ ] Test conditional logic/branching (when implemented)
- [ ] Test survey themes (light/dark/minimal)
- [ ] Test logo display
- [ ] Test response validation errors
- [ ] Test rate limiting
- [ ] Test concurrent response submissions
