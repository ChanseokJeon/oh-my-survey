"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextareaWithCounter } from "@/components/ui/input-with-counter";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "Customer satisfaction survey for an e-commerce store",
  "Employee engagement and workplace culture feedback",
  "Event feedback form for a tech conference",
  "Product feedback survey for a mobile app",
  "Course evaluation for an online learning platform",
];

interface InputStepProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  onGenerate: () => void;
}

export function InputStep({
  description,
  onDescriptionChange,
  isLoading,
  error,
  onGenerate,
}: InputStepProps) {
  const handleExampleClick = (example: string) => {
    onDescriptionChange(example);
  };

  const canGenerate = description.trim().length >= 10 && !isLoading;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="description">Describe your survey</Label>
        <TextareaWithCounter
          id="description"
          placeholder="E.g., A customer feedback survey for a coffee shop that measures satisfaction with service quality, product variety, and overall experience..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={2000}
          className="min-h-[120px]"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Minimum 10 characters. Be specific about what you want to learn.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Example prompts</Label>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        onClick={onGenerate}
        disabled={!canGenerate}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Survey
          </>
        )}
      </Button>
    </div>
  );
}
