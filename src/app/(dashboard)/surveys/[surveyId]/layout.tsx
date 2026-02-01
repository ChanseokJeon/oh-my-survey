import { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db, surveys, questions, ensureDbReady } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { SurveyProvider } from '@/contexts/survey-context';
import { SurveyLayoutHeaderWrapper } from '@/components/survey/survey-layout-header-wrapper';
import { getActualUserIdForPGlite } from '@/lib/utils/pglite-user';

interface SurveyLayoutProps {
  children: ReactNode;
  params: Promise<{ surveyId: string }>;
}

export default async function SurveyLayout({ children, params }: SurveyLayoutProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { surveyId } = await params;

  await ensureDbReady();

  // Resolve actual user ID for PGlite (may differ from session ID)
  const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;

  // Fetch survey with questions
  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.userId, actualUserId)));

  if (!survey) {
    notFound();
  }

  const surveyQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.surveyId, surveyId))
    .orderBy(asc(questions.order));

  return (
    <SurveyProvider surveyId={surveyId}>
      <div className="min-h-screen flex flex-col">
        <SurveyLayoutHeaderWrapper survey={survey} />
        <main className="flex-1 container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </SurveyProvider>
  );
}
