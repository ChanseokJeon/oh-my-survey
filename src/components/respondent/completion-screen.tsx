"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLabels, type SurveyLanguage } from "@/lib/i18n/respondent-labels";

interface CompletionScreenProps {
  surveyTitle: string;
  onSubmitAnother?: () => void;
  language: SurveyLanguage;
}

export function CompletionScreen({ surveyTitle, onSubmitAnother, language }: CompletionScreenProps) {
  const labels = getLabels(language);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="w-10 h-10 text-green-600" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{labels.thankYou}</h1>
        <p className="text-muted-foreground text-lg">
          {labels.responseRecorded}
        </p>
      </div>
      {onSubmitAnother && (
        <Button variant="outline" onClick={onSubmitAnother}>
          {labels.submitAnother}
        </Button>
      )}
    </div>
  );
}
