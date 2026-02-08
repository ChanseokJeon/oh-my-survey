"use client";

import { cn } from "@/lib/utils";
import { useKeyboardSelect } from "@/hooks/use-keyboard-select";

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
  const selectedIndex = options.indexOf(value);

  const { focusedIndex, getItemProps, containerProps } = useKeyboardSelect({
    itemCount: options.length,
    selectedIndex,
    onSelect: (index) => onChange(options[index]),
  });

  return (
    <div className="space-y-3" {...containerProps}>
      {options.map((option, index) => {
        const itemProps = getItemProps(index);
        return (
          <button
            key={index}
            type="button"
            ref={itemProps.ref}
            tabIndex={itemProps.tabIndex}
            role={itemProps.role}
            aria-checked={itemProps["aria-checked"]}
            onKeyDown={itemProps.onKeyDown}
            onClick={() => onChange(option)}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-all",
              "hover:border-primary hover:bg-primary/5",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              value === option
                ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                : "survey-card",
              index === focusedIndex && value !== option && "border-primary/50"
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
        );
      })}
    </div>
  );
}
