"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputStep } from "./input-step";
import { PreviewStep } from "./preview-step";
import type { AIGeneratorProps, Step, EditableSurvey, GeneratedSurvey } from "./types";

function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function toEditableSurvey(survey: GeneratedSurvey): EditableSurvey {
  return {
    title: survey.title,
    questions: survey.questions.map((q) => ({
      ...q,
      id: generateTempId(),
    })),
  };
}

export function AIGeneratorDialog({
  open,
  onOpenChange,
  onSurveyGenerated,
}: AIGeneratorProps) {
  const [step, setStep] = useState<Step>("input");
  const [description, setDescription] = useState("");
  const [editableSurvey, setEditableSurvey] = useState<EditableSurvey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep("input");
    setDescription("");
    setEditableSurvey(null);
    setIsLoading(false);
    setIsCreating(false);
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetState();
      }
      onOpenChange(open);
    },
    [onOpenChange, resetState]
  );

  const handleGenerate = useCallback(async () => {
    if (description.trim().length < 10) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/surveys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate survey");
      }

      const generatedSurvey = data.survey as GeneratedSurvey;
      setEditableSurvey(toEditableSurvey(generatedSurvey));
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [description]);

  const handleRegenerate = useCallback(() => {
    setStep("input");
    setEditableSurvey(null);
    setError(null);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!editableSurvey || editableSurvey.questions.length === 0) return;

    setIsCreating(true);
    setError(null);

    try {
      // Step 1: Create the survey
      const surveyResponse = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editableSurvey.title,
          theme: "light",
        }),
      });

      if (!surveyResponse.ok) {
        const data = await surveyResponse.json();
        throw new Error(data.error || "Failed to create survey");
      }

      const survey = await surveyResponse.json();

      // Step 2: Create all questions
      const questionPromises = editableSurvey.questions.map((question) =>
        fetch(`/api/surveys/${survey.id}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: question.type,
            title: question.title,
            options: question.type === "multiple_choice" ? question.options : undefined,
            required: question.required,
          }),
        })
      );

      const questionResponses = await Promise.all(questionPromises);

      // Check if any question creation failed
      const failedQuestion = questionResponses.find((r) => !r.ok);
      if (failedQuestion) {
        throw new Error("Failed to create some questions");
      }

      // Success - call the callback and close dialog
      onSurveyGenerated({ id: survey.id, title: survey.title });
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  }, [editableSurvey, onSurveyGenerated, handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "input" ? "Generate Survey with AI" : "Preview Generated Survey"}
          </DialogTitle>
          <DialogDescription>
            {step === "input"
              ? "Describe what you want to learn, and AI will create a professional survey for you."
              : "Review and customize your survey before creating it."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {step === "input" ? (
            <InputStep
              description={description}
              onDescriptionChange={setDescription}
              isLoading={isLoading}
              error={error}
              onGenerate={handleGenerate}
            />
          ) : editableSurvey ? (
            <PreviewStep
              survey={editableSurvey}
              onSurveyChange={setEditableSurvey}
              isCreating={isCreating}
              error={error}
              onRegenerate={handleRegenerate}
              onCreate={handleCreate}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { AIGeneratorProps } from "./types";
