import { NextResponse } from "next/server";
import { db, surveys, questions } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Find published survey by slug
  const [survey] = await db
    .select({
      id: surveys.id,
      title: surveys.title,
      theme: surveys.theme,
      logoBase64: surveys.logoBase64,
      status: surveys.status,
    })
    .from(surveys)
    .where(and(eq(surveys.slug, slug), eq(surveys.status, "published")));

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  // Get questions
  const surveyQuestions = await db
    .select({
      id: questions.id,
      type: questions.type,
      title: questions.title,
      options: questions.options,
      required: questions.required,
      order: questions.order,
    })
    .from(questions)
    .where(eq(questions.surveyId, survey.id))
    .orderBy(asc(questions.order));

  return NextResponse.json({
    id: survey.id,
    title: survey.title,
    theme: survey.theme,
    logoBase64: survey.logoBase64,
    questions: surveyQuestions,
  });
}
