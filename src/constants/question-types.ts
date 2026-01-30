import {
  Type,
  AlignLeft,
  List,
  ThumbsUp,
  Star,
  LucideIcon,
} from "lucide-react";
import { QuestionType } from "@/types/question";

export interface QuestionTypeInfo {
  type: QuestionType;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export const QUESTION_TYPES: QuestionTypeInfo[] = [
  {
    type: "short_text",
    label: "Short Text",
    description: "Single line text input",
    icon: Type,
    color: "text-blue-600",
  },
  {
    type: "long_text",
    label: "Long Text",
    description: "Multi-line text input",
    icon: AlignLeft,
    color: "text-purple-600",
  },
  {
    type: "multiple_choice",
    label: "Multiple Choice",
    description: "Select one option from a list",
    icon: List,
    color: "text-green-600",
  },
  {
    type: "yes_no",
    label: "Yes / No",
    description: "Simple yes or no question",
    icon: ThumbsUp,
    color: "text-amber-600",
  },
  {
    type: "rating",
    label: "Rating",
    description: "1-5 star rating",
    icon: Star,
    color: "text-pink-600",
  },
];

// Helper functions
export function getQuestionTypeInfo(type: QuestionType): QuestionTypeInfo | undefined {
  return QUESTION_TYPES.find((qt) => qt.type === type);
}

export function getQuestionTypeLabel(type: QuestionType): string {
  return getQuestionTypeInfo(type)?.label || type;
}

export function getQuestionTypeIcon(type: QuestionType): LucideIcon {
  return getQuestionTypeInfo(type)?.icon || Type;
}

export function getQuestionTypeColor(type: QuestionType): string {
  return getQuestionTypeInfo(type)?.color || "text-gray-600";
}
