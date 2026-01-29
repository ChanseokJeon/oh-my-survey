"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowRight } from "lucide-react";

interface StepCreateProps {
  onNext: () => void;
  onSkip: () => void;
}

export function StepCreate({ onNext, onSkip }: StepCreateProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Step 1: Create a Google Spreadsheet</h3>
        <p className="text-sm text-muted-foreground">
          Create a new Google Spreadsheet where survey responses will be stored.
        </p>

        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Instructions:</p>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
            <li>Click the button below to open Google Sheets</li>
            <li>Create a blank spreadsheet</li>
            <li>Give it a meaningful name (e.g., &quot;Survey Responses&quot;)</li>
            <li>Keep the tab open - you&apos;ll need the URL in the next step</li>
          </ol>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.open("https://sheets.google.com", "_blank")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Google Sheets
        </Button>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onSkip}>
          Skip - I have one
        </Button>
        <Button onClick={onNext}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
