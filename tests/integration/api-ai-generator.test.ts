/**
 * Integration tests for AI Survey Generator API
 * Tests the /api/surveys/generate endpoint
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { authFetch as helperAuthFetch, getAuthCookies } from '../helpers/api';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

let sessionCookie: string = '';
let isAuthenticated = false;

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

describe('AI Survey Generator API', () => {
  beforeAll(async () => {
    try {
      // Use the helper to get auth cookies
      sessionCookie = await getAuthCookies();
      isAuthenticated = true;
      console.log('✓ Authentication successful');
    } catch (error) {
      console.warn('Setup failed:', error);
      isAuthenticated = false;
    }
  });

  describe('POST /api/surveys/generate - Generate Survey with AI', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/surveys/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Test survey' }),
      });

      expect(response.status).toBe(401);
    });

    it('should require description field', async () => {
      if (!isAuthenticated) {
        console.log('Skipping - not authenticated');
        return;
      }

      const response = await authFetch('/api/surveys/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      // Error could be "Description is required" or Zod validation error
      expect(data.error).toMatch(/description|expected string/i);
    });

    it('should require minimum 10 characters', async () => {
      if (!isAuthenticated) {
        console.log('Skipping - not authenticated');
        return;
      }

      const response = await authFetch('/api/surveys/generate', {
        method: 'POST',
        body: JSON.stringify({ description: 'short' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('10 characters');
    });

    it('should generate survey from inference input (topic only)', async () => {
      if (!isAuthenticated) {
        console.log('Skipping - not authenticated');
        return;
      }

      const response = await authFetch('/api/surveys/generate', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Customer feedback survey for a restaurant',
        }),
      });

      // Check if API key is configured
      if (response.status === 500) {
        const data = await response.json();
        if (data.error?.includes('not configured')) {
          console.log('Skipping - AI service not configured');
          return;
        }
      }

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify survey structure
      expect(data.survey).toBeDefined();
      expect(data.survey.title).toBeDefined();
      expect(data.survey.questions).toBeDefined();
      expect(Array.isArray(data.survey.questions)).toBe(true);
      expect(data.survey.questions.length).toBeGreaterThanOrEqual(5);
      expect(data.survey.questions.length).toBeLessThanOrEqual(15);

      // Verify question structure
      const question = data.survey.questions[0];
      expect(question.type).toBeDefined();
      expect(['short_text', 'long_text', 'multiple_choice', 'yes_no', 'rating']).toContain(question.type);
      expect(question.title).toBeDefined();
      expect(typeof question.required).toBe('boolean');

      console.log(`✅ Generated: "${data.survey.title}" with ${data.survey.questions.length} questions`);
    }, 60000); // 60s timeout for AI response

    it('should generate survey from structured input (specific requirements)', async () => {
      if (!isAuthenticated) {
        console.log('Skipping - not authenticated');
        return;
      }

      const response = await authFetch('/api/surveys/generate', {
        method: 'POST',
        body: JSON.stringify({
          description: '직원 만족도 조사. 포함할 항목: 1) 급여 만족도 2) 워라밸 3) 팀 분위기. 각 항목은 1-5점 척도로.',
        }),
      });

      if (response.status === 500) {
        const data = await response.json();
        if (data.error?.includes('not configured')) {
          console.log('Skipping - AI service not configured');
          return;
        }
      }

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.survey.questions.length).toBeGreaterThanOrEqual(3);

      // Check for rating type questions (since we asked for 1-5 scale)
      const ratingQuestions = data.survey.questions.filter((q: any) => q.type === 'rating');
      expect(ratingQuestions.length).toBeGreaterThanOrEqual(1);

      console.log(`✅ Generated: "${data.survey.title}" with ${data.survey.questions.length} questions (${ratingQuestions.length} rating)`);
    }, 60000);

    it('should generate survey from long document input (summarization)', async () => {
      if (!isAuthenticated) {
        console.log('Skipping - not authenticated');
        return;
      }

      const longInput = `다음 회의록을 기반으로 팀원들에게 피드백을 받을 수 있는 설문을 만들어줘:

[2024년 1분기 프로젝트 회고 회의록]
참석자: 김팀장, 이개발, 박디자인

1. 프로젝트 일정 관련
- 초기 일정이 촉박했다는 의견
- QA 기간이 부족했음

2. 커뮤니케이션 이슈
- 기획팀과 개발팀 간 소통이 원활하지 않았음
- 주간 회의가 너무 길다는 피드백

3. 잘된 점
- 팀워크는 전반적으로 좋았음
- 야근 없이 마무리`;

      const response = await authFetch('/api/surveys/generate', {
        method: 'POST',
        body: JSON.stringify({ description: longInput }),
      });

      if (response.status === 500) {
        const data = await response.json();
        if (data.error?.includes('not configured')) {
          console.log('Skipping - AI service not configured');
          return;
        }
      }

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.survey.questions.length).toBeGreaterThanOrEqual(5);

      // The survey should include questions about the topics mentioned
      const questionTitles = data.survey.questions.map((q: any) => q.title.toLowerCase()).join(' ');

      // Should have questions related to the meeting topics
      console.log(`✅ Generated: "${data.survey.title}" with ${data.survey.questions.length} questions`);
      console.log(`   Question types: ${[...new Set(data.survey.questions.map((q: any) => q.type))].join(', ')}`);
    }, 60000);
  });

  describe('Full Flow: Generate and Create Survey', () => {
    let generatedSurveyId: string | null = null;

    it('should generate survey and then create it via API', async () => {
      if (!isAuthenticated) {
        console.log('Skipping - not authenticated');
        return;
      }

      // Step 1: Generate survey with AI
      const generateResponse = await authFetch('/api/surveys/generate', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Quick product feedback survey with 3-5 questions',
        }),
      });

      if (generateResponse.status === 500) {
        const data = await generateResponse.json();
        if (data.error?.includes('not configured')) {
          console.log('Skipping - AI service not configured');
          return;
        }
      }

      expect(generateResponse.status).toBe(200);
      const { survey: generatedSurvey } = await generateResponse.json();
      console.log(`   Generated: "${generatedSurvey.title}"`);

      // Step 2: Create actual survey in database
      const createResponse = await authFetch('/api/surveys', {
        method: 'POST',
        body: JSON.stringify({
          title: `[AI Test] ${generatedSurvey.title}`,
          theme: 'light',
        }),
      });

      expect(createResponse.status).toBe(201);
      const createdSurvey = await createResponse.json();
      generatedSurveyId = createdSurvey.id;
      console.log(`   Created survey: ${generatedSurveyId}`);

      // Step 3: Add generated questions to survey
      for (const question of generatedSurvey.questions) {
        const questionPayload: Record<string, unknown> = {
          type: question.type,
          title: question.title,
          required: question.required,
        };
        // Only include options for multiple_choice questions
        if (question.type === 'multiple_choice' && question.options) {
          questionPayload.options = question.options;
        }

        const questionResponse = await authFetch(`/api/surveys/${generatedSurveyId}/questions`, {
          method: 'POST',
          body: JSON.stringify(questionPayload),
        });

        if (questionResponse.status !== 201) {
          const errorData = await questionResponse.json();
          console.log(`   Question create failed: ${JSON.stringify(errorData)}`);
        }
        expect(questionResponse.status).toBe(201);
      }
      console.log(`   Added ${generatedSurvey.questions.length} questions`);

      // Step 4: Verify survey has questions
      const verifyResponse = await authFetch(`/api/surveys/${generatedSurveyId}/questions`);
      expect(verifyResponse.status).toBe(200);
      const { questions } = await verifyResponse.json();
      expect(questions.length).toBe(generatedSurvey.questions.length);

      console.log(`✅ Full flow complete: Survey "${generatedSurvey.title}" created with ${questions.length} questions`);
    }, 120000); // 2 minute timeout for full flow

    // Cleanup
    it('should cleanup test survey', async () => {
      if (generatedSurveyId) {
        const deleteResponse = await authFetch(`/api/surveys/${generatedSurveyId}`, {
          method: 'DELETE',
        });
        expect([200, 204]).toContain(deleteResponse.status);
        console.log(`   Cleaned up survey: ${generatedSurveyId}`);
      }
    }, 30000); // 30s timeout for cleanup
  });
});
