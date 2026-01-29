"use client";

import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface YesNoInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function YesNoInput({ value, onChange }: YesNoInputProps) {
  return (
    <div className="flex gap-4">
      <button
        type="button"
        onClick={() => onChange("yes")}
        className={cn(
          "flex-1 flex items-center justify-center gap-3 p-6 rounded-lg border text-lg font-medium transition-all",
          "hover:border-green-500 hover:bg-green-50",
          value === "yes"
            ? "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200"
            : "survey-card"
        )}
      >
        <Check className="w-6 h-6" />
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange("no")}
        className={cn(
          "flex-1 flex items-center justify-center gap-3 p-6 rounded-lg border text-lg font-medium transition-all",
          "hover:border-red-500 hover:bg-red-50",
          value === "no"
            ? "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200"
            : "survey-card"
        )}
      >
        <X className="w-6 h-6" />
        No
      </button>
    </div>
  );
}
