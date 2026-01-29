"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ArrowLeft, ArrowRight } from "lucide-react";

interface StepExtractIdProps {
  spreadsheetId: string;
  onSpreadsheetIdChange: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

function extractSpreadsheetId(input: string): string {
  // If it looks like just an ID (alphanumeric with dashes/underscores, 20+ chars)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) {
    return input.trim();
  }

  // Try to extract from URL
  // Pattern: https://docs.google.com/spreadsheets/d/{spreadsheetId}/...
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  return input.trim();
}

function isValidSpreadsheetId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{20,}$/.test(id);
}

export function StepExtractId({
  spreadsheetId,
  onSpreadsheetIdChange,
  onBack,
  onNext,
}: StepExtractIdProps) {
  const [inputValue, setInputValue] = useState(spreadsheetId);
  const [extractedId, setExtractedId] = useState(spreadsheetId);

  useEffect(() => {
    const id = extractSpreadsheetId(inputValue);
    setExtractedId(id);
    onSpreadsheetIdChange(id);
  }, [inputValue, onSpreadsheetIdChange]);

  const isValid = isValidSpreadsheetId(extractedId);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Step 2: Enter Spreadsheet URL or ID</h3>
        <p className="text-sm text-muted-foreground">
          Paste the URL of your Google Spreadsheet or its ID.
        </p>

        <div className="space-y-2">
          <Label htmlFor="spreadsheet-url">Spreadsheet URL or ID</Label>
          <Input
            id="spreadsheet-url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>

        {extractedId && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Extracted ID:</span>
              {isValid && <Check className="h-4 w-4 text-green-600" />}
            </div>
            <code className="text-xs bg-background px-2 py-1 rounded block overflow-auto">
              {extractedId}
            </code>
            {!isValid && extractedId.length > 0 && (
              <p className="text-xs text-destructive">
                Invalid ID format. Please check the URL or ID.
              </p>
            )}
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            The ID is the long string between <code className="text-xs">/d/</code> and{" "}
            <code className="text-xs">/edit</code> in the URL.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!isValid}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
