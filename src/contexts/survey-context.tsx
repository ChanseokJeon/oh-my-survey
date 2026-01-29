'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Survey, Question } from '@/lib/db/schema';

interface SurveyContextValue {
  survey: Survey | null;
  questions: Question[];
  isLoading: boolean;
  error: string | null;
  refreshSurvey: () => Promise<void>;
}

const SurveyContext = createContext<SurveyContextValue | undefined>(undefined);

interface SurveyProviderProps {
  surveyId: string;
  children: React.ReactNode;
}

export function SurveyProvider({ surveyId, children }: SurveyProviderProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSurvey = useCallback(async () => {
    if (!surveyId) {
      setError('Survey ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/surveys/${surveyId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Survey not found');
        }
        throw new Error(`Failed to fetch survey: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.survey) {
        throw new Error('Invalid survey data received');
      }

      setSurvey(data.survey);
      setQuestions(data.questions || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load survey';
      setError(errorMessage);
      console.error('Survey fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [surveyId]);

  const refreshSurvey = useCallback(async () => {
    await fetchSurvey();
  }, [fetchSurvey]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  const value: SurveyContextValue = {
    survey,
    questions,
    isLoading,
    error,
    refreshSurvey,
  };

  return (
    <SurveyContext.Provider value={value}>
      {children}
    </SurveyContext.Provider>
  );
}

export function useSurvey(): SurveyContextValue {
  const context = useContext(SurveyContext);

  if (context === undefined) {
    throw new Error('useSurvey must be used within a SurveyProvider');
  }

  return context;
}
