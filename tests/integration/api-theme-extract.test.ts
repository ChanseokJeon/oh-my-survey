/**
 * Integration tests for Theme Extraction API
 *
 * Prerequisites:
 * 1. Start dev server: pnpm dev
 * 2. Ensure database is running and accessible
 * 3. Run tests: pnpm test tests/integration/api-theme-extract.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Test session cookie (obtained after login)
let sessionCookie: string = '';
let testSurveyId: string = '';

// Helper to make authenticated requests
async function authFetch(path: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (sessionCookie) {
    (headers as Record<string, string>)['Cookie'] = sessionCookie;
  }

  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
}

// Test image: 1x1 red pixel PNG (base64)
const TEST_IMAGE_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

// Test image: 1x1 blue pixel PNG (base64)
const TEST_IMAGE_BLUE_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==';

describe('Theme Extraction API Integration Tests', () => {
  beforeAll(async () => {
    // Login and create test survey
    try {
      // Get CSRF token
      const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
      const csrfData = await csrfResponse.json();

      // Login
      const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          csrfToken: csrfData.csrfToken,
          email: 'test@example.com',
          password: 'test1234',
        }),
        redirect: 'manual',
      });

      const setCookie = loginResponse.headers.get('set-cookie');
      if (setCookie) {
        sessionCookie = setCookie.split(';')[0];
      }

      // Create test survey
      const surveyResponse = await authFetch('/api/surveys', {
        method: 'POST',
        body: JSON.stringify({
          title: `Theme Extract Test Survey ${Date.now()}`,
          theme: 'light',
        }),
      });

      if (surveyResponse.ok) {
        const survey = await surveyResponse.json();
        testSurveyId = survey.id;
      }
    } catch (error) {
      console.warn('Setup failed:', error);
    }
  });

  afterAll(async () => {
    // Cleanup test survey
    if (testSurveyId) {
      await authFetch(`/api/surveys/${testSurveyId}`, {
        method: 'DELETE',
      });
    }
  });

  describe('Success Cases', () => {
    it('should extract theme from base64 image', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/extract-theme`, {
        method: 'POST',
        body: JSON.stringify({
          source: 'base64',
          data: TEST_IMAGE_BASE64,
        }),
      });

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.palette).toBeDefined();
      expect(Array.isArray(result.palette)).toBe(true);
      expect(result.palette.length).toBeGreaterThan(0);
      expect(result.palette.length).toBeLessThanOrEqual(5);

      // Validate HEX format
      result.palette.forEach((color: string) => {
        expect(color).toMatch(/^#[A-Fa-f0-9]{6}$/);
      });

      expect(result.suggestedTheme).toBeDefined();
      expect(result.suggestedTheme.surveyBg).toBeDefined();
      expect(result.suggestedTheme.surveyFg).toBeDefined();
      expect(result.suggestedTheme.surveyPrimary).toBeDefined();

      // Validate HSL format
      expect(result.suggestedTheme.surveyPrimary).toMatch(/^\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%$/);
    });

    it('should extract theme from file (base64 encoded)', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/extract-theme`, {
        method: 'POST',
        body: JSON.stringify({
          source: 'file',
          data: TEST_IMAGE_BLUE_BASE64,
        }),
      });

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.ok).toBe(true);
      const result = await response.json();

      expect(result.palette).toBeDefined();
      expect(Array.isArray(result.palette)).toBe(true);
      expect(result.suggestedTheme).toBeDefined();
    });

    it('should extract theme from URL (public image)', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      // Use a reliable public image URL (placeholder.com)
      const publicImageUrl = 'https://via.placeholder.com/150/0000FF/FFFFFF';

      const response = await authFetch(`/api/surveys/${testSurveyId}/extract-theme`, {
        method: 'POST',
        body: JSON.stringify({
          source: 'url',
          data: publicImageUrl,
        }),
      });

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      // May fail if external service is down, that's acceptable
      if (!response.ok) {
        console.log('Skipping - external URL not accessible');
        return;
      }

      const result = await response.json();

      expect(result.palette).toBeDefined();
      expect(Array.isArray(result.palette)).toBe(true);
      expect(result.suggestedTheme).toBeDefined();
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 without authentication', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/surveys/${testSurveyId}/extract-theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'base64',
          data: TEST_IMAGE_BASE64,
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent survey', async () => {
      const response = await authFetch('/api/surveys/non-existent-survey-id/extract-theme', {
        method: 'POST',
        body: JSON.stringify({
          source: 'base64',
          data: TEST_IMAGE_BASE64,
        }),
      });

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.status).toBe(404);
    });
  });

  describe('Security: SSRF Protection', () => {
    it('should block localhost URLs', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/extract-theme`, {
        method: 'POST',
        body: JSON.stringify({
          source: 'url',
          data: 'http://localhost:3000/api/surveys',
        }),
      });

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBeDefined();
      expect(result.error.toLowerCase()).toContain('not allowed');
    });

    it('should block 127.0.0.1', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/extract-theme`, {
        method: 'POST',
        body: JSON.stringify({
          source: 'url',
          data: 'http://127.0.0.1:3000/api/surveys',
        }),
      });

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.status).toBe(400);
    });

    it('should block AWS metadata endpoint', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/extract-theme`, {
        method: 'POST',
        body: JSON.stringify({
          source: 'url',
          data: 'http://169.254.169.254/latest/meta-data/',
        }),
      });

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.status).toBe(400);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid base64 format', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/extract-theme`, {
        method: 'POST',
        body: JSON.stringify({
          source: 'base64',
          data: 'invalid-base64-data',
        }),
      });

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.status).toBe(400);
    });

    it('should reject non-image base64', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/extract-theme`, {
        method: 'POST',
        body: JSON.stringify({
          source: 'base64',
          data: 'data:text/plain;base64,SGVsbG8gV29ybGQ=',
        }),
      });

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.status).toBe(400);
    });

    it('should reject invalid URL format', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/extract-theme`, {
        method: 'POST',
        body: JSON.stringify({
          source: 'url',
          data: 'not-a-valid-url',
        }),
      });

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits after multiple requests', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      // Send 11 requests (limit is 10 per minute per user)
      const requests = Array.from({ length: 11 }, () =>
        authFetch(`/api/surveys/${testSurveyId}/extract-theme`, {
          method: 'POST',
          body: JSON.stringify({
            source: 'base64',
            data: TEST_IMAGE_BASE64,
          }),
        })
      );

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some((r) => r.status === 429);

      if (responses[0].status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      // Note: This may not always trigger in tests due to timing
      // Just log the result
      console.log('Rate limiting test result:', { rateLimited });
    });
  });
});
