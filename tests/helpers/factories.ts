import type {
  Survey,
  NewSurvey,
  Question,
  NewQuestion,
  Response,
  NewResponse,
  QuestionType,
  SurveyStatus,
  SurveyTheme
} from '@/lib/db/schema';

/**
 * Generate a unique slug for testing
 */
function generateTestSlug(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Create test survey data
 */
export function createTestSurveyData(overrides?: Partial<NewSurvey>): NewSurvey {
  const now = new Date();

  return {
    title: `Test Survey ${Date.now()}`,
    slug: generateTestSlug('survey'),
    userId: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
    status: 'draft' as SurveyStatus,
    theme: 'light' as SurveyTheme,
    logoBase64: null,
    sheetsConfig: null,
    ...overrides,
  };
}

/**
 * Create complete survey with all fields (for select operations)
 */
export function createTestSurvey(overrides?: Partial<Survey>): Survey {
  const now = new Date();

  return {
    id: '00000000-0000-0000-0000-000000000001',
    title: `Test Survey ${Date.now()}`,
    slug: generateTestSlug('survey'),
    userId: '00000000-0000-0000-0000-000000000000',
    status: 'draft' as SurveyStatus,
    theme: 'light' as SurveyTheme,
    logoBase64: null,
    sheetsConfig: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create test question data based on type
 */
export function createTestQuestionData(
  type: QuestionType,
  overrides?: Partial<NewQuestion>
): NewQuestion {
  const baseQuestion: NewQuestion = {
    surveyId: '00000000-0000-0000-0000-000000000001',
    type,
    title: `Test ${type} Question ${Date.now()}`,
    options: null,
    required: false,
    order: 0,
    ...overrides,
  };

  // Add options for multiple_choice
  if (type === 'multiple_choice' && !overrides?.options) {
    baseQuestion.options = ['Option 1', 'Option 2', 'Option 3'];
  }

  return baseQuestion;
}

/**
 * Create complete question with all fields (for select operations)
 */
export function createTestQuestion(
  type: QuestionType,
  overrides?: Partial<Question>
): Question {
  const now = new Date();

  const baseQuestion: Question = {
    id: '00000000-0000-0000-0000-000000000002',
    surveyId: '00000000-0000-0000-0000-000000000001',
    type,
    title: `Test ${type} Question ${Date.now()}`,
    options: null,
    required: false,
    order: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };

  // Add options for multiple_choice
  if (type === 'multiple_choice' && !overrides?.options) {
    baseQuestion.options = ['Option 1', 'Option 2', 'Option 3'];
  }

  return baseQuestion;
}

/**
 * Create test response data for given questions
 */
export function createTestResponseData(
  questions: Question[],
  overrides?: Partial<NewResponse>
): NewResponse {
  const answers: Record<string, string | string[] | number> = {};

  // Generate appropriate answers based on question types
  questions.forEach((question) => {
    switch (question.type) {
      case 'short_text':
        answers[question.id] = 'Short answer text';
        break;
      case 'long_text':
        answers[question.id] = 'This is a longer answer text that would be provided by a user filling out the survey.';
        break;
      case 'multiple_choice':
        if (question.options && question.options.length > 0) {
          answers[question.id] = question.options[0]; // Select first option
        }
        break;
      case 'yes_no':
        answers[question.id] = 'Yes';
        break;
      case 'rating':
        answers[question.id] = 4; // Rating 1-5
        break;
    }
  });

  return {
    surveyId: questions[0]?.surveyId || '00000000-0000-0000-0000-000000000001',
    answersJson: answers,
    ipAddress: '127.0.0.1',
    ...overrides,
  };
}

/**
 * Create complete response with all fields (for select operations)
 */
export function createTestResponse(
  questions: Question[],
  overrides?: Partial<Response>
): Response {
  const responseData = createTestResponseData(questions, overrides);

  return {
    id: '00000000-0000-0000-0000-000000000003',
    completedAt: new Date(),
    ipAddress: '127.0.0.1',
    ...responseData,
    ...overrides,
  };
}

/**
 * Create a set of test questions with various types
 */
export function createTestQuestionSet(surveyId: string): NewQuestion[] {
  return [
    createTestQuestionData('short_text', { surveyId, order: 0, title: 'What is your name?' }),
    createTestQuestionData('long_text', { surveyId, order: 1, title: 'Tell us about yourself' }),
    createTestQuestionData('multiple_choice', {
      surveyId,
      order: 2,
      title: 'What is your favorite color?',
      options: ['Red', 'Blue', 'Green', 'Yellow']
    }),
    createTestQuestionData('yes_no', { surveyId, order: 3, title: 'Do you agree?' }),
    createTestQuestionData('rating', { surveyId, order: 4, title: 'Rate your experience' }),
  ];
}
