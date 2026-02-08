"use client";

import { useState, useEffect, useCallback } from "react";
import { ProgressBar } from "./progress-bar";
import { QuestionView } from "./question-view";
import { CompletionScreen } from "./completion-screen";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Question } from "@/types/question";
import { getLabels, type SurveyLanguage } from "@/lib/i18n/respondent-labels";

interface SurveyData {
  id: string;
  title: string;
  theme: "light" | "dark" | "minimal" | "custom";
  customTheme?: {
    colors: {
      surveyBg: string;
      surveyBgRaw?: string;
      surveyFg: string;
      surveyPrimary: string;
      surveyPrimaryFg: string;
      surveyMuted: string;
      surveyMutedFg: string;
      surveyBorder: string;
      surveyInput: string;
      surveyCard: string;
      surveyCardFg: string;
    };
  };
  logoBase64: string | null;
  questions: Question[];
  language: SurveyLanguage;
}

interface SurveyContainerProps {
  survey: SurveyData;
  slug: string;
}

export function SurveyContainer({ survey, slug }: SurveyContainerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  const labels = getLabels(survey.language);
  const currentQuestion = survey.questions[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === survey.questions.length - 1;

  const canProceed = useCallback(() => {
    if (!currentQuestion) return false;
    const answer = answers[currentQuestion.id];
    if (!currentQuestion.required) return true;
    if (answer === undefined || answer === null) return false;
    if (typeof answer === "string" && answer.trim() === "") return false;
    return true;
  }, [currentQuestion, answers]);

  const handlePrevious = () => {
    if (isFirst || isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(currentIndex - 1);
      setIsAnimating(false);
    }, 150);
  };

  const handleNext = useCallback(() => {
    if (isAnimating || !canProceed()) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setIsAnimating(false);
    }, 150);
  }, [isAnimating, canProceed]);

  const handleSubmit = useCallback(async () => {
    if (!canProceed() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/public/surveys/${slug}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit");
      }

      setIsComplete(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit response",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [canProceed, isSubmitting, slug, answers, toast]);

  const handleReset = () => {
    setCurrentIndex(0);
    setAnswers({});
    setIsComplete(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore Space - it's used for selecting options in choice inputs
      if (e.key === " ") return;

      if (e.key === "Enter" && !e.shiftKey) {
        // Don't trigger navigation if focus is on a text input or textarea
        const target = e.target as HTMLElement;
        if (target.tagName === "TEXTAREA") return;

        if (isLast) {
          handleSubmit();
        } else {
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLast, handleSubmit, handleNext]);

  if (isComplete) {
    return <CompletionScreen surveyTitle={survey.title} onSubmitAnother={handleReset} language={survey.language} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <ProgressBar current={currentIndex + 1} total={survey.questions.length} language={survey.language} />

      {currentQuestion && (
        <QuestionView
          question={currentQuestion}
          value={answers[currentQuestion.id] ?? (currentQuestion.type === "rating" ? 0 : "")}
          onChange={(value) =>
            setAnswers({ ...answers, [currentQuestion.id]: value })
          }
          isAnimating={isAnimating}
          language={survey.language}
        />
      )}

      <div className="flex justify-between pt-8">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirst || isAnimating}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {labels.previous}
        </Button>

        {isLast ? (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {labels.submit}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canProceed() || isAnimating}>
            {labels.next}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {labels.pressEnter}
      </p>
    </div>
  );
}
