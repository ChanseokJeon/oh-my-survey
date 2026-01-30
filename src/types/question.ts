export type QuestionType = "short_text" | "long_text" | "multiple_choice" | "yes_no" | "rating";

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  options: string[] | null;
  required: boolean;
  order: number;
}

// For API responses where surveyId might be included
export interface QuestionWithSurvey extends Question {
  surveyId: string;
}
