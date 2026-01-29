"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

interface StepShareProps {
  onBack: () => void;
  onNext: () => void;
}

export function StepShare({ onBack, onNext }: StepShareProps) {
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchServiceAccountEmail() {
      try {
        const response = await fetch("/api/config/sheets");
        if (!response.ok) {
          throw new Error("Failed to fetch service account email");
        }
        const data = await response.json();
        setServiceAccountEmail(data.serviceAccountEmail);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchServiceAccountEmail();
  }, []);

  const handleCopy = async () => {
    if (serviceAccountEmail) {
      await navigator.clipboard.writeText(serviceAccountEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Step 3: Share with Service Account</h3>
        <p className="text-sm text-muted-foreground">
          Share your spreadsheet with our service account so we can write responses to it.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4">
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Service Account Email:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted px-3 py-2 rounded-md overflow-auto">
                  {serviceAccountEmail}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">How to share:</p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                <li>Open your Google Spreadsheet</li>
                <li>Click the &quot;Share&quot; button in the top right</li>
                <li>Paste the service account email above</li>
                <li>Set permission to &quot;Editor&quot;</li>
                <li>Uncheck &quot;Notify people&quot; (optional)</li>
                <li>Click &quot;Share&quot;</li>
              </ol>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={isLoading || !!error}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
