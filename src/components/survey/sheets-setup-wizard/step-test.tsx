"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ArrowLeft, Loader2, X } from "lucide-react";

interface StepTestProps {
  surveyId: string;
  spreadsheetId: string;
  sheetName: string;
  onSheetNameChange: (name: string) => void;
  onBack: () => void;
  onComplete: (config: { spreadsheetId: string; sheetName: string }) => void;
}

type TestResult = {
  success: boolean;
  message: string;
} | null;

export function StepTest({
  surveyId,
  spreadsheetId,
  sheetName,
  onSheetNameChange,
  onBack,
  onComplete,
}: StepTestProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/surveys/${surveyId}/test-sheets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spreadsheetId,
          sheetName: sheetName || "Sheet1",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || "Connection successful!",
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Connection failed. Please check your settings.",
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Connection test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleComplete = () => {
    onComplete({
      spreadsheetId,
      sheetName: sheetName || "Sheet1",
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Step 4: Test Connection</h3>
        <p className="text-sm text-muted-foreground">
          Test the connection to make sure everything is set up correctly.
        </p>

        <div className="space-y-2">
          <Label htmlFor="sheet-name">Sheet Name (optional)</Label>
          <Input
            id="sheet-name"
            placeholder="Sheet1"
            value={sheetName}
            onChange={(e) => onSheetNameChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            The name of the tab in your spreadsheet. Defaults to &quot;Sheet1&quot;.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">Configuration Summary:</p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-medium">Spreadsheet ID:</span>{" "}
              <code className="text-xs bg-background px-1 rounded">{spreadsheetId}</code>
            </p>
            <p>
              <span className="font-medium">Sheet:</span> {sheetName || "Sheet1"}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleTest}
          disabled={isTesting}
        >
          {isTesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Connection"
          )}
        </Button>

        {testResult && (
          <div
            className={`rounded-lg p-4 flex items-start gap-3 ${
              testResult.success
                ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {testResult.success ? (
              <Check className="h-5 w-5 mt-0.5 flex-shrink-0" />
            ) : (
              <X className="h-5 w-5 mt-0.5 flex-shrink-0" />
            )}
            <p className="text-sm">{testResult.message}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleComplete} disabled={!testResult?.success}>
          Complete Setup
        </Button>
      </div>
    </div>
  );
}
