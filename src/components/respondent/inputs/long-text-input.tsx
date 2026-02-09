"use client";

import { Textarea } from "@/components/ui/textarea";
import { getLabels, type SurveyLanguage } from "@/lib/i18n/respondent-labels";

interface LongTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  language?: SurveyLanguage;
}

export function LongTextInput({ value, onChange, placeholder, language = "en" }: LongTextInputProps) {
  const labels = getLabels(language);

  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || labels.placeholderLong}
      maxLength={2000}
      rows={5}
      className="survey-input text-lg resize-none"
      aria-label={placeholder || labels.placeholderLong}
    />
  );
}
