/**
 * Custom Test Assertions
 * Reusable validation helpers for tests
 */

import type { Survey, Question, Response, QuestionType } from '@/lib/db/schema';

/**
 * Assert that an object is a valid Survey
 */
export function assertValidSurvey(survey: any): asserts survey is Survey {
  if (!survey || typeof survey !== 'object') {
    throw new Error('Survey must be an object');
  }

  if (typeof survey.id !== 'string' || !survey.id) {
    throw new Error(`Survey must have a valid id, got: ${survey.id}`);
  }

  if (typeof survey.title !== 'string' || survey.title.length === 0) {
    throw new Error(`Survey must have a non-empty title, got: ${survey.title}`);
  }

  if (typeof survey.slug !== 'string' || survey.slug.length === 0) {
    throw new Error(`Survey must have a valid slug, got: ${survey.slug}`);
  }

  const validStatuses = ['draft', 'published', 'closed'];
  if (!validStatuses.includes(survey.status)) {
    throw new Error(`Survey status must be one of ${validStatuses.join(', ')}, got: ${survey.status}`);
  }

  const validThemes = ['light', 'dark', 'minimal'];
  if (!validThemes.includes(survey.theme)) {
    throw new Error(`Survey theme must be one of ${validThemes.join(', ')}, got: ${survey.theme}`);
  }

  if (typeof survey.userId !== 'string' || !survey.userId) {
    throw new Error(`Survey must have a valid userId, got: ${survey.userId}`);
  }

  if (!(survey.createdAt instanceof Date) && typeof survey.createdAt !== 'string') {
    throw new Error(`Survey must have a valid createdAt timestamp`);
  }

  if (!(survey.updatedAt instanceof Date) && typeof survey.updatedAt !== 'string') {
    throw new Error(`Survey must have a valid updatedAt timestamp`);
  }
}

/**
 * Assert that an object is a valid Question
 */
export function assertValidQuestion(question: any): asserts question is Question {
  if (!question || typeof question !== 'object') {
    throw new Error('Question must be an object');
  }

  if (typeof question.id !== 'string' || !question.id) {
    throw new Error(`Question must have a valid id, got: ${question.id}`);
  }

  if (typeof question.surveyId !== 'string' || !question.surveyId) {
    throw new Error(`Question must have a valid surveyId, got: ${question.surveyId}`);
  }

  const validTypes: QuestionType[] = ['short_text', 'long_text', 'multiple_choice', 'yes_no', 'rating'];
  if (!validTypes.includes(question.type)) {
    throw new Error(`Question type must be one of ${validTypes.join(', ')}, got: ${question.type}`);
  }

  if (typeof question.title !== 'string' || question.title.length === 0) {
    throw new Error(`Question must have a non-empty title, got: ${question.title}`);
  }

  // Validate options for multiple_choice
  if (question.type === 'multiple_choice') {
    if (!Array.isArray(question.options) || question.options.length < 2) {
      throw new Error(`Multiple choice question must have at least 2 options, got: ${question.options}`);
    }
  }

  if (typeof question.required !== 'boolean') {
    throw new Error(`Question required field must be a boolean, got: ${question.required}`);
  }

  if (typeof question.order !== 'number') {
    throw new Error(`Question order must be a number, got: ${question.order}`);
  }

  if (!(question.createdAt instanceof Date) && typeof question.createdAt !== 'string') {
    throw new Error(`Question must have a valid createdAt timestamp`);
  }

  if (!(question.updatedAt instanceof Date) && typeof question.updatedAt !== 'string') {
    throw new Error(`Question must have a valid updatedAt timestamp`);
  }
}

/**
 * Assert that an object is a valid Response
 */
export function assertValidResponse(response: any): asserts response is Response {
  if (!response || typeof response !== 'object') {
    throw new Error('Response must be an object');
  }

  if (typeof response.id !== 'string' || !response.id) {
    throw new Error(`Response must have a valid id, got: ${response.id}`);
  }

  if (typeof response.surveyId !== 'string' || !response.surveyId) {
    throw new Error(`Response must have a valid surveyId, got: ${response.surveyId}`);
  }

  if (!response.answersJson || typeof response.answersJson !== 'object') {
    throw new Error(`Response must have valid answersJson object, got: ${response.answersJson}`);
  }

  if (!(response.completedAt instanceof Date) && typeof response.completedAt !== 'string') {
    throw new Error(`Response must have a valid completedAt timestamp`);
  }
}

/**
 * Assert that a response is an API error with expected status
 */
export function assertApiError(response: any, expectedStatus: number): void {
  if (!response) {
    throw new Error('Response must be provided');
  }

  // For Response objects
  if (response.status !== undefined) {
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
    }
    return;
  }

  // For parsed error objects
  if (response.error === undefined && response.message === undefined) {
    throw new Error('Response must have error or message field');
  }
}

/**
 * Assert that an answer is valid for a given question type
 */
export function assertValidAnswer(
  answer: string | string[] | number,
  questionType: QuestionType,
  options?: string[]
): void {
  switch (questionType) {
    case 'short_text':
    case 'long_text':
      if (typeof answer !== 'string') {
        throw new Error(`Text answer must be a string, got: ${typeof answer}`);
      }
      break;

    case 'multiple_choice':
      if (typeof answer !== 'string') {
        throw new Error(`Multiple choice answer must be a string, got: ${typeof answer}`);
      }
      if (options && !options.includes(answer)) {
        throw new Error(`Answer "${answer}" is not in available options: ${options.join(', ')}`);
      }
      break;

    case 'yes_no':
      if (typeof answer !== 'string') {
        throw new Error(`Yes/No answer must be a string, got: ${typeof answer}`);
      }
      if (!['Yes', 'No'].includes(answer)) {
        throw new Error(`Yes/No answer must be "Yes" or "No", got: ${answer}`);
      }
      break;

    case 'rating':
      if (typeof answer !== 'number') {
        throw new Error(`Rating answer must be a number, got: ${typeof answer}`);
      }
      if (answer < 1 || answer > 5) {
        throw new Error(`Rating must be between 1 and 5, got: ${answer}`);
      }
      break;

    default:
      throw new Error(`Unknown question type: ${questionType}`);
  }
}

/**
 * Assert that all required questions are answered in a response
 */
export function assertAllRequiredAnswered(
  questions: Question[],
  answers: Record<string, string | string[] | number>
): void {
  const requiredQuestions = questions.filter(q => q.required);

  for (const question of requiredQuestions) {
    if (!(question.id in answers)) {
      throw new Error(`Required question "${question.title}" (${question.id}) is not answered`);
    }

    const answer = answers[question.id];
    if (answer === null || answer === undefined || answer === '') {
      throw new Error(`Required question "${question.title}" (${question.id}) has empty answer`);
    }
  }
}

/**
 * Assert that a UUID string is valid
 */
export function assertValidUuid(uuid: string, fieldName: string = 'UUID'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new Error(`${fieldName} must be a valid UUID, got: ${uuid}`);
  }
}

/**
 * Assert that a slug is valid (lowercase, alphanumeric with hyphens)
 */
export function assertValidSlug(slug: string): void {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    throw new Error(`Slug must be lowercase alphanumeric with hyphens, got: ${slug}`);
  }
}
