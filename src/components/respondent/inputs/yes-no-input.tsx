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
          "hover:border-success hover:bg-success/10",
          "focus:outline-none focus:ring-2 focus:ring-success/50",
          value === "yes"
            ? "border-success bg-success/10 text-success ring-2 ring-success/30"
            : "survey-card",
          focusedIndex === 0 && value !== "yes" && "border-success/50"
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
          "hover:border-destructive hover:bg-destructive/10",
          "focus:outline-none focus:ring-2 focus:ring-destructive/50",
          value === "no"
            ? "border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive/30"
            : "survey-card",
          focusedIndex === 1 && value !== "no" && "border-destructive/50"
        )}
      >
        <X className="w-6 h-6" />
        {labels.no}
      </button>
    </div>
  );
}
