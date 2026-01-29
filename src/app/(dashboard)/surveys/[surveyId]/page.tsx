import { redirect } from 'next/navigation';

interface SurveyPageProps {
  params: Promise<{ surveyId: string }>;
}

export default async function SurveyPage({ params }: SurveyPageProps) {
  const { surveyId } = await params;
  redirect(`/surveys/${surveyId}/edit`);
}
