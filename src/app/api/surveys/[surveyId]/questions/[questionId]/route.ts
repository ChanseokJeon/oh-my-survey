import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, questions, ensureDbReady } from "@/lib/db";
import { eq, and, gt, asc } from "drizzle-orm";
import { updateQuestionSchema } from "@/lib/validations/question";
import { verifySurveyOwnership } from "@/lib/utils/survey-ownership";
import { handleApiError } from "@/lib/utils/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ surveyId: string; questionId: string }> }
) {
  await ensureDbReady();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { surveyId, questionId } = await params;

  // Verify survey ownership
  const survey = await verifySurveyOwnership(surveyId, session.user.id);
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const [question] = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.surveyId, surveyId)));

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json(question);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ surveyId: string; questionId: string }> }
) {
  await ensureDbReady();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { surveyId, questionId } = await params;

  // Verify survey ownership
  const survey = await verifySurveyOwnership(surveyId, session.user.id);
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  // Verify question exists
  const [existing] = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.surveyId, surveyId)));

  if (!existing) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const validated = updateQuestionSchema.parse(body);

    const [updated] = await db
      .update(questions)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(questions.id, questionId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ surveyId: string; questionId: string }> }
) {
  await ensureDbReady();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { surveyId, questionId } = await params;

  // Verify survey ownership
  const survey = await verifySurveyOwnership(surveyId, session.user.id);
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  // Get the question to be deleted
  const [toDelete] = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.surveyId, surveyId)));

  if (!toDelete) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Delete the question
  await db.delete(questions).where(eq(questions.id, questionId));

  // Reindex remaining questions
  const remaining = await db
    .select()
    .from(questions)
    .where(and(eq(questions.surveyId, surveyId), gt(questions.order, toDelete.order)))
    .orderBy(asc(questions.order));

  // Update order for questions after the deleted one
  for (const q of remaining) {
    await db
      .update(questions)
      .set({ order: q.order - 1, updatedAt: new Date() })
      .where(eq(questions.id, q.id));
  }

  return new NextResponse(null, { status: 204 });
}
