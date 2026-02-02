"use client";

import { useState } from "react";
import { CustomThemeData } from "@/lib/theme/types";

interface ExtractThemeRequest {
  surveyId: string;
  source: "file" | "url" | "base64";
  data: string;
}

interface ExtractThemeResponse {
  palette: string[];
  suggestedTheme: CustomThemeData;
}

export function useExtractTheme() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = async (
    request: ExtractThemeRequest
  ): Promise<ExtractThemeResponse> => {
    setIsPending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/surveys/${request.surveyId}/extract-theme`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: request.source,
            data: request.data,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract theme");
      }

      const data: ExtractThemeResponse = await response.json();
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutateAsync,
    isPending,
    error,
  };
}
