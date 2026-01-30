/**
 * Integration tests for Responses API
 *
 * Tests all response-related endpoints:
 * - GET /api/surveys/[id]/responses - Get paginated responses
 * - GET /api/surveys/[id]/responses/export - Export CSV
 * - POST /api/public/surveys/[slug]/responses - Submit public response
 *
 * Prerequisites:
 * 1. Start dev server: pnpm dev
 * 2. Ensure database is running and accessible
 * 3. Run tests: pnpm test tests/integration/api-responses
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Test session cookie (obtained after login)
let sessionCookie: string = '';
let testSurveyId: string = '';
let testSurveySlug: string = '';
let testQuestionIds: string[] = [];

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

describe('Responses API Integration Tests', () => {
  // Setup: Login and create test survey
  beforeAll(async () => {
    try {
      // Check server availability
      const response = await fetch(`${BASE_URL}/api/auth/session`);
      if (!response.ok) {
        console.warn('Server not reachable, skipping integration tests');
        return;
      }

      // Get CSRF token
      const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;

      // Login
      const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
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

      const setCookie = loginResponse.headers.get('set-cookie');
      if (setCookie) {
        sessionCookie = setCookie.split(';')[0];
      }

      // Create test survey
      const surveyResponse = await authFetch('/api/surveys', {
        method: 'POST',
        body: JSON.stringify({
          title: `Response Test Survey ${Date.now()}`,
          theme: 'light',
        }),
      });

      if (surveyResponse.ok) {
        const survey = await surveyResponse.json();
        testSurveyId = survey.id;
        testSurveySlug = survey.slug;

        // Add questions of different types
        const questions = [
          {
            type: 'short_text',
            title: 'What is your name?',
            required: true,
          },
          {
            type: 'long_text',
            title: 'Tell us about yourself',
            required: false,
          },
          {
            type: 'rating',
            title: 'Rate our service',
            required: true,
          },
          {
            type: 'yes_no',
            title: 'Would you recommend us?',
            required: false,
          },
        ];

        for (const question of questions) {
          const questionResponse = await authFetch(`/api/surveys/${testSurveyId}/questions`, {
            method: 'POST',
            body: JSON.stringify(question),
          });

          if (questionResponse.ok) {
            const createdQuestion = await questionResponse.json();
            testQuestionIds.push(createdQuestion.id);
          }
        }

        // Publish the survey
        await authFetch(`/api/surveys/${testSurveyId}/publish`, {
          method: 'POST',
          body: JSON.stringify({ action: 'publish' }),
        });
      }
    } catch (error) {
      console.warn('Setup failed:', error);
    }
  });

  describe('POST /api/public/surveys/[slug]/responses - Submit Response', () => {
    it('should submit a valid response for published survey', async () => {
      if (!testSurveySlug || testQuestionIds.length === 0) {
        console.log('Skipping - no test survey available');
        return;
      }

      const answers: Record<string, string | number> = {
        [testQuestionIds[0]]: 'John Doe',
        [testQuestionIds[1]]: 'I am a test user',
        [testQuestionIds[2]]: 5,
        [testQuestionIds[3]]: 'yes',
      };

      const response = await fetch(`${BASE_URL}/api/public/surveys/${testSurveySlug}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Response submitted successfully');
      expect(data.responseId).toBeDefined();
    });

    it('should submit response with only required fields', async () => {
      if (!testSurveySlug || testQuestionIds.length === 0) {
        console.log('Skipping - no test survey available');
        return;
      }

      const answers: Record<string, string | number> = {
        [testQuestionIds[0]]: 'Jane Smith',
        [testQuestionIds[2]]: 4,
      };

      const response = await fetch(`${BASE_URL}/api/public/surveys/${testSurveySlug}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should reject response with missing required fields', async () => {
      if (!testSurveySlug || testQuestionIds.length === 0) {
        console.log('Skipping - no test survey available');
        return;
      }

      // Missing required name field (testQuestionIds[0])
      const answers: Record<string, string | number> = {
        [testQuestionIds[2]]: 3,
      };

      const response = await fetch(`${BASE_URL}/api/public/surveys/${testSurveySlug}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing required answers');
      expect(data.questionIds).toContain(testQuestionIds[0]);
    });

    it('should reject response with invalid answer types', async () => {
      if (!testSurveySlug || testQuestionIds.length === 0) {
        console.log('Skipping - no test survey available');
        return;
      }

      // Invalid rating type (should be number)
      const answers: Record<string, string | number> = {
        [testQuestionIds[0]]: 'Test User',
        [testQuestionIds[2]]: 'five' as unknown as number, // Invalid type
      };

      const response = await fetch(`${BASE_URL}/api/public/surveys/${testSurveySlug}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid');
    });

    it('should reject response with out-of-range rating', async () => {
      if (!testSurveySlug || testQuestionIds.length === 0) {
        console.log('Skipping - no test survey available');
        return;
      }

      // Rating out of range (1-5)
      const answers: Record<string, string | number> = {
        [testQuestionIds[0]]: 'Test User',
        [testQuestionIds[2]]: 10,
      };

      const response = await fetch(`${BASE_URL}/api/public/surveys/${testSurveySlug}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid rating');
    });

    it('should reject response with empty required string', async () => {
      if (!testSurveySlug || testQuestionIds.length === 0) {
        console.log('Skipping - no test survey available');
        return;
      }

      // Empty string for required field
      const answers: Record<string, string | number> = {
        [testQuestionIds[0]]: '   ', // Whitespace only
        [testQuestionIds[2]]: 4,
      };

      const response = await fetch(`${BASE_URL}/api/public/surveys/${testSurveySlug}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing required answers');
    });

    it('should return 404 for non-existent survey slug', async () => {
      const answers = {
        question1: 'Test',
      };

      const response = await fetch(`${BASE_URL}/api/public/surveys/non-existent-slug-12345/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Survey not found');
    });

    it('should return 404 for unpublished survey', async () => {
      if (!sessionCookie) {
        console.log('Skipping - not authenticated');
        return;
      }

      // Create unpublished survey
      const surveyResponse = await authFetch('/api/surveys', {
        method: 'POST',
        body: JSON.stringify({
          title: `Unpublished Test ${Date.now()}`,
          theme: 'light',
        }),
      });

      if (!surveyResponse.ok) {
        console.log('Skipping - could not create survey');
        return;
      }

      const survey = await surveyResponse.json();

      // Try to submit response (should fail)
      const response = await fetch(`${BASE_URL}/api/public/surveys/${survey.slug}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: {} }),
      });

      expect(response.status).toBe(404);

      // Cleanup
      await authFetch(`/api/surveys/${survey.id}`, { method: 'DELETE' });
    });
  });

  describe('GET /api/surveys/[id]/responses - Get Responses', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/surveys/test-id/responses`);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should get paginated responses', async () => {
      if (!testSurveyId || !sessionCookie) {
        console.log('Skipping - no test survey or session');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/responses`);

      if (response.status === 404) {
        console.log('Skipping - survey not found');
        return;
      }

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.responses).toBeDefined();
      expect(Array.isArray(data.responses)).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(50);
      expect(data.pagination.total).toBeGreaterThanOrEqual(0);
      expect(data.pagination.totalPages).toBeGreaterThanOrEqual(0);
    });

    it('should handle pagination parameters', async () => {
      if (!testSurveyId || !sessionCookie) {
        console.log('Skipping - no test survey or session');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/responses?page=2&limit=10`);

      if (response.status === 404) {
        console.log('Skipping - survey not found');
        return;
      }

      expect(response.ok).toBe(true);
      const data = await response.json();

      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.responses.length).toBeLessThanOrEqual(10);
    });

    it('should return response data with correct structure', async () => {
      if (!testSurveyId || !sessionCookie || testQuestionIds.length === 0) {
        console.log('Skipping - no test data available');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/responses`);

      if (response.status === 404) {
        console.log('Skipping - survey not found');
        return;
      }

      expect(response.ok).toBe(true);
      const data = await response.json();

      if (data.responses.length > 0) {
        const firstResponse = data.responses[0];
        expect(firstResponse.id).toBeDefined();
        expect(firstResponse.answers).toBeDefined();
        expect(firstResponse.completedAt).toBeDefined();
        expect(typeof firstResponse.answers).toBe('object');
      }
    });

    it('should enforce max limit of 100', async () => {
      if (!testSurveyId || !sessionCookie) {
        console.log('Skipping - no test survey or session');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/responses?limit=500`);

      if (response.status === 404) {
        console.log('Skipping - survey not found');
        return;
      }

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.pagination.limit).toBe(100);
    });

    it('should return 404 for non-existent survey', async () => {
      if (!sessionCookie) {
        console.log('Skipping - not authenticated');
        return;
      }

      const response = await authFetch('/api/surveys/non-existent-id-12345/responses');
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Survey not found');
    });

    it('should not allow access to other users surveys', async () => {
      if (!sessionCookie) {
        console.log('Skipping - not authenticated');
        return;
      }

      // Try to access a survey with a different user ID pattern
      const response = await authFetch('/api/surveys/00000000-0000-0000-0000-000000000000/responses');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/surveys/[id]/responses/export - Export CSV', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/surveys/test-id/responses/export`);
      expect(response.status).toBe(401);
    });

    it('should export responses as CSV', async () => {
      if (!testSurveyId || !sessionCookie) {
        console.log('Skipping - no test survey or session');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/responses/export`);

      if (response.status === 404) {
        console.log('Skipping - survey not found');
        return;
      }

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('text/csv');
      expect(response.headers.get('content-disposition')).toContain('attachment');
      expect(response.headers.get('content-disposition')).toContain('.csv');
    });

    it('should have correct CSV format with headers', async () => {
      if (!testSurveyId || !sessionCookie) {
        console.log('Skipping - no test survey or session');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/responses/export`);

      if (response.status === 404) {
        console.log('Skipping - survey not found');
        return;
      }

      expect(response.ok).toBe(true);
      const csvContent = await response.text();

      const lines = csvContent.split('\n');
      expect(lines.length).toBeGreaterThan(0);

      const headers = lines[0];
      expect(headers).toContain('Response ID');
      expect(headers).toContain('Submitted At');
      expect(headers).toContain('IP Address');
    });

    it('should properly escape CSV values', async () => {
      if (!testSurveyId || !sessionCookie || testQuestionIds.length === 0) {
        console.log('Skipping - no test data available');
        return;
      }

      // Submit response with special characters
      const answers: Record<string, string | number> = {
        [testQuestionIds[0]]: 'Name, with comma',
        [testQuestionIds[1]]: 'Text with "quotes" and\nnewlines',
        [testQuestionIds[2]]: 5,
      };

      await fetch(`${BASE_URL}/api/public/surveys/${testSurveySlug}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      // Export CSV
      const response = await authFetch(`/api/surveys/${testSurveyId}/responses/export`);

      if (response.status === 404) {
        console.log('Skipping - survey not found');
        return;
      }

      expect(response.ok).toBe(true);
      const csvContent = await response.text();

      // Check that special characters are properly escaped
      expect(csvContent).toContain('"Name, with comma"');
      expect(csvContent).toContain('""quotes""');
    });

    it('should include filename with survey slug and date', async () => {
      if (!testSurveyId || !sessionCookie) {
        console.log('Skipping - no test survey or session');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/responses/export`);

      if (response.status === 404) {
        console.log('Skipping - survey not found');
        return;
      }

      expect(response.ok).toBe(true);
      const disposition = response.headers.get('content-disposition');
      expect(disposition).toBeTruthy();

      // Filename should contain slug and date
      expect(disposition).toMatch(/response-test-survey-\d+-responses-\d{4}-\d{2}-\d{2}\.csv/);
    });

    it('should return 404 for non-existent survey', async () => {
      if (!sessionCookie) {
        console.log('Skipping - not authenticated');
        return;
      }

      const response = await authFetch('/api/surveys/non-existent-id-12345/responses/export');
      expect(response.status).toBe(404);
    });

    it('should handle empty response set', async () => {
      if (!sessionCookie) {
        console.log('Skipping - not authenticated');
        return;
      }

      // Create new survey with no responses
      const surveyResponse = await authFetch('/api/surveys', {
        method: 'POST',
        body: JSON.stringify({
          title: `Empty Survey ${Date.now()}`,
          theme: 'light',
        }),
      });

      if (!surveyResponse.ok) {
        console.log('Skipping - could not create survey');
        return;
      }

      const survey = await surveyResponse.json();

      // Export should still work with just headers
      const exportResponse = await authFetch(`/api/surveys/${survey.id}/responses/export`);
      expect(exportResponse.ok).toBe(true);

      const csvContent = await exportResponse.text();
      const lines = csvContent.split('\n').filter(l => l.trim());
      expect(lines.length).toBe(1); // Only header row

      // Cleanup
      await authFetch(`/api/surveys/${survey.id}`, { method: 'DELETE' });
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    if (testSurveyId && sessionCookie) {
      await authFetch(`/api/surveys/${testSurveyId}`, {
        method: 'DELETE',
      });
    }
  });
});

describe('Responses API Health Check', () => {
  it('should have server running', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/providers`);
    expect(response.ok).toBe(true);
  });
});
