"use client";

import { Textarea } from "@/components/ui/textarea";

interface LongTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LongTextInput({ value, onChange, placeholder }: LongTextInputProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Type your answer..."}
      maxLength={2000}
      rows={5}
      className="survey-input text-lg resize-none"
    />
  );
}
