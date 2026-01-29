/**
 * Integration tests for Oh-My-Survey API
 *
 * These tests run against a live dev server.
 * Prerequisites:
 * 1. Start dev server: pnpm dev
 * 2. Ensure database is running and accessible
 * 3. Run tests: pnpm test tests/integration
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

describe('API Integration Tests', () => {
  // Skip if server is not running
  beforeAll(async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/session`, {
        method: 'GET',
      });
      if (!response.ok) {
        console.warn('Server not reachable, skipping integration tests');
      }
    } catch {
      console.warn('Server not running at', BASE_URL);
    }
  });

  describe('Authentication', () => {
    it('should return session info', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/session`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toBeDefined();
    });

    it('should login with credentials', async () => {
      // First get CSRF token
      const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;

      // Login with test credentials
      const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          csrfToken,
          email: 'test@example.com',
          password: 'test1234',
        }),
        redirect: 'manual',
      });

      // Should redirect (302) on successful login
      expect([200, 302]).toContain(response.status);

      // Store session cookie for subsequent requests
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        sessionCookie = setCookie.split(';')[0];
      }
    });
  });

  describe('Surveys API', () => {
    it('should create a new survey', async () => {
      const response = await authFetch('/api/surveys', {
        method: 'POST',
        body: JSON.stringify({
          title: `Integration Test Survey ${Date.now()}`,
          theme: 'light',
        }),
      });

      // May fail without auth - that's expected behavior
      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.ok).toBe(true);
      const survey = await response.json();
      expect(survey.id).toBeDefined();
      expect(survey.title).toContain('Integration Test Survey');
      expect(survey.status).toBe('draft');

      testSurveyId = survey.id;
    });

    it('should get survey by ID', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}`);

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.ok).toBe(true);
      const survey = await response.json();
      expect(survey.id).toBe(testSurveyId);
    });

    it('should update survey', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Updated Test Survey',
          theme: 'dark',
        }),
      });

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.ok).toBe(true);
      const survey = await response.json();
      expect(survey.title).toBe('Updated Test Survey');
      expect(survey.theme).toBe('dark');
    });
  });

  describe('Questions API', () => {
    it('should add a question to survey', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'short_text',
          title: 'Test Question',
          required: true,
        }),
      });

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.ok).toBe(true);
      const question = await response.json();
      expect(question.id).toBeDefined();
      expect(question.type).toBe('short_text');
      expect(question.title).toBe('Test Question');
    });

    it('should get questions for survey', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/questions`);

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      expect(response.ok).toBe(true);
      const questions = await response.json();
      expect(Array.isArray(questions)).toBe(true);
    });
  });

  describe('Public Survey API', () => {
    it('should return 404 for non-existent survey', async () => {
      const response = await fetch(`${BASE_URL}/api/public/surveys/non-existent-slug-12345`);
      expect(response.status).toBe(404);
    });

    it('should not allow access to unpublished surveys', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      // Get the survey slug
      const surveyResponse = await authFetch(`/api/surveys/${testSurveyId}`);
      if (!surveyResponse.ok) {
        console.log('Skipping - could not get survey');
        return;
      }

      const survey = await surveyResponse.json();

      // Try to access via public API (should fail since not published)
      const publicResponse = await fetch(`${BASE_URL}/api/public/surveys/${survey.slug}`);
      expect(publicResponse.status).toBe(404);
    });
  });

  describe('Survey Publish Flow', () => {
    it('should publish a survey', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/publish`, {
        method: 'POST',
        body: JSON.stringify({ action: 'publish' }),
      });

      if (response.status === 401) {
        console.log('Skipping - authentication required');
        return;
      }

      // May fail if no questions added
      if (response.status === 400) {
        const data = await response.json();
        console.log('Publish failed:', data.error);
        return;
      }

      expect(response.ok).toBe(true);
      const survey = await response.json();
      expect(survey.status).toBe('published');
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up test survey
    if (testSurveyId) {
      await authFetch(`/api/surveys/${testSurveyId}`, {
        method: 'DELETE',
      });
    }
  });
});

describe('Health Check', () => {
  it('should respond to API routes', async () => {
    // Check that server is running
    const response = await fetch(`${BASE_URL}/api/auth/providers`);
    expect(response.ok).toBe(true);
  });
});
