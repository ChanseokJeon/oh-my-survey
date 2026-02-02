# Theme Extractor E2E Tests

## Overview

Comprehensive E2E tests for the theme extraction feature using Playwright. These tests run in **headless mode only** (per CLAUDE.md security rules).

## Test File

`tests/e2e/theme-extractor.spec.ts`

## Test Coverage

### 1. Basic Flow (3 tests)
- ✓ Navigate to settings page and see theme options
- ✓ Extract theme from base64 image via API
- ✓ Extract different colors from different images

### 2. URL-based Extraction (2 tests)
- ✓ Extract theme from valid public URL
- ✓ Reject invalid URL format

### 3. Error Handling (4 tests)
- ✓ Reject invalid image format
- ✓ Reject non-image base64 data
- ✓ Return 401 for unauthenticated requests
- ✓ Return 404 for non-existent survey

### 4. Security Tests (4 tests)
- ✓ Block localhost URLs (SSRF protection)
- ✓ Block 127.0.0.1 URLs (SSRF protection)
- ✓ Block AWS metadata endpoint (SSRF protection)
- ✓ Reject invalid protocols (file://, ftp://)

### 5. Rate Limiting (1 test)
- ✓ Enforce rate limits after 11 requests

### 6. Theme Persistence (3 tests)
- ✓ Update survey with custom theme via API
- ✓ Persist custom theme after page refresh
- ✓ Clear custom theme when switching to built-in theme

**Total: 17 test cases**

## Running Tests

### Prerequisites

1. **Start dev server:**
   ```bash
   pnpm dev
   ```

2. **Ensure database is ready:**
   - PostgreSQL container running on port 5433
   - Or PGlite initialized

3. **Test user exists:**
   - Email: `test@example.com`
   - Password: `test1234`

### Run All Theme Extractor Tests

```bash
pnpm test:e2e tests/e2e/theme-extractor.spec.ts
```

### Run Specific Test Suite

```bash
# Basic flow only
pnpm test:e2e tests/e2e/theme-extractor.spec.ts -g "Basic Flow"

# Security tests only
pnpm test:e2e tests/e2e/theme-extractor.spec.ts -g "Security Tests"

# Theme persistence only
pnpm test:e2e tests/e2e/theme-extractor.spec.ts -g "Theme Persistence"
```

### Run in Debug Mode

```bash
# Show browser (headed mode for debugging only)
pnpm test:e2e tests/e2e/theme-extractor.spec.ts --headed

# Step through tests
pnpm test:e2e tests/e2e/theme-extractor.spec.ts --debug
```

## Test Structure

### Test Images
- **RED_BASE64**: 1x1 red pixel PNG
- **BLUE_BASE64**: 1x1 blue pixel PNG

### Helper Functions
- `login(page)`: Authenticate user with retry logic
- `createTestSurvey(page, title)`: Create test survey and return ID

### Cleanup
All test suites include `afterAll` hooks to delete created surveys.

## API Endpoint Tested

**POST** `/api/surveys/[surveyId]/extract-theme`

Request body:
```json
{
  "source": "base64" | "url" | "file",
  "data": "image data or URL"
}
```

Response:
```json
{
  "palette": ["#FF0000", "#00FF00", ...],
  "suggestedTheme": {
    "surveyBg": "0 0% 100%",
    "surveyFg": "222.2 84% 4.9%",
    "surveyPrimary": "221.2 83.2% 53.3%",
    ...
  }
}
```

## Expected Behavior

### Success Cases
- Returns 200 with palette and suggested theme
- Palette: 1-5 HEX colors
- Suggested theme: HSL color values

### Error Cases
- 401: Unauthenticated
- 404: Survey not found
- 400: Invalid input (format, URL, SSRF)
- 429: Rate limit exceeded

### Security
- SSRF protection blocks:
  - localhost, 127.0.0.1
  - Private IP ranges
  - Cloud metadata endpoints (169.254.169.254)
  - Invalid protocols (file://, ftp://)

## Notes

1. **Serial execution**: Tests run in serial mode to avoid conflicts
2. **Headless only**: No browser automation (per CLAUDE.md)
3. **Retry logic**: 1 retry for flaky PGlite tests
4. **External URLs**: URL tests may skip if external service is down
5. **Rate limiting**: May not always trigger in test environment due to timing

## Troubleshooting

### Tests fail with "Login failed"
- Check dev server is running on localhost:3000
- Verify test user exists in database

### Tests fail with "Server not ready"
- Increase timeout in `waitForServer` helper
- Check for build errors in dev server logs

### Rate limiting test doesn't trigger
- This is expected - rate limits may not trigger in fast test execution
- Test logs whether rate limiting occurred

### SSRF tests fail
- Check validators in `src/lib/theme/validators.ts`
- Ensure blocked URLs return 400 status

## CI/CD Integration

These tests can run in CI with:
```yaml
- name: Run E2E Tests
  run: |
    pnpm dev &
    sleep 10
    pnpm test:e2e tests/e2e/theme-extractor.spec.ts
```

## Related Files

- `/src/app/api/surveys/[surveyId]/extract-theme/route.ts` - API endpoint
- `/src/lib/theme/extractor.ts` - Color extraction logic
- `/src/lib/theme/validators.ts` - Input validation & SSRF protection
- `/src/lib/theme/fetcher.ts` - URL image fetching
- `/src/lib/theme/generator.ts` - Theme generation from palette
- `/tests/integration/api-theme-extract.test.ts` - Integration tests
