"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompletionScreenProps {
  surveyTitle: string;
  onSubmitAnother?: () => void;
}

export function CompletionScreen({ surveyTitle, onSubmitAnother }: CompletionScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
        <Check className="w-10 h-10 text-green-600" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Thank you!</h1>
        <p className="text-muted-foreground text-lg">
          Your response to &quot;{surveyTitle}&quot; has been recorded.
        </p>
      </div>
      {onSubmitAnother && (
        <Button variant="outline" onClick={onSubmitAnother}>
          Submit another response
        </Button>
      )}
    </div>
  );
}
