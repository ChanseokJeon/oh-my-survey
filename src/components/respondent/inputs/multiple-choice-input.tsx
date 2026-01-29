"use client";

import { cn } from "@/lib/utils";

interface MultipleChoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

export function MultipleChoiceInput({
  value,
  onChange,
  options,
}: MultipleChoiceInputProps) {
  return (
    <div className="space-y-3">
      {options.map((option, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-all",
            "hover:border-primary hover:bg-primary/5",
            value === option
              ? "border-primary bg-primary/10 ring-2 ring-primary/20"
              : "survey-card"
          )}
        >
          <div
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
              value === option ? "border-primary bg-primary" : "border-muted-foreground"
            )}
          >
            {value === option && (
              <div className="w-2 h-2 rounded-full bg-white" />
            )}
          </div>
          <span className="flex-1">{option}</span>
        </button>
      ))}
    </div>
  );
}
