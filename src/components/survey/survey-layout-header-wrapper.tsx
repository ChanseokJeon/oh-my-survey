"use client";

import { usePathname } from 'next/navigation';
import { Survey } from '@/lib/db/schema';
import { SurveyLayoutHeader } from '@/components/survey/survey-layout-header';

interface SurveyLayoutHeaderWrapperProps {
  survey: Survey;
}

export function SurveyLayoutHeaderWrapper({ survey }: SurveyLayoutHeaderWrapperProps) {
  const pathname = usePathname();

  let activeTab: 'edit' | 'settings' | 'responses' = 'edit';
  if (pathname.includes('/settings')) {
    activeTab = 'settings';
  } else if (pathname.includes('/responses')) {
    activeTab = 'responses';
  }

  return <SurveyLayoutHeader survey={survey} activeTab={activeTab} />;
}
