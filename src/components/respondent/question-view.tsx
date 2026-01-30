"use client";

import { ShortTextInput } from "./inputs/short-text-input";
import { LongTextInput } from "./inputs/long-text-input";
import { MultipleChoiceInput } from "./inputs/multiple-choice-input";
import { YesNoInput } from "./inputs/yes-no-input";
import { RatingInput } from "./inputs/rating-input";
import { Badge } from "@/components/ui/badge";
import { Question } from "@/types/question";

interface QuestionViewProps {
  question: Question;
  value: string | number;
  onChange: (value: string | number) => void;
  isAnimating?: boolean;
}

export function QuestionView({
  question,
  value,
  onChange,
  isAnimating,
}: QuestionViewProps) {
  const renderInput = () => {
    switch (question.type) {
      case "short_text":
        return (
          <ShortTextInput
            value={value as string}
            onChange={onChange}
          />
        );
      case "long_text":
        return (
          <LongTextInput
            value={value as string}
            onChange={onChange}
          />
        );
      case "multiple_choice":
        return (
          <MultipleChoiceInput
            value={value as string}
            onChange={onChange}
            options={question.options || []}
          />
        );
      case "yes_no":
        return (
          <YesNoInput
            value={value as string}
            onChange={onChange}
          />
        );
      case "rating":
        return (
          <RatingInput
            value={value as number}
            onChange={onChange}
          />
        );
    }
  };

  return (
    <div
      className={`space-y-8 transition-all duration-300 ease-out ${
        isAnimating
          ? "opacity-0 translate-y-4"
          : "opacity-100 translate-y-0"
      }`}
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">
          {question.title}
          {question.required && (
            <span className="text-destructive ml-1">*</span>
          )}
        </h2>
        {question.required && (
          <Badge variant="outline" className="text-xs">Required</Badge>
        )}
      </div>
      {renderInput()}
    </div>
  );
}
