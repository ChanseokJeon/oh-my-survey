import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, questions, ensureDbReady } from "@/lib/db";
import { eq, and, inArray, asc } from "drizzle-orm";
import { reorderQuestionsSchema } from "@/lib/validations/question";
import { verifySurveyOwnership } from "@/lib/utils/survey-ownership";
import { handleApiError } from "@/lib/utils/api-error";
import { getActualUserIdForPGlite } from "@/lib/utils/pglite-user";

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

  // Verify survey ownership
  const actualUserId = await getActualUserIdForPGlite(session.user.id, session.user.email) || session.user.id;
  const survey = await verifySurveyOwnership(surveyId, actualUserId);
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { questionIds } = reorderQuestionsSchema.parse(body);

    // Verify all question IDs belong to this survey
    const existingQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(
        eq(questions.surveyId, surveyId),
        inArray(questions.id, questionIds)
      ));

    if (existingQuestions.length !== questionIds.length) {
      return NextResponse.json(
        { error: "Some question IDs are invalid" },
        { status: 400 }
      );
    }

    // Update order for each question
    await Promise.all(
      questionIds.map((id, index) =>
        db
          .update(questions)
          .set({ order: index + 1, updatedAt: new Date() })
          .where(eq(questions.id, id))
      )
    );

    // Return updated questions
    const updatedQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.surveyId, surveyId))
      .orderBy(asc(questions.order));

    return NextResponse.json({ questions: updatedQuestions });
  } catch (error) {
    return handleApiError(error);
  }
}
