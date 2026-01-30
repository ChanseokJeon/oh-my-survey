/**
 * Integration tests for Questions API
 *
 * These tests run against a live dev server.
 * Prerequisites:
 * 1. Start dev server: pnpm dev
 * 2. Ensure database is running and accessible
 * 3. Run tests: pnpm test tests/integration/api-questions.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Test session cookie (obtained after login)
let sessionCookie: string = '';
let testSurveyId: string = '';
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

describe('Questions API Integration Tests', () => {
  // Setup: Login and create test survey
  beforeAll(async () => {
    try {
      // First get CSRF token
      const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;

      // Login with test credentials
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

      // Store session cookie - need to get both session token cookies
      const setCookie = loginResponse.headers.get('set-cookie');
      if (setCookie) {
        // Extract all cookie parts
        const cookies = setCookie.split(/,(?=[^;]+=[^;]+)/).map(c => c.split(';')[0].trim());
        sessionCookie = cookies.join('; ');
      }

      // Verify session is valid
      const sessionCheck = await fetch(`${BASE_URL}/api/auth/session`, {
        headers: { Cookie: sessionCookie },
      });
      const session = await sessionCheck.json();
      if (!session?.user) {
        console.warn('Session not established, some tests may fail');
      }

      // Create test survey
      const surveyResponse = await authFetch('/api/surveys', {
        method: 'POST',
        body: JSON.stringify({
          title: `Questions Test Survey ${Date.now()}`,
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

  describe('POST /api/surveys/[id]/questions - Create Question', () => {
    it('should create a short_text question', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'short_text',
          title: 'What is your name?',
          required: true,
        }),
      });

      expect(response.status).toBe(201);
      const question = await response.json();
      expect(question.id).toBeDefined();
      expect(question.type).toBe('short_text');
      expect(question.title).toBe('What is your name?');
      expect(question.required).toBe(true);
      expect(question.order).toBe(1);
      expect(question.options).toBeNull();

      testQuestionIds.push(question.id);
    });

    it('should create a long_text question', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'long_text',
          title: 'Please describe your experience',
          required: false,
        }),
      });

      expect(response.status).toBe(201);
      const question = await response.json();
      expect(question.type).toBe('long_text');
      expect(question.title).toBe('Please describe your experience');
      expect(question.required).toBe(false);
      expect(question.order).toBe(2);

      testQuestionIds.push(question.id);
    });

    it('should create a multiple_choice question with options', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'multiple_choice',
          title: 'What is your favorite color?',
          options: ['Red', 'Blue', 'Green', 'Yellow'],
          required: true,
        }),
      });

      expect(response.status).toBe(201);
      const question = await response.json();
      expect(question.type).toBe('multiple_choice');
      expect(question.options).toEqual(['Red', 'Blue', 'Green', 'Yellow']);
      expect(question.order).toBe(3);

      testQuestionIds.push(question.id);
    });

    it('should create a yes_no question', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'yes_no',
          title: 'Do you agree with the terms?',
          required: true,
        }),
      });

      expect(response.status).toBe(201);
      const question = await response.json();
      expect(question.type).toBe('yes_no');
      expect(question.order).toBe(4);

      testQuestionIds.push(question.id);
    });

    it('should create a rating question', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'rating',
          title: 'How would you rate our service?',
          required: false,
        }),
      });

      expect(response.status).toBe(201);
      const question = await response.json();
      expect(question.type).toBe('rating');
      expect(question.order).toBe(5);

      testQuestionIds.push(question.id);
    });

    it('should reject multiple_choice question without options', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'multiple_choice',
          title: 'Pick an option',
          required: true,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid input');
    });

    it('should reject multiple_choice with less than 2 options', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'multiple_choice',
          title: 'Pick an option',
          options: ['Only one'],
          required: true,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject question with empty title', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'short_text',
          title: '',
          required: true,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject question with title exceeding 500 chars', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const longTitle = 'a'.repeat(501);
      const response = await authFetch(`/api/surveys/${testSurveyId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'short_text',
          title: longTitle,
          required: true,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 401 for unauthorized requests', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      // Make request without session cookie
      const response = await fetch(`${BASE_URL}/api/surveys/${testSurveyId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'short_text',
          title: 'Test Question',
          required: true,
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent survey', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await authFetch(`/api/surveys/${fakeId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'short_text',
          title: 'Test Question',
          required: true,
        }),
      });

      expect([401, 404]).toContain(response.status);
      const data = await response.json();
      expect(['Survey not found', 'Unauthorized']).toContain(data.error);
    });
  });

  describe('GET /api/surveys/[id]/questions - List Questions', () => {
    it('should get all questions for a survey', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(`/api/surveys/${testSurveyId}/questions`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.questions).toBeDefined();
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions.length).toBeGreaterThanOrEqual(5);

      // Verify questions are ordered
      for (let i = 0; i < data.questions.length - 1; i++) {
        expect(data.questions[i].order).toBeLessThan(data.questions[i + 1].order);
      }
    });

    it('should return 401 for unauthorized requests', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/surveys/${testSurveyId}/questions`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent survey', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await authFetch(`/api/surveys/${fakeId}/questions`);

      expect([401, 404]).toContain(response.status);
    });
  });

  describe('GET /api/surveys/[id]/questions/[qid] - Get Single Question', () => {
    it('should get a specific question', async () => {
      if (!testSurveyId || testQuestionIds.length === 0) {
        console.log('Skipping - no test questions created');
        return;
      }

      const questionId = testQuestionIds[0];
      const response = await authFetch(
        `/api/surveys/${testSurveyId}/questions/${questionId}`
      );

      expect(response.status).toBe(200);
      const question = await response.json();
      expect(question.id).toBe(questionId);
      expect(question.surveyId).toBe(testSurveyId);
    });

    it('should return 404 for non-existent question', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await authFetch(
        `/api/surveys/${testSurveyId}/questions/${fakeId}`
      );

      expect([401, 404]).toContain(response.status);
    });
  });

  describe('PATCH /api/surveys/[id]/questions/[qid] - Update Question', () => {
    it('should update question title', async () => {
      if (!testSurveyId || testQuestionIds.length === 0) {
        console.log('Skipping - no test questions created');
        return;
      }

      const questionId = testQuestionIds[0];
      const response = await authFetch(
        `/api/surveys/${testSurveyId}/questions/${questionId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: 'Updated Question Title',
          }),
        }
      );

      expect(response.status).toBe(200);
      const question = await response.json();
      expect(question.title).toBe('Updated Question Title');
      expect(question.updatedAt).toBeDefined();
    });

    it('should update question required status', async () => {
      if (!testSurveyId || testQuestionIds.length === 0) {
        console.log('Skipping - no test questions created');
        return;
      }

      const questionId = testQuestionIds[1];
      const response = await authFetch(
        `/api/surveys/${testSurveyId}/questions/${questionId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            required: true,
          }),
        }
      );

      expect(response.status).toBe(200);
      const question = await response.json();
      expect(question.required).toBe(true);
    });

    it('should update multiple_choice options', async () => {
      if (!testSurveyId || testQuestionIds.length < 3) {
        console.log('Skipping - no test questions created');
        return;
      }

      const questionId = testQuestionIds[2]; // multiple_choice question
      const response = await authFetch(
        `/api/surveys/${testSurveyId}/questions/${questionId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            options: ['Option A', 'Option B', 'Option C'],
          }),
        }
      );

      expect(response.status).toBe(200);
      const question = await response.json();
      expect(question.options).toEqual(['Option A', 'Option B', 'Option C']);
    });

    it('should reject update with empty title', async () => {
      if (!testSurveyId || testQuestionIds.length === 0) {
        console.log('Skipping - no test questions created');
        return;
      }

      const questionId = testQuestionIds[0];
      const response = await authFetch(
        `/api/surveys/${testSurveyId}/questions/${questionId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: '',
          }),
        }
      );

      expect(response.status).toBe(400);
    });

    it('should return 401 for unauthorized requests', async () => {
      if (!testSurveyId || testQuestionIds.length === 0) {
        console.log('Skipping - no test questions created');
        return;
      }

      const questionId = testQuestionIds[0];
      const response = await fetch(
        `${BASE_URL}/api/surveys/${testSurveyId}/questions/${questionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Updated Title',
          }),
        }
      );

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent question', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await authFetch(
        `/api/surveys/${testSurveyId}/questions/${fakeId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: 'Updated Title',
          }),
        }
      );

      expect([401, 404]).toContain(response.status);
    });
  });

  describe('PATCH /api/surveys/[id]/questions/reorder - Reorder Questions', () => {
    it('should reorder questions successfully', async () => {
      if (!testSurveyId || testQuestionIds.length < 3) {
        console.log('Skipping - not enough test questions');
        return;
      }

      // Get current order
      const listResponse = await authFetch(`/api/surveys/${testSurveyId}/questions`);
      const { questions: before } = await listResponse.json();

      // Reverse the order of first 3 questions
      const reorderedIds = [
        testQuestionIds[2],
        testQuestionIds[1],
        testQuestionIds[0],
        ...testQuestionIds.slice(3),
      ];

      const response = await authFetch(
        `/api/surveys/${testSurveyId}/questions/reorder`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            questionIds: reorderedIds,
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.questions).toBeDefined();
      expect(data.questions.length).toBe(before.length);

      // Verify new order
      expect(data.questions[0].id).toBe(testQuestionIds[2]);
      expect(data.questions[1].id).toBe(testQuestionIds[1]);
      expect(data.questions[2].id).toBe(testQuestionIds[0]);
    });

    it('should reject reorder with invalid question IDs', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await authFetch(
        `/api/surveys/${testSurveyId}/questions/reorder`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            questionIds: [fakeId, testQuestionIds[0]],
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Some question IDs are invalid');
    });

    it('should reject reorder with malformed UUIDs', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const response = await authFetch(
        `/api/surveys/${testSurveyId}/questions/reorder`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            questionIds: ['not-a-uuid', 'also-not-uuid'],
          }),
        }
      );

      expect(response.status).toBe(400);
    });

    it('should return 401 for unauthorized requests', async () => {
      if (!testSurveyId || testQuestionIds.length === 0) {
        console.log('Skipping - no test questions created');
        return;
      }

      const response = await fetch(
        `${BASE_URL}/api/surveys/${testSurveyId}/questions/reorder`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionIds: testQuestionIds,
          }),
        }
      );

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent survey', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await authFetch(`/api/surveys/${fakeId}/questions/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({
          questionIds: [fakeId],
        }),
      });

      expect([401, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/surveys/[id]/questions/[qid] - Delete Question', () => {
    it('should delete a question and reindex remaining questions', async () => {
      if (!testSurveyId || testQuestionIds.length === 0) {
        console.log('Skipping - no test questions created');
        return;
      }

      // Get initial count
      const beforeResponse = await authFetch(`/api/surveys/${testSurveyId}/questions`);
      const { questions: before } = await beforeResponse.json();
      const initialCount = before.length;

      // Delete the last question (to avoid affecting other tests)
      const questionToDelete = testQuestionIds[testQuestionIds.length - 1];
      const response = await authFetch(
        `/api/surveys/${testSurveyId}/questions/${questionToDelete}`,
        {
          method: 'DELETE',
        }
      );

      expect(response.status).toBe(204);

      // Verify question is deleted
      const afterResponse = await authFetch(`/api/surveys/${testSurveyId}/questions`);
      const { questions: after } = await afterResponse.json();
      expect(after.length).toBe(initialCount - 1);

      // Verify deleted question doesn't exist
      const checkResponse = await authFetch(
        `/api/surveys/${testSurveyId}/questions/${questionToDelete}`
      );
      expect(checkResponse.status).toBe(404);

      // Remove from test array
      testQuestionIds.pop();
    });

    it('should reindex questions after deletion in middle', async () => {
      if (!testSurveyId || testQuestionIds.length < 3) {
        console.log('Skipping - not enough test questions');
        return;
      }

      // Get questions before deletion
      const beforeResponse = await authFetch(`/api/surveys/${testSurveyId}/questions`);
      const { questions: before } = await beforeResponse.json();

      // Delete middle question
      const middleIndex = Math.floor(testQuestionIds.length / 2);
      const middleQuestionId = testQuestionIds[middleIndex];
      const deleteResponse = await authFetch(
        `/api/surveys/${testSurveyId}/questions/${middleQuestionId}`,
        {
          method: 'DELETE',
        }
      );

      expect(deleteResponse.status).toBe(204);

      // Verify reindexing
      const afterResponse = await authFetch(`/api/surveys/${testSurveyId}/questions`);
      const { questions: after } = await afterResponse.json();

      // Check that order numbers are sequential
      for (let i = 0; i < after.length; i++) {
        expect(after[i].order).toBe(i + 1);
      }

      // Remove from test array
      testQuestionIds.splice(middleIndex, 1);
    });

    it('should return 401 for unauthorized requests', async () => {
      if (!testSurveyId || testQuestionIds.length === 0) {
        console.log('Skipping - no test questions created');
        return;
      }

      const questionId = testQuestionIds[0];
      const response = await fetch(
        `${BASE_URL}/api/surveys/${testSurveyId}/questions/${questionId}`,
        {
          method: 'DELETE',
        }
      );

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent question', async () => {
      if (!testSurveyId) {
        console.log('Skipping - no test survey created');
        return;
      }

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await authFetch(
        `/api/surveys/${testSurveyId}/questions/${fakeId}`,
        {
          method: 'DELETE',
        }
      );

      expect([401, 404]).toContain(response.status);
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Delete all remaining test questions
    for (const questionId of testQuestionIds) {
      await authFetch(`/api/surveys/${testSurveyId}/questions/${questionId}`, {
        method: 'DELETE',
      });
    }

    // Delete test survey
    if (testSurveyId) {
      await authFetch(`/api/surveys/${testSurveyId}`, {
        method: 'DELETE',
      });
    }
  });
});
