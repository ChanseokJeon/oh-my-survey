import { describe, it, expect } from 'vitest';
import { createSurveySchema, updateSurveySchema } from '@/lib/validations/survey';
import { createQuestionSchema, reorderQuestionsSchema } from '@/lib/validations/question';
import { submitResponseSchema } from '@/lib/validations/response';

describe('Survey Validations', () => {
  describe('createSurveySchema', () => {
    it('should accept valid survey data', () => {
      const result = createSurveySchema.safeParse({
        title: 'Test Survey',
        theme: 'light',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const result = createSurveySchema.safeParse({
        title: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject title over 200 characters', () => {
      const result = createSurveySchema.safeParse({
        title: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('should default theme to light', () => {
      const result = createSurveySchema.safeParse({
        title: 'Test',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.theme).toBe('light');
      }
    });

    it('should reject invalid theme', () => {
      const result = createSurveySchema.safeParse({
        title: 'Test',
        theme: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateSurveySchema', () => {
    it('should accept partial updates', () => {
      const result = updateSurveySchema.safeParse({
        title: 'New Title',
      });
      expect(result.success).toBe(true);
    });

    it('should accept null logoBase64', () => {
      const result = updateSurveySchema.safeParse({
        logoBase64: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid sheetsConfig', () => {
      const result = updateSurveySchema.safeParse({
        sheetsConfig: {
          spreadsheetId: 'abc123',
          sheetName: 'Responses',
        },
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Question Validations', () => {
  describe('createQuestionSchema', () => {
    it('should accept short_text question', () => {
      const result = createQuestionSchema.safeParse({
        type: 'short_text',
        title: 'What is your name?',
        required: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept multiple_choice with options', () => {
      const result = createQuestionSchema.safeParse({
        type: 'multiple_choice',
        title: 'Choose one',
        options: ['A', 'B', 'C'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject multiple_choice without options', () => {
      const result = createQuestionSchema.safeParse({
        type: 'multiple_choice',
        title: 'Choose one',
      });
      expect(result.success).toBe(false);
    });

    it('should reject multiple_choice with less than 2 options', () => {
      const result = createQuestionSchema.safeParse({
        type: 'multiple_choice',
        title: 'Choose one',
        options: ['Only one'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject multiple_choice with more than 10 options', () => {
      const result = createQuestionSchema.safeParse({
        type: 'multiple_choice',
        title: 'Choose one',
        options: Array(11).fill('Option'),
      });
      expect(result.success).toBe(false);
    });

    it('should accept rating question', () => {
      const result = createQuestionSchema.safeParse({
        type: 'rating',
        title: 'Rate our service',
      });
      expect(result.success).toBe(true);
    });

    it('should accept yes_no question', () => {
      const result = createQuestionSchema.safeParse({
        type: 'yes_no',
        title: 'Do you agree?',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('reorderQuestionsSchema', () => {
    it('should accept array of UUIDs', () => {
      const result = reorderQuestionsSchema.safeParse({
        questionIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-UUID strings', () => {
      const result = reorderQuestionsSchema.safeParse({
        questionIds: ['not-a-uuid'],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Response Validations', () => {
  describe('submitResponseSchema', () => {
    it('should accept string answers', () => {
      const result = submitResponseSchema.safeParse({
        answers: {
          'q1': 'text answer',
          'q2': 'yes',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept number answers (rating)', () => {
      const result = submitResponseSchema.safeParse({
        answers: {
          'q1': 3,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject rating outside 1-5', () => {
      const result = submitResponseSchema.safeParse({
        answers: {
          'q1': 6,
        },
      });
      expect(result.success).toBe(false);
    });

    it('should accept array answers', () => {
      const result = submitResponseSchema.safeParse({
        answers: {
          'q1': ['option1', 'option2'],
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
