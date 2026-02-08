"use client";

import { Progress } from "@/components/ui/progress";
import { getLabels, type SurveyLanguage } from "@/lib/i18n/respondent-labels";

interface ProgressBarProps {
  current: number;
  total: number;
  language?: SurveyLanguage;
}

export function ProgressBar({ current, total, language = "en" }: ProgressBarProps) {
  const labels = getLabels(language);
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const questionText = labels.questionOf
    .replace('{current}', current.toString())
    .replace('{total}', total.toString());

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>{questionText}</span>
        <span>{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
