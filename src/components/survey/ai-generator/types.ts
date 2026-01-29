import type { GeneratedSurvey, GeneratedQuestion } from "@/lib/ai/survey-generator";

export type { GeneratedSurvey, GeneratedQuestion };

export interface AIGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSurveyGenerated: (survey: { id: string; title: string }) => void;
}

export type Step = "input" | "preview";

export interface EditableQuestion extends GeneratedQuestion {
  id: string; // temporary ID for React key
}

export interface EditableSurvey {
  title: string;
  questions: EditableQuestion[];
}
