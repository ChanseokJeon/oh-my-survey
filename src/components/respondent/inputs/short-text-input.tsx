"use client";

import { Input } from "@/components/ui/input";
import { getLabels, type SurveyLanguage } from "@/lib/i18n/respondent-labels";

interface ShortTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  language?: SurveyLanguage;
}

export function ShortTextInput({ value, onChange, placeholder, language = "en" }: ShortTextInputProps) {
  const labels = getLabels(language);

  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || labels.placeholder}
      maxLength={255}
      className="survey-input text-lg py-6"
    />
  );
}
