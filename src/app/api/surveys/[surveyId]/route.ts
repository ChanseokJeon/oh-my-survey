import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, surveys, questions, responses, ensureDbReady } from "@/lib/db";
import { eq, and, asc, count } from "drizzle-orm";
import { updateSurveySchema } from "@/lib/validations/survey";

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

  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.userId, session.user.id)));

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
    ...survey,
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
  const [existing] = await db
    .select({ id: surveys.id })
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.userId, session.user.id)));

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
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    throw error;
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
  const [existing] = await db
    .select({ id: surveys.id })
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.userId, session.user.id)));

  if (!existing) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  await db.delete(surveys).where(eq(surveys.id, surveyId));

  return new NextResponse(null, { status: 204 });
}
