"use client";

import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { getLabels, type SurveyLanguage } from "@/lib/i18n/respondent-labels";
import { useKeyboardSelect } from "@/hooks/use-keyboard-select";

interface YesNoInputProps {
  value: string;
  onChange: (value: string) => void;
  language?: SurveyLanguage;
}

const YES_NO_VALUES = ["yes", "no"] as const;

export function YesNoInput({ value, onChange, language = "en" }: YesNoInputProps) {
  const labels = getLabels(language);
  const selectedIndex = YES_NO_VALUES.indexOf(value as typeof YES_NO_VALUES[number]);

  const { focusedIndex, getItemProps, containerProps } = useKeyboardSelect({
    itemCount: 2,
    selectedIndex,
    onSelect: (index) => onChange(YES_NO_VALUES[index]),
  });

  const yesProps = getItemProps(0);
  const noProps = getItemProps(1);

  return (
    <div className="flex gap-4" {...containerProps}>
      <button
        type="button"
        ref={yesProps.ref}
        tabIndex={yesProps.tabIndex}
        role={yesProps.role}
        aria-checked={yesProps["aria-checked"]}
        onKeyDown={yesProps.onKeyDown}
        onClick={() => onChange("yes")}
        className={cn(
          "flex-1 flex items-center justify-center gap-3 p-6 rounded-lg border text-lg font-medium transition-all",
          "hover:border-green-500 hover:bg-green-50",
          "focus:outline-none focus:ring-2 focus:ring-green-400/50",
          value === "yes"
            ? "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200"
            : "survey-card",
          focusedIndex === 0 && value !== "yes" && "border-green-400/50"
        )}
      >
        <Check className="w-6 h-6" />
        {labels.yes}
      </button>
      <button
        type="button"
        ref={noProps.ref}
        tabIndex={noProps.tabIndex}
        role={noProps.role}
        aria-checked={noProps["aria-checked"]}
        onKeyDown={noProps.onKeyDown}
        onClick={() => onChange("no")}
        className={cn(
          "flex-1 flex items-center justify-center gap-3 p-6 rounded-lg border text-lg font-medium transition-all",
          "hover:border-red-500 hover:bg-red-50",
          "focus:outline-none focus:ring-2 focus:ring-red-400/50",
          value === "no"
            ? "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200"
            : "survey-card",
          focusedIndex === 1 && value !== "no" && "border-red-400/50"
        )}
      >
        <X className="w-6 h-6" />
        {labels.no}
      </button>
    </div>
  );
}
