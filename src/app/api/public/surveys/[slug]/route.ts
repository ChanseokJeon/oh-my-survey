import { NextResponse } from "next/server";
import { db, surveys, questions, ensureDbReady } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getActualUserIdForPGlite } from "@/lib/utils/pglite-user";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  await ensureDbReady();
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const isPreview = searchParams.get("preview") === "true";

  // Find survey by slug
  const [survey] = await db
    .select({
      id: surveys.id,
      title: surveys.title,
      theme: surveys.theme,
      language: surveys.language,
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

  // For preview mode, verify ownership using server-side session
  if (isPreview && survey.status === "draft") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve actual user ID for PGlite compatibility
    const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;

    if (survey.userId !== actualUserId) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
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
    language: survey.language,
    logoBase64: survey.logoBase64,
    questions: surveyQuestions,
  });
}
