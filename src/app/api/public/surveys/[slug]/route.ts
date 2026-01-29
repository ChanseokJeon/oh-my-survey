import { NextResponse } from "next/server";
import { db, surveys, questions } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const isPreview = searchParams.get("preview") === "true";
  const userId = searchParams.get("userId");

  // Find survey by slug
  const [survey] = await db
    .select({
      id: surveys.id,
      title: surveys.title,
      theme: surveys.theme,
      logoBase64: surveys.logoBase64,
      status: surveys.status,
      userId: surveys.userId,
    })
    .from(surveys)
    .where(
      isPreview
        ? eq(surveys.slug, slug)
        : and(eq(surveys.slug, slug), eq(surveys.status, "published"))
    );

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  // For preview mode, verify ownership
  if (isPreview && survey.status === "draft") {
    if (!userId || survey.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }
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
