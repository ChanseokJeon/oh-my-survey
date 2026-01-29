"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StepCreate } from "./step-create";
import { StepExtractId } from "./step-extract-id";
import { StepShare } from "./step-share";
import { StepTest } from "./step-test";

interface SheetsSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: string;
  onComplete: (config: { spreadsheetId: string; sheetName: string }) => void;
}

export function SheetsSetupWizard({
  open,
  onOpenChange,
  surveyId,
  onComplete,
}: SheetsSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");

  const handleSpreadsheetIdChange = useCallback((id: string) => {
    setSpreadsheetId(id);
  }, []);

  const handleSheetNameChange = useCallback((name: string) => {
    setSheetName(name);
  }, []);

  const handleComplete = (config: { spreadsheetId: string; sheetName: string }) => {
    onComplete(config);
    // Reset state for next use
    setCurrentStep(1);
    setSpreadsheetId("");
    setSheetName("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setCurrentStep(1);
      setSpreadsheetId("");
      setSheetName("");
    }
    onOpenChange(open);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepCreate
            onNext={() => setCurrentStep(2)}
            onSkip={() => setCurrentStep(2)}
          />
        );
      case 2:
        return (
          <StepExtractId
            spreadsheetId={spreadsheetId}
            onSpreadsheetIdChange={handleSpreadsheetIdChange}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        );
      case 3:
        return (
          <StepShare
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        );
      case 4:
        return (
          <StepTest
            surveyId={surveyId}
            spreadsheetId={spreadsheetId}
            sheetName={sheetName}
            onSheetNameChange={handleSheetNameChange}
            onBack={() => setCurrentStep(3)}
            onComplete={handleComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Google Sheets Setup</DialogTitle>
          <DialogDescription>
            Connect your survey to Google Sheets to automatically export responses.
            Step {currentStep} of 4.
          </DialogDescription>
        </DialogHeader>
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
