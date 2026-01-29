"use client";

import { Input } from "@/components/ui/input";

interface ShortTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ShortTextInput({ value, onChange, placeholder }: ShortTextInputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Type your answer..."}
      maxLength={255}
      className="survey-input text-lg py-6"
    />
  );
}
