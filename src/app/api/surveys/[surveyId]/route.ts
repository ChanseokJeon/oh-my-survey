import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, surveys, questions, responses, ensureDbReady } from "@/lib/db";
import { eq, asc, count } from "drizzle-orm";
import { updateSurveySchema } from "@/lib/validations/survey";
import { verifySurveyOwnership } from "@/lib/utils/survey-ownership";
import { handleApiError } from "@/lib/utils/api-error";
import { getActualUserIdForPGlite } from "@/lib/utils/pglite-user";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  await ensureDbReady();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { surveyId } = await params;

  const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;
  const survey = await verifySurveyOwnership(surveyId, actualUserId);

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const surveyQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.surveyId, surveyId))
    .orderBy(asc(questions.order));

  const [responseCount] = await db
    .select({ count: count() })
    .from(responses)
    .where(eq(responses.surveyId, surveyId));

  return NextResponse.json({
    survey,
    questions: surveyQuestions,
    responseCount: responseCount?.count ?? 0,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  await ensureDbReady();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { surveyId } = await params;

  // Verify ownership
  const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;
  const existing = await verifySurveyOwnership(surveyId, actualUserId);

  if (!existing) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const validated = updateSurveySchema.parse(body);

    const [updated] = await db
      .update(surveys)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(surveys.id, surveyId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  await ensureDbReady();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { surveyId } = await params;

  // Verify ownership
  const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;
  const existing = await verifySurveyOwnership(surveyId, actualUserId);

  if (!existing) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  await db.delete(surveys).where(eq(surveys.id, surveyId));

  return new NextResponse(null, { status: 204 });
}
